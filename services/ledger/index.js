// 記帳本 — Stage 6：收支輸入、分類、月統計圖表 UI；資料只存在記憶體。
// 訪客可用（不設 requiresLogin）：計劃案第三節「僅暫存體驗」。
import { showTipHint, closeTips } from "../../core/tips.js";
import { storageNote } from "../../core/storage-note.js";
import { ledgerApi } from "./data.js";
import { catsOf, catInfo, ymd, monthKey, shiftMonth, parseAmount, summarize, byCategory, groupByDay } from "./engine.js";

let rows = [];
let root = null;
let alive = false;
let month = monthKey();
let chartType = "expense";

const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => "$" + Number(n).toLocaleString("zh-TW", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const monthLabel = (k) => `${k.slice(0, 4)} 年 ${Number(k.slice(5))} 月`;
const dayLabel = (d) => { const x = new Date(d + "T00:00:00"); return `${x.getMonth() + 1}/${x.getDate()}（${"日一二三四五六"[x.getDay()]}）`; };

function render() {
  if (!root) return;
  const sum = summarize(rows, month);
  root.querySelector("[data-month]").textContent = monthLabel(month);
  root.querySelector("[data-next]").disabled = month >= monthKey();
  root.querySelector("[data-sum]").innerHTML = `
    <div class="col-span-3 text-center pb-2"><div class="text-xs font-bold text-slate-500 dark:text-slate-400">本月結餘</div>
      <div class="text-3xl font-black tabular-nums ${sum.balance < 0 ? "text-red-600" : "theme-text-primary"}">${sum.balance < 0 ? "-" : ""}${money(Math.abs(sum.balance))}</div></div>
    <div class="text-center"><div class="text-xs font-bold text-slate-500 dark:text-slate-400">收入</div><div class="text-lg font-black text-green-600 tabular-nums">${money(sum.income)}</div></div>
    <div class="text-center border-x border-slate-200 dark:border-slate-600"><div class="text-xs font-bold text-slate-500 dark:text-slate-400">支出</div><div class="text-lg font-black text-red-600 tabular-nums">${money(sum.expense)}</div></div>
    <div class="text-center"><div class="text-xs font-bold text-slate-500 dark:text-slate-400">筆數</div><div class="text-lg font-black text-slate-700 dark:text-slate-200 tabular-nums">${rows.filter((r) => r.date.startsWith(month)).length}</div></div>`;

  root.querySelectorAll("[data-ct]").forEach((b) => {
    const on = b.dataset.ct === chartType;
    b.className = `flex-1 py-2 rounded-full text-sm font-bold ${on ? "theme-bg-primary text-white" : "text-slate-600 dark:text-slate-300"}`;
  });
  const cats = byCategory(rows, month, chartType);
  root.querySelector("[data-chart]").innerHTML = cats.length ? cats.map((c) => {
    const i = catInfo(chartType, c.name);
    return `<div class="mb-2.5"><div class="flex justify-between text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
        <span><i class="fa-solid ${i.icon}" style="color:${i.color}"></i> ${esc(c.name)} <span class="text-slate-400 font-medium">${c.pct.toFixed(0)}%</span></span><span class="tabular-nums">${money(c.total)}</span></div>
      <div class="h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden"><div class="h-full rounded-full" style="width:${Math.max(c.pct, 2)}%;background:${i.color}"></div></div></div>`;
  }).join("") : `<p class="text-center text-sm font-bold text-slate-400 py-4">這個月還沒有${chartType === "income" ? "收入" : "支出"}紀錄</p>`;

  const days = groupByDay(rows, month);
  root.querySelector("[data-list]").innerHTML = days.length ? days.map((d) => `
    <div>
      <div class="flex justify-between px-1 pb-1 text-sm font-black text-slate-500 dark:text-slate-400"><span>${dayLabel(d.date)}</span><span class="tabular-nums">${d.net < 0 ? "-" : "+"}${money(Math.abs(d.net))}</span></div>
      <div class="bg-white/95 dark:bg-slate-800/95 rounded-2xl soft-shadow-sm divide-y divide-slate-100 dark:divide-slate-700">
        ${d.items.map((r) => { const i = catInfo(r.type, r.category); return `
        <button data-tip="ledger-open" data-open="${r.id}" class="w-full flex items-center gap-3 p-3.5 text-left active:bg-slate-50 dark:active:bg-slate-700 rounded-2xl">
          <span class="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0" style="background:${i.color}"><i class="fa-solid ${i.icon}"></i></span>
          <span class="flex-1 min-w-0"><span class="block font-black text-base text-slate-800 dark:text-slate-100">${esc(r.category)}</span>
            ${r.note ? `<span class="block text-sm font-medium text-slate-500 dark:text-slate-400 truncate">${esc(r.note)}</span>` : ""}</span>
          <span class="font-black text-lg tabular-nums ${r.type === "income" ? "text-green-600" : "text-red-600"}">${r.type === "income" ? "+" : "-"}${money(r.amount)}</span>
        </button>`; }).join("")}
      </div>
    </div>`).join("") : '<div class="text-center py-10 text-slate-500 dark:text-slate-400 font-bold text-base leading-relaxed">這個月還沒有帳目<br>按右下角「＋」記一筆</div>';
}

function toast(msg, err = false) {
  const t = document.createElement("div");
  t.className = `fixed top-6 left-1/2 -translate-x-1/2 z-[60] ${err ? "bg-red-600" : "bg-slate-900"} text-white font-bold px-5 py-3 rounded-full shadow-xl max-w-[85vw] text-center`;
  t.textContent = msg; root?.appendChild(t); setTimeout(() => t.remove(), 2500);
}

function openForm(r = null) {
  const d = r || { type: "expense", amount: "", category: "", date: ymd(), note: "" };
  const input = "w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl text-base bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100";
  const wrap = document.createElement("div");
  wrap.className = "fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center";
  wrap.innerHTML = `
    <form class="w-full max-w-md max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-t-3xl p-5 space-y-3 shadow-2xl" novalidate>
      <div class="flex justify-between items-center">
        <h3 class="text-xl font-black">${r ? "編輯帳目" : "記一筆"}</h3>
        <button type="button" data-tip="ledger-close" data-close aria-label="關閉" class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 text-lg"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <label data-tip="ledger-type" class="pick pick-ex cursor-pointer"><input type="radio" name="type" value="expense" class="sr-only" ${d.type === "expense" ? "checked" : ""}><span class="block text-center py-3 rounded-xl font-black border border-slate-300 dark:border-slate-600">支出</span></label>
        <label data-tip="ledger-type" class="pick pick-in cursor-pointer"><input type="radio" name="type" value="income" class="sr-only" ${d.type === "income" ? "checked" : ""}><span class="block text-center py-3 rounded-xl font-black border border-slate-300 dark:border-slate-600">收入</span></label>
      </div>
      <label class="block font-bold text-sm">金額 <span class="text-red-500">*</span>
        <input name="amount" inputmode="decimal" autocomplete="off" value="${d.amount}" placeholder="0" class="${input} mt-1 text-2xl font-black tabular-nums"></label>
      <div><span class="font-bold text-sm">分類 <span class="text-red-500">*</span></span><div data-cats class="grid grid-cols-4 gap-2 mt-1"></div></div>
      <label class="block font-bold text-sm">日期<input type="date" name="date" value="${d.date}" max="${ymd()}" class="${input} mt-1"></label>
      <label class="block font-bold text-sm">備註 <span class="text-xs text-slate-400 font-normal">(選填)</span>
        <input name="note" maxlength="40" value="${esc(d.note)}" placeholder="例如：全聯買菜" class="${input} mt-1"></label>
      <p data-err class="text-red-600 font-bold text-sm hidden"></p>
      <div class="flex gap-2 pt-1">
        ${r ? '<button type="button" data-tip="ledger-del" data-del class="px-4 py-3 rounded-xl font-bold bg-red-100 text-red-700"><i class="fa-solid fa-trash"></i> 刪除</button>' : ""}
        <button type="submit" data-tip="ledger-save" class="flex-1 theme-bg-primary text-white py-3 rounded-xl font-bold text-base">儲存</button>
      </div>
    </form>`;
  root.appendChild(wrap);
  const f = wrap.querySelector("form");
  let cat = d.category;
  const drawCats = () => {
    const type = f.type.value;
    if (!catsOf(type).some((c) => c.name === cat)) cat = "";
    f.querySelector("[data-cats]").innerHTML = catsOf(type).map((c) => `
      <button type="button" data-tip="ledger-cat" data-c="${c.name}" class="flex flex-col items-center gap-1 py-2 rounded-xl border-2 ${c.name === cat ? "" : "border-transparent"}" style="${c.name === cat ? `border-color:${c.color};background:${c.color}22` : ""}">
        <span class="w-10 h-10 rounded-full flex items-center justify-center text-white" style="background:${c.color}"><i class="fa-solid ${c.icon}"></i></span>
        <span class="text-xs font-bold">${c.name}</span></button>`).join("");
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
    const guest = !ctx?.state?.isLoggedIn;
    root.innerHTML = `
      <div class="flex items-center justify-between py-3 px-1">
        <h2 class="text-2xl font-black text-slate-800 dark:text-slate-100"><i class="fa-solid fa-wallet theme-text-primary"></i> 記帳本</h2>
      </div>
      <p class="mx-1 mb-3 text-xs font-bold leading-relaxed rounded-xl px-3 py-2 ${(ctx?.state?.storage?.ledger || "none") === "none" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}">
        <i class="fa-solid ${(ctx?.state?.storage?.ledger || "none") === "none" ? "fa-user-secret" : "fa-cloud-arrow-up"}"></i> ${storageNote(ctx?.state?.storage?.ledger, guest, "帳目")}</p>
      <div class="flex items-center justify-between gap-2 px-1 mb-3">
        <button data-tip="ledger-prev" data-prev aria-label="上個月" class="cal-nav"><i class="fa-solid fa-chevron-left"></i></button>
        <span data-month class="text-lg font-black text-slate-800 dark:text-slate-100"></span>
        <button data-tip="ledger-next" data-next aria-label="下個月" class="cal-nav"><i class="fa-solid fa-chevron-right"></i></button>
      </div>
      <div data-sum class="grid grid-cols-3 gap-y-1 bg-white/95 dark:bg-slate-800/95 rounded-2xl p-4 soft-shadow-sm mx-1 mb-4"></div>
      <div class="bg-white/95 dark:bg-slate-800/95 rounded-2xl p-4 soft-shadow-sm mx-1 mb-4">
        <div class="flex bg-slate-100 dark:bg-slate-700 rounded-full p-1 mb-3">
          <button data-tip="ledger-ct" data-ct="expense">支出分類</button><button data-tip="ledger-ct" data-ct="income">收入分類</button></div>
        <div data-chart></div>
      </div>
      <div data-list class="space-y-4 px-1"></div>
      <div class="sticky bottom-24 flex justify-end pr-1 pt-4 pointer-events-none">
        <button data-tip="ledger-add" data-add aria-label="記一筆" class="pointer-events-auto w-14 h-14 rounded-full theme-bg-primary text-white text-2xl soft-shadow-lg"><i class="fa-solid fa-plus"></i></button>
      </div>`;
    el.appendChild(root);
    root.querySelector("[data-prev]").onclick = () => { month = shiftMonth(month, -1); render(); };
    root.querySelector("[data-next]").onclick = () => { if (month < monthKey()) { month = shiftMonth(month, 1); render(); } };
    root.querySelector("[data-add]").onclick = () => openForm();
    root.addEventListener("click", (e) => {
      const c = e.target.closest("[data-ct]"); if (c) { chartType = c.dataset.ct; render(); return; }
      const o = e.target.closest("[data-open]"); if (o) openForm(rows.find((x) => x.id === o.dataset.open));
    });
    reload();
  },
  unmount() { closeTips(); alive = false; root?.remove(); root = null; },
};
