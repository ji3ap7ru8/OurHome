// 實用計算機 — 三星計算機式排版：上方顯示區、工具列（歷史／科學／折扣／分數／刪除）、下方 4 欄按鍵。
// 運算邏輯在 engine.js。訪客可用（不設 requiresLogin）。
// 歷史紀錄只存在記憶體（重新整理網頁即清除），不寫入任何永久儲存。
import { showTipHint, closeTips } from "../../core/tips.js";
import { newState, press, applyDiscount, foldToPct, foldLabel, fmt, exprText, preview, fractionText, insertValue, OPS } from "./engine.js";
import { showToast } from "../../core/toast.js";

const QUICK_FOLDS = [90, 85, 80, 70, 50]; // 實付百分比：9折、85折、8折、7折、5折
const MAIN = [
  ["C", "()", "%", "÷"],
  ["7", "8", "9", "×"],
  ["4", "5", "6", "−"],
  ["1", "2", "3", "+"],
  ["±", "0", ".", "="],
];
// 科學面板（4 欄，與主鍵盤對齊）。key 是引擎用的代號，label 是畫面文字
const SCI = [
  { k: "sin", l: "sin" }, { k: "cos", l: "cos" }, { k: "tan", l: "tan" }, { k: "deg", l: "DEG" },
  { k: "log", l: "log" }, { k: "ln", l: "ln" }, { k: "√", l: "√" }, { k: "π", l: "π" },
  { k: "²", l: "x²" }, { k: "^", l: "xʸ" }, { k: "!", l: "x!" }, { k: "e", l: "e" },
];
const KEYMAP = { "*": "×", "/": "÷", "-": "−", Enter: "=", Backspace: "⌫", Escape: "C", ",": ".", "(": "()", ")": "()", "^": "^", "!": "!" };
const KEYS_OK = [".", "+", "−", "×", "÷", "=", "⌫", "C", "%", "()", "^", "!"];
const LABELS = {
  C: "全部清除", "()": "括號", "%": "百分比", "÷": "除", "×": "乘", "−": "減", "+": "加", "=": "等於", "±": "正負號",
  sin: "正弦 sin", cos: "餘弦 cos", tan: "正切 tan", log: "常用對數 log", ln: "自然對數 ln", "√": "開根號",
  "π": "圓周率 π", e: "自然常數 e", "²": "平方", "^": "次方", "!": "階乘",
};
const HISTORY_MAX = 30;

let root = null;
let s = newState();
let panel = ""; // "" | "hist" | "sci" | "disc"
let customOpen = false;
let fracMode = false;
let history = []; // { expr, res }
let onKey = null;

const fold$ = (n) => fmt(String(Math.round(n * 100) / 100));
const toast = (msg) => showToast(msg, 1600, { pos: "bottom" });

// 數值顯示：分數模式下，能換成分數就用分數
const showNum = (str) => {
  if (fracMode && /^-?\d*\.?\d+$/.test(str)) {
    const f = fractionText(Number(str));
    if (f) return f;
  }
  return fmt(str);
};

function keyClass(k) {
  if (k === "=") return "ck ck-eq";
  if (OPS.includes(k)) return "ck ck-op";
  if (["C", "()", "%", "±"].includes(k)) return "ck ck-fn";
  return "ck ck-num";
}
const keyTip = (k) => (k === "C" ? "calc-clear" : k === "=" ? "calc-eq" : /^[\d.]$/.test(k) ? "calc-key" : "calc-op");

function toolBtn(id, icon, label, on) {
  return `<button data-tool="${id}" data-tip="calc-tool-${id}" data-tip-name="${label}" aria-label="${label}" aria-pressed="${on}" class="ct${on ? " ct-on" : ""}"><i class="fa-solid ${icon}"></i><span>${label}</span></button>`;
}

