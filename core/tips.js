// 操作提示說明：系統設定 > 個人化的開關（預設開）。
// 規則：開關開著時，「每次登入 / 重新進入網頁」後，第一次進入某個畫面就顯示該畫面的提示卡一次（同一次使用中再回來不重複）。
// 提示卡不擋操作（不變暗、不用按「下一步」）：浮在底部快捷列上方，一張卡列出 2~3 個重點，按「知道了」或 12 秒後自動消失。
// 用法（服務在 mount 時呼叫、unmount 時關閉）：
//   import { showTips, closeTips } from "../../core/tips.js";
//   showTips("notes", { title: "家庭公告小提示", items: ["…", "…"] });
import { state, emit, on } from "./store.js";

const STAY_MS = 12000;
let shown = new Set(); // 這次使用中已顯示過的畫面
let el = null, timer = null;

export const snapshotTips = () => state.tips !== false;

// 使用者在設定頁切換開關
export function setTips(v) {
  state.tips = !!v;
  if (!state.tips) closeTips();
  else shown.clear(); // 重新開啟：下次進入各畫面會再說明
  emit("tips:change", state.tips);
}

// 讀到雲端設定（舊設定檔沒有這欄 = 開啟）
export function applyTips(v) {
  state.tips = v !== false;
  emit("tips:change", state.tips);
}

export function closeTips() {
  clearTimeout(timer);
  const x = el; el = null;
  if (x) { x.style.opacity = "0"; setTimeout(() => x.remove(), 250); }
}

export function showTips(id, { title = "操作小提示", items = [] } = {}) {
  if (state.tips === false || shown.has(id) || !items.length) return;
  shown.add(id);
  closeTips();
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const box = document.createElement("div");
  box.setAttribute("role", "note");
  box.className = "fixed left-1/2 z-[60] w-[92vw] max-w-md -translate-x-1/2 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50 text-amber-950 shadow-xl px-4 py-3 transition-opacity duration-300";
  box.style.bottom = "calc(env(safe-area-inset-bottom, 0px) + 96px)";
  box.innerHTML = `<div class="flex items-center gap-2 mb-1.5"><i class="fa-regular fa-lightbulb text-amber-600"></i><span class="flex-1 text-sm font-black">${esc(title)}</span><button type="button" class="shrink-0 rounded-lg bg-amber-500 px-3 py-1 text-xs font-black text-white active:scale-95">知道了</button></div>
    <ul class="space-y-1 text-sm font-bold leading-snug">${items.map((t) => `<li class="flex gap-1.5"><span class="text-amber-500">•</span><span>${esc(t)}</span></li>`).join("")}</ul>`;
  box.querySelector("button").addEventListener("click", closeTips);
  document.body.appendChild(box);
  el = box;
  timer = setTimeout(closeTips, STAY_MS);
}

// 登入 / 登出：視為重新進入，各畫面的提示重新計算
on("auth:change", () => { shown.clear(); });
