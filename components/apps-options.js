// 所有應用頁的 ︙ 所有應用設定視窗：開關、展開動畫，以及三張卡片：
//   格式大小（state.appsView；登入後存 Google 雲端硬碟）
//   管理應用（列出所有應用，開關啟用/停用：state.apps.disabled；預設全部啟用）
//   排序方式（預設 / 名稱 / 自訂；自訂時用「編號」調整每個應用的位置：state.apps）
//   擴充插件（填標題＋貼網址即可新增，可選填圖示連結，之後可編輯；數量不限；新增的會出現在所有應用頁，也能參與自訂排序）
// 資料規則在 core/apps-model.js；改動時發出 apps:change，由 router 重畫所有應用頁、cloud.js 存進雲端設定。
import { appsOptionsTemplate } from "./apps-options.template.js";
import { on, emit, state } from "../core/store.js";
import { registerActions, registerChangeActions } from "../core/actions.js";
import { initAccordion, setAccordionOpen } from "../core/accordion.js";
import { showToast } from "../core/toast.js";
import { logout } from "../core/auth.js";
import { closeAppsOptions } from "../core/overlay.js";
import { fillAvatar } from "../core/avatar.js";
import { appIcon, fixAppIcons } from "../core/app-icon.js";
import { orderedApps, setSort, moveApp, stepApp, resetOrder, addPlugin, updatePlugin, removePlugin, pluginName, isEnabled, setEnabled, enableAll } from "../core/apps-model.js";

let wasOpen = false;
let armedId = null;   // 刪除插件的「再按一次」確認：目前待確認的插件 id
let armedTimer = null;
let editingId = null; // 正在編輯的插件 id（null＝新增模式）；編輯只在「擴充插件」卡片裡進行
let focusId = null;   // 剛被移動的應用：重畫後捲到它的位置
const BASE = "py-2 rounded-xl text-xs font-bold text-center border transition-all active:scale-95 ";
const SEL = "theme-border-primary theme-bg-light theme-text-primary";
const UNSEL = "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300";

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const SORT_ROWS = [
  { id: "default", icon: "fa-list-ol", title: "預設順序", note: "依系統排列，新增的插件接在後面" },
  { id: "name", icon: "fa-arrow-down-a-z", title: "名稱", note: "依名稱筆畫排列" },
  { id: "custom", icon: "fa-hand", title: "自訂排序", note: "自己訂編號，決定每個應用的位置" },
];

export function mountAppsOptions(mountEl) {
  mountEl.innerHTML = appsOptionsTemplate;
  initAccordion();
  registerActions({
    "apps-view": (el) => {
      const { key, value } = el.dataset;
      state.appsView[key] = key === "cols" ? Number(value) : value;
      renderFormat();
      emit("apps:view", { ...state.appsView });
    },
    "app-toggle": (el) => setEnabled(el.dataset.id, !isEnabled(el.dataset.id)),
    "apps-enable-all": () => { if (enableAll()) showToast("已全部啟用"); },
    "apps-sort": (el) => setSort(el.dataset.value),
    "apps-order-up": (el) => { focusId = el.dataset.id; stepApp(el.dataset.id, -1); },
    "apps-order-down": (el) => { focusId = el.dataset.id; stepApp(el.dataset.id, 1); },
    "apps-order-reset": () => { if (confirm("要把順序還原成預設嗎？")) resetOrder(); },
    "apps-logout": async () => { await logout(); closeAppsOptions(); }, // 登入按鈕沿用共用的 open-login-from-settings（叫出登入頁）
    "plugin-add": () => submitPlugin(),
    "plugin-remove": (el) => confirmRemove(el.dataset.id),
    "plugin-edit": (el) => startEdit(el.dataset.id),
    "plugin-cancel-edit": () => endEdit(),
  });
  registerChangeActions({
    "apps-order-num": (el) => { focusId = el.dataset.id; if (!moveApp(el.dataset.id, el.value)) renderSortArea(); },
  });
  // 標題欄 Enter → 網址欄；網址欄 Enter → 圖示連結欄；圖示連結欄 Enter → 新增／儲存（輸入法選字中的 Enter 不算）
  document.getElementById("pluginTitle")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); document.getElementById("pluginUrl")?.focus(); }
  });
  document.getElementById("pluginUrl")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); document.getElementById("pluginIcon")?.focus(); }
  });
  document.getElementById("pluginIcon")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); submitPlugin(); }
  });
  on("overlay:change", ({ apps }) => render(apps === "options"));
  on("theme:change", renderFormat); // 主色調改變時，選取中的按鈕跟著換色（theme-* 類別本身即時生效，這裡只是保險）
  on("apps:change", () => { renderFormat(); renderAll(); }); // 格式、排序、編號、插件改變（含登入後從雲端讀回來）
  on("auth:change", renderAccount);
  on("cloud:change", renderAccount); // 雲端硬碟狀態（同步中 / 已儲存 / 失敗）
  renderFormat();
  renderAll();
  renderAccount();
}

