// 值班表 — 目前只有樣式（範例資料），還沒有實際功能；之後再決定要排什麼班、怎麼提醒。
import { closeTips } from "../../core/tips.js";
import "./data.js"; // 登記資料集，「系統設定 → 儲存位置」才看得到它

let root = null;

const DAYS = [
  { d: "週一", who: "爸爸", tone: "sky" },
  { d: "週二", who: "媽媽", tone: "rose" },
  { d: "週三", who: "哥哥", tone: "emerald" },
  { d: "週四", who: "姊姊", tone: "amber" },
  { d: "週五", who: "爸爸", tone: "sky" },
  { d: "週六", who: "媽媽", tone: "rose" },
  { d: "週日", who: "全家", tone: "violet" },
];
const TONE = {
  sky: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200",
  rose: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200",
};

function render() {
  const rows = DAYS.map((x) => `
    <div class="flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-4 py-3 soft-shadow-sm">
      <span class="w-12 text-base font-black text-slate-700 dark:text-slate-200">${x.d}</span>
      <span class="flex-1 min-w-0"><span class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-black ${TONE[x.tone]}"><i class="fa-solid fa-user text-xs"></i>${x.who}</span></span>
      <i class="fa-solid fa-chevron-right text-xs text-slate-300 dark:text-slate-600"></i>
    </div>`).join("");
  root.innerHTML = `
    <div class="px-5 pt-3 pb-6 space-y-4">
      <div class="flex items-center gap-3">
        <span class="w-12 h-12 rounded-2xl theme-bg-light theme-text-primary flex items-center justify-center text-xl"><i class="fa-solid fa-calendar-check"></i></span>
        <div class="min-w-0">
          <h2 class="text-2xl font-black text-slate-800 dark:text-slate-100 leading-tight">值班表</h2>
          <p class="text-sm font-bold text-slate-500 dark:text-slate-400">本週輪值一覽</p>
        </div>
      </div>
      <div class="space-y-2">${rows}</div>
      <p class="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-center text-sm font-bold text-slate-500 dark:text-slate-400 py-3 px-4 leading-relaxed"><i class="fa-solid fa-hammer mr-1"></i>範例畫面，功能開發中</p>
    </div>`;
}

export default {
  id: "值班表",
  access: "public",
  mount(el) {
    root = document.createElement("div");
    root.className = "min-h-full";
    el.appendChild(root);
    render();
  },
  unmount() { closeTips(); root?.remove(); root = null; },
};
