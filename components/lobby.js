// 大廳：歡迎頁 + 「已選擇要顯示」的服務簡略資訊。
//   - 哪些服務、什麼順序、各自顯示什麼：由 ︙ 大廳設定（顯示管理 / 大廳排序 / 各列的「>」）決定，資料規則在 core/lobby-model.js
//   - 每個服務只佔一個區塊、一行可水平滑動的小卡；點區塊標題會進入該服務。小卡只有「生活圖卡」可以點：直接打開那一張圖卡，其餘服務的小卡只顯示資訊
//   - 目前有簡略資訊的服務：家庭公告、家庭日曆、換誰洗碗、生活圖卡、碼表（其餘服務暫時不顯示）
//   - 計時器：大廳可加時間（1/3/5/10/15/30 分，連點累加）、開始 / 暫停 / 清除，和計時器頁共用同一個計時器；倒數時小卡外框是倒數進度環（越來越短），最後 10 秒開始繞圈
//   - 碼表：大廳只有 開始 / 暫停 / 清除，和碼表頁共用同一個計時器（services/stopwatch/shared.js），碼表頁在跑的時候大廳也會一起跑秒
//   - 各服務要挑哪幾筆、整理成什麼欄位：core/lobby-feed.js（可用 Node 測試）
import { state, on } from "../core/store.js";
import { showTipHint } from "../core/tips.js";
import { showToast } from "../core/toast.js";
import { micErrMsg, ensureMic } from "../core/mic.js";
import { lobbyOrdered, getMode, modeLabelOf, lobbyCards, lobbyMenus, lobbyMenusAll, ledgerParts } from "../core/lobby-model.js";
import { appIcon, fixAppIcons } from "../core/app-icon.js";
import { noteItems, memoItems, calendarItems, calendarFetchRange, CAL_EMPTY, bowlItems, cardItems } from "../core/lobby-feed.js";
import { notesApi, PALETTE as NOTE_PALETTE } from "../services/notes/data.js";
import { calendarApi, COLOR_MAP, DEFAULT_COLOR } from "../services/calendar/data.js";
import { gcalApi } from "../core/gcal.js";
import { memoApi, catStyle } from "../services/memo/data.js";
import { bowlApi } from "../services/bowl/data.js";
import { menuApi } from "../services/menu/data.js";
import { cardsApi, KINDS } from "../services/cards/data.js";
import { ledgerApi } from "../services/ledger/data.js";
import { summarize, monthKey } from "../services/ledger/engine.js";
import { translatorApi } from "../services/translator/data.js";
import { canEnterBowl } from "../core/bowl-emails.js";
import { registerActions } from "../core/actions.js";
import { fmtStopwatch } from "../services/stopwatch/engine.js";
import { sw, syncBackground } from "../services/stopwatch/shared.js";
import { timerApi } from "../services/timer/index.js";
import { fmtClock, fmtSpoken, PRESETS } from "../services/timer/engine.js";

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safeImg = (u) => (/^https:\/\//i.test(u || "") ? u : "");
const GCAL_PALETTE = ["#039BE5", "#33B679", "#8E24AA", "#F4511E", "#F6BF26", "#3F51B5", "#E67C73", "#0B8043"]; // 與家庭日曆頁各 Google 日曆的代表色一致

const CHIP = "shrink-0 snap-start w-40 min-h-[3.5rem] rounded-xl px-3 py-2 text-left border";
const PLAIN = `${CHIP} bg-white/60 dark:bg-slate-800/60 border-white/70 dark:border-slate-700/70`;
const BIG = "shrink-0 snap-start w-56 min-h-[4.5rem] rounded-2xl px-3.5 py-3 text-left border-2 border-dashed border-slate-300 dark:border-slate-500 bg-white/60 dark:bg-slate-800/60"; // 生活圖卡：大一點的小卡
const nav = (id) => `data-action="nav" data-feature="${esc(id)}"`;
const msg = (t) => `<p class="shrink-0 w-full text-xs font-semibold text-slate-400 dark:text-slate-500 py-3">${esc(t)}</p>`;

const TASK = { 收碗: { icon: "fa-bowl-food", color: "#ea580c" }, 洗碗: { icon: "fa-hands-bubbles", color: "#2563eb" } }; // 換誰洗碗：小標題的圖示

/* ---------- 各服務：讀資料 + 畫小卡 ---------- */
const SECTIONS = {
  家庭公告: {
    login: true,
    load: () => notesApi.list(),
    build(raw, id) {
      const mode = getMode(id);
      const items = noteItems(raw, mode);
      if (!items.length) return msg("目前沒有公告");
      return items.map((n) => {
        const c = n.expired ? NOTE_PALETTE.expired : NOTE_PALETTE[n.color] || NOTE_PALETTE.gray; // 已過期的跟公告頁一樣變灰、排在最後
        return `<div class="relative shrink-0 snap-start w-44 rounded-b-lg border-t-[6px] px-3 pt-4 pb-3 text-left shadow-md" style="background:${c.bg};color:${c.text};border-color:${c.border}">
          <span class="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-3.5 bg-white/70 border border-dashed border-black/20"></span>
          <span class="flex items-center gap-1.5 mb-1.5">
            <span class="text-[10px] font-extrabold px-1.5 py-0.5 rounded border-2 border-current leading-none">${esc(n.tag)}</span>
            ${n.pinned ? '<span class="text-[10px] font-extrabold text-red-600 whitespace-nowrap"><i class="fa-solid fa-thumbtack"></i> 已置頂</span>' : ""}
          </span>
          <span class="block text-sm font-black truncate">${esc(n.title)}</span>
        </div>`;
      }).join("");
    },
  },
  個人記事本: {
    // 我的筆記：只顯示標題（不顯示內容）；沒登入也能看（資料依「儲存位置」設定，不保存時就是畫面上暫存的）
    load: () => memoApi.list(),
    build(raw, id) {
      const mode = getMode(id);
      const items = memoItems(raw, mode);
      if (!items.length) return msg(mode === "pinned" ? "目前沒有釘選的筆記" : "目前沒有符合的筆記");
      // 筆記風格：橫線紙 + 左側分類色條 + 膠帶，只放分類與標題
      return items.map((m, i) => `<div class="lob-memo" style="--memo-accent:${catStyle(m.category).accent};transform:rotate(${i % 2 ? .5 : -.5}deg)">
          <span class="lob-memo-tape"></span>
          <span class="lob-memo-meta"><span class="truncate">${esc(m.category)}</span>${m.pinned ? '<i class="fa-solid fa-thumbtack text-rose-500"></i>' : ""}</span>
          <span class="lob-memo-title">${esc(m.title)}</span>
        </div>`).join("");
    },
  },
  記帳: {
    // 記帳本：跟記帳頁的「本月結餘」卡同樣式；依大廳設定顯示 本月結餘 / 收入 / 支出（全部 = 三個都顯示）。沒登入也能看（資料依「儲存位置」設定）
    load: () => ledgerApi.list(),
    build(raw, id) {
      const parts = ledgerParts(getMode(id));
      const sum = summarize(raw || [], monthKey());
      const money = (n) => "$" + Number(n).toLocaleString("zh-TW", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      const flow = sum.income + sum.expense;
      const inPct = flow ? Math.round((sum.income / flow) * 100) : 50;
      const mm = monthKey().slice(5);
      const top = parts.includes("balance")
        ? `<div class="lg-sum-top"><div class="lg-label">本月結餘 <span class="lg-stamp">${mm}月</span></div>
            <div class="lg-balance ${sum.balance < 0 ? "neg" : ""}">${sum.balance < 0 ? "-" : ""}${money(Math.abs(sum.balance))}</div>
            ${parts.length === 3 ? `<div class="lg-ratio"><i style="width:${inPct}%"></i></div>` : ""}</div>` : "";
      const cols = [];
      if (parts.includes("income")) cols.push(`<div><span class="lg-label">${parts.includes("balance") ? "收入" : `本月收入 <span class="lg-stamp">${mm}月</span>`}</span><b class="lg-in">${money(sum.income)}</b></div>`);
      if (parts.includes("expense")) cols.push(`<div><span class="lg-label">${parts.includes("balance") ? "支出" : `本月支出 <span class="lg-stamp">${mm}月</span>`}</span><b class="lg-out">${money(sum.expense)}</b></div>`);
      const colsHtml = cols.length ? `<div class="lg-cols" style="grid-template-columns:repeat(${cols.length},1fr);${top ? "" : "border-top:0"}">${cols.join("")}</div>` : "";
      return `<div class="lg-card lg-book lob-lg">${'<div class="lg-spine"></div>'}${top}${colsHtml}</div>`;
    },
  },
  家庭日曆: {
    // 一次抓「這個月 + 未來 14 天」涵蓋的範圍，四種顯示方式（今日 / 未來7天 / 未來14天 / 這個月）共用同一份資料。跟家庭日曆頁一樣：有新增 Google 日曆就讀它們，否則讀 App 內行程
    async load() {
      const { from, to } = calendarFetchRange();
      const gcals = state.calendarIds || [];
      if (!gcals.length) {
        const last = new Date(to.getTime() - 864e5);
        const months = []; // 範圍內每一個月（可能橫跨 2 個月）
        for (let d = new Date(from.getFullYear(), from.getMonth(), 1); d <= last; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) months.push([d.getFullYear(), d.getMonth()]);
        return (await Promise.all(months.map(([y, m]) => calendarApi.getMonthEvents(y, m)))).flat();
      }
      const res = await Promise.allSettled(gcals.map((c, i) => gcalApi.list(c.calId, from, to, { name: c.name || c.calId, hex: GCAL_PALETTE[i % GCAL_PALETTE.length] })));
      if (res.every((r) => r.status === "rejected")) throw res[0].reason;
      return res.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    },
    build(raw, id) {
      const mode = getMode(id);
      const items = calendarItems(raw, mode);
      if (!items.length) return msg(CAL_EMPTY[mode] || "沒有行程");
      // 跟家庭日曆「點行程」的浮動視窗同款：上方日曆環 + 主色頁首 + 月/日白色日期牌，下方只放標題
      return items.map((e) => `<div class="lob-cal relative shrink-0 snap-start w-44 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 shadow-md">
          <div class="cal-rings" aria-hidden="true"><i></i><i></i><i></i></div>
          <div class="cal-head lob-cal-head"><div class="cal-head-main" style="justify-content:flex-start"><span class="lob-cal-date">${e.month}/${e.day}</span></div></div>
          <h4 class="mx-3 mt-3 mb-3.5 pl-3 text-base font-black leading-snug text-slate-800 dark:text-slate-100 break-words line-clamp-2" style="border-left:5px solid ${esc(COLOR_MAP[e.colorId] || e.hex || DEFAULT_COLOR)}">${esc(e.title)}</h4>
        </div>`).join("");
    },
  },
  換誰洗碗: {
    login: true,
    // 只有「可進入的電子郵件」名單內的帳號才讀（跟換誰洗碗頁相同的限制）
    load: async () => (canEnterBowl(state.account?.email) ? await bowlApi.load() : { locked: true }),
    build(raw, id) {
      if (raw?.locked) return msg("這個帳號沒有查看權限");
      const items = bowlItems(raw);
      const one = items[0];
      const box = "shrink-0 snap-start w-full rounded-xl px-3 py-3 border-2 border-dashed border-slate-300 dark:border-slate-500 bg-white/60 dark:bg-slate-800/60"; // 收碗 / 洗碗並排在同一張卡，中間一條分隔線
      if (items.length === 1) { // 休假 / 還沒排班
        return one.emoji
          ? `<div class="${box} flex flex-col items-center gap-1"><span class="text-3xl leading-none">${esc(one.emoji)}</span><span class="text-sm font-black text-slate-600 dark:text-slate-300">今天${esc(one.name)}</span></div>`
          : msg("今天還沒排班");
      }
      const cell = (b) => {
        const t = TASK[b.label] || {};
        const col = b.color || "#94a3b8"; // 沒安排：灰色
        return `<span class="flex-1 min-w-0 flex flex-col items-center gap-1.5">
          <span class="flex items-center gap-1 text-xs font-black text-slate-500 dark:text-slate-400"><i class="fa-solid ${t.icon || "fa-circle"} text-[11px]" style="color:${t.color || "#94a3b8"}"></i>${esc(b.label)}</span>
          <span class="w-14 h-14 rounded-full flex items-center justify-center bg-white dark:bg-slate-700" style="border:3px solid ${esc(col)}">${b.emoji ? `<span class="text-3xl leading-none">${esc(b.emoji)}</span>` : '<i class="fa-solid fa-minus text-slate-300"></i>'}</span>
          <span class="max-w-full truncate text-base font-black" style="color:${esc(col)}">${esc(b.name)}</span>
        </span>`;
      };
      return `<div class="${box} flex items-stretch gap-2">${cell(items[0])}<span class="w-px bg-slate-200 dark:bg-slate-700 my-1"></span>${cell(items[1])}</div>`;
    },
  },
  菜單: {
    login: true,
    load: () => menuApi.list(),
    build(raw, id) {
      const pick = new Set(lobbyMenus());
      const all = Array.isArray(raw) ? raw : [];
      let items = all.filter((m) => lobbyMenusAll() || pick.has(m.id)); // 沒有勾選特定菜單 = 全部
      if (!items.length && all.length) items = all; // 以前選的菜單已不存在 → 當作「全部」
      if (!items.length) return msg(lobbyMenusAll() ? "還沒有新增任何菜單，請先到「菜單」新增" : "選擇的菜單已不存在，請重新選擇");
      return items.map((m) => {
        const fb = "fa-solid fa-bowl-food text-sm theme-text-primary";
        const u = safeImg(m.iconUrl);
        const icon = u ? `<img data-icon data-fb="${esc(fb)}" src="${esc(u)}" alt="" referrerpolicy="no-referrer" class="w-full h-full object-contain">` : `<i class="${fb}"></i>`;
        return `<button type="button" ${nav(id)} data-open-menu="${esc(m.id)}" data-tip="lobby-card" class="${BIG} flex items-center gap-3 active:scale-95 transition">
          <span class="w-12 h-12 rounded-xl theme-bg-light overflow-hidden flex items-center justify-center shrink-0">${icon}</span>
          <span class="min-w-0 text-base font-black text-slate-800 dark:text-slate-100 truncate">${esc(m.name)}</span>
        </button>`;
      }).join("");
    },
  },
  翻譯機: {
    // 大廳的翻譯機：依「大廳設定 → 翻譯機」選的方式顯示。中翻英 / 英翻中 = 直接在大廳輸入、翻譯；即時翻譯 = 一鍵進入翻譯機並開啟即時翻譯
    load: async () => null,
    build(_raw, id) {
      const mode = getMode(id);
      if (mode === "live") {
        return `<button type="button" ${nav(id)} data-live="1" data-tip="lobby-card" class="${BIG} w-full flex items-center gap-3 active:scale-95 transition">
          <span class="w-12 h-12 rounded-xl theme-bg-primary text-white flex items-center justify-center shrink-0"><i class="fa-solid fa-microphone text-xl"></i></span>
          <span class="min-w-0"><span class="block text-base font-black text-slate-800 dark:text-slate-100">開始即時翻譯</span><span class="block text-xs font-semibold text-slate-400">邊說邊翻，也可以打字</span></span>
        </button>`;
      }
      const zh = mode === "zh-en";
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const canSpeak = "speechSynthesis" in window;
      return `<div data-lob-tr="${zh ? "zh-en" : "en-zh"}" class="shrink-0 w-full space-y-2">
        <div class="flex items-end gap-2 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-white/70 dark:border-slate-700/70 p-2.5">
          <textarea data-lob-tr-in rows="2" maxlength="500" placeholder="${zh ? "輸入中文，翻成英文…" : "Type English, translate to 中文…"}" class="flex-1 min-w-0 bg-transparent resize-none outline-none text-base font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400"></textarea>
          ${SR ? `<button type="button" data-lob-tr-mic data-tip="tr-mic" aria-label="語音輸入" class="w-10 h-10 rounded-full theme-bg-light theme-text-primary shrink-0 flex items-center justify-center active:scale-90 transition"><i class="fa-solid fa-microphone"></i></button>` : ""}
          <button type="button" data-lob-tr-go data-tip="tr-go" class="h-10 px-4 rounded-xl theme-bg-primary text-white font-black text-sm shrink-0 active:scale-95 transition"><i class="fa-solid fa-language"></i> 翻譯</button>
        </div>
        <div data-lob-tr-box class="hidden flex items-start gap-2 rounded-2xl border-2 theme-border-primary bg-white/80 dark:bg-slate-800/80 px-3 py-2.5">
          <p data-lob-tr-out class="flex-1 min-w-0 text-lg font-black text-slate-900 dark:text-white break-words select-text"></p>
          ${canSpeak ? `<button type="button" data-lob-tr-speak data-tip="tr-speak" aria-label="朗讀" class="hidden w-10 h-10 rounded-full theme-bg-light theme-text-primary shrink-0 flex items-center justify-center active:scale-90 transition"><i class="fa-solid fa-volume-high"></i></button>` : ""}
        </div>
      </div>`;
    },
  },
  計時器: {
    // 大廳的計時器：和計時器頁共用同一個計時器。外框 = 倒數進度環（剩餘越少弧線越短），最後 10 秒弧線開始繞著外框轉圈、越轉越快
    load: async () => null,
    after: () => { layoutTm(); startTmLoop(); },
    build() {
      const t = timerApi.timer;
      const st = t.status;
      const idle = st === "idle", run = st === "running", paused = st === "paused", done = st === "done";
      const sub = done ? "時間到了！" : paused ? "已暫停" : run ? (t.label || "倒數中") : "點下面的時間累加";
      const goOff = done || (idle && t.setMs <= 0);
      const cancelOff = done || (idle && t.setMs <= 0);
      const btn = "h-11 px-3.5 rounded-full font-black text-base shrink-0 active:scale-95 transition";
      return `<div data-lob-tm-card class="relative shrink-0 w-full rounded-2xl bg-white/80 dark:bg-slate-800/80 px-3.5 py-3 space-y-3" role="timer" aria-label="計時器，${esc(fmtSpoken(t.remaining()))}">
        <svg data-lob-tm-svg class="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
          <rect data-lob-tm-track fill="none" stroke-width="3.5" class="stroke-slate-200 dark:stroke-slate-700"/>
          <rect data-lob-tm-arc fill="none" stroke-width="3.5" stroke-linecap="round" pathLength="100" stroke="var(--primary-color)" style="display:none"/>
        </svg>
        <div class="relative flex items-center gap-2.5">
          <span class="flex-1 min-w-0">
            <span data-lob-tm-time class="block whitespace-nowrap font-black tabular-nums text-slate-900 dark:text-white leading-none ${paused ? "opacity-60" : ""}" style="font-size:clamp(1.5rem,8vw,1.9rem)">${fmtClock(t.remaining())}</span>
            <span class="block truncate text-xs font-bold mt-1 ${done ? "text-rose-500" : "text-slate-400 dark:text-slate-500"}">${esc(sub)}</span>
          </span>
          <button type="button" data-action="lob-tm" data-op="toggle" ${goOff ? "disabled" : ""} class="${btn} ${goOff ? "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500" : "theme-bg-primary text-white"}"><i class="fa-solid ${run ? "fa-pause" : "fa-play"} mr-1"></i>${run ? "暫停" : paused ? "繼續" : "開始"}</button>
          <button type="button" data-action="lob-tm" data-op="cancel" ${cancelOff ? "disabled" : ""} class="${btn} ${tmArmed && !idle ? "bg-red-500 text-white" : cancelOff ? "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-100"}">${tmArmed && !idle ? "再按一次" : idle ? "清除" : "取消"}</button>
        </div>
        ${idle ? `<div class="relative grid grid-cols-6 gap-1.5">${PRESETS.map((p) => `<button type="button" data-action="lob-tm" data-op="preset" data-ms="${p.ms}" aria-label="加 ${esc(p.label)}" class="h-10 px-0 rounded-xl font-black text-sm whitespace-nowrap active:scale-95 transition bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200">${esc(p.label)}</button>`).join("")}</div>` : ""}
      </div>`;
    },
  },
  碼表: {
    // 大廳的碼表：只有 開始 / 暫停 / 清除；和碼表頁共用同一個計時器，所以碼表頁在跑的時候，這裡也一起跑秒
    load: async () => null,
    after: () => startSwLoop(),
    build() {
      const run = sw.status === "running";
      const idle = sw.status === "idle";
      return `<div class="shrink-0 w-full rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-white/70 dark:border-slate-700/70 px-3.5 py-3 flex items-center gap-3" role="timer" aria-label="碼表">
        <span data-lob-sw-time class="flex-1 min-w-0 whitespace-nowrap font-black tabular-nums text-slate-900 dark:text-white leading-none ${sw.status === "paused" ? "opacity-60" : ""}" style="font-size:clamp(1.5rem,8vw,1.9rem)">${fmtStopwatch(sw.elapsed())}</span>
        <button type="button" data-action="lob-sw" data-op="toggle" class="h-11 px-4 rounded-full theme-bg-primary text-white font-black text-base shrink-0 active:scale-95 transition"><i class="fa-solid ${run ? "fa-pause" : "fa-play"} mr-1"></i>${run ? "暫停" : sw.status === "paused" ? "繼續" : "開始"}</button>
        <button type="button" data-action="lob-sw" data-op="reset" ${idle ? "disabled" : ""} class="h-11 px-4 rounded-full font-black text-base shrink-0 active:scale-95 transition ${idle ? "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-100"}">清除</button>
      </div>`;
    },
  },
  生活圖卡: {
    login: true,
    load: () => cardsApi.list(),
    build(raw, id) {
      if (!lobbyCards().length) return msg("還沒選擇要顯示的圖卡（大廳設定 → 大廳排序 → 生活圖卡 ›）");
      const items = cardItems(raw, lobbyCards());
      if (!items.length) return msg("選擇的圖卡已不存在，請重新選擇");
      return items.map((k) => {
        const fb = `fa-solid ${KINDS[k.kind]?.icon || "fa-image"} text-sm theme-text-primary`;
        const u = safeImg(k.iconUrl);
        const icon = u ? `<img data-icon data-fb="${esc(fb)}" src="${esc(u)}" alt="" referrerpolicy="no-referrer" class="w-full h-full object-contain">` : `<i class="${fb}"></i>`;
        return `<button type="button" ${nav(id)} data-open-card="${esc(k.id)}" data-tip="lobby-card" class="${BIG} flex items-center gap-3 active:scale-95 transition">
          <span class="w-12 h-12 rounded-xl theme-bg-light overflow-hidden flex items-center justify-center shrink-0">${icon}</span>
          <span class="min-w-0"><span class="block text-base font-black text-slate-800 dark:text-slate-100 truncate">${esc(k.name)}</span><span class="block text-xs font-semibold text-slate-400 truncate">${esc(k.kind)}</span></span>
        </button>`;
      }).join("");
    },
  },
};

/* ---------- 碼表：跑秒 ---------- */
let swRaf = null;
function swLoop() {
  swRaf = null;
  const els = document.querySelectorAll("[data-lob-sw-time]");
  if (!els.length) return; // 離開大廳（小卡不在畫面上）就停
  const t = fmtStopwatch(sw.elapsed());
  els.forEach((e) => { e.textContent = t; });
  if (sw.status === "running") swRaf = requestAnimationFrame(swLoop);
}
function startSwLoop() {
  if (!swRaf && sw.status === "running") swRaf = requestAnimationFrame(swLoop);
}

/* ---------- 計時器：外框倒數進度環 ---------- */
const SPIN_MS = 10_000; // 剩餘不到這個時間，弧線開始繞圈（短計時最多只轉後半段）
const RX = 15;          // 小卡圓角（rounded-2xl = 16px，外框內縮半個線寬）
let tmRaf = null;
let tmSpin = 0;         // 轉圈的位置（外框長度的 0~100）
let tmLast = 0;
let tmArmed = false;    // 「取消」要按兩次的確認狀態
let tmArmId = null;
const tmGeo = { s0: 0 };

// 依小卡目前的大小畫出外框（弧線從上方正中央開始，順時針）
function layoutTm() {
  const card = document.querySelector("[data-lob-tm-card]");
  if (!card) return;
  const w = card.clientWidth, h = card.clientHeight;
  if (!w || !h || card.dataset.wh === `${w}x${h}`) return;
  card.dataset.wh = `${w}x${h}`;
  const W = w - 3.5, H = h - 3.5;
  card.querySelectorAll("rect").forEach((r) => {
    r.setAttribute("x", 1.75); r.setAttribute("y", 1.75); r.setAttribute("width", W); r.setAttribute("height", H); r.setAttribute("rx", RX); r.setAttribute("pathLength", 100);
  });
  const per = 2 * (W - 2 * RX) + 2 * (H - 2 * RX) + 2 * Math.PI * RX;
  tmGeo.s0 = ((W / 2 - RX) / per) * 100; // 外框路徑從左上圓角結束處開始，這是「上方正中央」的位置
}

function paintTm(dt) {
  const card = document.querySelector("[data-lob-tm-card]");
  if (!card) return false;
  layoutTm();
  const t = timerApi.timer;
  const rem = t.remaining();
  const label = card.querySelector("[data-lob-tm-time]");
  const txt = fmtClock(rem);
  if (label && label.textContent !== txt) label.textContent = txt;
  const arc = card.querySelector("[data-lob-tm-arc]");
  if (!arc) return true;
  if (t.status !== "running" && t.status !== "paused") { arc.style.display = "none"; tmSpin = 0; return true; }
  const p = t.progress();
  const final = t.status === "running" && rem <= Math.min(SPIN_MS, t.totalMs / 2);
  if (final) { // 越接近結束轉得越快：每秒 0.5 圈 → 2 圈
    const near = 1 - rem / Math.min(SPIN_MS, t.totalMs / 2);
    tmSpin = (tmSpin + (50 + near * 150) * (dt / 1000)) % 100;
  } else tmSpin = 0;
  const len = Math.min(99.5, Math.max(final ? 4 : 0.8, p * 100)); // 弧線長度 = 剩餘比例（最後階段至少留一小段才看得到在轉）
  arc.style.display = "";
  arc.setAttribute("stroke-dasharray", `${len.toFixed(2)} ${(100 - len).toFixed(2)}`);
  arc.setAttribute("stroke-dashoffset", (-(tmGeo.s0 + tmSpin)).toFixed(2));
  arc.setAttribute("opacity", t.status === "paused" ? 0.45 : 1);
  return true;
}

function tmLoop(ts) {
  tmRaf = null;
  const dt = tmLast ? Math.min(100, ts - tmLast) : 16;
  tmLast = ts;
  if (!paintTm(dt)) { tmLast = 0; return; } // 離開大廳（小卡不在畫面上）就停
  if (timerApi.timer.status === "running") tmRaf = requestAnimationFrame(tmLoop);
  else tmLast = 0;
}
function startTmLoop() {
  tmLast = 0;
  paintTm(16);
  if (!tmRaf && timerApi.timer.status === "running") tmRaf = requestAnimationFrame(tmLoop);
}

/* ---------- 畫面 ---------- */
let raw = {};      // 這次進大廳讀回來的原始資料（改大廳設定時直接用，不重讀）
let seq = 0;       // 每次重畫 +1：舊的非同步結果不會蓋掉新畫面
let wired = false;

const modeLabel = (a) => (a.id === "生活圖卡" ? `已選 ${lobbyCards().length} 張` : a.id === "菜單" ? (lobbyMenusAll() ? "全部" : `已選 ${lobbyMenus().length} 份`) : modeLabelOf(a.id));

function shell(a) {
  // 除了「生活圖卡」（小卡直接打開那張圖卡），其餘服務點區塊任何地方都跳到該服務頁
  const whole = a.id === "生活圖卡" || a.id === "菜單" || a.id === "翻譯機" || a.id === "碼表" || a.id === "計時器" ? "" : `${nav(a.id)} data-tip="lobby-sec" data-tip-name="${esc(a.name)}" role="link" tabindex="-1"`;
  return `<section id="lobbySec-${esc(a.id)}" ${whole} class="glass-card rounded-3xl py-3${whole ? " cursor-pointer" : ""}">
    <button type="button" ${nav(a.id)} data-tip="lobby-sec" data-tip-name="${esc(a.name)}" class="w-full flex items-center gap-2 px-4 text-left">
      <span class="w-7 h-7 rounded-lg theme-bg-light overflow-hidden flex items-center justify-center shrink-0">${appIcon(a, "text-xs")}</span>
      <span class="text-sm font-black text-slate-800 dark:text-slate-100 truncate">${esc(a.name)}</span>
      <span class="text-[11px] font-semibold text-slate-400 dark:text-slate-500 truncate">${esc(modeLabel(a))}</span>
      <i class="fa-solid fa-chevron-right text-[10px] text-slate-300 dark:text-slate-600 ml-auto shrink-0"></i>
    </button>
    <div data-strip class="flex gap-2 overflow-x-auto no-scrollbar snap-x px-4 ${a.id === "家庭日曆" ? "pt-5" : "pt-2"} pb-1">${msg("讀取中…")}</div>
  </section>`;
}

async function fill(a, my, refetch) {
  const S = SECTIONS[a.id];
  const strip = () => (my === seq ? document.getElementById("lobbySec-" + a.id)?.querySelector("[data-strip]") : null);
  const show = (html) => {
    const el = strip();
    if (!el) return;
    el.innerHTML = html;
    el.querySelectorAll("img[data-icon]").forEach((im) => im.addEventListener("error", () => { const i = document.createElement("i"); i.className = im.dataset.fb; im.replaceWith(i); }, { once: true }));
  };
  if (S.login && !state.isLoggedIn) return show(msg("登入後才能查看"));
  try {
    if (refetch || !(a.id in raw)) raw[a.id] = await S.load();
    show(S.build(raw[a.id], a.id));
    S.after?.();
  } catch (e) {
    show(msg("讀取失敗：" + (e?.message || "請稍後再試")));
  }
}

function draw(refetch) {
  const feed = document.getElementById("lobbyFeed");
  if (!feed) return;
  const list = lobbyOrdered().filter((a) => SECTIONS[a.id]); // 其餘服務暫時沒有簡略資訊
  const my = ++seq;
  if (refetch) raw = {};
  feed.innerHTML = list.map(shell).join("");
  fixAppIcons(feed);
  list.forEach((a) => fill(a, my, refetch));
}

export function renderLobby(el /* , services */) {
  el.innerHTML = `
    <div class="px-5 pt-2 pb-6">
      <div class="flex items-center justify-between gap-3 mb-5">
        <h2 class="lobby-brand min-w-0 truncate">我們の家</h2>
        <button type="button" data-action="nav" data-feature="應用程式" data-tip="lobby-apps" class="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 soft-shadow-sm px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 active:scale-95 transition">所有應用<i class="fa-solid fa-chevron-right text-[10px] text-slate-400 dark:text-slate-500"></i></button>
      </div>
      <div id="lobbyFeed" class="space-y-4"></div>
    </div>`;
  if (!wired) { // 大廳設定、啟用/停用應用改變時，用已讀回來的資料重畫（不重新連線）
    wired = true;
    const again = () => { if (state.route === "大廳") draw(false); };
    on("lobby:change", again);
    // 大廳的翻譯機（中翻英 / 英翻中）：翻譯、麥克風語音輸入、朗讀譯文
    const dirOf = (box) => (box.dataset.lobTr === "zh-en" ? { from: "zh-TW", to: "en", fromSpeech: "zh-TW", toSpeech: "en-US" } : { from: "en", to: "zh-TW", fromSpeech: "en-US", toSpeech: "zh-TW" });
    let lobRec = null;
    const micState = (btn, on) => {
      if (!btn) return;
      btn.classList.toggle("theme-bg-primary", on); btn.classList.toggle("text-white", on); btn.classList.toggle("animate-pulse", on);
      btn.classList.toggle("theme-bg-light", !on); btn.classList.toggle("theme-text-primary", !on);
      btn.innerHTML = `<i class="fa-solid ${on ? "fa-stop" : "fa-microphone"}"></i>`;
    };
    const doTranslate = async (box) => {
      const text = box.querySelector("[data-lob-tr-in]").value.trim();
      const out = box.querySelector("[data-lob-tr-out]");
      const outBox = box.querySelector("[data-lob-tr-box]");
      const spk = box.querySelector("[data-lob-tr-speak]");
      if (!text) return;
      window.speechSynthesis?.cancel();
      const { from, to } = dirOf(box);
      outBox.classList.remove("hidden");
      spk?.classList.add("hidden");
      out.textContent = "翻譯中…";
      try { out.textContent = (await translatorApi.translate(text, from, to)).text; spk?.classList.remove("hidden"); }
      catch { out.textContent = "目前無法連線翻譯，請稍後再試"; }
    };
    document.addEventListener("click", async (e) => {
      const go = e.target.closest?.("[data-lob-tr-go]");
      if (go) return doTranslate(go.closest("[data-lob-tr]"));

      const mic = e.target.closest?.("[data-lob-tr-mic]");
      if (mic) {
        const box = mic.closest("[data-lob-tr]");
        if (lobRec || mic.dataset.busy) { lobRec?.stop(); return; }
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return showToast("此瀏覽器不支援語音辨識，請直接打字");
        window.speechSynthesis?.cancel();
        mic.dataset.busy = "1"; // 等待權限詢問期間，避免連按
        const why = await ensureMic();
        delete mic.dataset.busy;
        if (why) return showToast(why, 5500);
        const rec = new SR();
        rec.lang = dirOf(box).fromSpeech;
        rec.interimResults = false;
        let said = "";
        rec.onresult = (ev) => { said = ev.results?.[0]?.[0]?.transcript || ""; };
        rec.onerror = (ev) => { const m = micErrMsg(ev.error); if (m) showToast(m, 5000); };
        rec.onend = () => {
          lobRec = null; micState(mic, false);
          if (said && box.isConnected) {
            const input = box.querySelector("[data-lob-tr-in]");
            input.value = (input.value.trim() ? input.value.trim() + " " : "") + said;
            doTranslate(box); // 說完直接翻譯
          }
        };
        try { rec.start(); lobRec = rec; micState(mic, true); } catch { lobRec = null; micState(mic, false); }
        return;
      }

      const spk = e.target.closest?.("[data-lob-tr-speak]");
      if (spk && "speechSynthesis" in window) {
        const box = spk.closest("[data-lob-tr]");
        const synth = window.speechSynthesis;
        if (synth.speaking) { synth.cancel(); return; } // 唸到一半再按 = 停止
        const text = box.querySelector("[data-lob-tr-out]").textContent;
        if (!text) return;
        const u = new SpeechSynthesisUtterance(text);
        u.lang = dirOf(box).toSpeech; u.rate = 0.9;
        synth.speak(u);
      }
    });
    on("apps:change", again);
    const refillTm = () => { if (state.route === "大廳") fill({ id: "計時器" }, seq, false); }; // 只重畫計時器區塊
    on("timer:change", refillTm); // 計時器頁 / 時間到 / 大廳按鈕改變狀態時，大廳同步
    registerActions({
      "lob-tm": (el) => {
        const op = el.dataset.op;
        clearTimeout(tmArmId);
        if (op === "cancel" && timerApi.timer.status !== "idle" && !tmArmed) { // 取消進行中的計時要按兩次，避免誤觸
          tmArmed = true;
          tmArmId = setTimeout(() => { tmArmed = false; refillTm(); }, 3000);
          return refillTm();
        }
        tmArmed = false;
        timerApi.press(op, Number(el.dataset.ms) || 0);
        refillTm();
      },
      "lob-sw": (el) => {
        if (el.dataset.op === "reset") sw.reset();
        else if (sw.status === "running") sw.pause();
        else sw.start();
        syncBackground();
        fill({ id: "碼表" }, seq, false); // 只重畫碼表區塊，不影響其他區塊（例如翻譯機輸入到一半的字）
      },
    });
  }
  draw(true);
  showTipHint("lobby");
}
