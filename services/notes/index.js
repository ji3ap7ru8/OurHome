// 家庭公告（便利貼）— Stage 8：資料走 notesApi（連線後即時同步家庭共用 Firestore，否則只存記憶體）。
import { registerActions } from "../../core/actions.js";
import { MAX_NOTES, AUTHORS, TAGS, TAG_COLOR, PALETTE, notesApi } from "./data.js";
import { state } from "../../core/store.js";
import { effectiveNickname } from "../../core/nickname.js";
import { openLineSendDialog, closeLineSendDialog } from "../../core/line-send.js";
import { showTipHint, closeTips } from "../../core/tips.js";

let notes = [];               // 目前畫面上的資料（由 refresh() 從 notesApi 取得）
let loaded = false;
let off = null;               // 取消即時同步訂閱
let root = null;
let sortBy = "pinned";

const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safeUrl = (u) => (/^https?:\/\//i.test(u || "") ? u : "");
const stamp = (d, t, fb) => new Date(`${d}T${t || fb}`);
const expired = (n) => n.status === "綁定期限" && n.expireDate && new Date() > stamp(n.expireDate, n.expireTime, "23:59");
const ymd = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hm = (d = new Date()) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

function sorted() {
  const pub = (n) => stamp(n.publishDate, n.publishTime, "00:00");
  const exp = (n) => (n.status === "永久顯示" || !n.expireDate ? 4102444800000 : stamp(n.expireDate, n.expireTime, "23:59").getTime());
  const rank = (list, v) => { const i = list.indexOf(v); return i < 0 ? 99 : i; };
  return [...notes].sort((a, b) => {
    const ea = expired(a), eb = expired(b);
    if (ea !== eb) return ea ? 1 : -1;                 // 過期一律沉底
    const byDate = pub(b) - pub(a);
    if (ea) return byDate;
    if (sortBy === "pinned") return (b.isPinned - a.isPinned) || byDate;
    if (sortBy === "tag") return (rank(TAGS, a.tag) - rank(TAGS, b.tag)) || byDate;
    if (sortBy === "author") return (rank(AUTHORS, a.author) - rank(AUTHORS, b.author)) || byDate;
    if (sortBy === "expire") return exp(a) - exp(b);
    return byDate;
  });
}

// 便利貼視覺元素：膠帶、橫線筆記紙
const TAPE = '<span class="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-5 bg-white/70 border border-dashed border-black/20 shadow-sm" style="transform:translateX(-50%) rotate(-2deg)"></span>';
const RULED = "line-height:2rem;background-image:repeating-linear-gradient(transparent,transparent calc(2rem - 1px),rgba(0,0,0,.14) calc(2rem - 1px),rgba(0,0,0,.14) 2rem)";
const SORTS = [["pinned", "置頂優先"], ["date", "最新發布"], ["expire", "即將截止"]];
const style = (n) => { const c = expired(n) ? PALETTE.expired : PALETTE[n.color] || PALETTE.gray; return `background:${c.bg};color:${c.text};border-color:${c.border}`; };

function render() {
  const list = sorted();
  root.querySelector("[data-count]").textContent = `${notes.length} / ${MAX_NOTES} 張`;
  root.querySelectorAll("[data-sortbtn]").forEach((b) => {
    const on = b.dataset.sortbtn === sortBy;
    b.setAttribute("aria-pressed", on);
    b.style.cssText = on ? "background:#f59e0b;color:#451a03;border-color:#f59e0b" : "background:#fff;color:#78350f;border-color:#fcd34d";
  });
  root.querySelector("[data-grid]").innerHTML = list.length
    ? list.map((n, i) => `
      <button data-open="${n.id}" data-tip="notes-open" style="${style(n)};transform:rotate(${[-1, 1, -2, 2][i % 4]}deg)" class="relative text-left p-3.5 rounded-b-lg border-t-4 min-h-[10rem] flex flex-col justify-between shadow-md active:scale-95 transition">
        <span class="absolute -top-2 left-1/2 -translate-x-1/2 w-11 h-4 bg-white/70 border border-dashed border-black/20"></span>
        <div>
          <div class="flex justify-between items-start gap-1 mb-1">
            <span class="text-xs font-extrabold px-2 py-0.5 rounded border border-current">${esc(n.tag)}</span>
            ${expired(n) ? '<span class="text-[0.65rem] bg-gray-500 text-white px-1.5 py-0.5 rounded font-bold">已過期</span>' : n.isPinned ? '<i class="fa-solid fa-thumbtack text-red-600"></i>' : ""}
          </div>
          <h3 class="font-extrabold text-base truncate mt-1">${esc(n.title)}</h3>
          <p class="text-xs font-medium line-clamp-3 mt-1 leading-snug">${esc(n.content)}</p>
        </div>
        <div class="flex justify-between text-xs font-bold border-t border-black/10 pt-1.5 mt-2">
          <span><i class="fa-solid fa-user"></i> ${esc(n.author)}</span><span>${esc(n.publishDate.slice(5))}</span>
        </div>
      </button>`).join("")
    : `<div class="col-span-2 text-center py-12 text-slate-500 font-bold text-base">${loaded ? "目前沒有公告，按右上角「管理」新增" : "載入中…"}</div>`;
}

async function refresh() {
  try { notes = await notesApi.list(); loaded = true; }
  catch (e) { loaded = true; if (root) toast(e.message || "讀取失敗"); }
  if (root) render();
}

// 寫入雲端（或記憶體）並重新整理；失敗時顯示原因
async function run(fn) {
  try { await fn(); await refresh(); return true; }
  catch (e) { toast(e.message || "儲存失敗，請稍後再試"); return false; }
}

const modal = (inner) => {
  const m = document.createElement("div");
  m.className = "fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4";
  m.dataset.modal = "";
  m.innerHTML = `<div class="w-full max-w-md max-h-[92vh] overflow-y-auto overflow-x-hidden px-2 pt-5 pb-3 no-scrollbar">${inner}</div>`;
  m.addEventListener("click", (e) => e.target === m && m.remove());
  root.appendChild(m);
  return m;
};

function openDetail(id) {
  const n = notes.find((x) => x.id === id);
  if (!n) return;
  const link = safeUrl(n.link);
  const m = modal(`
    <div style="${style(n)};transform:rotate(-1deg)" class="relative rounded-b-xl border-t-8 px-6 pt-9 pb-6 shadow-2xl">
      ${TAPE}
      <button data-send aria-label="發送到 LINE" class="absolute top-3 right-16 w-10 h-10 rounded-full bg-white/70 text-lg flex items-center justify-center active:scale-90 transition"><i class="fa-solid fa-paper-plane"></i></button>
      <button data-close aria-label="關閉" class="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/70 text-lg flex items-center justify-center active:scale-90 transition"><i class="fa-solid fa-xmark"></i></button>
      <div class="flex items-center gap-2 pr-24 flex-wrap">
        <span class="text-sm px-3 py-0.5 rounded border-2 border-current font-extrabold">${esc(n.tag)}</span>
        ${expired(n) ? '<span class="text-xs bg-gray-500 text-white px-2 py-0.5 rounded font-bold">已過期</span>' : n.isPinned ? '<span class="font-extrabold text-red-600 text-sm"><i class="fa-solid fa-thumbtack"></i> 已置頂</span>' : ""}
      </div>
      <h2 class="text-3xl font-black mt-3 mb-3 leading-tight break-words">${esc(n.title)}</h2>
      ${n.content ? `<div style="${RULED}" class="text-lg font-bold whitespace-pre-wrap max-h-64 overflow-y-auto no-scrollbar">${esc(n.content)}</div>` : ""}
      ${link ? `<div class="mt-4"><a href="${esc(link)}" target="_blank" rel="noopener" class="inline-flex items-center gap-2 font-bold bg-white/80 text-blue-700 px-4 py-2 rounded-full shadow-sm"><i class="fa-solid fa-link"></i> 開啟附加連結</a></div>` : ""}
      <div class="flex justify-between items-end text-sm font-bold border-t-2 border-dashed border-black/20 pt-3 mt-5">
        <div class="space-y-0.5 opacity-80">
          <div><i class="fa-regular fa-calendar"></i> ${esc(n.publishDate)} ${esc(n.publishTime)}</div>
          <div><i class="fa-regular fa-clock"></i> ${n.status === "永久顯示" ? "永久顯示" : `截止 ${esc(n.expireDate)} ${esc(n.expireTime)}`}</div>
        </div>
        <span class="font-black text-xl"><i class="fa-solid fa-user text-base"></i> ${esc(n.author)}</span>
      </div>
      <span class="absolute bottom-0 right-0 w-9 h-9" style="background:linear-gradient(135deg,transparent 50%,rgba(0,0,0,.14) 50%);border-bottom-right-radius:.75rem"></span>
    </div>`);
  m.querySelector("[data-close]").onclick = () => m.remove();
  m.querySelector("[data-send]").onclick = () => openLineSendDialog({
    title: "發送便利貼",
    subtitle: n.title || "家庭公告",
    confirmText: `確定要發送「${n.title || "這張便利貼"}」嗎？`,
    buildMessages: () => [buildNoteFlex(notes.find((x) => x.id === id) || n)],
  });
}

// ---------- 發送便利貼到 LINE（與畫面上的便利貼相同，不含發送／關閉按鈕）----------
const cut = (v, max) => { const t = String(v ?? ""); return t.length > max ? t.slice(0, max - 1) + "…" : t; };
function buildNoteFlex(n) {
  const c = expired(n) ? PALETTE.expired : PALETTE[n.color] || PALETTE.gray;
  const link = safeUrl(n.link);
  const lines = String(n.content || "").split("\n").slice(0, 40);

  const tagBox = { type: "box", layout: "vertical", flex: 0, borderWidth: "2px", borderColor: c.text, cornerRadius: "4px", paddingStart: "8px", paddingEnd: "8px", paddingTop: "1px", paddingBottom: "1px",
    contents: [{ type: "text", text: cut(n.tag, 8), size: "sm", weight: "bold", color: c.text }] };
  const flag = expired(n)
    ? { type: "text", text: "已過期", size: "xs", weight: "bold", color: "#6b7280", flex: 0, gravity: "center" }
    : n.isPinned ? { type: "text", text: "📌 已置頂", size: "sm", weight: "bold", color: "#dc2626", flex: 0, gravity: "center" } : null;

  const body = [
    { type: "box", layout: "horizontal", spacing: "md", alignItems: "center", contents: flag ? [tagBox, flag] : [tagBox] },
    { type: "text", text: cut(n.title || "（無標題）", 100), size: "xl", weight: "bold", color: c.text, wrap: true, margin: "md" },
  ];
  if (n.content) {
    body.push({ type: "box", layout: "vertical", margin: "md",
      contents: lines.flatMap((ln, i) => [
        { type: "text", text: ln.trim() ? ln : " ", size: "md", weight: "bold", color: c.text, wrap: true, margin: i ? "sm" : "none" },
        { type: "separator", margin: "sm", color: "#00000024" },
      ]) });
  }
  if (link) body.push({ type: "text", text: "🔗 開啟附加連結", size: "sm", weight: "bold", color: "#1d4ed8", margin: "lg", action: { type: "uri", label: "開啟連結", uri: cut(link, 1000) } });

  body.push({ type: "separator", margin: "lg", color: "#00000033" });
  body.push({ type: "box", layout: "horizontal", margin: "md", alignItems: "flex-end",
    contents: [
      { type: "box", layout: "vertical", flex: 1, spacing: "xs", contents: [
        { type: "text", text: `📅 ${n.publishDate || ""} ${n.publishTime || ""}`.trim(), size: "xs", weight: "bold", color: c.text, wrap: true },
        { type: "text", text: `🕒 ${n.status === "永久顯示" ? "永久顯示" : `截止 ${n.expireDate || ""} ${n.expireTime || ""}`.trim()}`, size: "xs", weight: "bold", color: c.text, wrap: true },
      ] },
      { type: "text", text: `👤 ${n.author || ""}`, size: "lg", weight: "bold", color: c.text, align: "end", flex: 0, gravity: "bottom" },
    ] });

  return {
    type: "flex",
    altText: cut(`家庭公告：${n.title || n.content || "便利貼"}（${n.author || ""}）`, 380),
    contents: {
      type: "bubble", size: "mega",
      body: { type: "box", layout: "vertical", paddingAll: "0px", backgroundColor: c.bg,
        contents: [
          { type: "box", layout: "vertical", height: "10px", backgroundColor: c.border, contents: [] },
          { type: "box", layout: "vertical", paddingAll: "18px", contents: body },
        ] },
    },
  };
}

// 管理：列出全部公告（含已過期），可新增、編輯、刪除
function openManage() {
  if (!root) return;
  root.querySelectorAll("[data-manage]").forEach((x) => x.remove());
  const list = sorted();
  const m = modal(`
    <div style="background:#fffbeb;color:#451a03;border-color:#f59e0b;transform:rotate(.6deg)" class="relative rounded-b-xl border-t-8 px-4 pt-8 pb-5 shadow-2xl">
      ${TAPE}
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-xl font-black"><i class="fa-solid fa-thumbtack text-amber-600"></i> 管理公告 <span class="text-sm font-extrabold bg-amber-200 px-2 py-0.5 rounded-full align-middle">${notes.length} / ${MAX_NOTES}</span></h3>
        <button data-close aria-label="關閉" class="w-9 h-9 rounded-full bg-white/80 text-lg flex items-center justify-center active:scale-90 transition"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <button data-new class="w-full py-3 rounded-xl border-2 border-dashed border-amber-500 bg-amber-100/60 text-amber-800 font-black text-base mb-4 active:scale-95 transition"><i class="fa-solid fa-plus"></i> 新增便利貼</button>
      <div class="space-y-4">
        ${list.length ? list.map((n, i) => `
          <div class="relative flex items-center gap-2 pl-3.5 pr-2.5 py-3 rounded-b-lg border-t-4 shadow-md" style="${style(n)};transform:rotate(${[-0.8, 0.8, -0.4, 0.5][i % 4]}deg)">
            <span class="absolute -top-2.5 left-6 w-10 h-3.5 bg-white/70 border border-dashed border-black/20"></span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="shrink-0 text-[0.7rem] font-extrabold px-1.5 rounded border border-current">${esc(n.tag)}</span>
                ${expired(n) ? '<span class="shrink-0 text-[0.65rem] bg-gray-500 text-white px-1.5 rounded font-bold">已過期</span>' : n.isPinned ? '<i class="fa-solid fa-thumbtack text-red-600 text-xs"></i>' : ""}
              </div>
              <div class="font-black text-base truncate mt-0.5">${esc(n.title || n.content || "（無標題）")}</div>
              <div class="text-xs font-bold opacity-75"><i class="fa-solid fa-user"></i> ${esc(n.author)}・${esc(n.publishDate.slice(5))}</div>
            </div>
            <button data-edit="${n.id}" aria-label="編輯" class="shrink-0 w-10 h-10 rounded-full bg-white/80 text-blue-700 active:scale-90 transition"><i class="fa-solid fa-pen"></i></button>
            <button data-del="${n.id}" aria-label="刪除" class="shrink-0 w-10 h-10 rounded-full bg-white/80 text-red-600 active:scale-90 transition"><i class="fa-solid fa-trash"></i></button>
          </div>`).join("") : '<p class="text-center font-bold py-8 opacity-60">目前沒有便利貼</p>'}
      </div>
    </div>`);
  m.dataset.manage = "";
  m.querySelector("[data-close]").onclick = () => m.remove();
  m.querySelector("[data-new]").onclick = () => { m.remove(); openForm(); };
  m.addEventListener("click", async (e) => {
    const ed = e.target.closest("[data-edit]");
    if (ed) { const n = notes.find((x) => x.id === ed.dataset.edit); if (n) { m.remove(); openForm(n); } return; }
    const del = e.target.closest("[data-del]");
    if (!del) return;
    if (!del.dataset.sure) { // 3 秒內再按一次才刪除
      del.dataset.sure = "1"; del.classList.add("!bg-red-600", "!text-white");
      setTimeout(() => { delete del.dataset.sure; del.classList.remove("!bg-red-600", "!text-white"); }, 3000);
      return;
    }
    del.disabled = true;
    if (await run(() => notesApi.remove(del.dataset.del))) { m.remove(); openManage(); } else del.disabled = false;
  });
}

registerActions({ "notes-manage": () => openManage() });

// 目前開啟中的新增/編輯視窗（離開頁面時一併關閉）
let formClose = null;

// 新增 / 編輯便利貼：獨立的置中彈出視窗（不再借用 Bottom Sheet，也不和登入視窗共用任何結構）。
// 選項全部用「按鈕 + 內部狀態」，不使用隱藏的 radio / label，避免觸發全域點擊事件；
// 視窗內的 click / change / input 也不會再往上傳給全域事件委派（core/actions.js、accordion）。
function injectFormStyle() {
  if (document.getElementById("nf-style")) return;
  const s = document.createElement("style");
  s.id = "nf-style";
  s.textContent = `
    .nf-ov { transition: opacity .18s ease; }
    .nf-dlg { transition: transform .24s cubic-bezier(.16,1,.3,1), opacity .18s ease; }
    .nf-ov.nf-hide { opacity: 0; }
    .nf-ov.nf-hide .nf-dlg { transform: translateY(14px) scale(.97); opacity: 0; }
    @media (prefers-reduced-motion: reduce) { .nf-ov, .nf-dlg { transition: none; } }`;
  document.head.appendChild(s);
}

function openForm(n = null) {
  if (!n && notes.length >= MAX_NOTES) return toast(`最多 ${MAX_NOTES} 張便利貼，請先刪除舊的`);
  formClose?.(true);
  injectFormStyle();

  const d = n || { tag: "一般", isPinned: false, author: "", title: "", content: "", link: "", status: "綁定期限",
    publishDate: ymd(), publishTime: hm(), expireDate: ymd(new Date(Date.now() + 864e5)), expireTime: hm() };
  // 選項狀態（不放在 DOM 裡）
  // 發布人：Google 帳號名稱 或 暱稱（暱稱與帳號名稱相同就不用選）；編輯舊便利貼時保留原本的發布人
  const gName = state.account?.name || "家人";
  const nick = effectiveNickname();
  const authorOpts = [[gName, nick ? "Google帳號" : ""]];
  if (nick) authorOpts.push([nick, "暱稱"]);
  if (d.author && !authorOpts.some(([v]) => v === d.author)) authorOpts.unshift([d.author, "原發布人"]);
  const st = { tag: d.tag, author: d.author || nick || gName, status: d.status === "永久顯示" ? "永久顯示" : "綁定期限", isPinned: !!d.isPinned };

  const FIELD = "w-full min-w-0 px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-base font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition";
  const SUB = "block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1";
  const SEC = "px-5 py-4 border-b border-slate-100 dark:border-slate-800";
  const head = (icon, text, right = "") => `
    <div class="flex items-center gap-2 mb-2.5">
      <i class="fa-solid ${icon} w-4 text-center text-amber-600"></i>
      <span class="text-[0.95rem] font-extrabold text-slate-800 dark:text-slate-100">${text}</span>${right}
    </div>`;
  const opt = (kind, v, cap = "") => `<button type="button" role="radio" data-opt="${kind}" data-v="${esc(v)}" class="flex items-center justify-center gap-1.5 py-3 rounded-xl border-2 text-base font-extrabold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"><i data-tick class="fa-solid fa-check text-xs hidden"></i><span class="truncate">${esc(v)}</span>${cap ? `<span class="text-xs font-bold opacity-70 shrink-0">${cap}</span>` : ""}</button>`;

  // ---- 組出視窗 ----
  const host = document.getElementById("appContainer") || document.body;
  const ov = document.createElement("div");
  ov.className = "nf-ov nf-hide fixed inset-0 z-[70] bg-slate-900/55 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-3";
  ov.innerHTML = `
    <div class="nf-dlg relative w-full max-w-md flex flex-col rounded-3xl bg-[#fcfbf9] dark:bg-slate-900 shadow-2xl overflow-hidden outline-none" style="height:min(40rem,92vh);height:min(40rem,92dvh)" role="dialog" aria-modal="true" aria-label="${n ? "編輯" : "新增"}便利貼" tabindex="-1">
      <div data-band class="relative shrink-0 px-5 pt-6 pb-3.5 flex items-center justify-between border-b-4 transition-colors">
        <span class="absolute -top-1.5 left-1/2 -translate-x-1/2 w-14 h-4 bg-white/70 border border-dashed border-black/20 rounded-sm"></span>
        <div class="flex items-center gap-2.5 min-w-0">
          <i class="fa-solid ${n ? "fa-pen-to-square" : "fa-note-sticky"} text-xl"></i>
          <h2 class="text-xl font-black truncate">${n ? "編輯" : "新增"}便利貼</h2>
        </div>
        <button type="button" data-x aria-label="關閉" class="shrink-0 w-10 h-10 rounded-full bg-white/70 hover:bg-white text-lg flex items-center justify-center active:scale-90 transition"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <form novalidate class="flex-1 min-h-0 flex flex-col text-slate-800 dark:text-slate-100">
        <!-- 步驟指示 -->
        <div class="shrink-0 px-5 pt-3 pb-2 flex items-center gap-2" aria-live="polite">
          ${["標籤與發布人", "標題與內容", "顯示時間"].map((t, i) => `<div data-step="${i}" class="flex-1 min-w-0"><div data-bar class="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 transition-colors"></div><div class="text-[0.7rem] font-bold mt-1 truncate text-slate-400">${i + 1}. ${t}</div></div>`).join("")}
        </div>

        <div class="flex-1 min-h-0 relative">
          <!-- 第 1 頁：標籤、置頂、發布人 -->
          <div data-page="0" class="absolute inset-0 overflow-y-auto overscroll-contain no-scrollbar">
            <section class="${SEC}">
              ${head("fa-tag", "標籤")}
              <div role="radiogroup" aria-label="標籤" class="grid grid-cols-4 gap-2">${TAGS.map((t) => opt("tag", t)).join("")}</div>
            </section>
            <section class="${SEC}">
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <div class="text-base font-extrabold">📌 置頂</div>
                  <div class="text-xs font-bold text-slate-400">僅「重要／緊急」可使用</div>
                </div>
                <button type="button" role="switch" data-pin aria-label="置頂" class="shrink-0 relative w-14 h-8 rounded-full bg-slate-300 dark:bg-slate-600 transition disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
                  <span data-knob class="absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow transition-transform"></span>
                </button>
              </div>
            </section>
            <section class="px-5 py-4">
              ${head("fa-user", "發布人")}
              ${authorOpts.length > 1
                ? `<div role="radiogroup" aria-label="發布人" class="grid grid-cols-1 gap-2">${authorOpts.map(([v, cap]) => opt("author", v, cap)).join("")}</div>`
                : `<div class="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-base font-extrabold">${esc(authorOpts[0][0])}</div>`}
            </section>
          </div>

          <!-- 第 2 頁：標題、內容（內容框佔滿剩餘空間） -->
          <div data-page="1" class="absolute inset-0 hidden flex-col px-5 py-4 gap-3">
            <label class="block shrink-0">
              <span class="${SUB} flex justify-between"><span>標題</span><span data-cnt="title"></span></span>
              <input name="title" value="${esc(d.title)}" maxlength="30" placeholder="例如：週六回阿嬤家" class="${FIELD}">
            </label>
            <label class="flex-1 min-h-0 flex flex-col">
              <span class="${SUB} flex justify-between shrink-0"><span>內容</span><span data-cnt="content"></span></span>
              <textarea name="content" maxlength="300" placeholder="想跟家人說的話…" class="${FIELD} flex-1 min-h-0 resize-none leading-relaxed">${esc(d.content)}</textarea>
            </label>
            <label class="block shrink-0">
              <span class="${SUB}">附加連結（選填）</span>
              <span class="relative block">
                <i class="fa-solid fa-link absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input name="link" type="url" inputmode="url" value="${esc(d.link)}" placeholder="https://..." class="${FIELD} !pl-10">
              </span>
            </label>
          </div>

          <!-- 第 3 頁：顯示時間 -->
          <div data-page="2" class="absolute inset-0 hidden overflow-y-auto overscroll-contain no-scrollbar px-5 py-4">
            ${head("fa-clock", "顯示時間")}
            <div role="radiogroup" aria-label="顯示時間" class="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 mb-3">
              ${[["綁定期限", "fa-hourglass-half"], ["永久顯示", "fa-infinity"]].map(([v, ic]) => `<button type="button" role="radio" data-opt="status" data-v="${v}" class="flex items-center justify-center gap-2 py-2.5 rounded-lg text-base font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"><i class="fa-solid ${ic}"></i>${v}</button>`).join("")}
            </div>
            <div class="grid grid-cols-2 gap-2.5">
              <label class="block"><span class="${SUB}">發布日期</span><input type="date" name="publishDate" value="${d.publishDate}" class="${FIELD}"></label>
              <label class="block"><span class="${SUB}">發布時間</span><input type="time" name="publishTime" value="${d.publishTime}" class="${FIELD}"></label>
            </div>
            <div data-exp class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div class="grid grid-cols-2 gap-2.5">
                <label class="block"><span class="${SUB}">截止日期</span><input type="date" name="expireDate" value="${d.expireDate}" class="${FIELD}"></label>
                <label class="block"><span class="${SUB}">截止時間</span><input type="time" name="expireTime" value="${d.expireTime}" class="${FIELD}"></label>
              </div>
              <div class="flex items-center gap-2 mt-3 overflow-x-auto no-scrollbar" role="group" aria-label="快速設定截止時間">
                <span class="shrink-0 text-xs font-bold text-slate-400">快速設定</span>
                ${[["d1", "隔天"], ["d3", "3 天後"], ["d7", "1 週後"], ["m1", "1 個月後"]].map(([k, t]) => `<button type="button" data-quick="${k}" class="shrink-0 px-3.5 py-1.5 rounded-full border border-amber-300 bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 text-sm font-extrabold active:scale-95 transition">${t}</button>`).join("")}
              </div>
            </div>
          </div>
        </div>

        <div class="shrink-0 p-4 border-t border-slate-200/70 dark:border-slate-800 bg-[#fcfbf9] dark:bg-slate-900 space-y-2">
          <p data-err role="alert" class="hidden px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 text-sm font-bold"></p>
          <div class="flex gap-2.5">
            <button type="button" data-back class="px-5 py-3.5 rounded-2xl bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-base active:scale-95 transition flex items-center gap-1.5"><i data-back-ic class="fa-solid fa-chevron-left text-sm"></i><span data-back-t>取消</span></button>
            <button type="submit" class="flex-1 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-bold text-base shadow-md flex items-center justify-center gap-2 active:scale-[0.98] transition">
              <span data-next-t>下一頁</span><i data-next-ic class="fa-solid fa-chevron-right text-sm"></i>
            </button>
          </div>
        </div>
      </form>
    </div>`;
  host.appendChild(ov);

  // 視窗內的事件不要再往上傳：全域的點擊委派（data-action、手風琴…）完全碰不到這個視窗
  ["click", "change", "input", "keydown"].forEach((t) => ov.addEventListener(t, (e) => {
    e.stopPropagation();
    if (t === "keydown" && e.key === "Escape") close();
  }));

  const dlg = ov.querySelector(".nf-dlg");
  const band = ov.querySelector("[data-band]");
  const f = ov.querySelector("form");
  const el = (k) => f.elements[k];
  const errBox = f.querySelector("[data-err]");
  const pinBtn = f.querySelector("[data-pin]");
  const showErr = (t) => { errBox.textContent = t; errBox.classList.remove("hidden"); };
  const hideErr = () => errBox.classList.add("hidden");

  // 依狀態重畫：標籤顏色、選項外觀、置頂開關、截止欄位、字數
  const paint = () => {
    const pinOk = ["重要", "緊急"].includes(st.tag);
    if (!pinOk) st.isPinned = false;
    const c = PALETTE[TAG_COLOR[st.tag]] || PALETTE.gray;
    band.style.cssText = `background:${c.bg};color:${c.text};border-color:${c.border}`;
    f.querySelectorAll("[data-opt]").forEach((b) => {
      const kind = b.dataset.opt, v = b.dataset.v, on = st[kind] === v;
      b.setAttribute("aria-checked", on);
      b.querySelector("[data-tick]")?.classList.toggle("hidden", !on);
      if (kind === "status") {
        b.style.cssText = on ? "background:#fff;color:#b45309;box-shadow:0 1px 3px rgba(0,0,0,.18)" : "background:transparent;color:#64748b";
      } else if (kind === "tag") {
        const t = PALETTE[TAG_COLOR[v]];
        b.style.cssText = on ? `background:${t.bg};color:${t.text};border-color:${t.text}` : "background:transparent;border-color:#e2e8f0;color:#64748b";
      } else {
        b.style.cssText = on ? "background:#f59e0b;color:#451a03;border-color:#f59e0b" : "background:transparent;border-color:#e2e8f0;color:#64748b";
      }
    });
    pinBtn.disabled = !pinOk;
    pinBtn.setAttribute("aria-checked", st.isPinned);
    pinBtn.style.background = st.isPinned ? "#f59e0b" : "";
    pinBtn.firstElementChild.style.transform = st.isPinned ? "translateX(1.5rem)" : "";
    f.querySelector("[data-exp]").classList.toggle("hidden", st.status === "永久顯示");
    paintPage();
    ["title", "content"].forEach((k) => { f.querySelector(`[data-cnt=${k}]`).textContent = `${el(k).value.length} / ${el(k).maxLength}`; });
  };
  // ---- 分頁 ----
  let page = 0;
  const LAST = 2;
  const paintPage = () => {
    f.querySelectorAll("[data-page]").forEach((p) => {
      const on = +p.dataset.page === page;
      p.classList.toggle("hidden", !on);
      p.classList.toggle("flex", on && p.dataset.page === "1");
    });
    f.querySelectorAll("[data-step]").forEach((x) => {
      const i = +x.dataset.step;
      x.querySelector("[data-bar]").style.background = i <= page ? "#d97706" : "";
      x.lastElementChild.style.color = i === page ? "#b45309" : "";
    });
    f.querySelector("[data-back-t]").textContent = page === 0 ? "取消" : "上一頁";
    f.querySelector("[data-back-ic]").classList.toggle("hidden", page === 0);
    f.querySelector("[data-next-t]").textContent = page === LAST ? (n ? "儲存變更" : "發布便利貼") : "下一頁";
    f.querySelector("[data-next-ic]").className = `fa-solid ${page === LAST ? "fa-check" : "fa-chevron-right"} text-sm`;
  };
  const goPage = (i) => {
    page = i; hideErr(); paintPage();
    const focusEl = [null, el("title"), null][i];
    if (focusEl) setTimeout(() => focusEl.focus({ preventScroll: true }), 50);
  };
  // 離開該頁前檢查；回傳錯誤訊息或 ""
  const checkPage = (i) => {
    if (i === 0 && !st.author) return "請選擇發布人";
    if (i === 1) {
      if (!el("title").value.trim() && !el("content").value.trim()) return "標題或內容至少填一項";
      if (el("link").value && !safeUrl(el("link").value.trim())) return "連結需以 http:// 或 https:// 開頭";
    }
    if (i === 2) {
      if (!el("publishDate").value) return "請選擇發布日期";
      if (st.status !== "永久顯示") {
        if (!el("expireDate").value) return "請選擇截止日期";
        if (stamp(el("expireDate").value, el("expireTime").value, "23:59") <= stamp(el("publishDate").value, el("publishTime").value, "00:00"))
          return "截止時間必須晚於發布時間";
      }
    }
    return "";
  };

  const snapshot = () => JSON.stringify([st, ...[...new FormData(f)]]);

  f.addEventListener("click", (e) => {
    const b = e.target.closest("[data-opt]");
    if (b) { st[b.dataset.opt] = b.dataset.v; hideErr(); paint(); return; }
    if (e.target.closest("[data-pin]")) { if (!pinBtn.disabled) { st.isPinned = !st.isPinned; paint(); } return; }
    const q = e.target.closest("[data-quick]");
    if (q) { // 快速設定截止時間：以「發布日期時間」為基準往後推
      const base = stamp(el("publishDate").value || ymd(), el("publishTime").value, "00:00");
      const [kind, num] = [q.dataset.quick[0], +q.dataset.quick.slice(1)];
      if (kind === "d") base.setDate(base.getDate() + num); else base.setMonth(base.getMonth() + num);
      el("expireDate").value = ymd(base); el("expireTime").value = hm(base);
      hideErr();
    }
  });
  f.addEventListener("input", () => { hideErr(); paint(); });
  paint();
  const initial = snapshot();

  // ---- 開關 ----
  const prevFocus = document.activeElement;
  const teardown = () => {
    formClose = null;
    ov.classList.add("nf-hide");
    setTimeout(() => ov.remove(), 220);
    prevFocus?.focus?.({ preventScroll: true });
  };
  // force = true 直接關閉；否則內容有改動時先確認，避免誤觸遮罩就遺失輸入
  const close = (force = false) => {
    if (!force && snapshot() !== initial && !confirm("內容尚未儲存，確定要放棄嗎？")) return false;
    teardown(); return true;
  };
  formClose = close;
  let downOnBack = false; // 在輸入框內拖曳選字、放開在遮罩上，不算點遮罩
  ov.addEventListener("pointerdown", (e) => { downOnBack = e.target === ov; });
  ov.addEventListener("click", (e) => { if (e.target === ov && downOnBack) close(); });
  ov.querySelector("[data-x]").onclick = () => close();
  ov.querySelector("[data-back]").onclick = () => (page === 0 ? close() : goPage(page - 1));
  void ov.offsetHeight; // 先渲染一次隱藏狀態，淡入動畫才會出現
  ov.classList.remove("nf-hide");
  dlg.focus({ preventScroll: true });

  // ---- 儲存 ----
  f.onsubmit = async (e) => {
    e.preventDefault();
    const bad = checkPage(page);
    if (bad) return showErr(bad);
    if (page < LAST) return goPage(page + 1); // 下一頁（輸入框按 Enter 也是下一頁，不會提早送出）
    for (let i = 0; i < LAST; i++) { const m = checkPage(i); if (m) { goPage(i); return showErr(m); } }
    const perm = st.status === "永久顯示";
    const rec = {
      id: n?.id || "n" + Date.now(), tag: st.tag, color: TAG_COLOR[st.tag], isPinned: st.isPinned,
      author: st.author, title: el("title").value.trim(), content: el("content").value.trim(), link: el("link").value.trim(),
      status: st.status, publishDate: el("publishDate").value, publishTime: el("publishTime").value,
      expireDate: el("expireDate").value, expireTime: el("expireTime").value,
    };
    if (n?.createdAt) rec.createdAt = n.createdAt;
    const btn = f.querySelector("[type=submit]");
    btn.disabled = true;
    try { await notesApi.save(rec); await refresh(); close(true); }
    catch (err) { btn.disabled = false; showErr(err.message || "儲存失敗，請稍後再試"); }
  };
}

function toast(msg) {
  const t = document.createElement("div");
  t.className = "fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-slate-900 text-white font-bold px-5 py-3 rounded-full shadow-xl";
  t.textContent = msg; root.appendChild(t); setTimeout(() => t.remove(), 2500);
}

export default {
  id: "家庭公告",
  storage: "server", // 資料存放：server = 家庭共用 Firestore；private = 私人 Firestore（core/cloud.js 連線）
  access: "public",
  requiresLogin: true, // 計劃案第三節：訪客嚴格禁止
  mount(el) {
    root = document.createElement("div");
    root.className = "px-3.5 pb-6";
    root.innerHTML = `
      <div class="pt-4 pb-1 px-1">
        <span data-count class="text-sm font-black bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full"></span>
        <div class="flex gap-2 overflow-x-auto no-scrollbar mt-3 -mx-1 px-1 pb-1" role="group" aria-label="排序方式">
          ${SORTS.map(([v, t]) => `<button data-sortbtn="${v}" data-tip="notes-sort" class="shrink-0 px-3.5 py-1.5 rounded-full border text-sm font-extrabold active:scale-95 transition">${t}</button>`).join("")}
        </div>
      </div>
      <div data-grid class="grid grid-cols-2 gap-4 pt-3"></div>`;
    el.appendChild(root);
    root.addEventListener("click", (e) => {
      const sb = e.target.closest("[data-sortbtn]");
      if (sb) { sortBy = sb.dataset.sortbtn; render(); return; }
      const b = e.target.closest("[data-open]"); if (b) openDetail(b.dataset.open);
    });
    loaded = false; notes = [];
    render();
    refresh();
    showTipHint("notes");
    off = notesApi.onChange(() => { if (root) refresh(); }); // 家人新增/修改時即時更新
  },
  unmount() { closeTips(); closeLineSendDialog(); formClose?.(true); off?.(); off = null; root?.remove(); root = null; },
};
