// 家庭日曆 — Stage 3：純前端 UI 與邏輯，資料來自 data.js 的 calendarApi（記憶體 Mock）。
// 訪客可正常使用（計劃案第三節），因此不設 requiresLogin。
import { COLOR_LIST, COLOR_MAP, DEFAULT_COLOR, WEEKDAYS, calendarApi, toLocalStr } from "./data.js";
import { state, on } from "../../core/store.js";
import { gcalApi } from "../../core/gcal.js";
import { attachSheetResize } from "../../components/bottom-sheet.js";
import { showTipHint, closeTips } from "../../core/tips.js";

let root = null;
let cur1 = new Date();       // 目前顯示的月份（mount 時會重設為本月 1 日）
let events = [];               // 目前這個月的行程
let offCal = null;
let offApi = null;
let cache = {};                // key: "年-月"
let reqSeq = 0;                // 避免連點換月時舊回應蓋掉新畫面
let loading = false;
let detailDate = "";           // "YYYY-MM-DD"
let source = "local";          // 目前顯示的日曆："local" 家庭日曆（App 內）/ "all" 全部合併 / 某個 Google 日曆的內部編號（只存記憶體，離開頁面也記得）
let offIds = null;
let offToday = null;
let docClose = null;
const modals = new Set();        // 開著的視窗（離開頁面時一併關閉）
const TTL = 120000;            // Google 日曆資料快取 2 分鐘，之後切換月份會重新讀取
const PALETTE = ["#039BE5", "#33B679", "#8E24AA", "#F4511E", "#F6BF26", "#3F51B5", "#E67C73", "#0B8043"]; // 各 Google 日曆的代表色

const MONTH_EN = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safeUrl = (u) => (/^https?:\/\//i.test(u || "") ? u : "");
const pad = (n) => String(n).padStart(2, "0");
const dKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const sameDay = (a, b) => a.toDateString() === b.toDateString();
const dayDiff = (a, b) => Math.round((startOfDay(a) - startOfDay(b)) / 864e5); // 以日曆日計算，不受夏令時間影響
const color = (e) => COLOR_MAP[e.colorId] || e.hex || DEFAULT_COLOR;
const gcals = () => state.calendarIds || [];
const calLabel = (c) => c.name || c.calId;
const calHex = (c) => PALETTE[Math.max(0, gcals().indexOf(c)) % PALETTE.length];
const srcLabel = () => (source === "local" ? "日曆" : source === "all" ? "全部日曆" : calLabel(gcals().find((c) => c.id === source) || { calId: "日曆" }));
// 下拉選單只列使用者新增的日曆；2 個以上才有「全部日曆」。完全沒新增時才退回 App 內行程（選單不顯示）
function ensureSource() {
  const l = gcals();
  if (!l.length) { source = "local"; return; }
  if (source === "all" ? l.length >= 2 : l.some((c) => c.id === source)) return;
  source = l.length >= 2 ? "all" : l[0].id;
}
// 結束時間剛好 00:00 視為前一天結束（跨日行程不多算一天）
const lastDay = (e) => { const s = new Date(e.startTime), en = new Date(e.endTime); return en > s && en.getHours() === 0 && en.getMinutes() === 0 ? new Date(en.getTime() - 60000) : en; };
const eventsOn = (d) => events.filter((e) => dayDiff(new Date(e.startTime), d) <= 0 && dayDiff(lastDay(e), d) >= 0)
  .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

// ---------- 月曆 ----------
function renderMonth() {
  const y = cur1.getFullYear(), m = cur1.getMonth();
  root.querySelector("[data-mnum]").textContent = m + 1;
  root.querySelector("[data-year]").textContent = `${y} 年`;
  root.querySelector("[data-mname]").textContent = MONTH_EN[m];
  const mFirst = new Date(y, m, 1), mLast = new Date(y, m + 1, 0);
  const count = events.filter((e) => dayDiff(new Date(e.startTime), mLast) <= 0 && dayDiff(lastDay(e), mFirst) >= 0).length;
  root.querySelector("[data-count]").textContent = count ? `本月共 ${count} 個行程` : "本月還沒有行程";
  const gridStart = new Date(y, m, 1 - cur1.getDay());
  const weeks = Math.ceil((cur1.getDay() + new Date(y, m + 1, 0).getDate()) / 7);
  const today = new Date();
  let html = "";

  for (let w = 0; w < weeks; w++) {
    const ws = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + w * 7);
    const days = Array.from({ length: 7 }, (_, i) => new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + i));

    // 本週有交集的行程 → 算出起訖欄與不重疊的軌道
    const used = [];
    const bars = events
      .filter((e) => dayDiff(new Date(e.startTime), days[6]) <= 0 && dayDiff(lastDay(e), days[0]) >= 0)
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
      .map((e) => {
        const s = new Date(e.startTime), en = lastDay(e);
        const c0 = Math.max(0, dayDiff(s, ws)), c1 = Math.min(6, dayDiff(en, ws));
        let t = 0;
        while ((used[t] ||= Array(7).fill(false)).slice(c0, c1 + 1).some(Boolean)) t++;
        used[t].fill(true, c0, c1 + 1);
        const label = `${e.isMeeting ? "💻 " : ""}${e.title}`; // 手機每格很窄，色條只放標題，時間看當日詳情
        return `<button data-evt="${esc(dKey(s < ws ? ws : s))}" data-tip="cal-bar" class="cal-bar${s < ws ? " cl" : ""}${en > days[6] ? " cr" : ""}"
          style="grid-column:${c0 + 1}/span ${c1 - c0 + 1};grid-row:${t + 1};background:${color(e)}">${esc(label)}</button>`;
      }).join("");

    html += `<div class="cal-week">
      <div class="cal-bg">${days.map((d) => `<div data-day="${dKey(d)}" data-tip="cal-day" class="cal-cell${d.getMonth() !== m ? " other" : ""}${sameDay(d, today) ? " today" : ""}"><span class="cal-num">${d.getDate()}</span></div>`).join("")}</div>
      <div class="cal-bars">${bars}</div></div>`;
  }
  root.querySelector("[data-weeks]").innerHTML = html;
}

