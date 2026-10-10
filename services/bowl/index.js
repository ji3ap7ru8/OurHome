// 換誰洗碗 — Stage 7：家庭限定成員服務（純前端 UI + 邏輯，資料只在記憶體）。
// 需登入（requiresLogin）；登入帳號的電子郵件還要在雲端硬碟 default 的 bowlEmails 名單內（App 裡只能查看，不能改）。
// 沒有「你是哪一位」身分選擇：能進入的人都看得到排班，也都能調整排班。
import { on, state } from "../../core/store.js";
import { showTipHint, closeTips } from "../../core/tips.js";
import { canEnterBowl, getBowlEmails } from "../../core/bowl-emails.js";
import { VACATION_COLOR, bowlApi } from "./data.js";
import { openLineSendDialog, closeLineSendDialog } from "../../core/line-send.js";
import { MAX_AHEAD, WINDOW, autoSchedule, clearFuture, daysGrid, isEmptyDay, owed, tally, toggleOff, toggleTask, ymd } from "./engine.js";

let members = [];
let records = {};
let root = null;
let alive = false;
let offApi = null;
let offData = null;
let offCloud = null;
let offOverwrite = null;


const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const byId = (id) => members.find((m) => m.id === id);
const chores = () => members.filter((m) => m.chore);
const colorOf = (id) => byId(id)?.color || "#64748b";
const who = (id) => (id ? (byId(id) ? `${byId(id).emoji} ${esc(byId(id).name)}` : "（已移除）") : "---");
// 收碗 / 洗碗圖示（Font Awesome，顏色固定：橘＝收碗、藍＝洗碗，比表情符號好辨識）
const ICON = {
  clear: `<i class="fa-solid fa-bowl-food" style="color:#ea580c"></i>`,
  wash: `<i class="fa-solid fa-hands-bubbles" style="color:#0284c7"></i>`,
};
const WD = ["日", "一", "二", "三", "四", "五", "六"];
const weekday = (s) => { const [y, m, d] = s.split("-").map(Number); return WD[new Date(y, m - 1, d).getDay()]; };

function toast(msg, ms = 2500) {
  const t = document.createElement("div");
  t.className = "fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-slate-900 text-white font-bold px-5 py-3 rounded-full shadow-xl max-w-[85vw] text-center";
  t.textContent = msg; root?.appendChild(t); setTimeout(() => t.remove(), ms);
}

// ---------- 畫面 ----------
// 頁面標題「換誰洗碗」已移到頂部列（components/header.js 的 headerBowlTitle）

function statLines(days) {
  const order = chores().map((m) => m.id);
  const t = tally(days, records, order);
  const line = (task, icon, label) => {
    const o = owed(t[task], order);
    if (o.state === "none") return `${icon} ${label}：尚無安排`;
    if (o.state === "even") return `${icon} ${label}平衡（各 ${o.each} 次）`;
    const counts = order.map((id) => `${byId(id).emoji} ${t[task][id]}`).join(" vs ");
    return `${icon} ${o.owers.map(who).join("、")} 欠 <span class="font-black text-orange-600">${o.diff} 次</span> ${label}（${counts}）`;
  };
  return `<div>${line("clear", ICON.clear, "收碗")}</div><div>${line("wash", ICON.wash, "洗碗")}</div>`;
}

let curAhead = WINDOW.ahead; // 目前畫面顯示到「今天 + N 天」
let statOpen = false; // 欠碗統計：預設收合，點標題列展開
let scrollLaterEnd = false;
let extraAhead = 0;          // 使用者按「新增一天」後要求的天數
const dayOffset = (s) => { const [y, m, d] = s.split("-").map(Number); const t = new Date(); return Math.round((new Date(y, m - 1, d) - new Date(t.getFullYear(), t.getMonth(), t.getDate())) / 864e5); };

