// 菜單頁的 ︙ 菜單設定視窗：開關、展開動畫，以及兩張卡片 + 最底下的使用者 / 登出：
//   格式大小（state.menuView：瀏覽方式 菜單/清單、大小 大/中/小、每行 2/3 個）
//   排序方式（預設 / 名稱 / 自訂；自訂時用「編號」調整每張菜單的位置）
//   新增菜單（排序方式下方；新增、編輯、刪除菜單都只在這裡做，按下後關閉設定視窗並由 services/menu 開表單）
// 資料規則在 core/menu-model.js；改動時發出 menu:view / menu:change，由 services/menu 重畫、cloud.js 存進雲端設定。
import { menuOptionsTemplate } from "./menu-options.template.js";
import { on, emit, state } from "../core/store.js";
import { registerActions, registerChangeActions } from "../core/actions.js";
import { initAccordion, setAccordionOpen } from "../core/accordion.js";
import { logout } from "../core/auth.js";
import { closeAppsOptions } from "../core/overlay.js";
import { fillAvatar } from "../core/avatar.js";
import { orderedMenus, getMenuItems, setMenuView, setMenuSort, moveMenu, stepMenu, resetMenuOrder } from "../core/menu-model.js";

let wasOpen = false;
let delId = null; // 刪除要按兩次：第一次按下的那張菜單
let delTimer = null;
let focusId = null; // 剛被移動的菜單：重畫後捲到它的位置
const BASE = "py-2 rounded-xl text-xs font-bold text-center border transition-all active:scale-95 ";
const SEL = "theme-border-primary theme-bg-light theme-text-primary";
const UNSEL = "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300";
const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const SORT_ROWS = [
  { id: "default", icon: "fa-list-ol", title: "預設排序", note: "依建立先後排列" },
  { id: "name", icon: "fa-arrow-down-a-z", title: "名稱", note: "依名稱筆畫排列" },
  { id: "custom", icon: "fa-hand", title: "自訂排序", note: "自己訂編號，決定每張菜單的位置" },
];

export function mountMenuOptions(mountEl) {
  mountEl.innerHTML = menuOptionsTemplate;
  initAccordion();
  registerActions({
    "menu-add": () => { closeAppsOptions(); emit("menu:add"); }, // 關掉設定視窗，由 services/menu 開新增表單
    "menu-edit": (el) => { const id = el.dataset.id; closeAppsOptions(); emit("menu:edit", id); },
    "menu-del": (el) => {
      const id = el.dataset.id;
      clearTimeout(delTimer);
      if (delId === id) { delId = null; renderManage(); emit("menu:delete", id); return; }
      delId = id; renderManage();
      delTimer = setTimeout(() => { delId = null; renderManage(); }, 4000);
    },
    "menu-view": (el) => { setMenuView(el.dataset.key, el.dataset.value); renderFormat(); },
    "menu-sort": (el) => setMenuSort(el.dataset.value),
    "menu-order-up": (el) => { focusId = el.dataset.id; stepMenu(el.dataset.id, -1); },
    "menu-order-down": (el) => { focusId = el.dataset.id; stepMenu(el.dataset.id, 1); },
    "menu-order-reset": () => { if (confirm("要把順序還原成預設嗎？")) resetMenuOrder(); },
    "menu-logout": async () => { await logout(); closeAppsOptions(); }, // 登入按鈕沿用共用的 open-login-from-settings（叫出登入頁）
  });
  registerChangeActions({
    "menu-order-num": (el) => { focusId = el.dataset.id; if (!moveMenu(el.dataset.id, el.value)) renderSortArea(); },
  });
  on("overlay:change", ({ apps }) => render(apps === "menu"));
  on("theme:change", renderFormat);
  on("menu:view", renderFormat);
  on("menu:change", () => { renderSortArea(); renderManage(); });
  on("menu:items", () => { renderSortArea(); renderManage(); }); // 菜單新增 / 刪除 / 改名 / 登入後讀回來
  on("auth:change", renderAccount);
  on("cloud:change", renderAccount);
  renderFormat();
  renderSortArea();
  renderManage();
  renderAccount();
}