// 依目前選的日曆取得本月（含前後補位週）行程
async function fetchEvents(y, m) {
  const from = new Date(y, m, 1 - new Date(y, m, 1).getDay()), to = new Date(y, m + 1, 7);
  const jobs = [];
  if (source === "local") jobs.push(calendarApi.getMonthEvents(y, m));
  const targets = source === "all" ? gcals() : source === "local" ? [] : gcals().filter((c) => c.id === source);
  targets.forEach((c) => jobs.push(gcalApi.list(c.calId, from, to, { name: calLabel(c), hex: calHex(c) })));
  const res = await Promise.allSettled(jobs);
  const bad = res.find((r) => r.status === "rejected");
  if (bad) toast("讀取日曆失敗：" + (bad.reason?.message || bad.reason), true);
  return res.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

async function load() {
  const y = cur1.getFullYear(), m = cur1.getMonth(), key = `${source}|${y}-${m}`;
  const my = ++reqSeq;
  const hit = cache[key];
  if (hit && (source === "local" || Date.now() - hit.t < TTL)) { events = hit.list; return renderMonth(); }
  setLoading(true);
  try {
    const list = await fetchEvents(y, m);
    if (!root || my !== reqSeq) return;          // 已離開頁面或已換月
    cache[key] = { t: Date.now(), list };
    events = list;
    renderMonth();
  } catch (err) {
    toast("讀取日曆失敗：" + (err?.message || err), true);
  } finally {
    if (root && my === reqSeq) setLoading(false);
  }
}

// 左上角日曆切換：按鈕文字、選單內容
function renderSrc() {
  if (!root) return;
  const nm = document.querySelector("#headerCalSlot [data-src-name]");
  if (nm) nm.textContent = srcLabel();
  const item = (id, label, sub, hex) => `<button data-src="${esc(id)}" data-tip="cal-src" class="cal-menu-item${source === id ? " on" : ""}"><span class="cal-dot" style="background:${hex}"></span><span class="cal-menu-txt"><b>${esc(label)}</b><small>${esc(sub)}</small></span>${source === id ? '<i class="fa-solid fa-check"></i>' : ""}</button>`;
  const list = gcals();
  root.querySelector("[data-src-menu]").innerHTML =
    list.map((c) => item(c.id, calLabel(c), c.name ? c.calId : "Google 日曆", calHex(c))).join("")
    + (list.length >= 2 ? item("all", "全部日曆", "合併顯示所有日曆", "var(--primary-color)") : "")
    + (list.length ? "" : `<p class="cal-menu-empty">還沒有日曆<br>到右上角 ︙ 日曆設定 新增</p>`);
}
function setSource(id) {
  if (id === source) return;
  source = id;
  renderSrc();
  load();
}

function setLoading(on) {
  loading = on;
  root.querySelector("[data-loading]").classList.toggle("hidden", !on);
  root.querySelectorAll("[data-nav]").forEach((b) => (b.disabled = on));
}

function go(delta) {
  if (loading) return;
  cur1 = new Date(cur1.getFullYear(), cur1.getMonth() + delta, 1); // 固定用每月 1 日，避免 31 號跳月
  load();
}
function goToday() {
  if (loading) return;
  const n = new Date();
  cur1 = new Date(n.getFullYear(), n.getMonth(), 1);
  load();
}

// ---------- 當日詳情 ----------
function openDay(dateStr) {
  detailDate = dateStr;
  const [y, m, d] = dateStr.split("-").map(Number);
  const day = new Date(y, m - 1, d);
  const list = eventsOn(day);
  const sheet = openBottomSheet(`
    <div class="sheet-header pt-3 pb-2 px-5 flex flex-col shrink-0 select-none cursor-ns-resize touch-none border-b border-slate-200/60 dark:border-slate-800">
      <div class="w-full flex justify-center py-1"><div class="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full"></div></div>
      <div class="w-full flex items-center justify-between mt-1">
        <div class="w-10 h-10"></div>
        <div class="flex items-center gap-2">
          <i class="fa-regular fa-calendar-days text-base theme-text-primary"></i>
          <span class="text-lg font-black text-slate-800 dark:text-slate-100 tracking-wider">${m}/${d} 週${WEEKDAYS[day.getDay()]}</span>
          <span class="px-2 py-0.5 rounded-full theme-bg-primary text-white text-[10px] font-bold">${list.length ? `${list.length} 個行程` : "沒有行程"}</span>
        </div>
        <button data-close data-tip="cal-close" aria-label="關閉" class="w-10 h-10 rounded-full bg-slate-200/60 dark:bg-slate-800 hover:bg-rose-100 hover:text-rose-600 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all active:scale-90"><i class="fa-solid fa-xmark text-lg"></i></button>
      </div>
    </div>
    <div class="cal-scroll px-5 py-3 space-y-3 no-scrollbar">${list.length ? list.map(card).join("") : `<div class="py-12 text-center text-slate-400 space-y-2"><i class="fa-regular fa-calendar-xmark text-3xl"></i><p class="text-xs font-bold">這天沒有行程</p></div>`}</div>
    <div class="p-4 border-t border-slate-200/60 dark:border-slate-800 shrink-0">
      <button data-add data-tip="cal-add" class="w-full py-3 bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 transition-all text-white rounded-2xl font-bold text-xs soft-shadow-md flex items-center justify-center gap-2"><i class="fa-solid fa-plus"></i><span>新增行程</span></button>
    </div>`);
  const addBtn = sheet.querySelector("[data-add]");
  if (addBtn) addBtn.onclick = () => { sheet.remove(); openForm(null, dateStr); };
  sheet.addEventListener("click", (e) => {
    const b = e.target.closest("[data-edit],[data-del]");
    if (!b) {
      const c = e.target.closest("[data-view]");
      if (c && !e.target.closest("a")) { const ev = events.find((x) => x.id === c.dataset.view); if (ev) openDetail(ev, sheet); }
      return;
    }
    const id = b.dataset.edit || b.dataset.del;
    const ev = events.find((x) => x.id === id);
    if (!ev) return;
    if (b.dataset.edit) { sheet.remove(); return openForm(ev); }
    removeEvent(ev, b, () => sheet.remove());
  });
}

// 刪除行程：按兩次才刪除
function removeEvent(ev, b, after) {
  if (!b.dataset.sure) { b.dataset.sure = "1"; b.dataset.old = b.innerHTML; b.innerHTML = "再按一次刪除"; return; }
  (ev.gcal ? gcalApi.remove(ev.gcal, ev.gid) : calendarApi.remove(ev.id))
    .then(() => { cache = {}; after(); toast("行程已刪除"); load(); })
    .catch((x) => { b.dataset.sure = ""; b.innerHTML = b.dataset.old; toast("刪除失敗：" + (x?.message || x), true); });
}

// 點行程 → 置中的日曆風格浮動視窗，顯示完整資訊
function openDetail(e, daySheet) {
  const s = new Date(e.startTime), en = new Date(e.endTime);
  const t = sameDay(s, en) ? `${hm(s)} - ${hm(en)}` : `${s.getMonth() + 1}/${s.getDate()} ${hm(s)} ～ ${en.getMonth() + 1}/${en.getDate()} ${hm(en)}`;
  const link = safeUrl(e.link);
  const c = color(e);
  const row = (icon, inner) => `<div class="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-200"><i class="${icon} w-4 mt-0.5 text-center theme-text-primary"></i><div class="min-w-0 flex-1 break-words">${inner}</div></div>`;
  const pop = openModal(`
    <div class="cal-rings" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
    <div class="cal-head cal-pop-head">
      <div class="cal-head-main" style="justify-content:flex-start;gap:.8rem">
        <div class="cal-pop-tile"><small>${s.getMonth() + 1}月</small><b>${s.getDate()}</b></div>
        <div class="min-w-0">
          <div class="text-lg font-black leading-tight">週${WEEKDAYS[s.getDay()]}</div>
          <div class="text-xs font-bold opacity-90">${s.getFullYear()} 年 · ${e.gcal ? esc(e.calName) : "App 內行程"}</div>
        </div>
        <button data-close data-tip="cal-close" aria-label="關閉" class="cal-nav" style="margin-left:auto;flex:none;width:2.25rem;height:2.25rem"><i class="fa-solid fa-xmark"></i></button>
      </div>
    </div>
    <div class="px-5 py-4 space-y-3 overflow-y-auto no-scrollbar" style="max-height:50vh;touch-action:pan-y;overscroll-behavior:contain">
      <h3 class="text-xl font-black text-slate-800 dark:text-slate-100 break-words pl-3" style="border-left:5px solid ${c}">${esc(e.title)}</h3>
      ${row("fa-regular fa-clock", `<b>${t}</b>`)}
      ${e.location ? row("fa-solid fa-location-dot", esc(e.location)) : ""}
      ${link ? row(e.isMeeting ? "fa-solid fa-video" : "fa-solid fa-link", `${e.isMeeting ? "會議連結" : "附加連結"}：<a href="${esc(link)}" target="_blank" rel="noopener" class="theme-text-primary underline break-all">${esc(link)}</a>`) : ""}
      ${e.description ? row("fa-regular fa-note-sticky", `<span class="whitespace-pre-line">${esc(e.description)}</span>`) : ""}
      ${e.readOnly ? `<p class="text-[11px] text-slate-400 font-bold">整天／重複行程請到 Google 日曆修改</p>` : ""}
    </div>
    <div class="px-4 pb-4 pt-2 flex gap-2">
      ${e.readOnly ? "" : `<button data-edit data-tip="cal-edit" class="flex-1 py-2.5 rounded-2xl font-bold text-xs theme-bg-primary text-white"><i class="fa-solid fa-pen"></i> 修改</button>
      <button data-del data-tip="cal-del" class="flex-1 py-2.5 rounded-2xl font-bold text-xs bg-rose-100 text-rose-600"><i class="fa-solid fa-trash"></i> 刪除</button>`}
      <button data-close data-tip="cal-close" class="flex-1 py-2.5 rounded-2xl font-bold text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-100">關閉</button>
    </div>`, "pop");
  pop.classList.add("center");
  pop.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-edit],[data-del]");
    if (!b) return;
    if (b.dataset.edit) { pop.remove(); daySheet?.remove(); return openForm(e); }
    removeEvent(e, b, () => { pop.remove(); daySheet?.remove(); });
  });
}