function renderDisplay() {
  const prev = preview(s);
  let above = "";
  let big;
  if (s.error) big = `<span class="text-red-500 text-3xl">${s.error}</span>`;
  else if (s.done) {
    above = s.lastExpr;
    big = showNum(s.cur);
  } else big = exprText(s) || "0";
  const len = String(big).replace(/<[^>]+>/g, "").length;
  const size = s.error ? "" : len > 26 ? "1.5rem" : len > 16 ? "2rem" : len > 10 ? "2.6rem" : "3.2rem";
  const info = s.info;
  const sub = info
    ? `<span class="theme-text-primary">${fold$(info.orig)} 元 → ${foldLabel(info.pct)}</span> <span class="text-slate-500 dark:text-slate-400">＝ 應付 <b class="text-slate-800 dark:text-slate-100">${fold$(info.result)}</b> 元，省 <b class="text-rose-500">${fold$(info.saved)}</b> 元</span>`
    : prev != null ? `<span class="text-slate-500 dark:text-slate-400">＝ ${showNum(prev)}</span>` : "";
  return `
      <div class="calc-screen bg-white/95 dark:bg-slate-800/95 rounded-3xl soft-shadow-md px-5 py-3 mb-3 text-right" aria-live="polite">
        <div class="h-6 text-base font-semibold text-slate-400 dark:text-slate-500 truncate">${above || "&nbsp;"}</div>
        <div class="calc-main font-black text-slate-900 dark:text-white break-all leading-tight" style="${size ? `font-size:${size}` : ""}">${big}</div>
        <div class="h-7 mt-1 text-sm font-bold">${sub || "&nbsp;"}</div>
      </div>`;
}

function renderPanel() {
  if (panel === "sci") {
    return `<div class="grid grid-cols-4 gap-2 mb-3">${SCI.map(({ k, l }) => {
      const isDeg = k === "deg";
      const label = isDeg ? (s.deg ? "DEG" : "RAD") : l;
      const tip = isDeg ? "calc-deg" : "calc-op";
      const name = isDeg ? (s.deg ? "角度（度）" : "角度（弧度）") : LABELS[k] || l;
      return `<button data-tip="${tip}" data-tip-name="${name}" data-sci="${k}" aria-label="${name}" class="ck ck-sci${isDeg ? " ck-sci-mode" : ""}">${label}</button>`;
    }).join("")}</div>`;
  }
  if (panel === "disc") {
    return `<div class="mb-3">
        <div class="px-1 mb-1.5 text-sm font-extrabold text-slate-600 dark:text-slate-300"><i class="fa-solid fa-tags theme-text-primary"></i> 打折快算（先輸入原價）</div>
        <div class="grid grid-cols-6 gap-2">
          ${QUICK_FOLDS.map((p) => `<button data-tip="calc-fold" data-tip-name="${foldLabel(p)}" data-fold="${p}" aria-label="打${foldLabel(p)}" class="ck ck-fold">${foldLabel(p)}</button>`).join("")}
          <button data-tip="calc-fold-custom" data-fold-custom aria-label="自訂折數" class="ck ck-fold ck-fold-dash">其他</button>
        </div>
        ${customOpen ? `
        <div class="mt-2 flex gap-2 items-center bg-white/90 dark:bg-slate-800/90 rounded-2xl p-2 soft-shadow-sm">
          <input data-fold-input type="number" inputmode="decimal" step="any" placeholder="輸入幾折，例如 6.5 或 65" class="flex-1 min-w-0 h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold text-base">
          <button data-tip="calc-fold-go" data-fold-go class="h-11 px-4 rounded-xl theme-bg-primary text-white font-black">套用</button>
        </div>
        <p data-fold-err class="text-sm font-bold text-red-500 mt-1 px-1 hidden">請輸入 1～100 之間的折數</p>` : ""}
      </div>`;
  }
  if (panel === "hist") {
    const items = history.length
      ? history.map((h, i) => `<button data-hist="${i}" class="hist-item"><span class="hist-expr">${h.expr}</span><b class="hist-res">${fmt(h.res)}</b></button>`).join("")
      : `<p class="text-center text-sm font-bold text-slate-400 py-5">還沒有紀錄，按 = 算出答案後會出現在這裡</p>`;
    return `<div class="mb-3 bg-white/90 dark:bg-slate-800/90 rounded-2xl soft-shadow-sm p-2">
        <div class="flex items-center justify-between px-2 pb-1">
          <span class="text-sm font-extrabold text-slate-600 dark:text-slate-300">計算紀錄（點一筆可帶回答案）</span>
          ${history.length ? `<button data-tip="calc-hist-clear" data-hist-clear class="text-sm font-black text-rose-500 px-2 py-1">清除</button>` : ""}
        </div>
        <div class="hist-list">${items}</div>
      </div>`;
  }
  return "";
}

