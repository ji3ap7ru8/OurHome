// 實用計算機 — Stage 4：純前端 UI，運算邏輯在 engine.js。
// 訪客可用（不設 requiresLogin）。不寫入任何永久儲存，離開頁面即清除。
import { showTipHint, closeTips } from "../../core/tips.js";
import { newState, press, applyDiscount, foldToPct, foldLabel, fmt, exprText, OPS } from "./engine.js";

const QUICK_FOLDS = [90, 85, 80, 70, 50]; // 實付百分比：9折、85折、8折、7折、5折
const ROWS = [
  ["C", "⌫", "%", "÷"],
  ["7", "8", "9", "×"],
  ["4", "5", "6", "−"],
  ["1", "2", "3", "+"],
  ["0", "00", ".", "="],
];
const KEYMAP = { "*": "×", "/": "÷", "-": "−", Enter: "=", Backspace: "⌫", Escape: "C", ",": "." };

let root = null;
let s = newState();
let customOpen = false;
let onKey = null;

const fold$ = (n) => fmt(String(Math.round(n * 100) / 100));

function keyClass(k) {
  const base = "h-[3.6rem] rounded-2xl text-2xl font-black active:scale-95 transition select-none ";
  if (k === "=") return base + "theme-bg-primary text-white soft-shadow-md";
  if (OPS.includes(k)) return base + "theme-bg-light theme-text-primary";
  if (["C", "⌫", "%"].includes(k)) return base + "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-100";
  return base + "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 soft-shadow-sm";
}

const keyTip = (k) => (k === "C" ? "calc-clear" : k === "⌫" ? "calc-back" : k === "=" ? "calc-eq" : /^[\d.]+$/.test(k) ? "calc-key" : "calc-op");
const LABELS = { "⌫": "刪除一格", C: "全部清除", "=": "等於", "÷": "除", "×": "乘", "−": "減", "+": "加", "%": "百分比" };

function render() {
  const main = s.error ? s.error : fmt(s.cur !== "" ? s.cur : s.tokens.length ? s.tokens[s.tokens.length - 2] ?? "0" : "0");
  const expr = s.lastExpr || exprText(s);
  const info = s.info;

  root.innerHTML = `
    <div class="px-4 pt-2 pb-28">
      <h2 class="text-2xl font-black text-slate-800 dark:text-slate-100 mb-3 px-1"><i class="fa-solid fa-calculator theme-text-primary"></i> 計算機</h2>

      <div class="bg-white/95 dark:bg-slate-800/95 rounded-3xl soft-shadow-md px-5 py-4 mb-3 text-right" aria-live="polite">
        <div class="h-6 text-base font-semibold text-slate-400 dark:text-slate-500 truncate">${expr || "&nbsp;"}</div>
        <div class="font-black ${s.error ? "text-red-500 text-3xl" : "text-slate-900 dark:text-white"} break-all leading-tight" style="${s.error ? "" : `font-size:${main.length > 11 ? "2rem" : main.length > 8 ? "2.6rem" : "3.2rem"}`}">${main}</div>
        <div class="h-12 mt-1 text-sm font-bold ${info ? "" : "invisible"}">
          ${info ? `<span class="theme-text-primary">${fold$(info.orig)} 元 → ${foldLabel(info.pct)}</span>
            <span class="text-slate-500 dark:text-slate-400"> ＝ 應付 <b class="text-slate-800 dark:text-slate-100">${fold$(info.result)}</b> 元，省 <b class="text-rose-500">${fold$(info.saved)}</b> 元</span>` : "&nbsp;"}
        </div>
      </div>

      <div class="mb-3">
        <div class="flex items-center justify-between px-1 mb-1.5">
          <span class="text-sm font-extrabold text-slate-600 dark:text-slate-300"><i class="fa-solid fa-tags theme-text-primary"></i> 打折快算（先輸入原價）</span>
        </div>
        <div class="grid grid-cols-6 gap-2">
          ${QUICK_FOLDS.map((p) => `<button data-tip="calc-fold" data-tip-name="${foldLabel(p)}" data-fold="${p}" aria-label="打${foldLabel(p)}" class="h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 font-black text-base active:scale-95 transition">${foldLabel(p)}</button>`).join("")}
          <button data-tip="calc-fold-custom" data-fold-custom aria-label="自訂折數" class="h-12 rounded-xl border-2 border-dashed border-amber-400 text-amber-700 dark:text-amber-300 font-black text-base active:scale-95 transition">其他</button>
        </div>
        ${customOpen ? `
        <div class="mt-2 flex gap-2 items-center bg-white/90 dark:bg-slate-800/90 rounded-2xl p-2 soft-shadow-sm">
          <input data-fold-input type="number" inputmode="decimal" step="any" placeholder="輸入幾折，例如 6.5 或 65" class="flex-1 min-w-0 h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold text-base">
          <button data-tip="calc-fold-go" data-fold-go class="h-11 px-4 rounded-xl theme-bg-primary text-white font-black">套用</button>
        </div>
        <p data-fold-err class="text-sm font-bold text-red-500 mt-1 px-1 hidden">請輸入 1～100 之間的折數</p>` : ""}
      </div>

      <div class="grid grid-cols-4 gap-2.5">
        ${ROWS.flat().map((k) => `<button data-tip="${keyTip(k)}" data-tip-name="${LABELS[k] || k}" data-key="${k}" aria-label="${LABELS[k] || k}" class="${keyClass(k)}">${k}</button>`).join("")}
      </div>
    </div>`;
}

function handleKey(k) {
  press(s, k);
  render();
}

function handleFold(pct) {
  if (s.cur === "" && !s.tokens.length) return toast("請先輸入原價");
  applyDiscount(s, pct);
  customOpen = false;
  render();
}

function toast(msg) {
  const old = root.querySelector("[data-toast]");
  if (old) old.remove();
  const t = document.createElement("div");
  t.dataset.toast = "";
  t.className = "fixed left-1/2 -translate-x-1/2 bottom-28 z-[70] bg-slate-700 text-white font-bold px-4 py-2 rounded-xl";
  t.textContent = msg;
  root.appendChild(t);
  setTimeout(() => t.remove(), 1600);
}

function onClick(e) {
  const key = e.target.closest("[data-key]");
  if (key) return handleKey(key.dataset.key);
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
    customOpen = false;
    render();
    root.addEventListener("click", onClick);
    // 外接鍵盤支援（電腦預覽時方便；輸入框內不攔截）
    onKey = (e) => {
      if (e.target.closest?.("input, textarea") || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = KEYMAP[e.key] || e.key;
      if (/^\d$/.test(k) || [".", "+", "−", "×", "÷", "=", "⌫", "C", "%"].includes(k)) {
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