const avatarDot = (id, off, size = "w-14 h-14 text-3xl") => {
  const m = id && byId(id);
  if (off) return `<span class="${size} rounded-full flex items-center justify-center" style="background:${VACATION_COLOR}26;box-shadow:0 0 0 3px ${VACATION_COLOR}">🏖️</span>`;
  if (!m) return `<span class="${size} rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-400 font-black">?</span>`;
  return `<span class="${size} rounded-full flex items-center justify-center bg-white dark:bg-slate-700" style="box-shadow:0 0 0 3px ${m.color}">${m.emoji}</span>`;
};

const SAVE_TXT = { idle: "", pending: "（待保存…）", saving: "（保存中…）", saved: "（已保存 ✓）", error: "（保存失敗，稍後自動重試）" };
function noticeHtml() {
  const base = "mx-1 mb-3 text-xs font-bold leading-relaxed rounded-xl px-3 py-2";
  if (!bowlApi.synced()) return `<p class="${base} bg-amber-100/80 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200"><i class="fa-solid fa-triangle-exclamation"></i> 尚未連上伺服器 Firebase：目前只暫存在此畫面，重新整理會清除。請到設定填入 firebaseConfig（伺服器）。</p>`;
  return `<p class="${base} bg-white/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300"><i class="fa-solid fa-cloud-arrow-up theme-text-primary"></i> 數據會 1.5 秒自動保存至伺服器。<span class="${saveState === "error" ? "text-red-600" : "theme-text-primary"}">${SAVE_TXT[saveState]}</span></p>`;
}

