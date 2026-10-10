// 大廳：歡迎頁 + 「已選擇要顯示」的服務簡略資訊。
//   - 哪些服務、什麼順序、各自顯示什麼：由 ︙ 大廳設定（顯示管理 / 大廳排序 / 各列的「>」）決定，資料規則在 core/lobby-model.js
//   - 每個服務只佔一個區塊、一行可水平滑動的小卡；點區塊標題會進入該服務。小卡只有「生活圖卡」可以點：直接打開那一張圖卡，其餘服務的小卡只顯示資訊
//   - 目前有簡略資訊的服務：家庭公告、家庭日曆、換誰洗碗、生活圖卡（其餘服務暫時不顯示）
//   - 各服務要挑哪幾筆、整理成什麼欄位：core/lobby-feed.js（可用 Node 測試）
import { state, on } from "../core/store.js";
import { showTipHint } from "../core/tips.js";
import { lobbyOrdered, getMode, modeLabelOf, lobbyCards } from "../core/lobby-model.js";
import { appIcon, fixAppIcons } from "../core/app-icon.js";
import { noteItems, memoItems, calendarItems, calendarFetchRange, CAL_EMPTY, bowlItems, cardItems } from "../core/lobby-feed.js";
import { notesApi, PALETTE as NOTE_PALETTE } from "../services/notes/data.js";
import { calendarApi, COLOR_MAP, DEFAULT_COLOR } from "../services/calendar/data.js";
import { gcalApi } from "../core/gcal.js";
import { memoApi, catStyle } from "../services/memo/data.js";
import { bowlApi } from "../services/bowl/data.js";
import { cardsApi, KINDS } from "../services/cards/data.js";
import { canEnterBowl } from "../core/bowl-emails.js";

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

/* ---------- 畫面 ---------- */
let raw = {};      // 這次進大廳讀回來的原始資料（改大廳設定時直接用，不重讀）
let seq = 0;       // 每次重畫 +1：舊的非同步結果不會蓋掉新畫面
let wired = false;

const modeLabel = (a) => (a.id === "生活圖卡" ? `已選 ${lobbyCards().length} 張` : modeLabelOf(a.id));

function shell(a) {
  // 除了「生活圖卡」（小卡直接打開那張圖卡），其餘服務點區塊任何地方都跳到該服務頁
  const whole = a.id === "生活圖卡" ? "" : `${nav(a.id)} data-tip="lobby-sec" data-tip-name="${esc(a.name)}" role="link" tabindex="-1"`;
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
    on("apps:change", again);
  }
  draw(true);
  showTipHint("lobby");
}
