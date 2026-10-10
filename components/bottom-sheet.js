// 共用 Bottom Sheet：最新提醒 / 帳號登入
import { bottomSheetTemplate } from "./bottom-sheet.template.js";
import { on, emit, state } from "../core/store.js";
import { registerActions } from "../core/actions.js";
import { closeSheet } from "../core/overlay.js";
import { tryUnlockAdmin } from "../core/admin.js";
import { showToast } from "../core/toast.js";
import { saveReads, removeReads } from "../core/reminder-reads.js";
import { remindersApi, levelOf, timeText, esc } from "../core/reminders.js";

// 最新提醒：資料來自伺服器端 Firebase（管理員在系統設定 → 管理員 發布）。
// 這裡只能「標示已讀」，不能刪除（刪除只有管理員在系統設定 → 管理員 → 最新提醒才能做）。
// 已讀紀錄（提醒編號 → 發布時間）存在伺服器 Firestore（reminder_reads/<自己的信箱>），每位使用者各一份；訪客只在畫面，登出會清空。
let items = [];
const isRead = (r) => state.readReminders[r.id] === (r.createdAt || 0); // 提醒被編輯（時間更新）後會再變回未讀
const markRead = (list) => { // 寫進 state.readReminders（畫面），同時存到伺服器自己的文件（訪客只在畫面）
  const added = {};
  list.forEach((r) => { if (!isRead(r)) { state.readReminders[r.id] = added[r.id] = r.createdAt || 0; } });
  const changed = Object.keys(added).length > 0;
  if (changed) { saveReads(added); emit("reminders:read", { ...state.readReminders }); }
  return changed;
};
const markUnread = (list) => { // 恢復為未讀：從畫面與伺服器自己的文件移除
  const ids = list.filter((r) => r.id in state.readReminders).map((r) => r.id);
  if (!ids.length) return false;
  ids.forEach((id) => { delete state.readReminders[id]; });
  removeReads(ids);
  emit("reminders:read", { ...state.readReminders });
  return true;
};
const visible = () => items;
let filter = "unread"; // 篩選：unread 未讀 / read 已讀；每次開啟「最新提醒」都回到未讀
const shown = () => visible().filter((r) => (filter === "unread" ? !isRead(r) : isRead(r)));
const unreadCount = () => visible().filter((r) => !isRead(r)).length;

function submitAdminPassword() {
  const input = document.getElementById("adminPasswordInput");
  const err = document.getElementById("adminPasswordError");
  const r = tryUnlockAdmin(input?.value || "");
  if (r.ok) { closeSheet(); showToast("管理員功能已解鎖"); return; }
  if (err) { err.textContent = r.msg; err.classList.remove("hidden"); }
  if (input) { input.value = ""; input.focus(); }
}

const TITLE_LOGIN = `
  <i class="fa-solid fa-right-to-bracket text-base theme-text-primary"></i>
  <span class="text-lg font-black text-slate-800 dark:text-slate-100 tracking-wider">帳號登入</span>`;

const TITLE_ADMIN = `
  <i class="fa-solid fa-user-shield text-base theme-text-primary"></i>
  <span class="text-lg font-black text-slate-800 dark:text-slate-100 tracking-wider">管理員驗證</span>`;

const titleNotification = () => `
  <i class="fa-solid fa-bell text-base theme-text-primary"></i>
  <span class="text-lg font-black text-slate-800 dark:text-slate-100 tracking-wider">最新提醒</span>
  <span id="unreadHeaderBadge" class="px-2 py-0.5 rounded-full theme-bg-primary text-white text-[10px] font-bold ${unreadCount() ? "" : "hidden"}">${unreadCount()} 則未讀</span>`;