function render() {
  root.innerHTML = `
    <div class="px-4 pt-2 pb-28">
      ${renderDisplay()}
      <div class="flex items-center gap-2 mb-3">
        ${toolBtn("hist", "fa-clock-rotate-left", "紀錄", panel === "hist")}
        ${toolBtn("sci", "fa-square-root-variable", "科學", panel === "sci")}
        ${toolBtn("disc", "fa-tags", "折扣", panel === "disc")}
        ${toolBtn("frac", "fa-divide", "分數", fracMode)}
        <button data-key="⌫" data-tip="calc-back" data-tip-name="刪除一格" aria-label="刪除一格" class="ct ct-back ml-auto"><i class="fa-solid fa-delete-left"></i></button>
      </div>
      ${renderPanel()}
      <div class="grid grid-cols-4 gap-2.5">
        ${MAIN.flat().map((k) => `<button data-tip="${keyTip(k)}" data-tip-name="${LABELS[k] || k}" data-key="${k}" aria-label="${LABELS[k] || k}" class="${keyClass(k)}">${k === "()" ? "( )" : k === "±" ? "+/−" : k}</button>`).join("")}
      </div>
    </div>`;
}

function handleKey(k) {
  press(s, k);
  if (s.pushed) {
    history.unshift(s.pushed);
    if (history.length > HISTORY_MAX) history.pop();
  }
  render();
}

function handleFold(pct) {
  if (s.cur === "" && !s.tokens.length) return toast("請先輸入原價");
  applyDiscount(s, pct);
  customOpen = false;
  render();
}

function onClick(e) {
  const key = e.target.closest("[data-key]");
  if (key) return handleKey(key.dataset.key);
  const sci = e.target.closest("[data-sci]");
  if (sci) {
    if (sci.dataset.sci === "deg") { s.deg = !s.deg; return render(); }
    return handleKey(sci.dataset.sci);
  }
  const tool = e.target.closest("[data-tool]");
  if (tool) {
    const id = tool.dataset.tool;
    if (id === "frac") {
      fracMode = !fracMode;
      toast(fracMode ? "分數模式：答案能換成分數就顯示分數" : "已關閉分數模式");
    } else {
      panel = panel === id ? "" : id;
      customOpen = false;
    }
    return render();
  }
  const hist = e.target.closest("[data-hist]");
  if (hist) {
    const h = history[Number(hist.dataset.hist)];
    if (h) {
      if (!insertValue(s, h.res)) toast("請先輸入運算符號，再帶回答案");
      else panel = "";
    }
    return render();
  }
  if (e.target.closest("[data-hist-clear]")) { history = []; return render(); }
  const fold = e.target.closest("[data-fold]");
  if (fold) return handleFold(Number(fold.dataset.fold));
  if (e.target.closest("[data-fold-custom]")) {
    customOpen = !customOpen;
    render();
    root.querySelector("[data-fold-input]")?.focus();
    return;
  }
  if (e.target.closest("[data-fold-go]")) {
    const input = root.querySelector("[data-fold-input]");
    const pct = foldToPct(input.value);
    if (pct == null) return root.querySelector("[data-fold-err]").classList.remove("hidden");
    handleFold(pct);
  }
}

export default {
  id: "計算機",
  access: "public",
  mount(el) {
    root = el;
    showTipHint("calculator");
    s = newState();
    panel = "";
    customOpen = false;
    render();
    root.addEventListener("click", onClick);
    // 外接鍵盤支援（電腦預覽時方便；輸入框內不攔截）
    onKey = (e) => {
      if (e.target.closest?.("input, textarea") || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = KEYMAP[e.key] || e.key;
      if (/^\d$/.test(k) || KEYS_OK.includes(k)) {
        e.preventDefault();
        handleKey(k);
      }
    };
    document.addEventListener("keydown", onKey);
  },
  unmount() {
    closeTips();
    document.removeEventListener("keydown", onKey);
    root?.removeEventListener("click", onClick);
    onKey = null;
    root = null;
    s = newState();
  },
};