/* ---------- 格式大小 ---------- */
function renderFormat() {
  const v = state.appsView;
  document.querySelectorAll('#appsOptionsPage [data-action="apps-view"]').forEach((b) => {
    const on = String(v[b.dataset.key]) === b.dataset.value;
    b.className = BASE + (on ? SEL : UNSEL);
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
  const cols = document.getElementById("optCols");
  cols?.classList.toggle("opacity-40", v.mode === "list");
  cols?.classList.toggle("pointer-events-none", v.mode === "list");
}

/* ---------- 管理應用 ---------- */
function renderManage() {
  const box = document.getElementById("manageList");
  if (!box) return;
  const all = orderedApps(undefined, true); // 依目前排序方式列出全部（含停用）
  const off = all.filter((a) => !isEnabled(a.id)).length;
  box.innerHTML = all.map((a) => {
    const on = isEnabled(a.id);
    return `
    <button type="button" role="switch" aria-checked="${on}" data-action="app-toggle" data-id="${esc(a.id)}" class="w-full flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 px-2.5 py-2 text-left active:scale-[.98] transition ${on ? "" : "opacity-60"}">
      <span class="w-8 h-8 rounded-lg theme-bg-light overflow-hidden flex items-center justify-center shrink-0">${appIcon(a, "text-sm")}</span>
      <span class="flex-1 min-w-0 text-xs font-bold text-slate-700 dark:text-slate-200 truncate">${esc(a.name)}</span>
      ${a.plugin ? '<span class="text-[9px] font-bold bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full shrink-0">外部</span>' : ""}
      <span class="relative inline-block w-9 h-5 rounded-full shrink-0 transition-colors ${on ? "theme-bg-primary" : "bg-slate-300 dark:bg-slate-600"}"><span class="absolute top-[2px] left-[2px] h-4 w-4 rounded-full bg-white transition-transform ${on ? "translate-x-4" : ""}"></span></span>
    </button>`;
  }).join("");
  fixAppIcons(box);
  const sum = document.getElementById("manageSummary");
  if (sum) sum.textContent = off ? `已停用 ${off} 個，其餘啟用` : "全部啟用，可個別停用";
  document.getElementById("manageEnableAll")?.classList.toggle("hidden", !off);
}

/* ---------- 排序方式 + 自訂編號 ---------- */
function sortRow(r, on) {
  return `
    <button type="button" data-action="apps-sort" data-value="${r.id}" aria-pressed="${on}" class="w-full flex items-center justify-between rounded-xl px-3 py-2.5 border text-left active:scale-[.98] transition ${on ? "theme-border-primary theme-bg-light" : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40"}">
      <span class="flex items-center gap-3 min-w-0">
        <i class="fa-solid ${r.icon} text-sm w-4 text-center ${on ? "theme-text-primary" : "text-slate-400"}"></i>
        <span class="min-w-0">
          <span class="text-xs font-bold text-slate-700 dark:text-slate-200 block">${r.title}</span>
          <span class="text-[10px] text-slate-400 block">${r.note}</span>
        </span>
      </span>
      <i class="fa-solid ${on ? "fa-circle-check theme-text-primary" : "fa-circle text-slate-300 dark:text-slate-600"} text-sm shrink-0"></i>
    </button>`;
}

function orderEditor() {
  const list = orderedApps("custom");
  const n = list.length;
  const nums = Array.from({ length: n }, (_, i) => i + 1);
  const rows = list.map((a, i) => `
    <div data-order-row="${esc(a.id)}" class="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 px-2 py-1.5">
      <select data-change="apps-order-num" data-id="${esc(a.id)}" aria-label="${esc(a.name)} 的編號" class="w-14 shrink-0 py-1.5 pl-2 pr-0 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-black text-center theme-text-primary">
        ${nums.map((k) => `<option value="${k}"${k === i + 1 ? " selected" : ""}>${k}</option>`).join("")}
      </select>
      <span class="w-8 h-8 rounded-lg theme-bg-light overflow-hidden flex items-center justify-center shrink-0">${appIcon(a, "text-sm")}</span>
      <span class="flex-1 min-w-0 text-xs font-bold text-slate-700 dark:text-slate-200 truncate">${esc(a.name)}</span>
      ${a.plugin ? '<span class="text-[9px] font-bold bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full shrink-0">外部</span>' : ""}
      <button type="button" data-action="apps-order-up" data-id="${esc(a.id)}" ${i === 0 ? "disabled" : ""} aria-label="往前一位" class="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 flex items-center justify-center shrink-0 active:scale-90 transition ${i === 0 ? "opacity-30" : ""}"><i class="fa-solid fa-chevron-up text-xs"></i></button>
      <button type="button" data-action="apps-order-down" data-id="${esc(a.id)}" ${i === n - 1 ? "disabled" : ""} aria-label="往後一位" class="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 flex items-center justify-center shrink-0 active:scale-90 transition ${i === n - 1 ? "opacity-30" : ""}"><i class="fa-solid fa-chevron-down text-xs"></i></button>
    </div>`).join("");
  return `
    <div class="pt-1 space-y-2">
      <p class="text-[10px] text-slate-400 leading-relaxed">點左邊的編號選新位置，其他應用會自動順延；也可以用 ▲▼ 一格一格移。</p>
      <div id="orderList" class="space-y-1.5">${rows}</div>
      <button type="button" data-action="apps-order-reset" class="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 text-xs font-bold text-center active:scale-95 transition"><i class="fa-solid fa-rotate-left mr-1"></i>還原預設順序</button>
    </div>`;
}

function renderSortArea() {
  const box = document.getElementById("sortOptions");
  if (!box) return;
  const cur = state.apps.sort;
  const scroller = box.closest(".overflow-y-auto");
  const top = scroller?.scrollTop;
  box.innerHTML = `<div class="space-y-2">${SORT_ROWS.map((r) => sortRow(r, r.id === cur)).join("")}</div>` + (cur === "custom" ? orderEditor() : "");
  fixAppIcons(box);
  if (scroller && top != null) scroller.scrollTop = top;
  if (focusId) {
    const row = [...box.querySelectorAll("[data-order-row]")].find((r) => r.dataset.orderRow === focusId);
    row?.scrollIntoView({ block: "nearest" });
    focusId = null;
  }
}

/* ---------- 擴充插件 ---------- */
function renderPlugins() {
  const box = document.getElementById("pluginList");
  if (!box) return;
  const list = state.apps.plugins;
  if (editingId && !list.some((p) => p.id === editingId)) endEdit(); // 正在編輯的插件被刪掉（例如從雲端讀回來）→ 回到新增模式
  if (!list.length) {
    box.innerHTML = `
      <div class="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/30 px-4 py-5 text-center">
        <i class="fa-solid fa-puzzle-piece text-2xl text-slate-300 dark:text-slate-500"></i>
        <p class="text-xs font-bold text-slate-600 dark:text-slate-300 mt-2">還沒有擴充插件</p>
        <p class="text-[10px] text-slate-400 mt-1 leading-relaxed">貼上網址按「新增插件」，它就會出現在所有應用，點一下在新分頁開啟。</p>
      </div>`;
    return;
  }
  box.innerHTML = `
    <p class="text-[10px] font-bold text-slate-400">已新增 ${list.length} 個</p>` + list.map((p) => {
    const armed = armedId === p.id;
    const editing = editingId === p.id;
    return `
    <div class="flex items-center gap-2 rounded-xl border ${editing ? "theme-border-primary theme-bg-light" : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40"} px-2.5 py-2">
      <span class="w-8 h-8 rounded-lg theme-bg-light overflow-hidden flex items-center justify-center shrink-0">${appIcon({ icon: "fa-solid fa-puzzle-piece", iconUrl: p.iconUrl }, "text-sm")}</span>
      <span class="flex-1 min-w-0">
        <span class="text-xs font-bold text-slate-700 dark:text-slate-200 block truncate">${esc(p.name || pluginName(p.url))}</span>
        <span class="text-[10px] text-slate-400 block truncate">${esc(hostOf(p.url))}</span>
      </span>
      <button type="button" data-action="plugin-edit" data-id="${esc(p.id)}" aria-label="編輯這個插件" class="shrink-0 w-8 h-8 bg-white dark:bg-slate-700 border ${editing ? "theme-border-primary theme-text-primary" : "border-slate-200 dark:border-slate-600 text-slate-400 hover:text-slate-600"} rounded-lg flex items-center justify-center active:scale-90 transition"><i class="fa-solid fa-pen text-xs"></i></button>
      <button type="button" data-action="plugin-remove" data-id="${esc(p.id)}" aria-label="${armed ? "再按一次確定刪除" : "刪除這個插件"}" class="shrink-0 h-8 ${armed ? "px-3 bg-rose-500 text-white text-[11px] font-bold" : "w-8 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-rose-500"} rounded-lg flex items-center justify-center active:scale-90 transition">${armed ? "再按一次刪除" : '<i class="fa-solid fa-trash-can text-xs"></i>'}</button>
    </div>`;
  }).join("");
  fixAppIcons(box);
}

// 清單只顯示網域（完整網址太長不好看；點開插件時用完整網址）
const hostOf = (url) => { try { return new URL(url).host.replace(/^www\./i, ""); } catch { return ""; } };

const $f = () => ({ title: document.getElementById("pluginTitle"), url: document.getElementById("pluginUrl"), icon: document.getElementById("pluginIcon") });

// 新增 / 儲存變更 共用同一組欄位（編輯時欄位會帶入該插件的資料）
function submitPlugin() {
  const { title, url, icon } = $f();
  const r = editingId ? updatePlugin(editingId, title?.value, url?.value, icon?.value) : addPlugin(title?.value, url?.value, icon?.value);
  if (r.error) {
    showToast(r.error);
    (r.error.startsWith("請先輸入標題") ? title : r.error.startsWith("圖示") ? icon : url)?.focus();
    return;
  }
  const edited = !!editingId;
  endEdit();
  showToast(`${edited ? "已更新" : "已新增"}：${r.plugin.name}`);
}

function setEditUi(on, name = "") {
  const $ = (id) => document.getElementById(id);
  $("pluginEditNote")?.classList.toggle("hidden", !on);
  if ($("pluginEditNote")) $("pluginEditNote").textContent = on ? `編輯中：${name}（改完按「儲存變更」）` : "";
  $("pluginCancel")?.classList.toggle("hidden", !on);
  if ($("pluginSubmitText")) $("pluginSubmitText").textContent = on ? "儲存變更" : "新增插件";
  $("pluginSubmitIcon")?.classList.toggle("fa-plus", !on);
  $("pluginSubmitIcon")?.classList.toggle("fa-check", on);
}

function startEdit(id) {
  const p = state.apps.plugins.find((x) => x.id === id);
  if (!p) return;
  const { title, url, icon } = $f();
  editingId = id;
  title.value = p.name || "";
  url.value = p.url || "";
  icon.value = p.iconUrl || "";
  setEditUi(true, p.name || pluginName(p.url));
  renderPlugins();
  document.getElementById("pluginBox")?.scrollIntoView({ block: "nearest" });
  title.focus();
}

function endEdit() {
  const was = editingId;
  editingId = null;
  const { title, url, icon } = $f();
  if (title) title.value = "";
  if (url) url.value = "";
  if (icon) icon.value = "";
  setEditUi(false);
  if (was) renderPlugins();
}

// 防誤觸：3 秒內連按兩次才刪除（和計時器「取消」、碼表「歸零」一致）
function confirmRemove(id) {
  clearTimeout(armedTimer);
  if (armedId === id) {
    armedId = null;
    if (editingId === id) endEdit();
    removePlugin(id);
    return showToast("已移除插件");
  }
  armedId = id;
  armedTimer = setTimeout(() => { armedId = null; renderPlugins(); }, 3000);
  renderPlugins();
}

function renderAll() {
  renderManage();
  renderSortArea();
  renderPlugins();
}

/* ---------- 最底下：Google 帳號 ---------- */
function renderAccount() {
  const $ = (id) => document.getElementById(id);
  const loggedIn = state.isLoggedIn;
  $("appsLoginBtn")?.classList.toggle("hidden", loggedIn);
  $("appsUserBox")?.classList.toggle("hidden", !loggedIn);
  if (loggedIn) {
    fillAvatar($("appsAvatar"), state.account);
    $("appsUserName").textContent = state.account?.name || "已登入";
    $("appsUserEmail").textContent = state.account?.email || "";
  }
  const d = state.cloud.drive;
  const hint = !loggedIn ? "登入後，這裡的所有設定會自動存到你的 Google 雲端硬碟，換手機也會帶著走。"
    : d === "loading" ? "正在連線 Google 雲端硬碟…"
    : d === "error" ? (state.cloud.detail?.drive || "雲端硬碟連線失敗")
    : "這裡的所有設定會自動存到你的 Google 雲端硬碟" + (d === "ok" && state.cloud.detail?.drive ? "（" + state.cloud.detail.drive + "）" : "。");
  const h = $("appsDriveHint");
  if (h) { h.textContent = hint; h.classList.toggle("text-rose-500", loggedIn && d === "error"); h.classList.toggle("text-slate-400", !(loggedIn && d === "error")); }
}

function render(open) {
  const page = document.getElementById("appsOptionsPage");
  if (!page) return;
  page.classList.toggle("translate-x-0", open);
  page.classList.toggle("translate-x-full", !open);
  if (open && !wasOpen) setAccordionOpen("format", true); // 打開時先展開第一個
  wasOpen = open;
}
