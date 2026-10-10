// 個人記事本 — Stage 6：純前端 UI + 邏輯，資料只存在記憶體（訪客關閉網頁即清除）。
// 訪客可用（不設 requiresLogin）：計劃案第三節「僅暫存體驗」。
import { memoApi, DEFAULT_CAT, catStyle } from "./data.js";
import { state, on } from "../../core/store.js";
import { isFirebaseConfigured } from "../../core/cloud.js";
import { showTipHint, closeTips } from "../../core/tips.js";

let memos = [];
let root = null;
let filter = "全部";
let query = "";
let alive = false;

const usedCats = () => [...new Set(memos.map((m) => m.category).filter((c) => c && c !== DEFAULT_CAT))];
// 依「系統設定 > 儲存位置 > 我的筆記」的設定顯示對應說明
const STORE_NOTE = {
  none: { icon: "fa-user-secret", cls: "bg-amber-100 text-amber-900", text: "目前儲存位置為「不保存」，只會暫存資料，重整網頁將會清除。（可到 設定 > 儲存位置 變更）" },
  google: { icon: "fa-brands fa-google-drive", cls: "bg-sky-100 text-sky-900", text: "新增筆記將儲存至個人雲端硬碟中，資料如過大將佔用個人雲端空間需注意。" },
  server: { icon: "fa-server", cls: "bg-orange-100 text-orange-900", text: "新增筆記將儲存至伺服器中，依使用者帳號分區存放。" },
  private: { icon: "fa-lock", cls: "bg-emerald-100 text-emerald-900", text: "新增筆記將儲存至私人端中，隱密性極高。" },
};
let noteListening = false;
const WARN = "bg-amber-100 text-amber-900";
// 依儲存位置設定檢查系統設定／登入狀態，回傳要顯示的說明
const noteFor = (mode) => {
  const n = STORE_NOTE[mode] || STORE_NOTE.none;
  const warn = (text) => ({ icon: "fa-triangle-exclamation", cls: WARN, text });
  if (mode === "private" && !isFirebaseConfigured("private")) return warn("未設定私人端，只會暫存資料，重整網頁將會清除。");
  if (mode === "google" && !state.isLoggedIn) return warn("請先登入Google在新增筆記，否則只會暫存資料，重整網頁將會清除。");
  if (mode === "server") {
    if (!isFirebaseConfigured("server")) return warn("未設定伺服器，只會暫存資料，重整網頁將會清除。");
    if (!state.isLoggedIn) return warn("請先登入Google在新增筆記，否則只會暫存資料，重整網頁將會清除。");
  }
  return n;
};
const currentMode = () => state.storage?.memos || "none";
const setNote = (mode = currentMode()) => {
  const el = root?.querySelector("[data-note]"); if (!el) return;
  const n = noteFor(mode);
  el.hidden = dismissed === n.text; // 按過「了解」的同一則提示不再顯示（提示內容改變才會再出現）
  el.className = `memo-sticky mb-3 text-sm font-bold leading-relaxed rounded-lg px-3 py-2 ${n.cls}`;
  el.innerHTML = `<i class="${n.icon.includes(" ") ? n.icon : "fa-solid " + n.icon} mr-1"></i>${n.text} <button type="button" data-note-ok data-tip="memo-note-ok" class="ml-1 px-2.5 py-0.5 rounded-full bg-white/80 border border-current text-xs font-black active:scale-95 transition">了解</button>`;
  el.querySelector("[data-note-ok]").onclick = () => { dismissed = n.text; el.hidden = true; };
};
let dismissed = "";
const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (t) => { const d = new Date(t), p = (n) => String(n).padStart(2, "0"); return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`; };

const visible = () => {
  const q = query.trim().toLowerCase();
  return memos
    .filter((m) => (filter === "全部" || m.category === filter) && (!q || (m.title + m.content).toLowerCase().includes(q)))
    .sort((a, b) => (b.pinned - a.pinned) || b.updatedAt - a.updatedAt);
};

function render() {
  if (!root) return;
  if (filter !== "全部" && !usedCats().includes(filter)) filter = "全部";
  const list = visible();
  root.querySelector("[data-chips]").innerHTML = ["全部", ...usedCats()].map((c) =>
    `<button data-cat="${esc(c)}" data-tip="memo-tab" class="memo-tab${c === filter ? " on" : ""}">${esc(c)}</button>`).join("");
  root.querySelector("[data-count]").textContent = `共 ${memos.length} 則`;
  root.querySelector("[data-list]").innerHTML = list.length ? list.map((m) => {
    const s = catStyle(m.category);
    return `
    <button data-open="${m.id}" data-tip="memo-card" class="memo-card" style="--memo-accent:${s.accent}">
      <div class="flex items-center justify-between gap-2 mb-1.5">
        <span class="text-xs font-extrabold px-2.5 py-1 rounded-full ${s.cls}"><i class="fa-solid fa-tag"></i> ${esc(m.category || DEFAULT_CAT)}</span>
        <span class="text-xs font-medium text-slate-400">${m.pinned ? '<i class="fa-solid fa-thumbtack text-rose-500 mr-1"></i>' : ""}${fmt(m.updatedAt)}</span>
      </div>
      <h3 class="text-lg font-black text-slate-800 dark:text-slate-100 break-words">${esc(m.title)}</h3>
      ${m.content ? `<p class="text-base font-medium text-slate-600 dark:text-slate-300 line-clamp-3 whitespace-pre-wrap mt-1 leading-relaxed">${esc(m.content)}</p>` : ""}
    </button>`;
  }).join("") : `<div class="text-center py-14 text-slate-500 dark:text-slate-400 font-bold text-base leading-relaxed">${memos.length ? "找不到符合的記事" : "還沒有記事<br>按右上方「<i class=\"fa-solid fa-pen\"></i>」鉛筆圖示新增第一則"}</div>`;
}

function toast(msg) {
  const t = document.createElement("div");
  t.className = "fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-slate-900 text-white font-bold px-5 py-3 rounded-full shadow-xl max-w-[85vw] text-center";
  t.textContent = msg; root?.appendChild(t); setTimeout(() => t.remove(), 2500);
}

function openForm(m = null) {
  const d = m || { title: "", content: "", category: DEFAULT_CAT, pinned: false };
  const cur = d.category || DEFAULT_CAT;
  const cats = [DEFAULT_CAT, ...usedCats()];
  if (!cats.includes(cur)) cats.push(cur);
  const chip = (c) => `<label data-tip="memo-pick" class="cursor-pointer"><input type="radio" name="category" value="${esc(c)}" class="sr-only peer" ${c === cur ? "checked" : ""}><span class="memo-pick">${esc(c)}</span></label>`;
  const wrap = document.createElement("div");
  wrap.className = "fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center";
  wrap.innerHTML = `
    <form class="memo-paper w-full max-w-md max-h-[92vh] overflow-y-auto no-scrollbar rounded-t-3xl shadow-2xl">
      <span class="memo-paper-tape"></span>
      <div class="memo-row flex justify-between items-center">
        <h3 class="text-xl font-black memo-ink">${m ? "編輯記事" : "新增記事"}</h3>
        <button type="button" data-close data-tip="memo-close" aria-label="關閉" class="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 memo-ink"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <input name="title" maxlength="40" value="${esc(d.title)}" placeholder="標題（必填）" aria-label="標題" class="memo-line-input memo-title memo-sep">
      <div class="memo-row memo-label">分類</div>
      <div class="memo-chips" data-catpick>${cats.map(chip).join("")}</div>
      <div class="memo-row memo-sep flex items-center gap-2">
        <input data-newcat maxlength="10" placeholder="＋ 新增分類" aria-label="新增分類" class="memo-line-input memo-newcat">
        <button type="button" data-addcat data-tip="memo-addcat" class="memo-addcat">加入</button>
      </div>
      <div class="memo-row memo-label">內容 <span class="text-xs font-normal opacity-60">(選填)</span></div>
      <textarea name="content" rows="6" maxlength="2000" placeholder="想記些什麼…" aria-label="內容" class="memo-line-input memo-body">${esc(d.content)}</textarea>
      <label data-tip="memo-pin" class="memo-row flex items-center gap-2 font-bold memo-ink"><input type="checkbox" name="pinned" class="w-5 h-5" ${d.pinned ? "checked" : ""}> <i class="fa-solid fa-thumbtack text-rose-500"></i> 置頂</label>
      <p data-err class="text-red-600 font-bold text-sm hidden memo-row"></p>
      <div class="flex gap-2 pt-3 pb-4">
        ${m ? '<button type="button" data-del data-tip="memo-del" class="px-4 py-3 rounded-xl font-bold bg-red-100 text-red-700"><i class="fa-solid fa-trash"></i> 刪除</button>' : ""}
        <button type="submit" data-tip="memo-save" class="flex-1 theme-bg-primary text-white py-3 rounded-xl font-bold text-base">儲存</button>
      </div>
    </form>`;
  root.appendChild(wrap);
  const f = wrap.querySelector("form");
  const close = () => wrap.remove();
  wrap.addEventListener("click", (e) => e.target === wrap && close());
  wrap.querySelector("[data-close]").onclick = close;
  const newcat = wrap.querySelector("[data-newcat]");
  const addCat = () => {
    const name = newcat.value.trim().slice(0, 10); if (!name) return;
    let r = [...f.querySelectorAll('input[name="category"]')].find((x) => x.value === name);
    if (!r) { wrap.querySelector("[data-catpick]").insertAdjacentHTML("beforeend", chip(name)); r = [...f.querySelectorAll('input[name="category"]')].find((x) => x.value === name); }
    r.checked = true; newcat.value = "";
  };
  wrap.querySelector("[data-addcat]").onclick = addCat;
  newcat.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); addCat(); } };
  const del = wrap.querySelector("[data-del]");
  if (del) del.onclick = async () => {
    if (!del.dataset.sure) { del.dataset.sure = "1"; del.textContent = "再按一次刪除"; setTimeout(() => { if (del.isConnected) { del.dataset.sure = ""; del.innerHTML = '<i class="fa-solid fa-trash"></i> 刪除'; } }, 3000); return; }
    try { await memoApi.remove(m.id); } catch (ex) { return toast("刪除失敗：" + (ex.message || ex)); }
    close(); await reload(); toast("已刪除");
  };
  f.onsubmit = async (e) => {
    e.preventDefault();
    const err = f.querySelector("[data-err]");
    const title = f.title.value.trim();
    if (!title) { err.textContent = "請輸入標題"; err.classList.remove("hidden"); return; }
    try {
      await memoApi.save({ ...(m ? { id: m.id } : {}), title, content: f.content.value.trim(), category: (newcat.value.trim() ? (addCat(), f.category.value) : f.category.value) || DEFAULT_CAT, pinned: f.pinned.checked });
      close(); await reload();
    } catch (ex) { err.textContent = ex.message; err.classList.remove("hidden"); }
  };
  f.title.focus();
}

async function reload() {
  try { memos = await memoApi.list(); } catch (e) { memos = []; if (alive) toast("讀取失敗：" + (e.message || e)); }
  if (alive) render();
}

export default {
  id: "個人記事本",
  storageKey: "memos", // 儲存位置由使用者在「設定 → 資料管理 → 儲存位置」選（不保存 / Google 雲端 / Firebase 私人端）
  access: "private",
  mount(el, ctx) {
    alive = true;
    root = document.createElement("div");
    root.className = "memo-root";
    root.innerHTML = `
      <p data-note></p>
      <div class="flex items-center gap-2 pb-3">
        <div class="relative flex-1 min-w-0">
          <i class="fa-solid fa-magnifying-glass absolute left-1 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input data-search type="search" placeholder="搜尋標題或內容" class="memo-search">
        </div>
        <span data-count class="memo-count whitespace-nowrap"></span>
        <button data-add data-tip="memo-add" aria-label="新增記事" class="memo-fab shrink-0 w-10 h-10 rounded-full theme-bg-primary text-white text-lg"><i class="fa-solid fa-pen"></i></button>
      </div>
      <div data-chips class="memo-tabs flex gap-1.5 overflow-x-auto no-scrollbar mb-4 pt-2"></div>
      <div data-list class="space-y-4"></div>`;
    el.appendChild(root);
    setNote();
    if (!noteListening) { noteListening = true;
      on("data:change", (e) => { if (alive && e?.name === "memos") reload(); }); // 切換儲存位置 / 雲端資料更新後重新讀取
      for (const ev of ["auth:change", "cloud:change", "storage:sync", "storage:change"]) on(ev, () => { if (alive) setNote(); }); // 登入／連線／設定變動時重新檢查
    }
    root.querySelector("[data-search]").value = query;
    root.querySelector("[data-search]").oninput = (e) => { query = e.target.value; render(); };
    root.querySelector("[data-add]").onclick = () => openForm();
    root.addEventListener("click", (e) => {
      const c = e.target.closest("[data-cat]"); if (c) { filter = c.dataset.cat; render(); return; }
      const o = e.target.closest("[data-open]"); if (o) openForm(memos.find((x) => x.id === o.dataset.open));
    });
    reload();
    showTipHint("memo");
  },
  unmount() { closeTips(); alive = false; root?.remove(); root = null; },
};
