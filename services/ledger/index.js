// 記帳本 — Stage 6：收支輸入、分類、月統計圖表 UI；資料只存在記憶體。
// 訪客可用（不設 requiresLogin）：計劃案第三節「僅暫存體驗」。
import { showTipHint, closeTips } from "../../core/tips.js";
import { state, on } from "../../core/store.js";
import { isFirebaseConfigured } from "../../core/cloud.js";
import { ledgerApi } from "./data.js";
import { catsOf, catInfo, ymd, monthKey, shiftMonth, parseAmount, summarize, byCategory, groupByDay } from "./engine.js";

let rows = [];
let root = null;
let alive = false;
let month = monthKey();
let chartType = "expense";
let noteListening = false;
let dismissed = "";

// 依「系統設定 > 儲存位置 > 記帳本」的設定顯示對應說明（邏輯同「我的筆記」）
const STORE_NOTE = {
  none: { icon: "fa-user-secret", cls: "warn", text: "目前儲存位置為「不保存」，只會暫存資料，重整網頁將會清除。（可到 設定 > 儲存位置 變更）" },
  google: { icon: "fa-brands fa-google-drive", cls: "info", text: "新增帳目將儲存至個人雲端硬碟中，資料如過大將佔用個人雲端空間需注意。" },
  server: { icon: "fa-server", cls: "ok", text: "新增帳目將儲存至伺服器中，依使用者帳號分區存放。" },
  private: { icon: "fa-lock", cls: "ok", text: "新增帳目將儲存至私人端中，隱密性極高。" },
};
const noteFor = (mode) => {
  const warn = (text) => ({ icon: "fa-triangle-exclamation", cls: "warn", text });
  if (mode === "private" && !isFirebaseConfigured("private")) return warn("未設定私人端，只會暫存資料，重整網頁將會清除。");
  if (mode === "google" && !state.isLoggedIn) return warn("請先登入Google再新增帳目，否則只會暫存資料，重整網頁將會清除。");
  if (mode === "server") {
    if (!isFirebaseConfigured("server")) return warn("未設定伺服器，只會暫存資料，重整網頁將會清除。");
    if (!state.isLoggedIn) return warn("請先登入Google再新增帳目，否則只會暫存資料，重整網頁將會清除。");
  }
  return STORE_NOTE[mode] || STORE_NOTE.none;
};
const setNote = () => {
  const el = root?.querySelector("[data-note]"); if (!el) return;
  const n = noteFor(state.storage?.ledger || "none");
  el.hidden = dismissed === n.text; // 按過「了解」的同一則提示不再顯示（內容改變才會再出現）
  el.className = `lg-note ${n.cls}`;
  el.innerHTML = `<i class="${n.icon.includes(" ") ? n.icon : "fa-solid " + n.icon} mr-1"></i>${n.text} <button type="button" data-note-ok data-tip="ledger-note-ok" class="lg-note-ok">了解</button>`;
  el.querySelector("[data-note-ok]").onclick = () => { dismissed = n.text; el.hidden = true; };
};

