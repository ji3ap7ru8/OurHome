// 設定視窗的雲端區塊：連線狀態徽章（含「同步中…」）、firebaseConfig 輸入框、備份還原按鈕。
// 實際連線與讀寫都在 core/cloud.js，這裡只負責畫面與按鈕。
import { state, on } from "../core/store.js";
import { registerActions } from "../core/actions.js";
import { saveFirebaseConfigs, exportDriveConfig, importDriveConfigFile, syncNow, refreshApiData, restoreDefaults, exportBundle, importBundleFile } from "../core/cloud.js";
import { configToText } from "../core/fbconfig.js";

const $ = (id) => document.getElementById(id);

const TONE = {
  slate: "flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-bold",
  emerald: "flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold",
  amber: "flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-[10px] font-bold",
  rose: "flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-[10px] font-bold",
};
const DOT = { slate: "bg-slate-400", emerald: "bg-emerald-500 animate-pulse", amber: "bg-amber-500 animate-pulse", rose: "bg-rose-500" };

const isBusy = (key) => (state.cloud.busy || []).includes(key);

// 回傳 [色調, 文字, 是否同步中]。只要該資料來源正在載入 / 同步 / 匯入匯出，就一律顯示「同步中…」
function rowInfo(key) {
  const c = state.cloud;
  const syncing = c.syncing && (key === "private" || state.isLoggedIn);
  if (c[key] === "loading" || isBusy(key) || syncing) return ["amber", "同步中…", true];
  if (key === "drive") {
    if (!state.isLoggedIn) return ["slate", "訪客模式", false];
    if (c.drive === "error") return ["rose", "同步失敗", false];
    return ["emerald", "已連線", false];
  }
  const st = c[key];
  if (st === "ok") return ["emerald", "已連線", false];
  if (st === "error") return ["rose", "連線失敗", false];
  if (st === "unset") return ["slate", "未設定", false];
  if (!state.isLoggedIn && key === "server") return ["slate", "訪客已封鎖", false];
  return ["slate", "離線", false];
}

function paintBadge(id, key) {
  const el = $(id);
  if (!el) return false;
  const [tone, text, spin] = rowInfo(key);
  el.className = TONE[tone];
  el.innerHTML = spin
    ? `<i class="fa-solid fa-arrows-rotate fa-spin text-[9px]"></i>${text}`
    : `<span class="w-1.5 h-1.5 rounded-full ${DOT[tone]}"></span>${text}`;

  // 失敗時，在該列下方顯示原因
  const row = el.parentElement;
  let note = row.nextElementSibling?.matches("[data-cloud-detail]") ? row.nextElementSibling : null;
  const detail = !spin && tone === "rose" ? state.cloud.detail[key] : "";
  if (detail && !note) {
    note = document.createElement("div");
    note.dataset.cloudDetail = "";
    note.className = "text-[10px] text-rose-600 dark:text-rose-400 font-bold px-2 -mt-0.5";
    row.insertAdjacentElement("afterend", note);
  }
  if (note) { note.textContent = detail; note.classList.toggle("hidden", !detail); }
  return spin;
}

function paintDriveBadge() {
  const el = $("gdriveStatusBadge");
  if (!el) return;
  const { drive, detail } = state.cloud;
  let text = state.isLoggedIn ? "已連結帳號" : "訪客模式";
  let cls = state.isLoggedIn ? "text-[10px] text-emerald-600 dark:text-emerald-400 font-bold" : "text-[10px] text-slate-400";
  if (drive === "loading" || isBusy("drive") || (state.cloud.syncing && state.isLoggedIn)) { text = "同步中…"; cls = "text-[10px] text-amber-600 font-bold"; }
  else if (drive === "ok") text = detail.drive || "已同步";
  else if (drive === "error") { text = detail.drive || "同步失敗"; cls = "text-[10px] text-rose-600 font-bold"; }
  el.textContent = text;
  el.className = cls;
}

function paintInputs() {
  // 伺服器：要登入 Google 才能用；私人端：不管有沒有登入都能用
  const rows = [
    ["firebaseServerInput", state.isLoggedIn && state.cloud.mode === "google"],
    ["firebasePrivateInput", true],
  ];
  rows.forEach(([i, enabled]) => {
    const input = $(i);
    if (!input) return;
    input.disabled = !enabled;
    input.classList.toggle("bg-white", enabled);
    input.classList.toggle("dark:bg-slate-700", enabled);
    input.classList.toggle("bg-slate-100", !enabled);
    input.classList.toggle("dark:bg-slate-800", !enabled);
  });
  $("firebaseServerInput").placeholder = "貼上伺服器 firebaseConfig...";
  $("firebasePrivateInput").placeholder = "貼上私人 firebaseConfig...";
}

// ---- 儲存位置（我的筆記 / 記帳本）----
const STORE_KEYS = ["memos", "ledger"];
const radios = (key) => document.querySelectorAll(`input[name="store-${key}"]`);
const picked = (key) => document.querySelector(`input[name="store-${key}"]:checked`)?.value || "none";
const MODE_TEXT = { none: "不保存", google: "Google 雲端", server: "Firebase 伺服器", private: "Firebase 私人端" };

