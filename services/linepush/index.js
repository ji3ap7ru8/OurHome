// LINE推播 — 做出圖卡，再用 LINE Bot 發送通知。
// 目前只有空白頁（內部功能尚未開發）；預設關閉，要到 ︙ 所有應用設定 → 管理應用 開啟後才會出現在所有應用。
import { closeTips } from "../../core/tips.js";

let root = null;

function render() {
  root.innerHTML = `
    <div class="px-5 pt-3 pb-6 space-y-4">
      <div class="flex items-center gap-3">
        <span class="w-12 h-12 rounded-2xl theme-bg-light theme-text-primary flex items-center justify-center text-xl"><i class="fa-brands fa-line"></i></span>
        <div class="min-w-0">
          <h2 class="text-2xl font-black text-slate-800 dark:text-slate-100 leading-tight">LINE推播</h2>
          <p class="text-sm font-bold text-slate-500 dark:text-slate-400">製作圖卡，發送 LINE Bot 通知</p>
        </div>
      </div>
      <p class="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-center text-sm font-bold text-slate-500 dark:text-slate-400 py-3 px-4 leading-relaxed"><i class="fa-solid fa-hammer mr-1"></i>功能開發中</p>
    </div>`;
}

export default {
  id: "LINE推播",
  access: "public",
  mount(el) {
    root = document.createElement("div");
    root.className = "min-h-full";
    el.appendChild(root);
    render();
  },
  unmount() { closeTips(); root?.remove(); root = null; },
};
