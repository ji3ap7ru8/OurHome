// 生活圖卡（條碼包）— Stage 8：資料走 cardsApi（連線後即時同步家庭共用 Firestore，否則只存記憶體）。
import { KINDS, MAX_CODES, cardsApi } from "./data.js";
import { code39Svg, isCode39 } from "./code39.js";
import { state, on } from "../../core/store.js";
import { showTipHint, closeTips } from "../../core/tips.js";
import { orderedCards, setCardItems, takeOpenCard } from "../../core/cards-model.js";

let cards = [];
let loaded = false;
let off = null;
let offView = [];
let root = null;
let view = { page: "list", id: null }; // list | detail
let want = null; // 從大廳點進來要直接打開的圖卡 id：等圖卡讀回來就打開
let fs = { scale: 1, rotated: false, dist: 0, multi: false };
let headerHtml = null; // 頂部列左側「生活圖卡」標題的原始內容（詳細頁會換成「返回 + 圖卡名稱」，離開時還原）

const hdrTitle = () => document.getElementById("headerCardsTitle");
const setPage = (p) => { const a = document.getElementById("appContainer"); if (!a) return; if (p) a.setAttribute("data-cards-page", p); else a.removeAttribute("data-cards-page"); };
function headerList() { const h = hdrTitle(); if (h && headerHtml !== null) h.innerHTML = headerHtml; setPage("list"); }
function onHeaderClick(e) { if (e.target.closest("[data-back]")) { view = { page: "list", id: null }; render(); } }

