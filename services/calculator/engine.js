// 計算機引擎：純邏輯、無 DOM，方便測試。
// 狀態：tokens（已輸入的數字/運算符/括號/函數）+ cur（正在輸入的數字字串）。
// 支援：+ − × ÷、^（次方）、x²、x!、括號、sin/cos/tan/log/ln/√、π、e、%、分數換算。
// 運算採一般數學優先順序，不使用 eval。

export const MAX_DIGITS = 12;
export const OPS = ["+", "−", "×", "÷", "^"];
export const FUNCS = ["sin", "cos", "tan", "log", "ln", "√"]; // token 以「sin(」形式存放
const POST = ["²", "!"];
const CONSTS = ["π", "e"];
const NEG = "~"; // 一元負號（例如 ( −5 ）

export const newState = (deg = true) => ({ tokens: [], cur: "", done: false, info: null, error: "", lastExpr: "", deg, pushed: null });

// 去除浮點誤差（0.1+0.2 → 0.3）
const clean = (n) => (Math.abs(n) < 1e-12 ? 0 : Number(n.toPrecision(12)));
const round2 = (n) => Math.round(n * 100) / 100;

export function numToStr(n) {
  if (!isFinite(n)) return "";
  const s = String(clean(n));
  if (!/e/i.test(s)) return s;
  return n.toFixed(8).replace(/\.?0+$/, "");
}

const isNum = (t) => /^-?\d/.test(t ?? "");
const isFuncTok = (t) => typeof t === "string" && t.length > 1 && t.endsWith("(");
const isOpen = (t) => t === "(" || isFuncTok(t);
const isValueEnd = (t) => t === ")" || CONSTS.includes(t) || POST.includes(t) || isNum(t);
const depthOf = (tokens) => tokens.reduce((d, t) => d + (isOpen(t) ? 1 : t === ")" ? -1 : 0), 0);