function card(e) {
  const s = new Date(e.startTime), en = new Date(e.endTime);
  const t = sameDay(s, en) ? `${hm(s)} - ${hm(en)}` : `${s.getMonth() + 1}/${s.getDate()} ${hm(s)} ～ ${en.getMonth() + 1}/${en.getDate()} ${hm(en)}`;
  const c = color(e);
  // 只顯示標題與時間；位置、連結、內容、來源等細節點開後在詳情視窗看（點卡片的行為不變）
  return `<div data-view="${esc(e.id)}" data-tip="cal-view" role="button" tabindex="0" class="notification-card bg-white dark:bg-slate-800 rounded-2xl pl-4 pr-3 py-3.5 soft-shadow-sm flex items-center gap-3 border-l-4 cursor-pointer active:scale-[.98] transition" style="border-left-color:${c}">
    <div class="flex-1 min-w-0">
      <h4 class="text-base font-black text-slate-800 dark:text-slate-100 break-words leading-snug">${esc(e.title)}</h4>
      <span class="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full text-xs font-bold text-slate-700 dark:text-slate-100" style="background:color-mix(in srgb, ${c} 16%, transparent)"><i class="fa-regular fa-clock" style="color:${c}"></i>${t}</span>
    </div>
    <i class="fa-solid fa-chevron-right text-xs text-slate-300 dark:text-slate-500 shrink-0"></i>
  </div>`;
}