/* ---------- 格式大小 ---------- */
function renderFormat() {
  const v = state.menuView;
  document.querySelectorAll('#menuOptionsPage [data-action="menu-view"]').forEach((b) => {
    const sel = String(v[b.dataset.key]) === b.dataset.value;
    b.className = BASE + (sel ? SEL : UNSEL);
    b.setAttribute("aria-pressed", sel ? "true" : "false");
  });
  const cols = $("menuOptCols");
  cols?.classList.toggle("opacity-40", v.mode === "list");
  cols?.classList.toggle("pointer-events-none", v.mode === "list");
}

/* ---------- 排序方式 + 自訂編號 ---------- */
function sortRow(r, sel) {
  return `
    <button type="button" data-tip="cards-sort-${r.id}" data-action="menu-sort" data-value="${r.id}" aria-pressed="${sel}" class="w-full flex items-center justify-between rounded-xl px-3 py-2.5 border text-left active:scale-[.98] transition ${sel ? "theme-border-primary theme-bg-light" : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40"}">
      <span class="flex items-center gap-3 min-w-0">
        <i class="fa-solid ${r.icon} text-sm w-4 text-center ${sel ? "theme-text-primary" : "text-slate-400"}"></i>
        <span class="min-w-0">
          <span class="text-xs font-bold text-slate-700 dark:text-slate-200 block">${r.title}</span>
          <span class="text-[10px] text-slate-400 block">${r.note}</span>
        </span>
      </span>
      <i class="fa-solid ${sel ? "fa-circle-check theme-text-primary" : "fa-circle text-slate-300 dark:text-slate-600"} text-sm shrink-0"></i>
    </button>`;
}

function orderEditor() {
  const list = orderedMenus(getMenuItems(), "custom");
  const n = list.length;
  if (!n) return `<p class="text-[10px] text-slate-400 leading-relaxed pt-1">還沒有菜單可以排序。新增菜單後，這裡會出現每張菜單的編號。</p>`;
  const nums = Array.from({ length: n }, (_, i) => i + 1);
  const arrow = "w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 flex items-center justify-center shrink-0 active:scale-90 transition";
  const rows = list.map((c, i) => `
    <div data-order-row="${esc(c.id)}" class="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 px-2 py-1.5">
      <select data-tip="cards-order-num" data-change="menu-order-num" data-id="${esc(c.id)}" aria-label="${esc(c.name)} 的編號" class="w-14 shrink-0 py-1.5 pl-2 pr-0 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-black text-center theme-text-primary">
        ${nums.map((k) => `<option value="${k}"${k === i + 1 ? " selected" : ""}>${k}</option>`).join("")}
      </select>
      <span class="flex-1 min-w-0">
        <span class="text-xs font-bold text-slate-700 dark:text-slate-200 block truncate">${esc(c.name)}</span>
        <span class="text-[10px] text-slate-400 block truncate">${esc(c.kind)}</span>
      </span>
      <button type="button" data-tip="cards-order-up" data-action="menu-order-up" data-id="${esc(c.id)}" ${i === 0 ? "disabled" : ""} aria-label="往前一位" class="${arrow} ${i === 0 ? "opacity-30" : ""}"><i class="fa-solid fa-chevron-up text-xs"></i></button>
      <button type="button" data-tip="cards-order-down" data-action="menu-order-down" data-id="${esc(c.id)}" ${i === n - 1 ? "disabled" : ""} aria-label="往後一位" class="${arrow} ${i === n - 1 ? "opacity-30" : ""}"><i class="fa-solid fa-chevron-down text-xs"></i></button>
    </div>`).join("");
  return `
    <div class="pt-1 space-y-2">
      <p class="text-[10px] text-slate-400 leading-relaxed">點左邊的編號選新位置，其他菜單會自動順延；也可以用 ▲▼ 一格一格移。</p>
      <div class="space-y-1.5">${rows}</div>
      <button type="button" data-tip="cards-order-reset" data-action="menu-order-reset" class="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 text-xs font-bold text-center active:scale-95 transition"><i class="fa-solid fa-rotate-left mr-1"></i>還原預設順序</button>
    </div>`;
}