function renderMain() {
  const maxRec = Math.max(0, ...Object.keys(records).map(dayOffset));
  curAhead = Math.min(MAX_AHEAD, Math.max(WINDOW.ahead, extraAhead, maxRec));
  const days = daysGrid(new Date(), curAhead);
  const todayStr = days.find((d) => d.offset === 0).dateStr;
  const td = records[todayStr] || { clear: null, wash: null, off: false };
  const heroColor = td.off ? VACATION_COLOR : td.clear ? colorOf(td.clear) : "var(--primary-color)";
  const rec = (s) => records[s] || { clear: null, wash: null, off: false };
  const dateHead = (dateStr, badge) => `<div class="flex items-center justify-between mb-2"><span class="text-sm font-black text-slate-800 dark:text-slate-100">${dateStr.slice(5)} <span class="text-xs font-bold text-slate-500 dark:text-slate-400">週${weekday(dateStr)}</span></span>${badge}</div>`;
  const pill = (t, cls) => `<span class="text-[0.65rem] font-black px-1.5 py-0.5 rounded-md ${cls}">${t}</span>`;

  // 歷史：唯讀
  const histCard = ({ dateStr }) => {
    const r = rec(dateStr);
    const line = (v, icon) => `<div class="flex items-center justify-center gap-1.5 py-1.5 text-sm font-black text-slate-700 dark:text-slate-200">${icon} ${r.off ? "🏖️ 休假" : v ? who(v) : `<span class="text-slate-400 font-bold">無紀錄</span>`}</div>`;
    return `<div class="snap-start shrink-0 w-[8.25rem] rounded-2xl p-2.5 bg-white/75 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700" style="${r.off ? `background-image:linear-gradient(${VACATION_COLOR}1f,${VACATION_COLOR}1f)` : r.clear ? `background-image:linear-gradient(${colorOf(r.clear)}14,${colorOf(r.clear)}14)` : ""}">
      ${dateHead(dateStr, pill("歷史", "bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200"))}${line(r.clear, ICON.clear)}${line(r.wash, ICON.wash)}</div>`;
  };

  // 今日與未來：可編輯
  const editCard = ({ dateStr, offset }, w = "") => {
    const r = rec(dateStr), today = offset === 0;
    const tint = r.off ? `${VACATION_COLOR}26` : r.clear ? `${colorOf(r.clear)}1a` : "";
    const badge = today ? pill("今日", "theme-bg-primary text-white") : pill("未來", "bg-emerald-500 text-white");
    const row = (task, icon, label) => `
      <div class="mb-2"><div class="text-xs font-black text-slate-500 dark:text-slate-400 mb-1">${icon} ${label}</div>
        <div class="flex flex-wrap gap-1">${chores().map((m) => {
          const on_ = r[task] === m.id;
          return `<button data-tip="bowl-set" data-tip-name="${esc(m.name)}" data-a="set" data-date="${dateStr}" data-task="${task}" data-id="${m.id}" ${r.off ? "disabled" : ""} aria-pressed="${on_}" aria-label="${label} ${esc(m.name)}"
            class="flex-1 min-w-[2.2rem] py-2 rounded-lg text-lg font-black shadow-sm transition active:scale-95 ${r.off ? "opacity-35 bg-slate-200 dark:bg-slate-700" : on_ ? "text-white" : "bg-white dark:bg-slate-700"}" style="${on_ ? `background:${m.color}` : ""}">${m.emoji}</button>`;
        }).join("")}</div></div>`;
    return `<div class="${w} rounded-2xl p-2.5 ${today ? "border-2 theme-border-primary" : "border-[1.5px] border-slate-200 dark:border-slate-700"} bg-white dark:bg-slate-800" style="${tint ? `background-image:linear-gradient(${tint},${tint})` : ""}">
      ${dateHead(dateStr, badge)}${row("clear", ICON.clear, "收碗")}${row("wash", ICON.wash, "洗碗")}
      <button data-tip="bowl-vac" data-a="vac" data-date="${dateStr}" class="w-full py-2 rounded-lg text-xs font-black ${r.off ? "text-white" : "border border-dashed border-slate-300 dark:border-slate-500 text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-700/60"}" style="${r.off ? `background:${VACATION_COLOR}` : ""}">${r.off ? "🏖️ 已休假" : "🏖️ 休假"}</button></div>`;
  };

  const hist = days.filter((d) => d.offset < 0);
  const near = days.filter((d) => d.offset >= 0 && d.offset <= 2);
  const later = days.filter((d) => d.offset >= 3);
  const arrow = (k, dir, ic) => `<button data-tip="bowl-scroll" data-a="scroll" data-k="${k}" data-dir="${dir}" aria-label="${dir < 0 ? "往左" : "往右"}" class="w-7 h-7 rounded-full bg-white/80 dark:bg-slate-700 theme-text-primary text-xs shadow-sm active:scale-90"><i class="fa-solid ${ic}"></i></button>`;
  const section = (icon, title, hint, k) => `<div class="flex items-center justify-between mx-1 mt-5 mb-2"><h3 class="text-sm font-black text-slate-700 dark:text-slate-200"><i class="${icon} theme-text-primary"></i> ${title}</h3>${k ? `<span class="flex items-center gap-1.5"><span class="text-[0.7rem] font-bold text-slate-400 mr-1">${hint}</span>${arrow(k, -1, "fa-chevron-left")}${arrow(k, 1, "fa-chevron-right")}</span>` : `<span class="text-[0.7rem] font-bold text-slate-400">${hint}</span>`}</div>`;
  const canAdd = curAhead < MAX_AHEAD;

  return `<div class="pt-1"></div>
    ${noticeHtml()}
    <div class="rounded-3xl overflow-hidden bg-white/90 dark:bg-slate-800/90 soft-shadow-sm border border-white dark:border-slate-700">
      <div class="flex items-center justify-between px-4 py-2.5 text-white" style="background:linear-gradient(135deg,var(--primary-color),var(--primary-dark))">
        <span class="text-base font-black"><i class="fa-solid fa-thumbtack"></i> 今日執勤</span>
        <button type="button" data-tip="bowl-send" data-a="send" class="ml-auto mr-2 text-xs font-black bg-white text-emerald-700 px-3 py-1 rounded-full active:scale-95"><i class="fa-solid fa-paper-plane"></i> 發送</button>
        <span class="text-xs font-black bg-white/25 px-2.5 py-1 rounded-full">${todayStr.slice(5)} 週${weekday(todayStr)}</span>
      </div>
      <div class="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700 px-2 py-4 text-center">
        ${[["clear", `${ICON.clear} 收碗`], ["wash", `${ICON.wash} 洗碗`]].map(([k, l]) => `<div class="flex flex-col items-center gap-2"><div class="text-xs font-black text-slate-500 dark:text-slate-400">${l}</div>${avatarDot(td[k], td.off)}<div class="text-lg font-black" style="color:${td.off ? VACATION_COLOR : td[k] ? colorOf(td[k]) : "#94a3b8"}">${td.off ? "休假" : td[k] && byId(td[k]) ? esc(byId(td[k]).name) : "尚未安排"}</div></div>`).join("")}
      </div>
      <div class="border-t border-dashed border-slate-300 dark:border-slate-600" style="background:color-mix(in srgb, var(--primary-light) 40%, transparent)">
        <button data-tip="bowl-stat" data-a="stat" aria-expanded="${statOpen}" class="w-full flex items-center justify-between px-4 py-2.5 text-sm font-black text-slate-600 dark:text-slate-300"><span><i class="fa-solid fa-scale-balanced theme-text-primary"></i> 欠碗統計</span><i data-stat-chev class="fa-solid fa-chevron-down text-xs text-slate-400" style="transition:transform .3s ease;transform:rotate(${statOpen ? 180 : 0}deg)"></i></button>
        <div data-stat-body style="display:grid;grid-template-rows:${statOpen ? "1fr" : "0fr"};opacity:${statOpen ? 1 : 0};transition:grid-template-rows .3s ease,opacity .3s ease">
          <div style="overflow:hidden;min-height:0"><div class="px-4 pb-3 text-sm font-bold text-slate-600 dark:text-slate-300 text-center space-y-1">
            ${statLines(days)}
            <div class="text-xs font-medium text-slate-400">統計範圍：近 ${days.length} 天（含今天與已排定的未來）</div>
          </div></div>
        </div>
      </div>
    </div>

    ${section("fa-solid fa-clock-rotate-left", `歷史 ${WINDOW.back} 日`, "左右滑動查看・不可修改", "hist")}
    <div class="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 -mx-3.5 px-3.5 cursor-grab select-none" data-scroll="hist">${hist.map(histCard).join("")}</div>

    ${section("fa-solid fa-pen-to-square", "今日與未來 2 日", "可編輯")}
    <div class="grid grid-cols-3 gap-2.5">${near.map(editCard).join("")}</div>

    ${section("fa-solid fa-calendar-plus", "之後的日子", "左右滑動・可編輯・可新增", "later")}
    <div class="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 -mx-3.5 px-3.5 cursor-grab" data-scroll="later">${later.map((d) => editCard(d, "shrink-0 w-[8.25rem]")).join("")}${canAdd ? `<button data-tip="bowl-addday" data-a="addday" class="shrink-0 w-[8.25rem] min-h-[8rem] rounded-2xl border-2 border-dashed theme-border-primary theme-text-primary bg-white/50 dark:bg-slate-800/50 flex flex-col items-center justify-center gap-1 font-black text-sm active:scale-95 transition"><i class="fa-solid fa-plus text-xl"></i>新增一天</button>` : ""}</div>

    <div class="flex gap-2.5 mt-6 pb-24">
      <button data-tip="bowl-auto" data-a="auto" class="flex-1 py-3.5 rounded-2xl theme-bg-primary text-white text-base font-black soft-shadow-sm active:scale-95 transition"><i class="fa-solid fa-bolt"></i> 自動排班</button>
      <button data-tip="bowl-reset" data-a="reset" class="flex-1 py-3.5 rounded-2xl bg-slate-300 dark:bg-slate-600 text-slate-800 dark:text-slate-100 text-base font-black active:scale-95 transition"><i class="fa-solid fa-rotate-left"></i> 重設未來</button>
    </div>`;
}

// 電子郵件不在名單內（或名單還沒設定）：整個服務不開放
function renderEmailLocked() {
  const mail = state.account?.email || "";
  const msg = getBowlEmails().length
    ? `目前登入的帳號${mail ? `（${esc(mail)}）` : ""}不在可進入的名單內。<br>請請管理員把你的電子郵件加進名單。`
    : "還沒有設定可進入的成員名單。<br>請管理員在 Firestore 的 default 填入 bowlEmails，再到系統設定按「API 資料更新」。";
  return `<div class="pt-1"></div>
    <div class="text-center py-12 px-4">
      <div class="w-20 h-20 mx-auto rounded-full bg-white dark:bg-slate-800 soft-shadow-md flex items-center justify-center mb-5"><i class="fa-solid fa-lock text-3xl theme-text-primary"></i></div>
      <h3 class="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">這個服務沒有開放給你</h3>
      <p class="text-base font-medium text-slate-500 dark:text-slate-400 leading-relaxed">${msg}</p>
    </div>`;
}

function render() {
  if (!root) return;
  if (!canEnterBowl(state.account?.email)) { root.querySelector("[data-view]").innerHTML = renderEmailLocked(); return; }
  const pos = {};
  root.querySelectorAll("[data-scroll]").forEach((el) => { pos[el.dataset.scroll] = el.scrollLeft; });
  root.querySelector("[data-view]").innerHTML = renderMain();
  root.querySelectorAll("[data-scroll]").forEach((el) => {
    const k = el.dataset.scroll;
    if (k === "hist" && pos.hist === undefined) el.scrollLeft = el.scrollWidth; // 歷史列第一次停在最近（昨天）
    else if (pos[k] !== undefined) el.scrollLeft = pos[k];
  });
  if (scrollLaterEnd) { const el = root.querySelector('[data-scroll="later"]'); if (el) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" }); scrollLaterEnd = false; }
}

// ---------- 資料與事件 ----------
let saveState = "idle"; // idle | pending | saving | saved | error
let dirty = false;      // 畫面上有還沒保存的修改
let saving = false;
let saveTimer = null;
const SAVE_DELAY = 1500;
const clone = (o) => JSON.parse(JSON.stringify(o));

async function reload() {
  if (dirty || saving) return; // 有還沒保存的修改時，不要用伺服器資料蓋掉
  try {
    const d = await bowlApi.load();
    members = d.members; records = d.records; extraAhead = d.ahead || 0;
  } catch (e) {
    members = []; records = {};
    if (alive) toast?.("讀取失敗：" + (e.message || e));
  }
  if (alive) render();
}

// 畫面上的修改：先改畫面（馬上看到），停手 1.5 秒後自動存進伺服器
function edit(fn) {
  fn();
  dirty = true; saveState = "pending";
  clearTimeout(saveTimer); saveTimer = setTimeout(flush, SAVE_DELAY);
  render();
}

async function flush() {
  clearTimeout(saveTimer); saveTimer = null;
  if (!dirty || saving) return;
  saving = true; dirty = false; saveState = "saving"; if (alive) render();
  try {
    await bowlApi.saveAll({ records: clone(records), ahead: extraAhead });
    saveState = dirty ? "pending" : "saved";
  } catch (ex) {
    dirty = true; saveState = "error";
    if (alive) toast("保存失敗：" + (ex.message || ex));
    saveTimer = setTimeout(flush, 5000); // 5 秒後自動重試
  } finally {
    saving = false;
    if (alive) render();
  }
}

const orderIds = () => chores().map((m) => m.id);
const inWindow = (dateStr) => dayOffset(dateStr) >= -WINDOW.back;

// 覆蓋儲存：先刪掉伺服器上整份「換誰洗碗」資料，再存入目前畫面的資料（只留歷史 5 日之後的日子）
async function overwriteSave() {
  if (!alive || !canEnterBowl(state.account?.email)) return;
  if (!bowlApi.synced()) { toast("尚未連上伺服器 Firebase，無法覆蓋儲存"); return; }
  clearTimeout(saveTimer); saveTimer = null;
  const keep = Object.fromEntries(Object.entries(records).filter(([d]) => inWindow(d)));
  saving = true; dirty = false; saveState = "saving"; render();
  try {
    await bowlApi.overwrite({ members: clone(members), records: keep, ahead: extraAhead });
    records = keep; saveState = "saved";
    toast("已覆蓋儲存");
  } catch (ex) {
    dirty = true; saveState = "error";
    toast("覆蓋儲存失敗：" + (ex.message || ex), 4000);
    saveTimer = setTimeout(flush, 5000);
  } finally {
    saving = false; render();
  }
}

function onClick(e) {
  const t = e.target.closest("[data-a]");
  if (!t || t.disabled) return;
  const a = t.dataset.a, d = t.dataset;
  if (a === "set") { if (d.date < ymd()) return; edit(() => { const r = toggleTask(records[d.date], d.task, d.id); if (isEmptyDay(r)) delete records[d.date]; else records[d.date] = r; }); return; }
  if (a === "vac") { if (d.date < ymd()) return; edit(() => { const r = toggleOff(records[d.date]); if (isEmptyDay(r)) delete records[d.date]; else records[d.date] = r; }); return; }
  if (a === "auto") { edit(() => { records = autoSchedule(daysGrid(new Date(), curAhead), clone(records), orderIds()); }); toast("已自動排班"); return; }
  if (a === "reset") { edit(() => { records = clearFuture(daysGrid(new Date(), curAhead), clone(records)); }); toast("已清空未來的安排"); return; }
  if (a === "send") { openSendModal(); return; }
  if (a === "stat") { // 不重畫整頁，直接改樣式讓 CSS 動畫生效（展開 / 收合有滑動與淡入淡出）
    statOpen = !statOpen;
    t.setAttribute("aria-expanded", String(statOpen));
    const body = root.querySelector("[data-stat-body]"), chev = root.querySelector("[data-stat-chev]");
    if (body) { body.style.gridTemplateRows = statOpen ? "1fr" : "0fr"; body.style.opacity = statOpen ? "1" : "0"; }
    if (chev) chev.style.transform = `rotate(${statOpen ? 180 : 0}deg)`;
    return;
  }
  if (a === "addday") { scrollLaterEnd = true; edit(() => { extraAhead = Math.min(MAX_AHEAD, curAhead + 1); }); return; }
  if (a === "scroll") { const el = root.querySelector(`[data-scroll="${d.k}"]`); el?.scrollBy({ left: Number(d.dir) * 270, behavior: "smooth" }); return; }
}

// ---------- 發送今日執勤到 LINE（經 Google Apps Script 中繼站）----------
const hex = (c, d) => (/^#[0-9a-f]{6}$/i.test(String(c || "").trim()) ? String(c).trim() : d);

// 與畫面上「今日執勤」卡片相同的 LINE Flex Message（不含發送按鈕）
function buildDutyFlex() {
  const todayStr = ymd();
  const td = records[todayStr] || { clear: null, wash: null, off: false };
  const primary = hex(getComputedStyle(document.documentElement).getPropertyValue("--primary-color"), "#059669");
  const vac = hex(VACATION_COLOR, "#d97706");
  const col = (label, labelColor, id) => {
    const m = id && byId(id);
    const emoji = td.off ? "🏖️" : m ? m.emoji : "?";
    const color = td.off ? vac : m ? hex(m.color, "#64748b") : "#94a3b8";
    const name = td.off ? "休假" : m ? m.name : "尚未安排";
    return {
      type: "box", layout: "vertical", flex: 1, spacing: "md", alignItems: "center",
      contents: [
        { type: "text", text: label, size: "sm", weight: "bold", color: labelColor, align: "center" },
        { type: "box", layout: "vertical", width: "64px", height: "64px", cornerRadius: "32px", borderWidth: "3px", borderColor: color, backgroundColor: "#ffffff", justifyContent: "center", alignItems: "center",
          contents: [{ type: "text", text: emoji, size: "3xl", align: "center" }] },
        { type: "text", text: name, size: "lg", weight: "bold", color, align: "center", wrap: true },
      ],
    };
  };
  const dateTxt = `${todayStr.slice(5)} 週${weekday(todayStr)}`;
  const name = (id) => (td.off ? "休假" : id && byId(id) ? byId(id).name : "尚未安排");
  return {
    type: "flex",
    altText: `今日執勤 ${dateTxt}：收碗 ${name(td.clear)}、洗碗 ${name(td.wash)}`,
    contents: {
      type: "bubble", size: "kilo",
      header: { type: "box", layout: "horizontal", backgroundColor: primary, paddingAll: "12px", alignItems: "center",
        contents: [
          { type: "text", text: "📌 今日執勤", weight: "bold", size: "md", color: "#ffffff", flex: 1 },
          { type: "text", text: dateTxt, size: "xs", color: "#ffffff", align: "end" },
        ] },
      body: { type: "box", layout: "horizontal", paddingAll: "16px", spacing: "md",
        contents: [col("🍜 收碗", "#ea580c", td.clear), { type: "separator" }, col("🧼 洗碗", "#0284c7", td.wash)] },
    },
  };
}

function openSendModal() {
  openLineSendDialog({ title: "今日執勤", subtitle: "把今天的收碗、洗碗發送到 LINE", buildMessages: () => [buildDutyFlex()] });
}

export default {
  id: "換誰洗碗",
  storage: "server", // 資料存放：server = 家庭共用 Firestore；private = 私人 Firestore（core/cloud.js 連線）
  access: "members", // 登入後，僅「可瀏覽」名單內的成員可使用（訪客一律禁止）
  requiresLogin: true,
  mount(el) {
    alive = true;
    showTipHint("bowl");
    root = document.createElement("div");
    root.className = "px-3.5 pb-6";
    root.innerHTML = `<div data-view></div>`;
    el.appendChild(root);
    root.addEventListener("click", onClick);
    // 電腦版：滑鼠按住拖曳也能左右捲動（手機用觸控原生捲動）
    let drag = null, moved = false;
    root.addEventListener("pointerdown", (e) => {
      const el = e.pointerType === "mouse" && e.button === 0 && e.target.closest("[data-scroll]");
      if (!el || e.target.closest("button")) return;
      drag = { el, x: e.clientX, left: el.scrollLeft }; moved = false;
    });
    root.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 4) moved = true;
      if (moved) drag.el.scrollLeft = drag.left - dx;
    });
    const endDrag = () => { drag = null; };
    root.addEventListener("pointerup", endDrag); root.addEventListener("pointerleave", endDrag); root.addEventListener("pointercancel", endDrag);
    offApi = on("api:refresh", () => { if (alive) render(); }); // 〔API 資料更新〕後名單可能變了 → 重新判斷
    offData = on("data:change", ({ name }) => { if (alive && /^bowl_/.test(name || "")) reload(); }); // 伺服器同步 / 其他家人修改時即時更新
    offCloud = on("cloud:change", () => { if (alive) render(); });
    offOverwrite = on("bowl:overwrite", () => { overwriteSave(); });
    reload();
  },
  unmount() { closeTips(); closeLineSendDialog(); flush(); alive = false; offOverwrite?.(); offOverwrite = null; statOpen = false; saveState = "idle"; offApi?.(); offApi = null; offData?.(); offData = null; offCloud?.(); offCloud = null; root?.remove(); root = null; extraAhead = 0; },
};
