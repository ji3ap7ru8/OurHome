// 「大廳設定」視窗裡的兩張卡片：
//   顯示管理：列出已啟用的服務（順序同所有應用），開關決定大廳要不要顯示
//   大廳排序：只列出「大廳有顯示」的服務，點編號選新位置，或點編號選新位置；右邊的「>」設定該服務在大廳的顯示方式
// 資料規則在 core/lobby-model.js；改動時發出 lobby:change，由 cloud.js 存進雲端設定。
import { on, state } from "../core/store.js";
import { registerActions, registerChangeActions } from "../core/actions.js";
import { cardsApi } from "../services/cards/data.js";
import { memoApi } from "../services/memo/data.js";
import { appIcon, fixAppIcons } from "../core/app-icon.js";
import { lobbyCandidates, lobbyOrdered, isShown, setShown, moveLobby, resetLobbyOrder, modeOptions, getMode, setMode, lobbyCards, toggleLobbyCard } from "../core/lobby-model.js";

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (id) => document.getElementById(id);
const ROW = "flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 px-2.5 py-2";
const ARROW = "w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 flex items-center justify-center text-xs active:scale-95 disabled:opacity-30 disabled:active:scale-100 transition";
const MODAL = "fixed inset-0 z-[80] flex items-center justify-center p-6 bg-slate-900/40";
const NUM = "w-14 shrink-0 py-1.5 pl-2 pr-0 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-black text-center theme-text-primary";
const EXTERNAL = '<span class="text-[9px] font-bold bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full shrink-0">外部</span>';

let focusId = null; // 剛被移動的服務：重畫後捲到它的位置

export function mountLobbySettings() {
  registerActions({
    "lobby-toggle": (el) => setShown(el.dataset.id, !isShown(el.dataset.id)),
    "lobby-detail": (el) => openDetail(el.dataset.id),
    "lobby-detail-close": () => closeDetail(),
    "lobby-card-toggle": (el) => { toggleLobbyCard(el.dataset.cardId, cardList.map((c) => c.id)); paintCards(); },
    "lobby-mode-pick": (el) => { setMode(el.dataset.id, el.dataset.value); closeDetail(); },
    "lobby-order-reset": () => { if (confirm("要把大廳順序還原成跟「所有應用」相同嗎？")) resetLobbyOrder(); },
  });
  registerChangeActions({
    "lobby-order-num": (el) => { focusId = el.dataset.id; if (!moveLobby(el.dataset.id, el.value)) renderOrder(); },
  });
  on("lobby:change", renderAll);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDetail(); });
  on("apps:change", renderAll); // 啟用/停用、所有應用排序、插件改變 → 兩張卡片跟著更新
  renderAll();
}

function renderAll() {
  renderShow();
  renderOrder();
}

// 重畫時保留設定視窗的捲動位置
function keepScroll(box, draw) {
  const scroller = box.closest(".overflow-y-auto");
  const top = scroller?.scrollTop;
  draw();
  if (scroller && top != null) scroller.scrollTop = top;
}

function renderShow() {
  const box = $("lobbyShowList");
  if (!box) return;
  const list = lobbyCandidates();
  keepScroll(box, () => {
    box.innerHTML = list.length
      ? list.map((a) => {
          const on = isShown(a.id);
          return `
    <button type="button" role="switch" aria-checked="${on}" data-action="lobby-toggle" data-id="${esc(a.id)}" class="w-full text-left ${ROW} active:scale-[.98] transition">
      <span class="w-8 h-8 rounded-lg theme-bg-light overflow-hidden flex items-center justify-center shrink-0">${appIcon(a, "text-sm")}</span>
      <span class="flex-1 min-w-0 text-xs font-bold text-slate-700 dark:text-slate-200 truncate">${esc(a.name)}</span>
      ${a.plugin ? EXTERNAL : ""}
      <span class="relative inline-block w-9 h-5 rounded-full shrink-0 transition-colors ${on ? "theme-bg-primary" : "bg-slate-300 dark:bg-slate-600"}"><span class="absolute top-[2px] left-[2px] h-4 w-4 rounded-full bg-white transition-transform ${on ? "translate-x-4" : ""}"></span></span>
    </button>`;
        }).join("")
      : '<p class="text-[11px] text-slate-400 text-center py-3">目前沒有已啟用的服務，請先到「所有應用設定 → 管理應用」啟用。</p>';
    fixAppIcons(box);
  });
  const opened = list.filter((a) => isShown(a.id)).length;
  const sum = $("lobbyShowSummary");
  if (sum) sum.textContent = !list.length ? "尚無已啟用的服務" : opened ? `已開啟 ${opened} 個` : "全部關閉，開啟的才會顯示在大廳";
}

