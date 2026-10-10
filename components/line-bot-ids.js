// 系統設定裡的「LINE Bot」插件：一組 Bot Token（預設遮蔽，可按眼睛顯示），底下輸入名稱（可不填）與 User ID，按新增，可一直新增；清單可刪除。
// 資料規則在 core/line-bot-ids.js；改動時發出 linebotids:change，由 core/cloud.js 存進 Google 雲端硬碟。
import { on, state } from "../core/store.js";
import { registerActions } from "../core/actions.js";
import { showToast } from "../core/toast.js";
import { addLineBotId, removeLineBotId, setLineBotToken, updateLineBotId, setLineRelayUrl } from "../core/line-bot-ids.js";

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let armedId = null; // 刪除的「再按一次」確認
let armedTimer = null;
let editingId = null; // 正在編輯的那一筆

export function mountLineBotIds() {
  registerActions({
    "linebot-add": () => submit(),
    "linebot-token-eye": () => toggleEye(),
    "linebot-remove": (el) => confirmRemove(el.dataset.id),
    "linebot-edit": (el) => { editingId = el.dataset.id; renderList(); $("lineBotEditName")?.focus(); },
    "linebot-edit-cancel": () => { editingId = null; renderList(); },
    "linebot-edit-save": () => saveEdit(),
  });
  $("lineBotName")?.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); $("lineBotValue")?.focus(); } });
  $("lineBotValue")?.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); submit(); } });
  $("lineRelayUrl")?.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); saveRelay(); } });
  $("lineBotToken")?.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); saveToken(); } });
  // 沒有儲存按鈕：輸入停頓 0.6 秒、按 Enter 或離開輸入框就自動存進狀態，再由 core/cloud.js 在 1.5 秒後存進 Google 雲端硬碟
  autoSave($("lineRelayUrl"), () => saveRelay(true));
  autoSave($("lineBotToken"), () => saveToken(true));
  on("linebotids:change", () => { syncToken(); renderList(); });
  syncToken();
  renderList();
}

// 輸入框跟著 state 走（登入讀到雲端設定、登出清除時都會更新）；使用者正在輸入時不蓋掉
function syncToken() {
  const ru = $("lineRelayUrl"), rs = $("lineRelayUrlState");
  if (ru && document.activeElement !== ru) ru.value = state.lineRelayUrl || "";
  if (rs) rs.textContent = state.lineRelayUrl ? "已儲存中繼站 URL" : "尚未設定中繼站 URL（輸入後自動儲存）";
  const inp = $("lineBotToken"), st = $("lineBotTokenState");
  if (inp && document.activeElement !== inp) inp.value = state.lineBotToken || "";
  if (st) st.textContent = state.lineBotToken ? "已儲存 Bot Token" : "尚未設定 Bot Token（輸入後自動儲存）";
}

function autoSave(inp, fn) {
  if (!inp) return;
  let t = null;
  inp.addEventListener("input", () => { clearTimeout(t); t = setTimeout(fn, 600); });
  inp.addEventListener("blur", () => { clearTimeout(t); fn(); });
}

function saveRelay(silent) {
  const inp = $("lineRelayUrl");
  const r = setLineRelayUrl(inp?.value);
  if (r.error) { if (!silent) { showToast(r.error); inp?.focus(); } else setHint("lineRelayUrlState", r.error); return; }
  if (inp && !silent) inp.value = r.url;
  syncToken();
  if (!silent) showToast(r.url ? "已儲存中繼站 URL" : "已清除中繼站 URL");
}

function saveToken(silent) {
  const inp = $("lineBotToken");
  const r = setLineBotToken(inp?.value);
  if (r.error) { if (!silent) { showToast(r.error); inp?.focus(); } else setHint("lineBotTokenState", r.error); return; }
  if (inp && !silent) inp.value = r.token;
  syncToken();
  if (!silent) showToast(r.token ? "已儲存 Bot Token" : "已清除 Bot Token");
}

function setHint(id, msg) { const el = $(id); if (el) el.textContent = msg; }

function toggleEye() {
  const inp = $("lineBotToken"), ic = $("lineBotTokenEye");
  if (!inp) return;
  const show = inp.dataset.mask === "on"; // 用 CSS 遮罩取代 type=password，避免瀏覽器跳出「儲存密碼」
  inp.dataset.mask = show ? "off" : "on";
  if (ic) ic.className = `fa-solid ${show ? "fa-eye-slash" : "fa-eye"} text-sm`;
}