const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safeImg = (u) => (/^https:\/\//i.test(u || "") ? u : "");
// 一張圖卡可有多筆內容 codes:[{label,value}]；舊資料只有 code 字串，也當成一筆
const getCodes = (c) => (Array.isArray(c.codes) && c.codes.length ? c.codes : c.code ? [{ label: "", value: c.code }] : []);
const kindIcon = (k) => KINDS[k.kind]?.icon || "fa-image";
// 圖卡圖示：有貼圖示連結就用圖片（載入失敗自動換回預設小圖示），否則用類型圖示
function iconHtml(k, size) {
  const fb = `fa-solid ${kindIcon(k)} ${size} flat-icon`;
  const u = safeImg(k.iconUrl);
  return u ? `<img data-icon data-fb="${esc(fb)}" src="${esc(u)}" alt="" class="w-full h-full object-contain">` : `<i class="${fb}"></i>`;
}
// 內容裡的圖片連結載入失敗 → 改顯示連結文字
function fixPics(scope) {
  scope.querySelectorAll("img[data-pic]").forEach((im) => {
    im.addEventListener("error", () => {
      const d = document.createElement("div");
      d.className = "font-semibold text-slate-900 text-center break-all text-sm";
      d.textContent = im.dataset.v;
      im.replaceWith(d);
    }, { once: true });
  });
}
function fixIcons(scope) {
  scope.querySelectorAll("img[data-icon]").forEach((im) => {
    im.addEventListener("error", () => { const i = document.createElement("i"); i.className = im.dataset.fb; im.replaceWith(i); }, { once: true });
  });
}

// 依類型產生「可放大」的主視覺：車牌／電話 = 大字；載具／會員／條碼 = Code39 條碼（不能轉就顯示文字）；其他 = 文字。多筆內容由上往下排。
function codeBlock(c, { label, value }, big, multi, hasImg) {
  const lbl = label ? `<div class="text-sm font-bold text-slate-500 mb-1 text-center break-all">${esc(label)}</div>` : "";
  let body;
  const u = safeImg(value); // 內容是 https 連結 → 直接當圖片顯示
  if (u) {
    body = `<img data-pic data-v="${esc(value)}" src="${esc(u)}" alt="${esc(c.name)}" class="max-w-full rounded-lg" style="max-height:${big ? (multi ? "35vh" : "50vh") : (multi ? "10rem" : "14rem")}">`;
  } else if (c.kind === "車牌號碼") {
    body = `<div class="border-4 border-slate-800 rounded-xl px-6 py-3 bg-white text-slate-900 font-black tracking-widest text-center" style="font-size:${big ? (multi ? "2.4rem" : "3rem") : (multi ? "1.8rem" : "2.25rem")}">${esc(value)}</div>`;
  } else if (c.kind === "電話號碼") {
    body = `<div class="font-black text-slate-900 tracking-wider text-center break-all" style="font-size:${big ? (multi ? "2.2rem" : "2.8rem") : (multi ? "1.6rem" : "2rem")}">${esc(value)}</div>`;
  } else if (c.kind === "電子郵件") {
    body = `<div class="font-black text-slate-900 text-center break-all" style="font-size:${big ? (multi ? "1.6rem" : "2rem") : (multi ? "1.2rem" : "1.4rem")}">${esc(value)}</div>`;
  } else if (c.kind === "其他" || hasImg || !isCode39(value)) {
    body = `<div class="font-semibold text-slate-900 tracking-wider text-center break-all" style="font-size:${big ? "1.4rem" : "1.2rem"}">${esc(value)}</div>`;
  } else {
    body = code39Svg(value, big ? (multi ? 110 : 160) : (multi ? 80 : 110))
      + `<div class="font-semibold text-slate-900 tracking-wider mt-3 text-center break-all" style="font-size:${big ? "1.4rem" : "1.2rem"}">${esc(value)}</div>`;
  }
  return `<div class="w-full flex flex-col items-center">${lbl}${body}</div>`;
}
// only：null＝全部；"pic"＝只有舊資料圖片；數字＝只有第 n 筆內容。detail＝詳細頁（每筆內容各自是一顆可放大的按鈕）
function face(c, big = false, only = null, detail = false) {
  const codes = getCodes(c);
  const img = c.kind === "車牌號碼" ? "" : safeImg(c.imageUrl); // 舊資料的內容圖片
  const pic = img ? `<img src="${esc(img)}" alt="${esc(c.name)}" class="max-w-full rounded-lg" style="max-height:${big ? "50vh" : "14rem"}">` : "";
  const multi = codes.length + (img ? 1 : 0) > 1;
  const wrap = (key, html) => detail ? `<button type="button" data-full="${key}" data-tip="cards-zoom" class="w-full flex justify-center active:scale-[0.98] transition">${html}</button>` : html;
  const parts = [];
  if (pic && (only === null || only === "pic")) parts.push(wrap("pic", pic));
  codes.forEach((x, i) => { if (only === null || only === i) parts.push(wrap(i, codeBlock(c, x, big, codes.length > 1 && only === null, !!img))); });
  return `<div class="w-full flex flex-col items-center ${multi && only === null ? "gap-5" : ""}">${parts.join("")}</div>`;
}

// 圖卡大小：內距 / 圖示框 / 圖示 / 名稱 / 類型 / 「新增」最小高度（「中」＝原本的樣子）
const CARD = {
  l: { pad: "p-6", box: "w-16 h-16", icon: "text-3xl", name: "text-lg", kind: "text-sm", min: "min-h-[11rem]" },
  m: { pad: "p-5", box: "w-14 h-14", icon: "text-2xl", name: "text-base", kind: "text-xs", min: "min-h-[9rem]" },
  s: { pad: "p-3", box: "w-11 h-11", icon: "text-lg", name: "text-sm", kind: "text-[0.7rem]", min: "min-h-[6.5rem]" },
};
// 清單大小：列內距 / 圖示框 / 圖示 / 名稱 / 類型
const LIST = {
  l: { pad: "py-4 px-5", box: "w-14 h-14", icon: "text-2xl", name: "text-lg", kind: "text-sm" },
  m: { pad: "py-3 px-4", box: "w-12 h-12", icon: "text-xl", name: "text-base", kind: "text-xs" },
  s: { pad: "py-2 px-3", box: "w-9 h-9", icon: "text-base", name: "text-sm", kind: "text-[0.7rem]" },
};
const GRID_COLS = { 2: "grid-cols-2", 3: "grid-cols-3" };

function render() {
  if (view.page === "detail") return renderDetail();
  root.style.removeProperty("--cardc");
  root.classList.remove("flat-detail");
  headerList(); // 清單頁：頂部列回到「生活圖卡 / 點一下卡片顯示條碼」，背景不模糊
  const { mode, size, cols } = state.cardsView; // ︙ 生活圖卡設定：瀏覽方式 / 大小 / 每行數量
  const list = mode === "list";
  const c = (list ? LIST : CARD)[size] || (list ? LIST : CARD).m;
  const gap = list ? "gap-3" : cols === 3 ? "gap-3" : "gap-4";
  const items = orderedCards(cards, state.cardsSort.sort); // 預設 / 名稱 / 自訂
  const html = items.map((k) => list
    ? `<button data-open="${k.id}" data-tip="cards-open" class="flat-card w-full rounded-2xl ${c.pad} flex items-center gap-4 active:scale-[.98] transition text-left">
        <span class="flat-ibox ${c.box} rounded-2xl overflow-hidden flex items-center justify-center shrink-0">${iconHtml(k, c.icon)}</span>
        <span class="flex-1 min-w-0">
          <span class="${c.name} font-bold text-slate-800 dark:text-slate-100 block truncate">${esc(k.name)}</span>
          <span class="${c.kind} font-semibold text-slate-500 dark:text-slate-400 block">${esc(k.kind)}</span>
        </span>
        <i class="fa-solid fa-chevron-right text-xs text-slate-400 dark:text-slate-500 shrink-0"></i>
      </button>`
    : `<button data-open="${k.id}" data-tip="cards-open" class="flat-card min-w-0 rounded-3xl ${c.pad} flex flex-col items-center active:scale-95 transition">
        <span class="flat-ibox ${c.box} rounded-2xl overflow-hidden flex items-center justify-center shrink-0 mb-3">${iconHtml(k, c.icon)}</span>
        <span class="${c.name} font-bold text-slate-800 dark:text-slate-100 text-center break-words w-full">${esc(k.name)}</span>
        <span class="${c.kind} font-semibold text-slate-500 dark:text-slate-400 mt-0.5">${esc(k.kind)}</span>
      </button>`).join("");
  const empty = loaded && !items.length
    ? '<div class="col-span-full text-center text-slate-400 dark:text-slate-500 font-bold py-10 leading-relaxed"><i class="fa-solid fa-ellipsis-vertical"></i> 還沒有圖卡<br><span class="text-sm font-semibold">點右上角 ︙ →「新增圖卡」</span></div>'
    : "";
  root.innerHTML = `
    <div class="px-5 pt-2 pb-6">
      <div class="${list ? "flex flex-col" : "grid " + (GRID_COLS[cols] || GRID_COLS[2])} ${gap}">
        ${html}
        ${loaded ? "" : '<div class="col-span-full text-center text-slate-400 font-bold py-4">載入中…</div>'}
        ${empty}
      </div>
    </div>`;
  fixIcons(root);
}

async function refresh() {
  try { cards = await cardsApi.list(); } catch (e) { toast(e.message || "讀取失敗"); }
  loaded = true;
  setCardItems(cards); // 讓 ︙ 生活圖卡設定的「自訂排序」知道目前有哪些圖卡
  if (!root) return;
  if (want) { const id = want; want = null; if (cards.some((x) => x.id === id)) view = { page: "detail", id }; } // 大廳點進來：直接打開那一張
  if (view.page === "detail" && !cards.some((x) => x.id === view.id)) view = { page: "list", id: null }; // 這張卡被別台裝置刪掉了
  render();
}

async function run(fn) {
  try { await fn(); await refresh(); return true; }
  catch (e) { toast(e.message || "儲存失敗，請稍後再試"); return false; }
}

function toast(msg) {
  if (!root) return;
  const t = document.createElement("div");
  t.className = "fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-slate-900 text-white font-bold px-5 py-3 rounded-full shadow-xl";
  t.textContent = msg; root.appendChild(t); setTimeout(() => t.remove(), 2500);
}

function renderDetail() {
  const c = cards.find((x) => x.id === view.id);
  if (!c) { view = { page: "list" }; return render(); }
  root.style.removeProperty("--cardc");
  root.classList.add("flat-detail");
  setPage("detail"); // 詳細頁：整個背景（含上方標題列、下方底欄區）一起模糊，見 app.css
  const h = hdrTitle();
  if (h) h.innerHTML = `<div class="flex items-center gap-3 min-w-0">
        <button data-back class="flat-chip rounded-2xl px-4 py-2 font-bold active:scale-95 transition shrink-0"><i class="fa-solid fa-chevron-left"></i> 返回</button>
        <h2 class="text-xl font-extrabold text-slate-900 dark:text-slate-100 truncate min-w-0">${esc(c.name)}</h2>
      </div>`; // 返回鈕 + 名稱搬到頂部列左側（取代原本的標題）
  root.innerHTML = `
    <div class="px-5 pt-3 pb-6">
      <div class="flat-face w-full rounded-[2rem] p-6 flex justify-center">${face(c, false, null, true)}</div>
      <p class="text-center text-sm font-bold text-slate-600 dark:text-slate-300 mt-4"><i class="fa-solid fa-magnifying-glass-plus"></i> 點擊任一內容可單獨放大</p>
    </div>`;
  fixPics(root);
  showTipHint("cards-detail");
}

function openFullscreen(c, only = null) {
  fs = { scale: 1, rotated: false, dist: 0, multi: false };
  const o = document.createElement("div");
  o.setAttribute("data-card-fs", "");
  o.className = "absolute inset-0 z-[100] flex items-center justify-center bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl"; // 放大時整個畫面蓋上主題底色（淺色=白、深色=黑）+ 模糊
  o.innerHTML = `
    <button data-x aria-label="關閉" class="absolute top-6 right-6 w-11 h-11 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 shadow text-xl text-slate-700 dark:text-slate-100 z-10"><i class="fa-solid fa-xmark"></i></button>
    <div data-card class="bg-white rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5 flex items-center justify-center transition-transform duration-200" style="width:85vw;max-width:28rem;touch-action:none">${face(c, true, only)}</div>
    <div class="absolute bottom-8 text-sm font-semibold text-slate-600 dark:text-slate-200 bg-white/90 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-600 rounded-full px-4 py-2 pointer-events-none">單擊切換橫／直向 ｜ 雙指可縮放</div>`;
  const card = o.querySelector("[data-card]");
  fixPics(card);
  const apply = () => (card.style.transform = `rotate(${fs.rotated ? 90 : 0}deg) scale(${fs.scale})`);
  const d = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  card.addEventListener("touchstart", (e) => { fs.multi = e.touches.length === 2; if (fs.multi) fs.dist = d(e.touches); }, { passive: true });
  card.addEventListener("touchmove", (e) => {
    if (e.touches.length === 2 && fs.dist) { const n = d(e.touches); fs.scale = Math.min(Math.max(fs.scale * (n / fs.dist), 0.8), 3.5); fs.dist = n; apply(); }
  }, { passive: true });
  card.addEventListener("touchend", (e) => { if (e.touches.length < 2) fs.dist = 0; });
  card.addEventListener("click", (e) => { e.stopPropagation(); if (!fs.multi) { fs.rotated = !fs.rotated; apply(); } fs.multi = false; });
  const close = () => o.remove();
  o.querySelector("[data-x]").onclick = close;
  o.addEventListener("click", (e) => e.target === o && close());
  (document.getElementById("appContainer") || root).appendChild(o); // 掛在整個 App 容器：連上方標題列和下方底欄一起蓋住（容器本身有 dark 樣式，主題色照樣生效）
}

function openForm(c = null) {
  const d = c || { name: "", kind: "會員條碼", iconUrl: "", imageUrl: "" };
  const start = getCodes(d);
  const input = "w-full p-2.5 border border-slate-300 rounded-xl text-base bg-white text-slate-900 outline-none theme-focus-border";
  const row = (x = {}) => `
    <div data-row class="flex items-center gap-2">
      <input data-label value="${esc(x.label || "")}" maxlength="10" placeholder="備註" aria-label="備註（選填）" class="${input} !w-20 shrink-0 !px-2">
      <input data-value value="${esc(x.value || "")}" maxlength="500" aria-label="內容" class="${input} min-w-0 flex-1">
      <button type="button" data-delrow aria-label="刪除這筆" class="w-10 h-10 rounded-xl bg-slate-200 text-slate-600 shrink-0 active:scale-90 transition"><i class="fa-solid fa-xmark"></i></button>
    </div>`;
  const m = document.createElement("div");
  m.className = "fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4";
  m.innerHTML = `
    <form class="flat-form w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-5 shadow-2xl space-y-3 text-slate-800 dark:text-slate-100">
      <h3 class="text-xl font-black">${c ? "編輯" : "新增"}圖卡</h3>
      <label class="font-bold text-sm block">名稱 *<input name="name" value="${esc(d.name)}" maxlength="20" class="${input}"></label>
      <label class="font-bold text-sm block">類型<select name="kind" class="${input}">${Object.keys(KINDS).map((k) => `<option ${k === d.kind ? "selected" : ""}>${k}</option>`).join("")}</select></label>
      <div>
        <div class="font-bold text-sm"><span data-codelabel>內容</span>（可新增多個）</div>
        <p data-hint class="text-xs font-semibold text-slate-500 mb-2"></p>
        <div data-rows class="space-y-2">${(start.length ? start : [{}]).map(row).join("")}</div>
        <button type="button" data-addrow class="mt-2 w-full py-2 rounded-xl border-2 border-dashed border-slate-300 text-slate-600 font-bold text-sm active:scale-95 transition"><i class="fa-solid fa-plus"></i> 新增一筆內容</button>
      </div>
      <label class="font-bold text-sm block">圖卡圖示連結（選填，https 圖片直接連結）<input name="iconUrl" type="url" value="${esc(d.iconUrl)}" placeholder="https://.../icon.png" class="${input}"></label>
      ${d.imageUrl ? `<label class="font-bold text-sm block">內容圖片連結（舊資料，可清空）<input name="imageUrl" type="url" value="${esc(d.imageUrl)}" class="${input}"></label>` : ""}
      <p data-err class="text-red-600 font-bold text-sm hidden"></p>
      <div class="flex gap-2 pt-1">
        <button type="submit" class="flat-btn flex-1 text-white py-3 rounded-xl font-bold text-base active:scale-95 transition">儲存</button>
        <button type="button" data-close class="px-5 py-3 rounded-xl font-bold bg-slate-200 text-slate-800">取消</button>
      </div>
    </form>`;
  const f = m.querySelector("form");
  const rows = m.querySelector("[data-rows]");
  const sync = () => {
    const k = KINDS[f.kind.value];
    m.querySelector("[data-hint]").textContent = k.hint + "；也可直接貼上 https 圖片連結，會顯示成圖片。";
    m.querySelector("[data-codelabel]").textContent = k.label;
    rows.querySelectorAll("[data-value]").forEach((i) => (i.placeholder = k.ph));
    m.querySelector("[data-addrow]").classList.toggle("hidden", rows.children.length >= MAX_CODES);
  };
  f.addEventListener("change", sync); sync();
  f.addEventListener("click", (e) => {
    if (e.target.closest("[data-addrow]") && rows.children.length < MAX_CODES) {
      rows.insertAdjacentHTML("beforeend", row()); sync(); rows.lastElementChild.querySelector("[data-value]").focus();
    }
    const del = e.target.closest("[data-delrow]");
    if (del) {
      if (rows.children.length > 1) del.closest("[data-row]").remove();
      else del.closest("[data-row]").querySelectorAll("input").forEach((i) => (i.value = "")); // 只剩一筆：清空即可
      sync();
    }
  });
  m.querySelector("[data-close]").onclick = () => m.remove();
  m.addEventListener("click", (e) => e.target === m && m.remove());
  f.onsubmit = async (e) => {
    e.preventDefault();
    const err = (t) => { const p = f.querySelector("[data-err]"); p.textContent = t; p.classList.remove("hidden"); };
    const codes = [...rows.querySelectorAll("[data-row]")]
      .map((r) => ({ label: r.querySelector("[data-label]").value.trim(), value: r.querySelector("[data-value]").value.trim() }))
      .filter((x) => x.value);
    const rec = {
      id: c?.id || "c" + Date.now(), name: f.name.value.trim(), kind: f.kind.value,
      code: codes[0]?.value || "", codes, iconUrl: f.iconUrl.value.trim(), imageUrl: f.imageUrl ? f.imageUrl.value.trim() : "",
    };
    if (!rec.name) return err("請輸入名稱");
    if (!codes.length && !rec.imageUrl) return err("請至少輸入一筆內容");
    if (rec.iconUrl && !safeImg(rec.iconUrl)) return err("圖示連結需以 https:// 開頭");
    if (rec.imageUrl && !safeImg(rec.imageUrl)) return err("內容圖片連結需以 https:// 開頭");
    if (rec.kind === "電子發票載具" && codes.some((x) => !safeImg(x.value) && !isCode39(x.value))) return err("載具條碼只能包含英數字與 - . 空白 $ / + %，例如 /ABC1234");
    const btn = f.querySelector("[type=submit]");
    if (btn) btn.disabled = true;
    if (c?.createdAt) rec.createdAt = c.createdAt;
    if (await run(() => cardsApi.save(rec))) {
      m.remove();
      view = c && view.page === "detail" && view.id === rec.id ? view : { page: "list" }; // 正在看這張卡 → 留在詳細頁
      render();
    } else if (btn) btn.disabled = false;
  };
  root.appendChild(m);
}

export default {
  id: "生活圖卡",
  storage: "server", // 資料存放：server = 家庭共用 Firestore；private = 私人 Firestore（core/cloud.js 連線）
  access: "public",
  requiresLogin: true, // 計劃案第三節：訪客嚴格禁止
  mount(el) {
    view = { page: "list", id: null };
    want = takeOpenCard();
    if (headerHtml === null) headerHtml = hdrTitle()?.innerHTML ?? null;
    hdrTitle()?.addEventListener("click", onHeaderClick);
    root = document.createElement("div");
    root.className = "min-h-full transition-[background] duration-300";
    el.appendChild(root);
    root.addEventListener("click", (e) => {
      const t = e.target;
      const open = t.closest("[data-open]");
      if (open) { view = { page: "detail", id: open.dataset.open }; return render(); }
      if (t.closest("[data-back]")) { view = { page: "list" }; return render(); }
      const cur = cards.find((x) => x.id === view.id);
      const full = t.closest("[data-full]");
      if (full && cur) { const k = full.dataset.full; return openFullscreen(cur, k === "pic" ? "pic" : Number(k)); }
    });
    loaded = false; cards = [];
    render();
    refresh();
    showTipHint("cards");
    off = cardsApi.onChange(() => { if (root) refresh(); });
    // ︙ 生活圖卡設定改了格式 / 排序 → 清單頁立刻重畫（詳細頁不動）
    const redraw = () => { if (root && view.page === "list") render(); };
    offView = [on("cards:view", redraw), on("cards:change", redraw), on("cards:add", () => { if (root) openForm(); }), // ︙ 生活圖卡設定 →「新增圖卡」：新增 / 編輯 / 刪除都在那裡
      on("cards:edit", (id) => { const k = cards.find((x) => x.id === id); if (root && k) openForm(k); }),
      on("cards:delete", (id) => {
        if (!root) return;
        if (view.page === "detail" && view.id === id) view = { page: "list", id: null };
        run(() => cardsApi.remove(id));
      })];
  },
  unmount() { closeTips(); hdrTitle()?.removeEventListener("click", onHeaderClick); headerList(); setPage(null); document.querySelectorAll("#appContainer > [data-card-fs]").forEach((n) => n.remove()); off?.(); off = null; offView.forEach((f) => f()); offView = []; setCardItems([]); root?.remove(); root = null; },
};
