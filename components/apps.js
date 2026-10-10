// 所有應用頁（路由 id 仍為「應用程式」，避免舊的雲端快捷設定失效）：呈現所有服務。
// 已實作者可進入，未實作者顯示「即將推出」。瀏覽方式/大小/每行數量由 state.appsView 決定（︙ 選項視窗可改）。
import { state } from "../core/store.js";
import { orderedApps } from "../core/apps-model.js";
import { appIcon, fixAppIcons } from "../core/app-icon.js";
import { showTipHint } from "../core/tips.js";

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// 圖卡大小：內距 / 圖示框 / 圖示 / 文字（「中」＝原本的樣子）
const CARD = {
  l: { pad: "py-8 px-2", box: "w-16 h-16", icon: "text-3xl", text: "text-lg", gap: "mb-3" },
  m: { pad: "py-6 px-2", box: "w-14 h-14", icon: "text-2xl", text: "text-base", gap: "mb-3" },
  s: { pad: "py-4 px-1", box: "w-11 h-11", icon: "text-lg", text: "text-sm", gap: "mb-2" },
};
// 清單大小：列高 / 圖示框 / 圖示 / 文字
const LIST = {
  l: { pad: "py-4 px-4", box: "w-14 h-14", icon: "text-2xl", text: "text-lg" },
  m: { pad: "py-3 px-4", box: "w-12 h-12", icon: "text-xl", text: "text-base" },
  s: { pad: "py-2 px-3", box: "w-9 h-9", icon: "text-base", text: "text-sm" },
};
const GRID_COLS = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" };

export function renderApps(el, services) {
  const { mode, size, cols } = state.appsView;
  const items = orderedApps(); // 內建服務 + 擴充插件，依「排序方式」排好
  const list = mode === "list";
  const c = (list ? LIST : CARD)[size] || (list ? LIST : CARD).m;
  const gap = list ? "gap-3" : cols >= 4 ? "gap-2" : cols === 3 ? "gap-3" : "gap-4";

  const html = items.map((f) => {
    const svc = f.plugin ? null : services.get(f.id);
    const locked = svc?.requiresLogin && !state.isLoggedIn;
    const badge = f.plugin ? "外部" : !svc ? "即將推出" : locked ? "需登入" : "";
    const dim = svc || f.plugin ? "" : "opacity-60";
    // 插件：直接開新分頁（noopener，不讓對方網頁控制本頁）；內建服務：走路由
    const open = f.plugin
      ? (cls, inner) => `<a href="${esc(f.url)}" target="_blank" rel="noopener noreferrer" title="${esc(f.url)}" data-tip="apps-plugin" class="${cls}">${inner}</a>`
      : (cls, inner) => `<button data-action="nav" data-feature="${esc(f.id)}" data-tip="apps-open" class="${cls}">${inner}</button>`;
    const name = esc(f.name);
    const icon = `<span class="${c.box} rounded-2xl theme-bg-light overflow-hidden flex items-center justify-center shrink-0 ${list ? "" : c.gap}">${appIcon(f, c.icon)}</span>`;
    if (list) {
      return open(`w-full bg-white/90 dark:bg-slate-800/90 rounded-2xl ${c.pad} flex items-center gap-4 soft-shadow-sm active:scale-[.98] transition text-left ${dim}`, `
        ${icon}
        <span class="flex-1 min-w-0 ${c.text} font-bold text-slate-800 dark:text-slate-100 truncate">${name}</span>
        ${badge ? `<span class="text-[0.65rem] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full shrink-0">${badge}</span>` : ""}
        <i class="fa-solid ${f.plugin ? "fa-arrow-up-right-from-square" : "fa-chevron-right"} text-xs text-slate-300 dark:text-slate-500 shrink-0"></i>`);
    }
    return open(`relative min-w-0 bg-white/90 dark:bg-slate-800/90 rounded-3xl ${c.pad} flex flex-col items-center soft-shadow-sm active:scale-95 transition ${dim}`, `
        ${badge ? `<span class="absolute top-1.5 right-1.5 text-[0.6rem] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full">${badge}</span>` : ""}
        ${icon}
        <span class="${c.text} font-bold leading-tight text-center text-slate-800 dark:text-slate-100 max-w-full ${f.plugin ? "break-all line-clamp-2" : ""}">${name}</span>`);
  }).join("");

  el.innerHTML = `
    <div class="px-5 pt-3 pb-6">
      <div class="${list ? "flex flex-col" : "grid " + (GRID_COLS[cols] || GRID_COLS[2])} ${gap}">${html}</div>
    </div>`;
  fixAppIcons(el); // 插件圖示連不上 → 換回預設圖示
  showTipHint("apps");
}