// ---------- 運算 ----------
export function evaluate(tokens, deg = true) {
  let i = 0;
  const peek = () => tokens[i];
  const fail = (m = "格式錯誤") => { throw new Error(m); };

  const callFn = (name, x) => {
    const rad = deg ? (x * Math.PI) / 180 : x;
    switch (name) {
      case "sin": return Math.sin(rad);
      case "cos": return Math.cos(rad);
      case "tan": if (Math.abs(Math.cos(rad)) < 1e-12) fail("tan 無法計算"); return Math.tan(rad);
      case "log": if (x <= 0) fail("log 要大於 0"); return Math.log10(x);
      case "ln": if (x <= 0) fail("ln 要大於 0"); return Math.log(x);
      case "√": if (x < 0) fail("負數不能開根號"); return Math.sqrt(x);
    }
    return fail();
  };

  const expr = () => {
    let v = term();
    while (peek() === "+" || peek() === "−") {
      const op = tokens[i++];
      const r = term();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  };
  const term = () => {
    let v = unary();
    while (peek() === "×" || peek() === "÷") {
      const op = tokens[i++];
      const r = unary();
      if (op === "÷" && r === 0) fail("不能除以零");
      v = op === "×" ? v * r : v / r;
    }
    return v;
  };
  const unary = () => {
    if (peek() === NEG) { i++; return -unary(); }
    return power();
  };
  const power = () => {
    const base = postfix();
    if (peek() === "^") {
      i++;
      const ex = unary(); // 右結合
      const r = Math.pow(base, ex);
      if (Number.isNaN(r)) fail("無法計算");
      return r;
    }
    return base;
  };
  const postfix = () => {
    let v = primary();
    while (POST.includes(peek())) {
      const p = tokens[i++];
      if (p === "²") v = v * v;
      else {
        if (!Number.isInteger(v) || v < 0 || v > 170) fail("階乘只能算 0～170 的整數");
        let f = 1;
        for (let k = 2; k <= v; k++) f *= k;
        v = f;
      }
    }
    return v;
  };
  const primary = () => {
    const t = tokens[i++];
    if (t === undefined) fail();
    if (t === "π") return Math.PI;
    if (t === "e") return Math.E;
    if (t === "(") { const v = expr(); if (tokens[i++] !== ")") fail(); return v; }
    if (isFuncTok(t)) { const v = expr(); if (tokens[i++] !== ")") fail(); return callFn(t.slice(0, -1), v); }
    const n = Number(t);
    if (Number.isNaN(n)) fail();
    return n;
  };

  const v = expr();
  if (i !== tokens.length) fail();
  if (!isFinite(v) || Math.abs(v) >= 1e15) throw new Error("數字太大");
  return clean(v);
}

// ---------- 組合可計算的 token ----------
// 去掉結尾的運算符/空括號，並自動補上沒關的括號
function fullTokens(s) {
  const t = [...s.tokens];
  if (s.cur !== "") t.push(s.cur.replace(/\.$/, ""));
  while (t.length && (OPS.includes(t[t.length - 1]) || t[t.length - 1] === NEG || isOpen(t[t.length - 1]))) t.pop();
  for (let d = depthOf(t); d > 0; d--) t.push(")");
  return t;
}

const fail = (s, msg) => Object.assign(s, { tokens: [], cur: "", done: false, info: null, error: msg, lastExpr: "" });

// 算式顯示用文字
export function tokensText(tokens) {
  return tokens
    .map((t) => (["+", "−", "×", "÷"].includes(t) ? ` ${t} ` : t === NEG ? "−" : isNum(t) ? fmt(t) : t))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}
export const exprText = (s) => tokensText([...s.tokens, ...(s.cur !== "" && !s.done ? [s.cur] : [])]);

// 即時預覽（輸入中、算式還沒按 = 時顯示在下方）
export function preview(s) {
  if (s.done || !s.tokens.length) return null;
  try {
    const t = fullTokens(s);
    if (!t.length || (t.length === 1 && isNum(t[0]))) return null;
    return numToStr(evaluate(t, s.deg));
  } catch { return null; }
}

// ---------- 輸入 ----------
function resetDone(s) { s.cur = ""; s.done = false; s.info = null; s.lastExpr = ""; }
function commitCur(s) {
  if (s.cur !== "") { s.tokens.push(s.cur.replace(/\.$/, "")); s.cur = ""; }
}
const last = (s) => s.tokens[s.tokens.length - 1];
// 前面已有「值」時，接著輸入數字/括號/函數要補乘號
function needMul(s) { return s.cur === "" && isValueEnd(last(s)); }

export function press(s, key) {
  s.error = ""; s.pushed = null;

  if (/^\d$/.test(key) || key === "00") {
    if (s.done) resetDone(s);
    if (needMul(s)) s.tokens.push("×");
    if (key === "00" && (s.cur === "" || s.cur === "0")) key = "0";
    if (s.cur === "0") s.cur = key === "0" ? "0" : key;
    else if (s.cur.replace(/[-.]/g, "").length + key.length <= MAX_DIGITS) s.cur += key;
    return s;
  }
  if (key === ".") {
    if (s.done) resetDone(s);
    if (needMul(s)) s.tokens.push("×");
    if (s.cur.includes(".")) return s;
    s.cur = s.cur === "" ? "0." : s.cur + ".";
    return s;
  }
  if (OPS.includes(key)) {
    s.done = false; s.info = null; s.lastExpr = "";
    if (s.cur !== "") { commitCur(s); s.tokens.push(key); return s; }
    const l = last(s);
    if (l === undefined || isOpen(l) || l === NEG) {
      if (key === "−") s.tokens.push(NEG); // 開頭或括號後的負號
      return s;
    }
    if (OPS.includes(l)) s.tokens[s.tokens.length - 1] = key;
    else s.tokens.push(key); // 接在 ) π e ² ! 後面
    return s;
  }
  if (key === "C") return Object.assign(s, newState(s.deg));
  if (key === "⌫") {
    if (s.done) return Object.assign(s, newState(s.deg));
    if (s.cur !== "") { s.cur = s.cur.slice(0, -1); if (s.cur === "-") s.cur = ""; return s; }
    if (!s.tokens.length) return s;
    const t = s.tokens.pop();
    if (isNum(t)) { s.cur = t.slice(0, -1); if (s.cur === "-") s.cur = ""; return s; }
    if (isNum(last(s))) s.cur = s.tokens.pop(); // 刪掉運算符後，把前一個數字拉回編輯
    return s;
  }
  if (key === "±") {
    if (s.cur !== "") { s.cur = s.cur.startsWith("-") ? s.cur.slice(1) : "-" + s.cur; if (s.cur === "-0") s.cur = "0"; return s; }
    const l = last(s);
    if (l === undefined || isOpen(l)) s.tokens.push(NEG);
    else if (l === NEG) s.tokens.pop();
    return s;
  }
  if (key === "()") {
    if (s.done) resetDone(s);
    const hasValue = s.cur !== "" || isValueEnd(last(s));
    if (hasValue && depthOf(s.tokens) > 0) { commitCur(s); s.tokens.push(")"); return s; }
    if (hasValue) { commitCur(s); s.tokens.push("×"); }
    s.tokens.push("(");
    return s;
  }
  if (key === "π" || key === "e") {
    if (s.done) resetDone(s);
    if (s.cur !== "") { commitCur(s); s.tokens.push("×"); } else if (needMul(s)) s.tokens.push("×");
    s.tokens.push(key);
    return s;
  }
  if (FUNCS.includes(key)) {
    const f = key + "(";
    if (s.done) { // 對上一個答案套用函數：sin(答案)
      const v = s.cur; resetDone(s); s.tokens = [f, v];
      return s;
    }
    if (s.cur !== "") { commitCur(s); s.tokens.push("×"); } else if (needMul(s)) s.tokens.push("×");
    s.tokens.push(f);
    return s;
  }
  if (key === "²" || key === "!") {
    if (s.done) { s.done = false; s.info = null; s.lastExpr = ""; }
    if (s.cur !== "") { commitCur(s); s.tokens.push(key); }
    else if (isValueEnd(last(s))) s.tokens.push(key);
    return s;
  }
  if (key === "%") {
    if (s.cur === "") return s;
    const n = Number(s.cur);
    const prevOp = s.tokens[s.tokens.length - 1];
    const before = s.tokens.slice(0, -1);
    if ((prevOp === "+" || prevOp === "−") && before.length && depthOf(before) === 0) {
      // 「100 + 10%」＝ 100 + 100 的 10% → 慣用手機算法
      try { s.cur = numToStr((evaluate(before, s.deg) * n) / 100); return s; } catch { /* 退回單純 /100 */ }
    }
    s.cur = numToStr(n / 100);
    return s;
  }
  if (key === "=") {
    const t = fullTokens(s);
    if (!t.length) return s;
    if (t.length === 1 && isNum(t[0])) { s.tokens = []; s.cur = t[0]; s.done = true; return s; }
    try {
      const r = evaluate(t, s.deg);
      s.lastExpr = tokensText(t) + " =";
      s.pushed = { expr: tokensText(t), res: numToStr(r) };
      s.tokens = []; s.cur = numToStr(r); s.done = true; s.info = null;
    } catch (e) { fail(s, e.message); }
    return s;
  }
  return s;
}

// 把歷史紀錄的結果放回算式
export function insertValue(s, str) {
  if (s.done) resetDone(s);
  if (s.cur !== "") return false;
  if (needMul(s)) s.tokens.push("×");
  s.cur = str;
  return true;
}

// 打折：pct 為實付百分比（8折=80、85折=85）。以目前整個算式結果當「原價」。
export function applyDiscount(s, pct) {
  const t = fullTokens(s);
  if (!t.length) return s;
  try {
    const orig = evaluate(t, s.deg);
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

// 小數 → 分數（連分數法）。整數或無法用 ≤ 1000 的分母精準表示則回傳 null。
export function toFraction(x, maxDen = 1000) {
  if (!isFinite(x) || Number.isInteger(x)) return null;
  const sign = x < 0 ? -1 : 1;
  const a = Math.abs(x);
  let h1 = 1, h0 = 0, k1 = 0, k0 = 1, b = a;
  for (let i = 0; i < 20; i++) {
    const ai = Math.floor(b);
    const h2 = ai * h1 + h0, k2 = ai * k1 + k0;
    if (k2 > maxDen) break;
    h0 = h1; h1 = h2; k0 = k1; k1 = k2;
    if (Math.abs(a - h1 / k1) < 1e-9 * Math.max(1, a)) return { n: sign * h1, d: k1 };
    if (b - ai < 1e-12) break;
    b = 1 / (b - ai);
  }
  return null;
}

// 分數文字：5/6、-3/4、1 1/2（帶分數）
export function fractionText(x) {
  const f = toFraction(x);
  if (!f) return null;
  const neg = f.n < 0, n = Math.abs(f.n);
  const whole = Math.floor(n / f.d), rem = n % f.d;
  const body = whole > 0 ? `${fmt(String(whole))} ${rem}/${f.d}` : `${rem}/${f.d}`;
  return (neg ? "-" : "") + body;
}

// 顯示用：加千分位，保留尾端小數點與 0
export function fmt(str) {
  if (str === "" || str == null) return "0";
  if (!/^-?[\d.]*$/.test(str)) return str;
  const neg = str.startsWith("-");
  const [i, d] = (neg ? str.slice(1) : str).split(".");
  const head = (i || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (neg ? "-" : "") + head + (d !== undefined ? "." + d : "");
}