function renderSortArea() {
  const box = $("menuSortOptions");
  if (!box) return;
  const cur = state.menuSort.sort;
  const scroller = box.closest(".overflow-y-auto");
  const top = scroller?.scrollTop;
  box.innerHTML = `<div class="space-y-2">${SORT_ROWS.map((r) => sortRow(r, r.id === cur)).join("")}</div>` + (cur === "custom" ? orderEditor() : "");
  if (scroller && top != null) scroller.scrollTop = top;
  if (focusId) {
    const row = [...box.querySelectorAll("[data-order-row]")].find((r) => r.dataset.orderRow === focusId);
    row?.scrollIntoView({ block: "nearest" });
    focusId = null;
  }
}

/* ---------- 新增菜單：既有菜單的編輯 / 刪除 ---------- */
function renderManage() {
  const box = $("menuManageList");
  if (!box) return;
  const list = orderedMenus(getMenuItems(), state.menuSort.sort);
  if (delId && !list.some((c) => c.id === delId)) delId = null;
  if (!list.length) { box.innerHTML = `<p class="text-[10px] text-slate-400 leading-relaxed">還沒有菜單。按上面的「新增菜單」開始。</p>`; return; }
  const btn = "h-8 rounded-lg border flex items-center justify-center shrink-0 active:scale-90 transition ";
  box.innerHTML = list.map((c) => {
    const sure = c.id === delId;
    return `
    <div class="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 px-3 py-1.5">
      <span class="flex-1 min-w-0">
        <span class="text-xs font-bold text-slate-700 dark:text-slate-200 block truncate">${esc(c.name)}</span>
        <span class="text-[10px] text-slate-400 block truncate">${esc(c.kind)}</span>
      </span>
      <button type="button" data-tip="cards-edit" data-action="menu-edit" data-id="${esc(c.id)}" aria-label="編輯 ${esc(c.name)}" class="${btn} w-8 bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300"><i class="fa-solid fa-pen text-xs"></i></button>
      <button type="button" data-tip="cards-del" data-action="menu-del" data-id="${esc(c.id)}" aria-label="刪除 ${esc(c.name)}" class="${btn} ${sure ? "px-2 bg-rose-600 border-rose-600 text-white text-[10px] font-bold" : "w-8 bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-rose-500"}">${sure ? "再按一次刪除" : '<i class="fa-solid fa-trash text-xs"></i>'}</button>
    </div>`;
  }).join("");
}

/* ---------- 最底下：使用者 / 登出 ---------- */
function renderAccount() {
  const loggedIn = state.isLoggedIn;
  $("menuLoginBtn")?.classList.toggle("hidden", loggedIn);
  $("menuUserBox")?.classList.toggle("hidden", !loggedIn);
  if (loggedIn) {
    fillAvatar($("menuAvatar"), state.account);
    $("menuUserName").textContent = state.account?.name || "已登入";
    $("menuUserEmail").textContent = state.account?.email || "";
  }
  const d = state.cloud.drive;
  const hint = !loggedIn ? "登入後，這裡的設定會自動存到你的 Google 雲端硬碟，換手機也會帶著走。"
    : d === "loading" ? "正在連線 Google 雲端硬碟…"
    : d === "error" ? (state.cloud.detail?.drive || "雲端硬碟連線失敗")
    : "這裡的設定會自動存到你的 Google 雲端硬碟" + (d === "ok" && state.cloud.detail?.drive ? "（" + state.cloud.detail.drive + "）" : "。");
  const h = $("menuDriveHint");
  if (h) { h.textContent = hint; h.classList.toggle("text-rose-500", loggedIn && d === "error"); h.classList.toggle("text-slate-400", !(loggedIn && d === "error")); }
}

function render(open) {
  const page = $("menuOptionsPage");
  if (!page) return;
  page.classList.toggle("translate-x-0", open);
  page.classList.toggle("translate-x-full", !open);
  if (open && !wasOpen) setAccordionOpen("mformat", true); // 打開時先展開第一個
  wasOpen = open;
}