export function mountBottomSheet(mountEl) {
  mountEl.innerHTML = bottomSheetTemplate;

  registerActions({
    "admin-verify": () => submitAdminPassword(),
  });
  document.getElementById("adminPasswordInput")?.addEventListener("keydown", (e) => { if (e.key === "Enter") submitAdminPassword(); });

  document.getElementById("reminderFilter")?.addEventListener("change", (e) => { filter = e.target.value === "read" ? "read" : "unread"; renderNotifications(); });
  on("overlay:change", ({ sheet }) => render(sheet));
  initResize();
  initReminderDialog();
  on("data:change", ({ name }) => { if (name === "reminders") reloadNotifications(); });
  on("cloud:ready", reloadNotifications);
  on("auth:change", () => reloadNotifications());
  on("reminders:read", () => renderNotifications()); // 雲端載入已讀紀錄後，重畫未讀點
  reloadNotifications();
}

async function reloadNotifications() {
  try { items = state.isLoggedIn ? await remindersApi.list() : []; } catch { items = []; }
  renderNotifications();
}

function renderNotifications() {
  const box = document.getElementById("notificationList");
  if (box) {
    const list = shown();
    if (!list.length) {
      const empty = !state.isLoggedIn ? "登入後可查看家庭的最新提醒" : !visible().length ? "目前沒有提醒" : filter === "unread" ? "沒有未讀的提醒" : "沒有已讀的提醒";
      box.innerHTML = `
        <div class="py-16 text-center text-slate-400 space-y-2">
          <i class="fa-regular fa-bell-slash text-3xl"></i>
          <p class="text-xs font-bold">${empty}</p>
        </div>`;
    } else {
      box.innerHTML = list.map((r) => {
        const lv = levelOf(r.level);
        const unread = !isRead(r);
        return `
          <div class="notification-card cursor-pointer active:scale-[0.98] transition-transform" data-id="${esc(r.id)}" role="button" tabindex="0">
            <div class="bg-white dark:bg-slate-800 rounded-3xl rounded-tl-md p-4 soft-shadow-sm border border-slate-200/70 dark:border-slate-700 flex flex-col gap-2">
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-base font-bold ${lv.iconBox}"><i class="fa-solid ${lv.icon}"></i><span>${lv.label}</span></span>
                ${unread ? `<span class="card-dot w-3 h-3 rounded-full shrink-0 ${lv.dot}"></span>` : ""}
                <span class="ml-auto text-base font-bold text-slate-400 dark:text-slate-400 shrink-0">${timeText(r.createdAt)}</span>
              </div>
              <h4 class="text-lg font-black text-slate-800 dark:text-slate-100 break-words leading-snug">${esc(r.title)}</h4>
              ${r.content ? `<p class="text-base text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line break-words line-clamp-3">${esc(r.content)}</p>` : ""}
              ${unread ? "" : `<button type="button" data-unread="${esc(r.id)}" class="self-end mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-sm font-bold text-slate-600 dark:text-slate-200 active:scale-95 transition-transform"><i class="fa-regular fa-envelope"></i><span>標示為未讀</span></button>`}
            </div>
          </div>`;
      }).join("");
    }
  }
  updateUnreadBadges();
}

function render(type) {
  const sheet = document.getElementById("bottomSheet");
  const contentNotification = document.getElementById("sheetContentNotification");
  const contentLogin = document.getElementById("sheetContentLogin");
  const contentAdmin = document.getElementById("sheetContentAdmin");
  const headerTitle = document.getElementById("sheetHeaderTitle");
  if (!sheet) return;

  if (!type) {
    sheet.classList.remove("open-default", "open-expanded");
    sheet.classList.add("closed");
    document.getElementById("adminPasswordInput")?.blur();
    return;
  }

  const isLogin = type === "login";
  const isAdmin = type === "admin";
  contentNotification.classList.toggle("hidden", isLogin || isAdmin);
  contentLogin.classList.toggle("hidden", !isLogin);
  contentAdmin.classList.toggle("hidden", !isAdmin);
  document.getElementById("reminderFilter")?.classList.toggle("hidden", isLogin || isAdmin); // 篩選只在「最新提醒」顯示
  if (!isLogin && !isAdmin) { filter = "unread"; const f = document.getElementById("reminderFilter"); if (f) f.value = "unread"; renderNotifications(); } // 每次開啟都預設看未讀
  headerTitle.innerHTML = isAdmin ? TITLE_ADMIN : isLogin ? TITLE_LOGIN : titleNotification();
  sheet.style.zIndex = isAdmin ? "60" : ""; // 管理員驗證從系統設定裡彈出，要蓋在設定視窗上面
  if (isAdmin) {
    const input = document.getElementById("adminPasswordInput");
    const err = document.getElementById("adminPasswordError");
    if (input) { input.value = ""; setTimeout(() => input.focus(), 350); }
    if (err) err.classList.add("hidden");
  }

  if (sheet.classList.contains("closed")) {
    sheet.style.height = "";
    sheet.classList.remove("open-expanded");
  }
  sheet.classList.remove("closed");
  sheet.classList.add("open-default");
}

