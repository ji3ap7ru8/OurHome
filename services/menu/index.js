// 菜單 — 仿「生活圖卡」：一張卡 = 名稱 + 圖示（選填）+ 菜單圖片（選填）+ 線上點餐連結（選填）。
// 點卡片 → 有菜單圖片就放大看（有點餐連結時下方多一顆「線上點餐」）；只有點餐連結就直接開啟。
// 瀏覽格式 / 排序 / 新增 / 編輯 / 刪除都在右上角 ︙ 菜單設定（components/menu-options.js），同生活圖卡設定。
import { menuApi } from "./data.js";
import { on, state } from "../../core/store.js";
import { orderedMenus, setMenuItems } from "../../core/menu-model.js";
import { takeOpenMenu } from "../../core/lobby-model.js";
import { showTipHint, closeTips } from "../../core/tips.js";

let items = [];
let loaded = false;
let root = null;
let off = null;
let offEv = [];
let want = null; // 從大廳點進來要直接放大的菜單 id
let fs = { scale: 1, rotated: false, dist: 0, multi: false };

const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safeImg = (u) => (/^https:\/\//i.test(u || "") ? u : "");
const iconHtml = (m) => {
  const fb = "fa-solid fa-utensils text-2xl menu-icon";
  const u = safeImg(m.iconUrl);
  return u ? `<img data-icon data-fb="${fb}" src="${esc(u)}" alt="" referrerpolicy="no-referrer" class="w-full h-full object-contain">` : `<i class="${fb}"></i>`;
};
function fixImgs(scope) {
  scope.querySelectorAll("img[data-icon]").forEach((im) => im.addEventListener("error", () => { const i = document.createElement("i"); i.className = im.dataset.fb; im.replaceWith(i); }, { once: true }));
  scope.querySelectorAll("img[data-pic]").forEach((im) => im.addEventListener("error", () => {
    const d = document.createElement("div");
    d.className = "font-bold text-slate-500 text-center break-all text-sm p-4";
    d.textContent = "圖片載入失敗，請確認連結是圖片的直接連結";
    im.replaceWith(d);
  }, { once: true }));
}

function toast(msg) {
  if (!root) return;
  const t = document.createElement("div");
  t.className = "fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-slate-900 text-white font-bold px-5 py-3 rounded-full shadow-xl";
  t.textContent = msg; root.appendChild(t); setTimeout(() => t.remove(), 2500);
}

const CARD = {
  l: { pad: "px-4 py-7", box: "w-20 h-20", icon: "text-3xl", name: "text-lg" },
  m: { pad: "px-4 py-6", box: "w-16 h-16", icon: "text-2xl", name: "text-base" },
  s: { pad: "px-3 py-4", box: "w-12 h-12", icon: "text-lg", name: "text-sm" },
};
const LIST = {
  l: { pad: "py-4 px-5", box: "w-16 h-16", icon: "text-2xl", name: "text-lg" },
  m: { pad: "py-3 px-4", box: "w-14 h-14", icon: "text-xl", name: "text-base" },
  s: { pad: "py-2 px-3", box: "w-10 h-10", icon: "text-base", name: "text-sm" },
};
const GRID_COLS = { 2: "grid-cols-2", 3: "grid-cols-3" };
const tags = (m) => (safeImg(m.imageUrl) ? '<i class="fa-solid fa-image" title="有菜單圖片"></i>' : "") + (safeImg(m.orderUrl) ? '<i class="fa-solid fa-bag-shopping" title="可線上點餐"></i>' : "");
const kindOf = (m) => [safeImg(m.imageUrl) ? "菜單圖片" : "", safeImg(m.orderUrl) ? "線上點餐" : ""].filter(Boolean).join("・") || "僅名稱";
const tipOf = (m) => (!safeImg(m.imageUrl) && safeImg(m.orderUrl) ? "menu-link" : "menu-open");

function render() {
  if (!root) return;
  const { mode, size, cols } = state.menuView; // ︙ 菜單設定：瀏覽方式 / 大小 / 每行數量
  const list = mode === "list";
  const c = (list ? LIST : CARD)[size] || (list ? LIST : CARD).m;
  const sorted = orderedMenus(items, state.menuSort.sort); // 預設 / 名稱 / 自訂
  const html = sorted.map((m) => list
    ? `<div>
        <button data-open="${m.id}" data-tip="${tipOf(m)}" class="menu-card w-full rounded-2xl ${c.pad} flex items-center gap-4 active:scale-[.98] transition text-left">
          <span class="menu-plate ${c.box} rounded-full overflow-hidden flex items-center justify-center shrink-0 p-2">${iconHtml(m)}</span>
          <span class="flex-1 min-w-0">
            <span class="menu-name !text-left block truncate ${c.name}">${esc(m.name)}</span>
            <span class="menu-tags !justify-start">${tags(m)}</span>
          </span>
          <i class="fa-solid fa-chevron-right text-xs shrink-0" style="color:var(--m-sub)"></i>
        </button>
      </div>`
    : `<div>
        <button data-open="${m.id}" data-tip="${tipOf(m)}" class="menu-card w-full min-w-0 rounded-3xl ${c.pad} flex flex-col items-center active:scale-95 transition">
          <span class="menu-plate ${c.box} rounded-full overflow-hidden flex items-center justify-center shrink-0 mb-4 p-2">${iconHtml(m)}</span>
          <span class="menu-name ${c.name}">${esc(m.name)}</span>
          <span class="menu-rule"></span>
          <span class="menu-tags">${tags(m)}</span>
        </button>
      </div>`).join("");
  const empty = loaded && !items.length
    ? '<div class="menu-empty col-span-full text-center font-bold py-10 leading-relaxed"><i class="fa-solid fa-utensils text-2xl mb-2"></i><br>還沒有菜單<br><span class="text-sm font-semibold">點右上角 <i class="fa-solid fa-ellipsis-vertical"></i> →「新增菜單」</span></div>' : "";
  root.innerHTML = `
    <div class="menu-awning"></div>
    <div class="menu-title">MENU</div>
    <div class="px-5 pt-3 pb-6">
      <div class="menu-grid ${list ? "flex flex-col gap-3" : "grid " + (GRID_COLS[cols] || GRID_COLS[2]) + (cols === 3 ? " gap-3" : " gap-4")}">
        ${html}
        ${loaded ? "" : '<div class="menu-empty col-span-full text-center font-bold py-4">載入中…</div>'}
        ${empty}
      </div>
    </div>`;
  fixImgs(root);
}

async function refresh() {
  try { items = await menuApi.list(); } catch (e) { toast(e.message || "讀取失敗"); }
  loaded = true;
  setMenuItems(items.map((m) => ({ id: m.id, name: m.name, kind: kindOf(m) }))); // 讓 ︙ 菜單設定的「自訂排序」知道目前有哪些菜單
  render();
  if (want) { const id = want; want = null; const m = items.find((x) => x.id === id); if (m) openFullscreen(m); }
}
async function run(fn) {
  try { await fn(); await refresh(); return true; }
  catch (e) { toast(e.message || "儲存失敗，請稍後再試"); return false; }
}

// 放大看菜單圖片：單擊切換橫／直向、雙指縮放（同生活圖卡）
function openFullscreen(m) {
  fs = { scale: 1, rotated: false, dist: 0, multi: false };
  const o = document.createElement("div");
  o.setAttribute("data-card-fs", "");
  o.className = "absolute inset-0 z-[100] flex items-center justify-center bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl";
  const u = safeImg(m.imageUrl), ou = safeImg(m.orderUrl);
  o.innerHTML = `
    <button data-x aria-label="關閉" class="absolute top-6 right-6 w-11 h-11 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 shadow text-xl text-slate-700 dark:text-slate-100 z-10"><i class="fa-solid fa-xmark"></i></button>
    <div class="absolute top-7 left-6 right-20 text-lg font-black text-slate-800 dark:text-slate-100 truncate">${esc(m.name)}</div>
    <div data-card class="bg-white rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-3 flex items-center justify-center transition-transform duration-200" style="width:90vw;max-width:30rem;touch-action:none">
      ${u ? `<img data-pic src="${esc(u)}" alt="${esc(m.name)}" referrerpolicy="no-referrer" class="max-w-full rounded-xl" style="max-height:75vh">` : '<div class="font-bold text-slate-500 text-center p-6">這份菜單沒有圖片，請用下方按鈕線上點餐</div>'}
    </div>
    ${ou ? `<a data-order href="${esc(ou)}" target="_blank" rel="noopener noreferrer" data-tip="menu-link" class="absolute bottom-20 flex items-center gap-2 rounded-full bg-orange-600 text-white font-black text-base px-6 py-3 shadow-xl active:scale-95 transition"><i class="fa-solid fa-bag-shopping"></i> 線上點餐</a>` : ""}
    <div class="absolute bottom-8 text-sm font-semibold text-slate-600 dark:text-slate-200 bg-white/90 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-600 rounded-full px-4 py-2 pointer-events-none">${u ? "單擊切換橫／直向 ｜ 雙指可縮放" : "點空白處關閉"}</div>`;
  const card = o.querySelector("[data-card]");
  fixImgs(card);
  o.querySelector("[data-order]")?.addEventListener("click", (e) => e.stopPropagation());
  const apply = () => (card.style.transform = `rotate(${fs.rotated ? 90 : 0}deg) scale(${fs.scale})`);
  const d = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  card.addEventListener("touchstart", (e) => { fs.multi = e.touches.length === 2; if (fs.multi) fs.dist = d(e.touches); }, { passive: true });
  card.addEventListener("touchmove", (e) => { if (e.touches.length === 2 && fs.dist) { const n = d(e.touches); fs.scale = Math.min(Math.max(fs.scale * (n / fs.dist), 0.8), 3.5); fs.dist = n; apply(); } }, { passive: true });
  card.addEventListener("touchend", (e) => { if (e.touches.length < 2) fs.dist = 0; });
  card.addEventListener("click", (e) => { e.stopPropagation(); if (!fs.multi) { fs.rotated = !fs.rotated; apply(); } fs.multi = false; });
  const close = () => o.remove();
  o.querySelector("[data-x]").onclick = close;
  o.addEventListener("click", (e) => e.target === o && close());
  (document.getElementById("appContainer") || root).appendChild(o);
}

function openForm(m = null) {
  const d = m || { name: "", iconUrl: "", imageUrl: "", orderUrl: "" };
  const input = "w-full p-2.5 border border-slate-300 rounded-xl text-base bg-white text-slate-900 outline-none theme-focus-border";
  const w = document.createElement("div");
  w.className = "fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4";
  w.innerHTML = `
    <form class="flat-form w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-5 shadow-2xl space-y-3 text-slate-800 dark:text-slate-100" novalidate>
      <h3 class="text-xl font-black">${m ? "編輯" : "新增"}菜單</h3>
      <label class="font-bold text-sm block">名稱 *<input name="name" value="${esc(d.name)}" maxlength="20" class="${input}"></label>
      <label class="font-bold text-sm block">圖示連結（選填，https 圖片直接連結）<input name="iconUrl" type="url" value="${esc(d.iconUrl)}" placeholder="https://.../icon.png" class="${input}"></label>
      <label class="font-bold text-sm block">菜單圖片連結（選填，https 圖片直接連結）<input name="imageUrl" type="url" value="${esc(d.imageUrl)}" placeholder="https://.../menu.jpg" class="${input}"></label>
      <label class="font-bold text-sm block">線上點餐連結（選填，https 網址）<input name="orderUrl" type="url" value="${esc(d.orderUrl || "")}" placeholder="https://.../order" class="${input}"></label>
      <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold">菜單圖片與線上點餐連結至少填一個。</p>
      <p data-err class="text-red-600 font-bold text-sm hidden"></p>
      <div class="flex gap-2 pt-1">
        ${m ? '<button type="button" data-del class="px-4 py-3 rounded-xl font-bold bg-red-100 text-red-700"><i class="fa-solid fa-trash"></i> 刪除</button>' : ""}
        <button type="submit" class="flat-btn flex-1 text-white py-3 rounded-xl font-bold text-base active:scale-95 transition">儲存</button>
        <button type="button" data-close class="px-5 py-3 rounded-xl font-bold bg-slate-200 text-slate-800">取消</button>
      </div>
    </form>`;
  const f = w.querySelector("form");
  const close = () => w.remove();
  w.querySelector("[data-close]").onclick = close;
  w.addEventListener("click", (e) => e.target === w && close());
  const del = w.querySelector("[data-del]");
  if (del) del.onclick = async () => {
    if (!del.dataset.sure) { del.dataset.sure = "1"; del.textContent = "再按一次刪除"; setTimeout(() => { if (del.isConnected) { del.dataset.sure = ""; del.innerHTML = '<i class="fa-solid fa-trash"></i> 刪除'; } }, 3000); return; }
    if (await run(() => menuApi.remove(m.id))) close();
  };
  f.onsubmit = async (e) => {
    e.preventDefault();
    const err = (t) => { const p = f.querySelector("[data-err]"); p.textContent = t; p.classList.remove("hidden"); };
    const rec = { id: m?.id || "u" + Date.now(), name: f.name.value.trim(), iconUrl: f.iconUrl.value.trim(), imageUrl: f.imageUrl.value.trim(), orderUrl: f.orderUrl.value.trim() };
    if (!rec.name) return err("請輸入名稱");
    if (!rec.imageUrl && !rec.orderUrl) return err("菜單圖片連結與線上點餐連結至少填一個");
    if (rec.imageUrl && !safeImg(rec.imageUrl)) return err("菜單圖片連結需以 https:// 開頭");
    if (rec.orderUrl && !safeImg(rec.orderUrl)) return err("線上點餐連結需以 https:// 開頭");
    if (rec.iconUrl && !safeImg(rec.iconUrl)) return err("圖示連結需以 https:// 開頭");
    if (m?.createdAt) rec.createdAt = m.createdAt;
    const btn = f.querySelector("[type=submit]");
    btn.disabled = true;
    if (await run(() => menuApi.save(rec))) close(); else btn.disabled = false;
  };
  root.appendChild(w);
}

export default {
  id: "菜單",
  storage: "server", // 家庭共用 Firestore（集合 menus）
  access: "public",
  requiresLogin: true, // 同生活圖卡：訪客不可用
  mount(el) {
    root = document.createElement("div");
    root.className = "min-h-full";
    el.appendChild(root);
    root.addEventListener("click", (e) => {
      const o = e.target.closest("[data-open]");
      if (!o) return;
      const m = items.find((x) => x.id === o.dataset.open);
      if (!m) return;
      if (!safeImg(m.imageUrl) && safeImg(m.orderUrl)) { window.open(m.orderUrl, "_blank", "noopener,noreferrer"); return; } // 只有點餐連結：直接開啟
      openFullscreen(m);
    });
    want = takeOpenMenu();
    loaded = false; items = [];
    render();
    refresh();
    showTipHint("menu");
    off = menuApi.onChange(() => { if (root) refresh(); });
    // ︙ 菜單設定改了格式 / 排序 → 立刻重畫；「新增菜單」「編輯」「刪除」都從設定視窗進來
    const redraw = () => { if (root) render(); };
    offEv = [on("menu:view", redraw), on("menu:change", redraw), on("menu:add", () => { if (root) openForm(); }),
      on("menu:edit", (id) => { const m = items.find((x) => x.id === id); if (root && m) openForm(m); }),
      on("menu:delete", (id) => { if (root) run(() => menuApi.remove(id)); })];
  },
  unmount() { closeTips(); document.querySelectorAll("#appContainer > [data-card-fs]").forEach((n) => n.remove()); off?.(); off = null; offEv.forEach((f) => f()); offEv = []; setMenuItems([]); root?.remove(); root = null; },
};
