// 帳密庫 — 目前只有樣式（範例資料），還沒有實際功能。
// 之後存放真實帳號密碼前，需要先決定存放位置與加密方式；現在畫面上的內容都是假的範例，不會儲存任何輸入。
import { closeTips } from "../../core/tips.js";
import "./data.js"; // 登記資料集，「系統設定 → 儲存位置」才看得到它

let root = null;

const SAMPLES = [
  { icon: "fa-building-columns", name: "網路銀行", user: "example_user", tone: "text-sky-600" },
  { icon: "fa-wifi", name: "家裡 Wi-Fi", user: "OurHome-5G", tone: "text-emerald-600" },
  { icon: "fa-cart-shopping", name: "購物網站", user: "name@example.com", tone: "text-amber-600" },
];

function render() {
  const rows = SAMPLES.map((x) => `
    <div class="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-4 py-3 soft-shadow-sm flex items-center gap-3">
      <span class="w-11 h-11 rounded-xl theme-bg-light flex items-center justify-center text-lg shrink-0 ${x.tone}"><i class="fa-solid ${x.icon}"></i></span>
      <span class="flex-1 min-w-0">
        <span class="block text-base font-black text-slate-800 dark:text-slate-100 truncate">${x.name}</span>
        <span class="block text-sm font-semibold text-slate-500 dark:text-slate-400 truncate">${x.user}</span>
        <span class="block text-sm font-black tracking-widest text-slate-400 dark:text-slate-500">••••••••</span>
      </span>
      <span class="flex flex-col gap-2 shrink-0 text-slate-400 dark:text-slate-500">
        <i class="fa-solid fa-eye w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm"></i>
        <i class="fa-regular fa-copy w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm"></i>
      </span>
    </div>`).join("");
  root.innerHTML = `
    <div class="px-5 pt-3 pb-6 space-y-4">
      <div class="flex items-center gap-3">
        <span class="w-12 h-12 rounded-2xl theme-bg-light theme-text-primary flex items-center justify-center text-xl"><i class="fa-solid fa-key"></i></span>
        <div class="min-w-0">
          <h2 class="text-2xl font-black text-slate-800 dark:text-slate-100 leading-tight">帳密庫</h2>
          <p class="text-sm font-bold text-slate-500 dark:text-slate-400">家人共用的帳號與密碼</p>
        </div>
      </div>
      <div class="flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-4 py-3 text-slate-400 dark:text-slate-500 font-bold text-sm"><i class="fa-solid fa-magnifying-glass"></i><span>搜尋名稱…</span></div>
      <div class="space-y-2">${rows}</div>
      <p class="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-center text-sm font-bold text-slate-500 dark:text-slate-400 py-3 px-4 leading-relaxed"><i class="fa-solid fa-hammer mr-1"></i>範例畫面，功能開發中<br><span class="text-xs font-semibold">上面都是假資料，請先不要輸入真實密碼</span></p>
    </div>`;
}

export default {
  id: "帳密庫",
  access: "public",
  requiresLogin: true, // 帳密屬於敏感資料：訪客不可用
  mount(el) {
    root = document.createElement("div");
    root.className = "min-h-full";
    el.appendChild(root);
    render();
  },
  unmount() { closeTips(); root?.remove(); root = null; },
};