/* ---------- 壓著頂端長條上下拖曳調整高度 ---------- */
// 拖曳：高度跟著手指走（最小 25%、最大 92%）；往下拖到很矮再放開 = 關閉。
// 輕點長條：在預設高度與展開高度之間切換。
const MIN_RATIO = 0.25, MAX_RATIO = 0.92, CLOSE_RATIO = 0.3, TAP_PX = 6;

function initResize() {
  attachSheetResize(document.getElementById("bottomSheet"), closeSheet);
}

// 讓任何「.bottom-sheet + .sheet-header」結構的視窗都能壓著頂端長條拖曳（家庭公告的新增/編輯表單也共用）
export function attachSheetResize(sheet, onClose) {
  const header = sheet?.querySelector(".sheet-header");
  if (!sheet || !header) return;

  let drag = null;

  header.addEventListener("pointerdown", (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (e.target.closest("button, select")) return; // 關閉鈕、下拉選單照常運作
    const box = sheet.offsetParent || sheet.parentElement;
    drag = { id: e.pointerId, y0: e.clientY, h0: sheet.offsetHeight, box: box.clientHeight, moved: false, h: sheet.offsetHeight };
    header.setPointerCapture?.(e.pointerId);
    sheet.classList.add("dragging");
  });

  header.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = drag.y0 - e.clientY; // 往上拖 = 變高
    if (Math.abs(dy) > TAP_PX) drag.moved = true;
    if (!drag.moved) return;
    drag.h = Math.min(drag.box * MAX_RATIO, Math.max(drag.box * 0.12, drag.h0 + dy));
    sheet.style.height = drag.h + "px";
  });

  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    sheet.classList.remove("dragging");
    header.releasePointerCapture?.(d.id);
    if (!d.moved) { // 輕點：預設 ⇄ 展開
      sheet.style.height = "";
      const expand = !sheet.classList.contains("open-expanded");
      sheet.classList.toggle("open-expanded", expand);
      sheet.classList.toggle("open-default", !expand);
      return;
    }
    if (d.h < d.box * CLOSE_RATIO) { sheet.style.height = ""; onClose(); return; }
    d.h = Math.max(d.h, d.box * MIN_RATIO);
    sheet.style.height = d.h + "px";
  };
  header.addEventListener("pointerup", end);
  header.addEventListener("pointercancel", end);
}

function updateUnreadBadges() {
  const unread = unreadCount();
  const bell = document.getElementById("unreadBadge");
  const header = document.getElementById("unreadHeaderBadge");
  if (bell) bell.style.display = unread ? "" : "none";
  document.getElementById("bellIcon")?.classList.toggle("bell-wiggle", !!unread); // 有未讀：鈴鐺左右晃動
  if (header) { header.classList.toggle("hidden", !unread); header.textContent = `${unread} 則未讀`; }
}

/* ---------- 點提醒訊息：中間彈出通知風格視窗，顯示完整內容 ---------- */
let dlg = null, dlgId = null;