// ---------- 新增／編輯 ----------
function openForm(ev = null, dateStr = "") {
  const now = new Date();
  let start = now;
  if (ev) start = new Date(ev.startTime);
  else if (dateStr) { const [y, m, d] = dateStr.split("-").map(Number); start = new Date(y, m - 1, d, now.getHours(), 0); }
  const d = ev || { id: "", title: "", startTime: toLocalStr(start), endTime: toLocalStr(new Date(start.getTime() + 36e5)), location: "", description: "", link: "", isMeeting: false, colorId: "" };
  const inp = "w-full px-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none theme-focus-border";
  const lbl = "text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1";
  const list = gcals();
  const TITLES = ["選擇日曆與顏色", "行程名稱與內容", "地點、連結與時間"];
  const sheet = openModal(`
    <form novalidate>
      <div class="cal-rings" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      <div class="cal-head cal-pop-head">
        <div class="cal-head-main" style="justify-content:flex-start;gap:.7rem">
          <div class="min-w-0">
            <div class="text-lg font-black leading-tight"><i class="fa-solid fa-calendar-plus"></i> ${ev ? "修改行程" : "新增行程"}</div>
            <div data-steptitle class="text-xs font-bold opacity-90 mt-0.5"></div>
          </div>
          <button type="button" data-close data-tip="cal-close" aria-label="關閉" class="cal-nav" style="margin-left:auto;flex:none;width:2.25rem;height:2.25rem"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="flex gap-1.5 mt-3 relative" style="z-index:1">${[0, 1, 2].map((n) => `<span data-dot="${n}" class="h-1.5 flex-1 rounded-full transition-colors"></span>`).join("")}</div>
      </div>
      <div class="cal-scroll px-5 py-4 no-scrollbar" style="max-height:50vh">
        <section data-page="0" class="space-y-4">
          <div>
            <span class="${lbl}">哪個日曆</span>
            ${ev ? `<p class="${inp}">${esc(ev.gcal ? ev.calName : "App 內行程")}</p>`
              : list.length ? `<select name="target" class="${inp}">${list.map((c) => `<option value="${esc(c.id)}"${source === c.id ? " selected" : ""}>${esc(calLabel(c))}</option>`).join("")}</select>`
              : `<p class="${inp}">App 內行程（尚未新增 Google 日曆）</p>`}
          </div>
          <div>
            <span class="${lbl}">日曆顏色</span>
            <div class="flex flex-wrap gap-2.5 mt-2">${COLOR_LIST.map((c) => `<label title="${c.label}" class="cursor-pointer"><input type="radio" name="color" value="${c.id}" ${c.id === (d.colorId || "") ? "checked" : ""} class="sr-only peer"><span class="cal-sw peer-checked:ring-4 peer-checked:ring-slate-700 dark:peer-checked:ring-white" style="background:${c.hex || "#fff"}">${c.hex ? "" : "預設"}</span></label>`).join("")}</div>
          </div>
        </section>
        <section data-page="1" class="space-y-4 hidden">
          <label class="block"><span class="${lbl}">行程名稱 *</span><input name="title" value="${esc(d.title)}" maxlength="40" placeholder="例如：家族聚餐" class="${inp}"></label>
          <label class="block"><span class="${lbl}">內容</span><textarea name="desc" rows="6" maxlength="500" placeholder="詳細說明（可留空）" class="${inp}">${esc(d.description)}</textarea></label>
        </section>
        <section data-page="2" class="space-y-4 hidden">
          <label class="block"><span class="${lbl}">地址</span><input name="location" value="${esc(d.location)}" maxlength="60" placeholder="可留空" class="${inp}"></label>
          <label class="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200 cursor-pointer"><input type="checkbox" name="meeting" ${d.isMeeting ? "checked" : ""} class="w-5 h-5"> 💻 視訊會議</label>
          <label data-linkwrap class="block"><span data-linklbl class="${lbl}">${d.isMeeting ? "會議連結" : "附加連結"}（選填，https）</span><input type="url" name="link" value="${esc(d.link)}" placeholder="https://..." class="${inp}"></label>
          <div>
            <span class="${lbl}">時間 *</span>
            <div class="space-y-2">
              <label class="text-[11px] text-slate-500 block">開始<input type="datetime-local" name="start" value="${esc(d.startTime)}" class="${inp}"></label>
              <label class="text-[11px] text-slate-500 block">結束<input type="datetime-local" name="end" value="${esc(d.endTime)}" class="${inp}"></label>
            </div>
          </div>
        </section>
        <p data-err class="text-rose-600 font-bold text-xs mt-3 hidden"></p>
      </div>
      <div class="p-4 border-t border-slate-200/60 dark:border-slate-800 flex gap-2">
        <button type="button" data-prev data-tip="cal-step-prev" class="px-5 py-3 rounded-2xl font-bold text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-100 flex items-center gap-1.5"><i class="fa-solid fa-chevron-left"></i><span data-prevtxt>取消</span></button>
        <button type="button" data-next data-tip="cal-step-next" class="flex-1 theme-bg-primary text-white py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 soft-shadow-md"><span data-nexttxt>下一頁</span><i data-nexticon class="fa-solid fa-chevron-right"></i></button>
      </div>
    </form>`, "pop");
  sheet.classList.add("center");
  const f = sheet.querySelector("form");
  let page = 0;
  const err = (t) => { const p = f.querySelector("[data-err]"); p.textContent = t || ""; p.classList.toggle("hidden", !t); };
  const show = (n) => {
    page = n; err("");
    f.querySelectorAll("[data-page]").forEach((el) => el.classList.toggle("hidden", Number(el.dataset.page) !== n));
    f.querySelectorAll("[data-dot]").forEach((el) => { const on = Number(el.dataset.dot) <= n; el.style.background = on ? "#fff" : "rgba(255,255,255,.35)"; });
    f.querySelector("[data-steptitle]").textContent = `${n + 1} / 3　${TITLES[n]}`;
    f.querySelector("[data-prevtxt]").textContent = n === 0 ? "取消" : "上一頁";
    const pv = f.querySelector("[data-prev]");
    pv.querySelector("i").classList.toggle("hidden", n === 0);
    pv.toggleAttribute("data-close", n === 0); // 第一頁的「取消」直接關閉視窗
    f.querySelector("[data-nexttxt]").textContent = n === 2 ? "儲存" : "下一頁";
    f.querySelector("[data-nexticon]").className = n === 2 ? "fa-solid fa-check" : "fa-solid fa-chevron-right";
  };
  f.meeting.onchange = () => (f.querySelector("[data-linklbl]").textContent = (f.meeting.checked ? "會議連結" : "附加連結") + "（選填，https）");
  f.querySelector("[data-prev]").addEventListener("click", () => { if (page > 0) show(page - 1); });
  const collect = () => ({ id: d.id, title: f.title.value.trim(), startTime: f.start.value, endTime: f.end.value, location: f.location.value.trim(), description: f.desc.value.trim(), link: f.link.value.trim(), isMeeting: f.meeting.checked, colorId: f.color.value });
  const submit = async () => {
    const rec = collect();
    if (!rec.title) { show(1); return err("請填寫行程名稱"); }
    if (!rec.startTime || !rec.endTime) return err("請填寫完整的開始與結束時間");
    if (new Date(rec.endTime) <= new Date(rec.startTime)) return err("結束時間必須晚於開始時間");
    if (rec.link && !safeUrl(rec.link)) return err("連結需以 http:// 或 https:// 開頭");
    const btn = f.querySelector("[data-next]");
    btn.disabled = true; f.querySelector("[data-nexttxt]").textContent = "儲存中...";
    try {
      // 目標日曆：修改時沿用原本的；新增時看第一頁的選擇（沒有 Google 日曆時存 App 內）
      const pick = f.target?.value || "local";
      const gc = ev ? ev.gcal : pick === "local" ? "" : gcals().find((c) => c.id === pick)?.calId;
      if (ev && gc) await gcalApi.update(gc, { ...rec, id: ev.gid });
      else if (gc) await gcalApi.create(gc, rec);
      else await (rec.id ? calendarApi.update(rec) : calendarApi.create(rec));
      if (!ev && gc && source !== "all" && source !== pick) { source = pick; renderSrc(); } // 新增到別的日曆：切過去才看得到
      cache = {};
      sheet.remove();
      // 跳到行程所在月份，讓使用者馬上看到結果
      const s = new Date(rec.startTime);
      cur1 = new Date(s.getFullYear(), s.getMonth(), 1);
      toast(rec.id ? "行程已更新" : "行程已新增");
      load();
    } catch (x) { btn.disabled = false; show(2); err("儲存失敗：" + (x?.message || x)); }
  };
  f.querySelector("[data-next]").onclick = () => {
    if (page === 1 && !f.title.value.trim()) return err("請填寫行程名稱");
    return page === 2 ? submit() : show(page + 1);
  };
  f.onsubmit = (e) => { e.preventDefault(); f.querySelector("[data-next]").click(); };
  show(0);
}

// ---------- 共用 ----------
function openModal(inner, cls = "") {
  const m = document.createElement("div");
  m.className = "cal-modal";
  m.innerHTML = `<div class="cal-sheet ${cls}">${inner}</div>`;
  m.addEventListener("click", (e) => { if (e.target === m || e.target.closest("[data-close]")) m.remove(); });
  document.body.appendChild(m); // 放在最外層：蓋住底部 Dock，也不受頁面捲動影響
  modals.add(m);
  const mo = new MutationObserver(() => { if (!m.isConnected) { modals.delete(m); mo.disconnect(); } });
  mo.observe(document.body, { childList: true });
  return m;
}

// 底部面板（和「最新提醒」相同：滑入／滑出動畫、壓著頂端灰色長條上下拖曳調整高度）
function openBottomSheet(inner) {
  const m = document.createElement("div");
  m.className = "cal-modal";
  m.style.opacity = "0";
  m.innerHTML = `<div class="cal-sheetbox"><div class="bottom-sheet closed absolute bottom-0 left-0 right-0 rounded-t-[36px] flex flex-col soft-shadow-lg border-t border-slate-200/60 dark:border-slate-800 overflow-hidden">${inner}</div></div>`;
  const bs = m.querySelector(".bottom-sheet");
  let closing = false;
  m.close = () => {
    if (closing) return;
    closing = true;
    bs.style.height = "";
    bs.classList.remove("open-default", "open-expanded");
    bs.classList.add("closed");
    m.style.opacity = "0";
    setTimeout(() => m.remove(), 300);
  };
  m.addEventListener("click", (e) => { if (e.target === m || e.target.closest("[data-close]")) m.close(); });
  document.body.appendChild(m);
  modals.add(m);
  const mo = new MutationObserver(() => { if (!m.isConnected) { modals.delete(m); mo.disconnect(); } });
  mo.observe(document.body, { childList: true });
  attachSheetResize(bs, () => m.close());
  requestAnimationFrame(() => requestAnimationFrame(() => { m.style.opacity = "1"; bs.classList.remove("closed"); bs.classList.add("open-default"); }));
  return m;
}

function toast(msg, isErr = false) {
  const t = document.createElement("div");
  t.className = "cal-toast" + (isErr ? " err" : "");
  t.textContent = msg;
  root.appendChild(t);
  setTimeout(() => t.remove(), 2400);
}

export default {
  id: "家庭日曆",
  storage: "server", // 資料存放：server = 家庭共用 Firestore；private = 私人 Firestore（core/cloud.js 連線）
  access: "public",         // 訪客可用，故不設 requiresLogin
  mount(el) {
    const n = new Date();
    cur1 = new Date(n.getFullYear(), n.getMonth(), 1);
    cache = {}; events = [];
    ensureSource();
    offCal = calendarApi.onChange(() => { cache = {}; if (root) load(); }); // 家人新增/修改行程時更新
    root = document.createElement("div");
    root.className = "cal-root";
    root.innerHTML = `
      <div data-src-menu class="cal-menu hidden" role="listbox"></div>
      <div class="cal-paper">
        <div class="cal-rings" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
        <div class="cal-head">
          <div class="cal-head-main">
            <button data-nav="-1" data-tip="cal-prev" aria-label="上個月" class="cal-nav"><i class="fa-solid fa-chevron-left"></i></button>
            <div class="cal-mo">
              <b data-mnum></b><span class="cal-mo-unit">月</span>
              <span class="cal-mo-side"><em data-year></em><small data-mname></small></span>
            </div>
            <button data-nav="1" data-tip="cal-next" aria-label="下個月" class="cal-nav"><i class="fa-solid fa-chevron-right"></i></button>
          </div>
        </div>
        <div class="cal-wd">${WEEKDAYS.map((w, i) => `<div class="${i === 0 || i === 6 ? "text-rose-500" : ""}">${w}</div>`).join("")}</div>
        <div class="cal-body relative">
          <div data-weeks></div>
          <div data-loading class="hidden absolute inset-0 bg-white/60 dark:bg-slate-900/60 flex items-center justify-center z-10"><div class="cal-spin"></div></div>
        </div>
        <div class="cal-note"><i class="fa-regular fa-hand-pointer"></i><span data-count></span><span class="cal-note-tip">點日期查看／新增</span></div>
      </div>`;
    el.appendChild(root);
    // 左上角（頁首）日曆切換按鈕 + 頁首「今天」
    const slot = document.getElementById("headerCalSlot");
    if (slot) {
      slot.innerHTML = '<button data-src-btn data-tip="cal-src" aria-haspopup="listbox" aria-label="切換日曆" class="cal-src"><i class="fa-solid fa-calendar-days"></i><span data-src-name></span><i class="fa-solid fa-chevron-down cal-src-caret"></i></button>';
      slot.onclick = (e) => { if (e.target.closest("[data-src-btn]")) root?.querySelector("[data-src-menu]").classList.toggle("hidden"); };
    }
    docClose = (e) => { if (!e.target.closest("[data-src-menu],#headerCalSlot")) root?.querySelector("[data-src-menu]")?.classList.add("hidden"); };
    document.addEventListener("click", docClose, true);
    offToday = on("calendar:today", goToday);
    renderSrc();
    // Google 日曆 ID 清單改變（新增 / 刪除 / 從雲端載入）：更新選單並重新讀取
    offApi = on("api:refresh", () => { cache = {}; if (root) load(); }); // 設定 → API 資料更新：重新讀取 Google 日曆
    offIds = on("calendarids:change", () => { ensureSource(); cache = {}; renderSrc(); if (root) load(); });

    root.addEventListener("click", (e) => {
      if (e.target.closest("[data-modal],.cal-modal")) return;
      const pick = e.target.closest("[data-src]");
      if (pick) { root.querySelector("[data-src-menu]").classList.add("hidden"); return setSource(pick.dataset.src); }
      const nav = e.target.closest("[data-nav]");
      if (nav) return go(Number(nav.dataset.nav));
      const bar = e.target.closest("[data-evt]");
      const cell = e.target.closest("[data-day]");
      const key = bar?.dataset.evt || cell?.dataset.day;
      if (key) openDay(key);
    });
    load();
    showTipHint("calendar");
  },
  unmount() {
    closeTips();
    reqSeq++; offCal?.(); offCal = null; offIds?.(); offIds = null; offApi?.(); offApi = null; offToday?.(); offToday = null;
    if (docClose) { document.removeEventListener("click", docClose, true); docClose = null; }
    const slot = document.getElementById("headerCalSlot");
    if (slot) { slot.onclick = null; slot.innerHTML = ""; }
    modals.forEach((m) => m.remove()); modals.clear();
    root?.remove(); root = null; },
};