function renderList() {
  const box = $("lineBotList");
  if (!box) return;
  const list = state.lineBotIds;
  const cnt = $("lineBotCount");
  if (cnt) cnt.textContent = list.length ? `（${list.length} 個）` : "";
  if (!list.length) { box.innerHTML = `<p class="text-[10px] text-slate-400 text-center py-1">還沒有 User ID</p>`; return; }
  box.innerHTML = `<p class="text-[10px] font-bold text-slate-400">已新增 ${list.length} 個 User ID</p>` + list.map((x) => {
    const armed = armedId === x.id;
    if (editingId === x.id) return `
    <div class="rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-700/40 p-2.5 space-y-2">
      <label for="lineBotEditName" data-tip="set-lbl-lname" class="text-[11px] font-bold text-slate-700 dark:text-slate-200 block">名稱<span class="text-[10px] font-medium text-slate-400 ml-1">（可不填，最多 20 字）</span></label>
      <input id="lineBotEditName" type="text" maxlength="20" autocomplete="off" value="${esc(x.name)}" class="select-text w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none theme-focus-border">
      <label for="lineBotEditValue" data-tip="set-lbl-luid" class="text-[11px] font-bold text-slate-700 dark:text-slate-200 block">User ID</label>
      <input id="lineBotEditValue" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" value="${esc(x.userId)}" class="select-text w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none theme-focus-border">
      <div class="flex gap-2">
        <button type="button" data-tip="set-line-ecancel" data-action="linebot-edit-cancel" class="flex-1 py-2 rounded-xl bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-100 text-xs font-bold active:scale-95 transition">取消</button>
        <button type="button" data-tip="set-line-esave" data-action="linebot-edit-save" class="flex-1 py-2 rounded-xl theme-bg-primary text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition"><i class="fa-solid fa-floppy-disk"></i> 儲存</button>
      </div>
    </div>`;
    return `
    <div class="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 px-2.5 py-2">
      <span class="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0"><i class="fa-brands fa-line text-base text-emerald-600"></i></span>
      <span class="flex-1 min-w-0">
        ${x.name ? `<span class="text-xs font-bold text-slate-700 dark:text-slate-200 block truncate">${esc(x.name)}</span>` : ""}
        <span class="${x.name ? "text-[10px] text-slate-400" : "text-xs font-bold text-slate-700 dark:text-slate-200"} block truncate select-text">${esc(x.userId)}</span>
      </span>
      <button type="button" data-tip="set-line-edit" data-action="linebot-edit" data-id="${esc(x.id)}" aria-label="編輯這個 User ID" class="shrink-0 w-8 h-8 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-emerald-600 rounded-lg flex items-center justify-center active:scale-90 transition"><i class="fa-solid fa-pen text-xs"></i></button>
      <button type="button" data-tip="set-line-del" data-action="linebot-remove" data-id="${esc(x.id)}" aria-label="${armed ? "再按一次確定刪除" : "刪除這個 User ID"}" class="shrink-0 h-8 ${armed ? "px-3 bg-rose-500 text-white text-[11px] font-bold" : "w-8 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-rose-500"} rounded-lg flex items-center justify-center active:scale-90 transition">${armed ? "再按一次刪除" : '<i class="fa-solid fa-trash-can text-xs"></i>'}</button>
    </div>`;
  }).join("");
}

function submit() {
  const name = $("lineBotName"), val = $("lineBotValue");
  const r = addLineBotId(name?.value, val?.value);
  if (r.error) { showToast(r.error); val?.focus(); return; }
  name.value = ""; val.value = "";
  showToast(`已新增：${r.item.name || r.item.userId}`);
  val.focus(); // 可以接著輸入下一個
}

function saveEdit() {
  const r = updateLineBotId(editingId, $("lineBotEditName")?.value, $("lineBotEditValue")?.value);
  if (r.error) { showToast(r.error); $("lineBotEditValue")?.focus(); return; }
  editingId = null;
  renderList();
  showToast("已更新");
}

function confirmRemove(id) {
  clearTimeout(armedTimer);
  if (armedId === id) { armedId = null; if (editingId === id) editingId = null; removeLineBotId(id); return showToast("已移除 User ID"); }
  armedId = id;
  armedTimer = setTimeout(() => { armedId = null; renderList(); }, 3000);
  renderList();
}