function initReminderDialog() {
  dlg = document.createElement("div");
  dlg.id = "reminderDialog";
  dlg.className = "fixed inset-0 z-[80] flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-sm opacity-0 pointer-events-none transition-opacity duration-200";
  dlg.innerHTML = `
    <div id="reminderDialogCard" role="dialog" aria-modal="true" class="w-full max-w-sm max-h-[85vh] flex flex-col bg-slate-100 dark:bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden scale-90 transition-transform duration-200">
      <div class="px-5 pt-5 pb-2 flex justify-center shrink-0">
        <span id="reminderDialogTime" class="px-4 py-1 rounded-full bg-slate-200/80 dark:bg-slate-800 text-base font-bold text-slate-500 dark:text-slate-300"></span>
      </div>
      <div class="px-4 py-2 overflow-y-auto min-h-0">
        <div class="relative bg-white dark:bg-slate-700 rounded-3xl rounded-tl-md p-5 shadow-sm flex flex-col gap-3">
          <span id="reminderDialogTag" class="self-start inline-flex items-center gap-2 px-3 py-1 rounded-full text-base font-bold"></span>
          <h3 id="reminderDialogTitle" class="text-2xl font-black text-slate-800 dark:text-slate-50 break-words leading-snug"></h3>
          <div id="reminderDialogContent" class="text-xl text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line break-words"></div>
        </div>
      </div>
      <div class="p-4 shrink-0 flex flex-col gap-2">
        <button type="button" id="reminderDialogUnread" class="w-full py-3 rounded-2xl bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-base font-bold active:scale-95 transition-transform"><i class="fa-regular fa-envelope mr-1.5"></i>標示為未讀</button>
        <button type="button" id="reminderDialogClose" class="w-full py-3.5 rounded-2xl theme-bg-primary text-white text-lg font-bold active:scale-95 transition-transform">知道了</button>
      </div>
    </div>`;
  document.body.appendChild(dlg);

  dlg.addEventListener("click", (e) => {
    if (e.target.closest("#reminderDialogUnread")) { const r = items.find((x) => x.id === dlgId); if (r) { markUnread([r]); showToast("已恢復為未讀"); } closeReminderDialog(); }
  });
  dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.closest("#reminderDialogClose")) closeReminderDialog(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && dlg.classList.contains("opacity-100")) closeReminderDialog(); });

  const list = document.getElementById("notificationList");
  const open = (e) => {
    const ub = e.target.closest("[data-unread]");
    if (ub) { e.stopPropagation(); const r = items.find((x) => x.id === ub.dataset.unread); if (r) { markUnread([r]); showToast("已恢復為未讀"); } return; }
    const card = e.target.closest(".notification-card");
    if (card) openReminderDialog(card.dataset.id);
  };
  list?.addEventListener("click", open);
  list?.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(e); } });
}

function openReminderDialog(id) {
  const r = items.find((x) => x.id === id);
  if (!r || !dlg) return;
  dlgId = id;
  const lv = levelOf(r.level);
  const q = (sel) => dlg.querySelector(sel);
  q("#reminderDialogTag").className = `self-start inline-flex items-center gap-2 px-3 py-1 rounded-full text-base font-bold ${lv.iconBox}`;
  q("#reminderDialogTag").innerHTML = `<i class="fa-solid ${lv.icon}"></i><span>${lv.label}</span>`;
  q("#reminderDialogTime").textContent = timeText(r.createdAt);
  q("#reminderDialogTitle").textContent = r.title || "";
  const content = q("#reminderDialogContent");
  content.textContent = r.content || "";
  content.classList.toggle("hidden", !r.content);
  dlg.classList.remove("opacity-0", "pointer-events-none");
  dlg.classList.add("opacity-100");
  q("#reminderDialogCard").classList.replace("scale-90", "scale-100");
  q("#reminderDialogClose").focus();
  markRead([r]); // 看過就標示已讀
}

function closeReminderDialog() {
  if (!dlg) return;
  dlg.classList.add("opacity-0", "pointer-events-none");
  dlg.classList.remove("opacity-100");
  dlg.querySelector("#reminderDialogCard").classList.replace("scale-100", "scale-90");
}
