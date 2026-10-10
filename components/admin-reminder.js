// 管理員「最新提醒」編輯視窗：右側滑出（疊在系統設定上面）。要先登入並通過管理員驗證才打得開。
// 發布 / 編輯 / 刪除的資料存在伺服器端 Firebase（core/reminders.js），所有人的「最新提醒」都會看到。
import { adminReminderTemplate } from "./admin-reminder.template.js";
import { state, on } from "../core/store.js";
import { registerActions } from "../core/actions.js";
import { openAdminReminder, closeAdminReminder } from "../core/overlay.js";
import { showToast } from "../core/toast.js";
import { remindersApi, levelOf, timeText, esc, MAX_TITLE, MAX_CONTENT } from "../core/reminders.js";

const $ = (id) => document.getElementById(id);
let rows = [];
let editingId = null;
let busy = false;

export function mountAdminReminder() {
  const host = document.createElement("div");
  host.id = "adminReminderMount";
  const anchor = document.getElementById("settingsMount");
  if (anchor) anchor.insertAdjacentElement("afterend", host); else document.body.appendChild(host);
  host.innerHTML = adminReminderTemplate;

  registerActions({
    "open-admin-reminder": () => {
      if (!state.isLoggedIn || !state.adminUnlocked) return showToast("請先通過管理員驗證");
      openAdminReminder();
    },
    "close-admin-reminder": () => closeAdminReminder(),
    "reminder-publish": () => publish(),
    "reminder-clear": () => resetForm(),
    "reminder-edit": (el) => startEdit(el.dataset.id),
    "reminder-delete": (el) => remove(el.dataset.id),
  });

  on("overlay:change", ({ admin }) => {
    const page = $("adminReminderPage");
    if (!page) return;
    page.classList.toggle("translate-x-0", !!admin);
    page.classList.toggle("translate-x-full", !admin);
    if (admin) reload();
  });
  on("admin:change", (unlocked) => { if (!unlocked) { closeAdminReminder(); resetForm(); } }); // 上鎖（登出 / 關閉設定）時一併收起
  on("data:change", ({ name }) => { if (name === "reminders") reload(); });
  on("cloud:ready", reload);
  reload();
}

async function reload() {
  try { rows = await remindersApi.list(); } catch { rows = []; }
  renderList();
}

function renderList() {
  const box = $("reminderAdminList");
  if (!box) return;
  $("reminderAdminCount").textContent = `${rows.length} 則`;
  if (!rows.length) {
    box.innerHTML = `<div class="px-4 py-8 text-center text-[11px] font-bold text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">還沒有發布過提醒</div>`;
    return;
  }
  box.innerHTML = rows.map((r) => {
    const lv = levelOf(r.level);
    return `
      <div class="bg-white dark:bg-slate-800 rounded-3xl rounded-tl-md p-4 soft-shadow-sm border border-slate-200/70 dark:border-slate-700 flex flex-col gap-2 ${r.id === editingId ? "ring-2 ring-orange-300" : ""}">
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-base font-bold ${lv.iconBox}"><i class="fa-solid ${lv.icon}"></i><span>${lv.label}</span></span>
          <span class="ml-auto text-base font-bold text-slate-400 dark:text-slate-400 shrink-0">${timeText(r.createdAt)}</span>
        </div>
        <h4 class="text-lg font-black text-slate-800 dark:text-slate-100 break-words leading-snug">${esc(r.title)}</h4>
        ${r.content ? `<p class="text-base text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line break-words line-clamp-3">${esc(r.content)}</p>` : ""}
        <div class="flex items-center justify-end gap-1 -mb-1">
          <button type="button" data-action="reminder-edit" data-id="${esc(r.id)}" aria-label="編輯提醒" class="w-9 h-9 rounded-full text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-700 flex items-center justify-center"><i class="fa-solid fa-pen text-sm"></i></button>
          <button type="button" data-action="reminder-delete" data-id="${esc(r.id)}" aria-label="刪除提醒" class="w-9 h-9 rounded-full text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-700 flex items-center justify-center"><i class="fa-solid fa-trash-can text-sm"></i></button>
        </div>
      </div>`;
  }).join("");
}

const level = () => document.querySelector('input[name="adminReminderLevel"]:checked')?.value || "info";
const setLevel = (v) => { const r = document.querySelector(`input[name="adminReminderLevel"][value="${v}"]`); if (r) r.checked = true; };

function paintForm() {
  const editing = !!editingId;
  $("reminderFormTitle").textContent = editing ? "編輯提醒" : "發布新提醒";
  $("reminderFormIcon").className = "fa-solid " + (editing ? "fa-pen" : "fa-pen-to-square") + " text-orange-500";
  $("reminderPublishLabel").textContent = editing ? "更新提醒" : "發布提醒";
  $("reminderClearBtn").textContent = editing ? "取消編輯" : "清除";
}

function resetForm() {
  editingId = null;
  if ($("reminderTitle")) { $("reminderTitle").value = ""; $("reminderContent").value = ""; setLevel("info"); paintForm(); renderList(); }
}

function startEdit(id) {
  const r = rows.find((x) => x.id === id);
  if (!r) return;
  editingId = id;
  $("reminderTitle").value = r.title || "";
  $("reminderContent").value = r.content || "";
  setLevel(r.level || "info");
  paintForm(); renderList();
  $("reminderTitle").scrollIntoView?.({ behavior: "smooth", block: "center" });
  $("reminderTitle").focus();
}

// 伺服器端要連上才能發布（demo 模式沒有雲端時，只存記憶體讓你預覽）
function serverReady() {
  if (state.cloud.mode !== "google") return true;
  if (state.cloud.server === "ok") return true;
  showToast("伺服器端 Firebase 尚未連線，無法發布（到系統設定 → 資料管理設定 firebaseConfig 伺服器）", 4000);
  return false;
}

async function publish() {
  if (busy) return;
  if (!state.isLoggedIn || !state.adminUnlocked) return showToast("請先通過管理員驗證");
  const title = $("reminderTitle").value.trim();
  const content = $("reminderContent").value.trim();
  if (!title) { $("reminderTitle").focus(); return showToast("請輸入提醒標題"); }
  if (title.length > MAX_TITLE || content.length > MAX_CONTENT) return showToast(`標題最多 ${MAX_TITLE} 字、內容最多 ${MAX_CONTENT} 字`);
  if (!serverReady()) return;
  const old = editingId ? rows.find((x) => x.id === editingId) : null;
  busy = true;
  $("reminderPublishBtn").disabled = true;
  try {
    await remindersApi.save({
      ...(old ? { id: old.id } : {}),
      title, content, level: level(),
      createdAt: Date.now(), // 發布或編輯都以「這次」的日期時間為準（編輯後會排到最上面）
      updatedAt: Date.now(),
    });
    showToast(old ? "提醒已更新" : "提醒已發布");
    resetForm();
  } catch (e) { showToast("發布失敗：" + (e?.message || e), 4000); }
  finally { busy = false; $("reminderPublishBtn").disabled = false; }
}

async function remove(id) {
  const r = rows.find((x) => x.id === id);
  if (!r || !confirm(`要刪除提醒「${r.title}」嗎？所有人的最新提醒都會一起消失。`)) return;
  if (!serverReady()) return;
  try {
    await remindersApi.remove(id);
    if (editingId === id) resetForm();
    showToast("已刪除提醒");
  } catch (e) { showToast("刪除失敗：" + (e?.message || e), 4000); }
}