// 把「已生效的設定」畫回選項（只在設定改變 / 登入狀態改變時呼叫，避免蓋掉使用者還沒按儲存的選擇）
function paintStorageChoice() {
  STORE_KEYS.forEach((k) => {
    const cur = state.storage[k] || "none";
    radios(k).forEach((r) => { r.checked = r.value === cur; });
  });
  paintStorage();
}

// 選項是否可選、目前狀態文字：不動使用者已點選但尚未儲存的選擇
function paintStorage() {
  const canGoogle = state.isLoggedIn && state.cloud.mode === "google";
  STORE_KEYS.forEach((k) => {
    radios(k).forEach((r) => {
      const off = r.value === "google" && !canGoogle;
      r.disabled = off;
      r.nextElementSibling?.classList.toggle("opacity-40", off);
      r.parentElement.classList.toggle("cursor-not-allowed", off);
      if (off && r.checked) {
        r.checked = false;
        const fb = [...radios(k)].find((x) => x.value === (state.storage[k] === "google" ? "none" : state.storage[k] || "none"));
        if (fb) fb.checked = true;
      }
    });
    const el = document.querySelector(`[data-store-status="${k}"]`);
    if (el) {
      const cur = state.storage[k] || "none";
      el.textContent = `目前：${MODE_TEXT[cur]}`;
      el.className = "ml-auto text-[10px] font-bold " + (cur === "none" ? "text-slate-400" : "text-emerald-600 dark:text-emerald-400");
    }
  });
}

// 〔立即同步〕按鈕：同步中不可重複按
function paintSync() {
  const b = $("syncNowBtn");
  if (!b) return;
  const busy = !!state.cloud.syncing;
  b.disabled = busy;
  b.querySelector("[data-label]").textContent = busy ? "同步中…" : "立即同步";
  b.querySelector("[data-icon]").classList.toggle("fa-spin", busy);
}

// 備份還原按鈕：雲端硬碟兩顆要登入才能用；任何同步 / 匯出入進行中，全部暫停避免重複按
function paintBackup() {
  const working = !!state.cloud.syncing || (state.cloud.busy || []).length > 0;
  document.querySelectorAll("[data-backup-btn]").forEach((b) => {
    b.disabled = working;
  });
  $("backupDriveHint")?.classList.toggle("hidden", state.isLoggedIn);
  // API 資料更新：進行中顯示「更新中…」並轉圈
  const a = $("apiRefreshBtn");
  if (a) {
    a.querySelector("[data-label]").textContent = working ? "更新中…" : "API 資料更新";
    a.querySelector("[data-icon]").classList.toggle("fa-spin", working);
  }
}

function paintAll() {
  const spins = [
    paintBadge("statusGoogleBadge", "drive"),
    paintBadge("statusFirebaseServerBadge", "server"),
    paintBadge("statusFirebasePrivateBadge", "private"),
  ];
  const head = $("statusSyncBadge");
  if (head) { const on = spins.some(Boolean); head.classList.toggle("hidden", !on); head.classList.toggle("flex", on); }
  paintDriveBadge();
  paintInputs();
  paintSync();
  paintBackup();
  paintStorage();
}

// 開啟檔案選擇器，選到 .json 就交給 handler
function pickJson(handler) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.onchange = () => input.files[0] && handler(input.files[0]);
  input.click();
}

export function mountCloudSettings() {
  registerActions({
    "sync-now": () => syncNow(),
    "api-refresh": () => refreshApiData(),
    "restore-defaults": () => restoreDefaults(),
    "drive-export": () => exportDriveConfig(),
    "drive-import": () => pickJson(importDriveConfigFile),
    "fb-save": () => saveFirebaseConfigs({
      server: $("firebaseServerInput").disabled ? null : $("firebaseServerInput").value, // 未登入時伺服器框上鎖，略過
      private: $("firebasePrivateInput").value,
    }),
    // 儲存位置卡片的〔儲存位置設定〕：只套用 我的筆記 / 記帳本 的儲存位置
    "storage-save": async () => {
      await saveFirebaseConfigs({}, { memos: picked("memos"), ledger: picked("ledger") });
      paintStorageChoice(); // 沒套用成功的選項（例如私人端沒連上）退回目前實際的儲存位置
    },
    "bundle-export": () => exportBundle(),
    "bundle-import": () => pickJson(importBundleFile),
  });

  on("cloud:change", paintAll);
  on("auth:change", () => { paintAll(); paintStorageChoice(); });
  on("storage:sync", paintStorageChoice);
  on("storage:change", paintStorageChoice);
  on("cloud:config", ({ server, private: priv }) => {
    $("firebaseServerInput").value = configToText(server);
    $("firebasePrivateInput").value = configToText(priv);
  });
  paintAll();
  paintStorageChoice();
}