const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => "$" + Number(n).toLocaleString("zh-TW", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const monthLabel = (k) => `${k.slice(0, 4)} 年 ${Number(k.slice(5))} 月`;
const dayLabel = (d) => { const x = new Date(d + "T00:00:00"); return `${x.getMonth() + 1}/${x.getDate()}（${"日一二三四五六"[x.getDay()]}）`; };

function render() {
  if (!root) return;
  const sum = summarize(rows, month);
  const cnt = rows.filter((r) => r.date.startsWith(month)).length;
  const flow = sum.income + sum.expense;
  const inPct = flow ? Math.round((sum.income / flow) * 100) : 50;
  root.querySelector("[data-month]").textContent = monthLabel(month);
  root.querySelector("[data-next]").disabled = month >= monthKey();
  root.querySelector("[data-sum]").innerHTML = `
    <div class="lg-spine"></div>
    <div class="lg-sum-top">
      <div class="lg-label">本月結餘 <span class="lg-stamp">${month.slice(5)}月</span></div>
      <div class="lg-balance ${sum.balance < 0 ? "neg" : ""}">${sum.balance < 0 ? "-" : ""}${money(Math.abs(sum.balance))}</div>
      <div class="lg-ratio" title="收入與支出比例"><i style="width:${inPct}%"></i></div>
    </div>
    <div class="lg-cols">
      <div><span class="lg-label">收入</span><b class="lg-in">${money(sum.income)}</b></div>
      <div><span class="lg-label">支出</span><b class="lg-out">${money(sum.expense)}</b></div>
      <div><span class="lg-label">筆數</span><b>${cnt}</b></div>
    </div>`;

  root.querySelectorAll("[data-ct]").forEach((b) => b.classList.toggle("on", b.dataset.ct === chartType));
  const cats = byCategory(rows, month, chartType);
  root.querySelector("[data-chart]").innerHTML = cats.length ? cats.map((c) => {
    const i = catInfo(chartType, c.name);
    return `<div class="lg-cat">
        <span class="lg-chip" style="background:${i.color}"><i class="fa-solid ${i.icon}"></i></span>
        <div class="flex-1 min-w-0">
          <div class="flex items-baseline gap-1.5"><span class="font-black text-sm">${esc(c.name)}</span><span class="text-xs font-bold text-slate-400">${c.pct.toFixed(0)}%</span><span class="lg-dots"></span><span class="font-black text-sm tabular-nums">${money(c.total)}</span></div>
          <div class="lg-bar"><div style="width:${Math.max(c.pct, 2)}%;background:${i.color}"></div></div>
        </div></div>`;
  }).join("") : `<p class="text-center text-sm font-bold text-slate-400 py-4">這個月還沒有${chartType === "income" ? "收入" : "支出"}紀錄</p>`;

  const days = groupByDay(rows, month);
  root.querySelector("[data-list]").innerHTML = days.length ? days.map((d) => `
    <section class="lg-day">
      <header><span>${dayLabel(d.date)}</span><span class="tabular-nums">${d.net < 0 ? "-" : "+"}${money(Math.abs(d.net))}</span></header>
      ${d.items.map((r) => { const i = catInfo(r.type, r.category); return `
      <button data-tip="ledger-open" data-open="${r.id}" class="lg-row">
        <span class="lg-chip" style="background:${i.color}"><i class="fa-solid ${i.icon}"></i></span>
        <span class="flex-1 min-w-0"><span class="block font-black text-base">${esc(r.category)}</span>
          ${r.note ? `<span class="block text-sm font-medium text-slate-500 dark:text-slate-400 truncate">${esc(r.note)}</span>` : ""}</span>
        <span class="lg-amt ${r.type === "income" ? "lg-in" : "lg-out"}">${r.type === "income" ? "+" : "-"}${money(r.amount)}</span>
      </button>`; }).join("")}
    </section>`).join("") : '<div class="lg-empty"><i class="fa-solid fa-book-open"></i><p>這個月還沒有帳目<br>按右上角「記一筆」開始記帳</p></div>';
}

function toast(msg, err = false) {
  const t = document.createElement("div");
  t.className = `fixed top-6 left-1/2 -translate-x-1/2 z-[60] ${err ? "bg-red-600" : "bg-slate-900"} text-white font-bold px-5 py-3 rounded-full shadow-xl max-w-[85vw] text-center`;
  t.textContent = msg; root?.appendChild(t); setTimeout(() => t.remove(), 2500);
}

function openForm(r = null) {
  const d = r || { type: "expense", amount: "", category: "", date: ymd(), note: "" };
  const wrap = document.createElement("div");
  wrap.className = "fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-3";
  wrap.innerHTML = `
    <form class="lg-sheet w-full max-w-md max-h-[88vh] overflow-y-auto" novalidate>
      <div class="lg-wallet">
        <div class="lg-wallet-top">
          <h3><i class="fa-solid ${r ? "fa-pen-to-square" : "fa-wallet"}"></i> ${r ? "編輯帳目" : "記一筆"}</h3>
          <button type="button" data-tip="ledger-close" data-close aria-label="關閉" class="lg-x"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="lg-seg">
          <label data-tip="ledger-type" class="pick pick-ex"><input type="radio" name="type" value="expense" class="sr-only" ${d.type === "expense" ? "checked" : ""}><span><i class="fa-solid fa-arrow-trend-down"></i> 支出</span></label>
          <label data-tip="ledger-type" class="pick pick-in"><input type="radio" name="type" value="income" class="sr-only" ${d.type === "income" ? "checked" : ""}><span><i class="fa-solid fa-arrow-trend-up"></i> 收入</span></label>
        </div>
        <label class="lg-amount"><span>金額 <b>*</b></span>
          <div><em>$</em><input name="amount" inputmode="decimal" autocomplete="off" value="${d.amount}" placeholder="0"></div></label>
        <span class="lg-clasp"></span>
      </div>
      <div class="lg-body">
        <div><span class="lg-label">分類 <b class="text-red-500">*</b></span><div data-cats class="grid grid-cols-4 gap-2 mt-1.5"></div></div>
        <div class="lg-slots">
          <label class="lg-slot"><i class="fa-solid fa-calendar-day"></i><span>日期</span><input type="date" name="date" value="${d.date}" max="${ymd()}"></label>
          <label class="lg-slot"><i class="fa-solid fa-pen"></i><span>備註</span><input name="note" maxlength="40" value="${esc(d.note)}" placeholder="選填，例如：全聯買菜"></label>
        </div>
        <p data-err class="text-red-600 font-bold text-sm hidden"></p>
        <div class="flex gap-2 pt-1">
          ${r ? '<button type="button" data-tip="ledger-del" data-del class="lg-del"><i class="fa-solid fa-trash"></i> 刪除</button>' : ""}
          <button type="submit" data-tip="ledger-save" class="lg-save"><i class="fa-solid fa-check"></i> 儲存</button>
        </div>
      </div>
    </form>`;
  root.appendChild(wrap);
  const f = wrap.querySelector("form");
  let cat = d.category;
  const drawCats = () => {
    const type = f.type.value;
    if (!catsOf(type).some((c) => c.name === cat)) cat = "";
    f.querySelector("[data-cats]").innerHTML = catsOf(type).map((c) => `
      <button type="button" data-tip="ledger-cat" data-c="${c.name}" class="lg-pickcat ${c.name === cat ? "on" : ""}" style="--cc:${c.color}">
        <span class="lg-chip" style="background:${c.color}"><i class="fa-solid ${c.icon}"></i></span>
        <span>${c.name}</span></button>`).join("");
  };
  f.addEventListener("change", (e) => e.target.name === "type" && drawCats());
  f.querySelector("[data-cats]").addEventListener("click", (e) => { const b = e.target.closest("[data-c]"); if (b) { cat = b.dataset.c; drawCats(); } });
  drawCats();

  const close = () => wrap.remove();
  wrap.addEventListener("click", (e) => e.target === wrap && close());
  wrap.querySelector("[data-close]").onclick = close;
  const del = wrap.querySelector("[data-del]");
  if (del) del.onclick = async () => {
    if (!del.dataset.sure) { del.dataset.sure = "1"; del.textContent = "再按一次刪除"; setTimeout(() => { if (del.isConnected) { del.dataset.sure = ""; del.innerHTML = '<i class="fa-solid fa-trash"></i> 刪除'; } }, 3000); return; }
    try { await ledgerApi.remove(r.id); } catch (ex) { return toast("刪除失敗：" + (ex.message || ex)); }
    close(); await reload(); toast("已刪除");
  };
  f.onsubmit = async (e) => {
    e.preventDefault();
    const err = (t) => { const p = f.querySelector("[data-err]"); p.textContent = t; p.classList.remove("hidden"); };
    const amount = parseAmount(f.amount.value);
    if (amount === null) return err("請輸入正確金額（大於 0、最多兩位小數）");
    if (!cat) return err("請選擇分類");
    if (!f.date.value || f.date.value > ymd()) return err("請選擇今天或更早的日期");
    try { await ledgerApi.save({ ...(r ? { id: r.id } : {}), type: f.type.value, amount, category: cat, date: f.date.value, note: f.note.value.trim() }); }
    catch (ex) { return err("儲存失敗：" + (ex.message || ex)); }
    month = f.date.value.slice(0, 7); // 新增後自動跳到該筆所在月份
    close(); await reload();
  };
  f.amount.focus();
}

async function reload() {
  try { rows = await ledgerApi.list(); } catch (e) { rows = []; if (alive) toast("讀取失敗：" + (e.message || e)); }
  if (alive) render();
}

export default {
  id: "記帳",
  storageKey: "ledger", // 儲存位置由使用者在「設定 → 資料管理 → 儲存位置」選（不保存 / Google 雲端 / Firebase 私人端）
  access: "private",
  mount(el, ctx) {
    alive = true;
    showTipHint("ledger");
    root = document.createElement("div");
    root.className = "px-3.5 pb-6";
    root.innerHTML = `
      <div class="h-1"></div>
      <p data-note></p>
      <div class="lg-monthbar">
        <button data-tip="ledger-prev" data-prev aria-label="上個月" class="cal-nav"><i class="fa-solid fa-chevron-left"></i></button>
        <span data-month></span>
        <button data-tip="ledger-next" data-next aria-label="下個月" class="cal-nav"><i class="fa-solid fa-chevron-right"></i></button>
      </div>
      <div data-sum class="lg-card lg-book"></div>
      <div class="lg-card lg-chart">
        <div class="lg-tabs"><button data-tip="ledger-ct" data-ct="expense">支出分類</button><button data-tip="ledger-ct" data-ct="income">收入分類</button></div>
        <div data-chart></div>
      </div>
      <h3 class="lg-h"><i class="fa-solid fa-list-ul"></i> 流水帳</h3>
      <div data-list class="space-y-3"></div>`;
    el.appendChild(root);
    setNote();
    if (!noteListening) { noteListening = true;
      on("ledger:add", () => { if (alive && root) openForm(); }); // 頂部列「記一筆」
      on("data:change", (e) => { if (alive && e?.name === "ledger") reload(); }); // 切換儲存位置 / 雲端資料更新後重新讀取
      for (const ev of ["auth:change", "cloud:change", "storage:sync", "storage:change"]) on(ev, () => { if (alive) setNote(); });
    }
    root.querySelector("[data-prev]").onclick = () => { month = shiftMonth(month, -1); render(); };
    root.querySelector("[data-next]").onclick = () => { if (month < monthKey()) { month = shiftMonth(month, 1); render(); } };
    root.addEventListener("click", (e) => {
      const c = e.target.closest("[data-ct]"); if (c) { chartType = c.dataset.ct; render(); return; }
      const o = e.target.closest("[data-open]"); if (o) openForm(rows.find((x) => x.id === o.dataset.open));
    });
    reload();
  },
  unmount() { closeTips(); alive = false; root?.remove(); root = null; },
};
