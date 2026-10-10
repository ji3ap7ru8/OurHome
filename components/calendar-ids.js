// 家庭日曆的 ︙ ID設定視窗：開關、新增 / 刪除 Google 日曆 ID。資料規則在 core/calendar-ids.js；
// 改動時發出 calendarids:change，由 core/cloud.js 存進 Google 雲端硬碟（系統設定）。
import { calendarIdsTemplate } from "./calendar-ids.template.js";
import { on, state } from "../core/store.js";
import { registerActions } from "../core/actions.js";
import { showToast } from "../core/toast.js";
import { addCalendarId, removeCalendarId } from "../core/calendar-ids.js";

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let armedId = null; // 刪除的「再按一次」確認：目前待確認的項目 id
let armedTimer = null;

export function mountCalendarIds(mountEl) {
  mountEl.innerHTML = calendarIdsTemplate;
  registerActions({
    "calid-add": () => submit(),
    "calid-remove": (el) => confirmRemove(el.dataset.id),
  });
  // 名稱欄按 Enter → 跳到 ID 欄；ID 欄按 Enter → 新增（輸入法選字中的 Enter 不算）
  $("calIdName")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); $("calIdValue")?.focus(); }
  });
  $("calIdValue")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); submit(); }
  });
  on("overlay:change", ({ apps }) => {
    const page = $("calendarIdPage");
    if (!page) return;
    const open = apps === "calendarId";
    page.classList.toggle("translate-x-0", open);
    page.classList.toggle("translate-x-full", !open);
  });
  on("calendarids:change", renderList);
  on("auth:change", renderHint);
  on("cloud:change", renderHint);
  renderList();
  renderHint();
}

function renderList() {
  const box = $("calendarIdList");
  if (!box) return;
  const list = state.calendarIds;
  if (!list.length) {
    box.innerHTML = `
      <div class="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/30 px-4 py-5 text-center">
        <i class="fa-solid fa-calendar-plus text-2xl text-slate-300 dark:text-slate-500"></i>
        <p class="text-xs font-bold text-slate-600 dark:text-slate-300 mt-2">還沒有日曆 ID</p>
        <p class="text-[10px] text-slate-400 mt-1 leading-relaxed">輸入 Google 日曆 ID 按「新增日曆 ID」，可以一直新增。</p>
      </div>`;
    return;
  }
  box.innerHTML = `<p class="text-[10px] font-bold text-slate-400">已新增 ${list.length} 個</p>` + list.map((x) => {
    const armed = armedId === x.id;
    return `
    <div class="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 px-2.5 py-2">
      <span class="w-8 h-8 rounded-lg theme-bg-light flex items-center justify-center shrink-0"><i class="fa-solid fa-calendar-days text-sm theme-text-primary"></i></span>
      <span class="flex-1 min-w-0">
        ${x.name ? `<span class="text-xs font-bold text-slate-700 dark:text-slate-200 block truncate">${esc(x.name)}</span>` : ""}
        <span class="${x.name ? "text-[10px] text-slate-400" : "text-xs font-bold text-slate-700 dark:text-slate-200"} block truncate select-text">${esc(x.calId)}</span>
      </span>
      <button type="button" data-action="calid-remove" data-id="${esc(x.id)}" aria-label="${armed ? "再按一次確定刪除" : "刪除這個日曆 ID"}" class="shrink-0 h-8 ${armed ? "px-3 bg-rose-500 text-white text-[11px] font-bold" : "w-8 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-rose-500"} rounded-lg flex items-center justify-center active:scale-90 transition">${armed ? "再按一次刪除" : '<i class="fa-solid fa-trash-can text-xs"></i>'}</button>
    </div>`;
  }).join("");
}

function submit() {
  const name = $("calIdName");
  const val = $("calIdValue");
  const r = addCalendarId(name?.value, val?.value);
  if (r.error) { showToast(r.error); val?.focus(); return; }
  name.value = "";
  val.value = "";
  showToast(`已新增：${r.item.name || r.item.calId}`);
}

// 防誤觸：3 秒內連按兩次才刪除
function confirmRemove(id) {
  clearTimeout(armedTimer);
  if (armedId === id) {
    armedId = null;
    removeCalendarId(id);
    return showToast("已移除日曆 ID");
  }
  armedId = id;
  armedTimer = setTimeout(() => { armedId = null; renderList(); }, 3000);
  renderList();
}

function renderHint() {
  const loggedIn = state.isLoggedIn;
  $("calIdLoginBtn")?.classList.toggle("hidden", loggedIn);
  const d = state.cloud.drive;
  const hint = !loggedIn ? "登入後，這裡的設定會自動存到你的 Google 雲端硬碟，換手機也會帶著走。未登入時只暫存在這個畫面。"
    : d === "loading" ? "正在連線 Google 雲端硬碟…"
    : d === "error" ? (state.cloud.detail?.drive || "雲端硬碟連線失敗")
    : "這裡的設定會自動存到你的 Google 雲端硬碟" + (d === "ok" && state.cloud.detail?.drive ? "（" + state.cloud.detail.drive + "）" : "。");
  const h = $("calIdDriveHint");
  if (h) { h.textContent = hint; h.classList.toggle("text-rose-500", loggedIn && d === "error"); h.classList.toggle("text-slate-400", !(loggedIn && d === "error")); }
}
