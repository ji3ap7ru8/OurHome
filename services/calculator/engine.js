// 計算機引擎：純邏輯、無 DOM，方便測試。
// 狀態：tokens（已輸入的數字/運算符）+ cur（正在輸入的數字字串）。
// 運算採一般數學優先順序（先乘除後加減），不使用 eval。

export const MAX_DIGITS = 12;
export const OPS = ["+", "−", "×", "÷"];

export const newState = () => ({ tokens: [], cur: "", done: false, info: null, error: "", lastExpr: "" });

// 去除浮點誤差（0.1+0.2 → 0.3）
const clean = (n) => Number(n.toPrecision(12));
const round2 = (n) => Math.round(n * 100) / 100;

// 數字轉成字串（避免科學記號）
export function numToStr(n) {
  if (!isFinite(n)) return "";
  const s = String(clean(n));
  if (!/e/i.test(s)) return s;
  return n.toFixed(8).replace(/\.?0+$/, "");
}

// 遞迴下降：expr = term (+|− term)*；term = num (×|÷ num)*
export function evaluate(tokens) {
  let i = 0;
  const num = () => {
    const v = Number(tokens[i++]);
    if (Number.isNaN(v)) throw new Error("格式錯誤");
    return v;
  };
  const term = () => {
    let v = num();
    while (tokens[i] === "×" || tokens[i] === "÷") {
      const op = tokens[i++];
      const r = num();
      if (op === "÷" && r === 0) throw new Error("不能除以零");
      v = op === "×" ? v * r : v / r;
    }
    return v;
  };
  let v = term();
  while (tokens[i] === "+" || tokens[i] === "−") {
    const op = tokens[i++];
    const r = term();
    v = op === "+" ? v + r : v - r;
  }
  if (i !== tokens.length) throw new Error("格式錯誤");
  if (!isFinite(v) || Math.abs(v) >= 1e15) throw new Error("數字太大");
  return clean(v);
}

// 目前可計算的完整 token（去掉結尾的運算符）
function fullTokens(s) {
  const t = [...s.tokens];
  if (s.cur !== "") t.push(s.cur);
  while (t.length && OPS.includes(t[t.length - 1])) t.pop();
  return t;
}

const fail = (s, msg) => Object.assign(s, { tokens: [], cur: "", done: false, info: null, error: msg, lastExpr: "" });

export function press(s, key) {
  s.error = "";
  if (/^\d$/.test(key) || key === "00") {
    if (s.done) { s.cur = ""; s.done = false; s.info = null; s.lastExpr = ""; }
    if (key === "00" && (s.cur === "" || s.cur === "0")) key = "0";
    if (s.cur === "0") s.cur = key === "0" ? "0" : key;
    else if (s.cur.replace(/[-.]/g, "").length + key.length <= MAX_DIGITS) s.cur += key;
    return s;
  }
  if (key === ".") {
    if (s.done) { s.cur = ""; s.done = false; s.info = null; s.lastExpr = ""; }
    if (s.cur.includes(".")) return s;
    s.cur = s.cur === "" ? "0." : s.cur + ".";
    return s;
  }
  if (OPS.includes(key)) {
    s.done = false; s.info = null; s.lastExpr = "";
    if (s.cur !== "") { s.tokens.push(s.cur.replace(/\.$/, "")); s.cur = ""; s.tokens.push(key); }
    else if (s.tokens.length && OPS.includes(s.tokens[s.tokens.length - 1])) s.tokens[s.tokens.length - 1] = key;
    return s; // 一開始就按運算符：忽略
  }
  if (key === "C") return Object.assign(s, newState());
  if (key === "⌫") {
    if (s.done) return Object.assign(s, newState());
    if (s.cur !== "") s.cur = s.cur.slice(0, -1);
    else if (s.tokens.length) { // 退回上一個運算符，並把前一個數字拉回編輯
      s.tokens.pop();
      s.cur = s.tokens.pop() ?? "";
    }
    return s;
  }
  if (key === "%") {
    if (s.cur === "") return s;
    const n = Number(s.cur);
    const prevOp = s.tokens[s.tokens.length - 1];
    if ((prevOp === "+" || prevOp === "−") && s.tokens.length >= 2) {
      // 「100 + 10%」＝ 100 + 100 的 10% → 慣用手機算法
      const base = evaluate(s.tokens.slice(0, -1));
      s.cur = numToStr((base * n) / 100);
    } else {
      s.cur = numToStr(n / 100);
    }
    return s;
  }
  if (key === "=") {
    const t = fullTokens(s);
    if (!t.length) return s;
    if (t.length === 1 && !s.tokens.length) { s.cur = String(t[0]); s.done = true; return s; }
    try {
      const r = evaluate(t);
      s.lastExpr = t.join(" ") + " =";
      s.tokens = []; s.cur = numToStr(r); s.done = true; s.info = null;
    } catch (e) { fail(s, e.message); }
    return s;
  }
  return s;
}

// 打折：pct 為實付百分比（8折=80、85折=85）。以目前整個算式結果當「原價」。
export function applyDiscount(s, pct) {
  const t = fullTokens(s);
  if (!t.length) return s;
  try {
    const orig = evaluate(t);
    const result = round2((orig * pct) / 100);
    s.info = { orig, pct, result, saved: round2(orig - result) };
    s.lastExpr = "";
    s.tokens = []; s.cur = numToStr(result); s.done = true; s.error = "";
  } catch (e) { fail(s, e.message); }
  return s;
}

// 「8.5」「85」都視為 85折；其餘合理範圍 1~100
export function foldToPct(input) {
  const n = Number(input);
  if (!isFinite(n) || n <= 0) return null;
  const pct = n <= 10 ? n * 10 : n;
  return pct > 100 ? null : pct;
}

export const foldLabel = (pct) => `${pct % 10 === 0 ? pct / 10 : pct}折`;

// 顯示用：加千分位，保留尾端小數點與 0
export function fmt(str) {
  if (str === "" || str == null) return "0";
  const neg = str.startsWith("-");
  const [i, d] = (neg ? str.slice(1) : str).split(".");
  const head = (i || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (neg ? "-" : "") + head + (d !== undefined ? "." + d : "");
}

export const exprText = (s) => [...s.tokens.map((t) => (OPS.includes(t) ? t : fmt(t))), ...(s.cur !== "" && !s.done ? [fmt(s.cur)] : [])].join(" ");