function renderOrder() {
  const box = $("lobbyOrderBox");
  if (!box) return;
  const list = lobbyOrdered();
  const n = list.length;
  keepScroll(box, () => {
    box.innerHTML = n
      ? `<p class="text-[10px] text-slate-400 leading-relaxed">只排「顯示管理」裡開啟的服務，點左邊的編號選新位置，其他服務會自動順延；右邊的「>」可設定該服務在大廳的顯示方式。</p>
    <div id="lobbyOrderList" class="space-y-1.5">${list.map((a, i) => `
      <div data-order-row="${esc(a.id)}" class="${ROW} py-1.5">
        <select data-change="lobby-order-num" data-id="${esc(a.id)}" aria-label="${esc(a.name)} 的編號" class="${NUM}">${list.map((_, k) => `<option value="${k + 1}"${k === i ? " selected" : ""}>${k + 1}</option>`).join("")}</select>
        <span class="w-8 h-8 rounded-lg theme-bg-light overflow-hidden flex items-center justify-center shrink-0">${appIcon(a, "text-sm")}</span>
        <span class="flex-1 min-w-0 text-xs font-bold text-slate-700 dark:text-slate-200 truncate">${esc(a.name)}</span>
        ${a.plugin ? EXTERNAL : ""}
        ${a.plugin ? "" : `<button type="button" data-action="lobby-detail" data-id="${esc(a.id)}" aria-label="${esc(a.name)} 的大廳顯示設定" class="${ARROW}"><i class="fa-solid fa-chevron-right"></i></button>`}
      </div>`).join("")}</div>
    ${state.lobby.order.length ? '<button type="button" data-action="lobby-order-reset" class="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 text-xs font-bold text-center active:scale-95 transition"><i class="fa-solid fa-rotate-left mr-1"></i>還原成跟「所有應用」相同</button>' : ""}`
      : '<p class="text-[11px] text-slate-400 text-center py-3">大廳目前沒有要顯示的服務，請先在「顯示管理」開啟。</p>';
    fixAppIcons(box);
    if (focusId) {
      [...box.querySelectorAll("[data-order-row]")].find((r) => r.dataset.orderRow === focusId)?.scrollIntoView({ block: "nearest" });
      focusId = null;
    }
  });
  const sum = $("lobbyOrderSummary");
  if (sum) sum.textContent = state.lobby.order.length ? "自訂順序" : "目前同「所有應用」的順序";
}

// 點「>」：小視窗選這個服務在大廳要怎麼顯示；沒有選項的服務先顯示「暫時沒有可設定的項目」
let cardList = []; // 生活圖卡視窗目前讀到的圖卡 [{ id, name }]
function closeDetail() { document.getElementById("lobbyDetail")?.remove(); cardList = []; }

const CHOICE = "w-full flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/40 px-3 py-2.5 text-left active:scale-[.98] transition";
const tick = (on) => `<i class="fa-solid ${on ? "fa-circle-check theme-text-primary" : "fa-circle text-slate-300 dark:text-slate-600"} text-sm shrink-0"></i>`;

// 生活圖卡：列出已新增的圖卡名稱，可多選要在大廳顯示哪幾張
function paintCards() {
  const body = document.getElementById("lobbyDetailBody");
  if (!body) return;
  const on = new Set(lobbyCards());
  body.innerHTML = cardList.length
    ? `<p class="text-[10px] text-slate-400">選擇大廳要顯示的圖卡（可多選）</p>
      <div class="space-y-1.5 max-h-[50vh] overflow-y-auto">${cardList.map((c) => `
      <button type="button" role="checkbox" aria-checked="${on.has(c.id)}" data-action="lobby-card-toggle" data-card-id="${esc(c.id)}" class="${CHOICE}">
        <span class="flex-1 min-w-0 text-sm font-bold text-slate-700 dark:text-slate-200 truncate">${esc(c.name || "（未命名）")}</span>${tick(on.has(c.id))}
      </button>`).join("")}</div>`
    : '<p class="text-[11px] text-slate-400 text-center py-3">還沒有新增任何圖卡，請先到「生活圖卡」新增。</p>';
}
async function loadCards() {
  const body = document.getElementById("lobbyDetailBody");
  if (body) body.innerHTML = '<p class="text-[11px] text-slate-400 text-center py-3">讀取圖卡中…</p>';
  try { cardList = (await cardsApi.list()).map((c) => ({ id: c.id, name: c.name })); }
  catch { cardList = []; if (document.getElementById("lobbyDetailBody")) document.getElementById("lobbyDetailBody").innerHTML = '<p class="text-[11px] text-slate-400 text-center py-3">讀取圖卡失敗，請確認已登入並連線。</p>'; return; }
  paintCards();
}

function openDetail(id) {
  const a = lobbyOrdered().find((x) => x.id === id);
  if (!a || a.plugin) return;
  closeDetail();
  const opts = modeOptions(id);
  const cur = getMode(id);
  const isCards = id === "生活圖卡";
  const choices = (list) => '<p class="text-[10px] text-slate-400">大廳要顯示哪些內容</p>' + list.map((o) => `
      <button type="button" data-action="lobby-mode-pick" data-id="${esc(id)}" data-value="${esc(o.value)}" class="${CHOICE}">
        <span class="flex-1 text-sm font-bold text-slate-700 dark:text-slate-200">${esc(o.label)}</span>${tick(o.value === cur)}
      </button>`).join("");
  const body = opts.length
    ? choices(opts)
    : isCards ? "" : '<p class="text-[11px] text-slate-400 text-center py-3">這個服務暫時沒有可設定的項目。</p>';
  const box = document.createElement("div");
  box.id = "lobbyDetail";
  box.className = MODAL;
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-label", `${a.name} 的大廳顯示設定`);
  box.innerHTML = `
    <div data-action="lobby-detail-close" class="absolute inset-0"></div>
    <div class="relative w-full max-w-xs rounded-2xl bg-white dark:bg-slate-800 p-4 space-y-2 soft-shadow-sm">
      <div class="flex items-center gap-2 pb-1">
        <span class="w-8 h-8 rounded-lg theme-bg-light overflow-hidden flex items-center justify-center shrink-0">${appIcon(a, "text-sm")}</span>
        <h3 class="flex-1 min-w-0 text-sm font-black text-slate-800 dark:text-slate-100 truncate">${esc(a.name)}</h3>
        <button type="button" data-action="lobby-detail-close" aria-label="關閉" class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div id="lobbyDetailBody" class="space-y-2">${body}</div>
    </div>`;
  document.body.appendChild(box);
  fixAppIcons(box);
  if (isCards) loadCards();
  if (id === "個人記事本") loadMemoChoices(opts, choices); // 補上目前有的每個分類
}

// 我的筆記：選項 = 全部、目前有的每個分類、釘選
async function loadMemoChoices(opts, choices) {
  let cats = [];
  try { cats = [...new Set((await memoApi.list()).map((m) => m.category).filter((c) => c && c !== "全部"))]; } catch { /* 讀不到就只列全部 / 釘選 */ }
  const cur = getMode("個人記事本");
  if (cur.startsWith("cat:") && !cats.includes(cur.slice(4))) cats.push(cur.slice(4)); // 目前選的分類（即使已沒有筆記）仍列出
  const body = document.getElementById("lobbyDetailBody");
  if (!body) return;
  const [all, pinned] = opts;
  body.innerHTML = choices([all, ...cats.map((c) => ({ value: "cat:" + c, label: c })), pinned]);
}
