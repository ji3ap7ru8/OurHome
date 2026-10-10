// 雲端總管：三種儲存各管各的。
//
//   1. OAuth（Google 雲端硬碟 appDataFolder 的 ourhome-config.json）
//        → 系統設定（主題 / 主色調 / 字體 / 快捷列）、firebaseConfig 伺服器、firebaseConfig 私人端
//   2. firebaseConfig 伺服器 Server（家庭共用庫）：家庭公告、生活圖卡（另有日曆、洗碗）
//        → 一定要先登入 Google；用 Google access token 登入 Firebase
//   3. firebaseConfig 私人端 Private：個人記事本、記帳本（要選「Firebase 私人端」才會存這裡）
//        → 不管有沒有登入 Google 都能用（匿名連線）；未登入時設定只存在記憶體
//   4. 儲存位置（設定 → 資料管理）：我的筆記、記帳本各自選 不保存（預設）/ Google 雲端硬碟 / Firebase 私人端
//        → 選擇存在系統設定（state.storage）；Google 雲端 = appDataFolder 的 ourhome-data-<名稱>.json
//
//   私人端分區：資料放 user_data/<暱稱>/<memos|ledger>。
//     訪客（沒登入）：暱稱隨機產生；私人端存「全部」＝系統設定（user_data/<暱稱>/settings/main）＋我的筆記、記帳本
//     已登入：設定存 Google 雲端硬碟，私人端只存 我的筆記、記帳本（儲存位置選「Firebase 私人端」）
//
//   登入流程：Google 登入 → 讀雲端硬碟（沒有資料就用預設）→ 套用系統設定
//             → 取得兩組 firebaseConfig → 立刻連線並同步 Firestore
//   登出 → 解除全部連線並清空記憶體（私人資料不留在共用裝置上）
//   「立即同步」→ syncNow()：先把還沒存的設定寫回，再重新讀取設定並重新連線兩個資料庫
import { state, on, emit } from "./store.js";
import { availableFeatures, DEFAULT_SHORTCUTS } from "./config.js";
import { isGoogleConfigured, getAccessToken, clearToken, forgetAccount, hasValidToken } from "./google.js";
import { readConfig, writeConfig } from "./drive.js";
import { createDriveBackend, ensureDataFile, resetDriveData } from "./drive-store.js";
import { connect, disconnect } from "./firebase.js";
import { allRepos } from "./repo.js";
import { parseFirebaseConfig } from "./fbconfig.js";
import { applySavedTheme, snapshotTheme, resetTheme } from "./theme.js";
import { snapshotApps, applyApps, resetApps } from "./apps-model.js";
import { snapshotCards, applyCards, resetCards } from "./cards-model.js";
import { snapshotLobby, applyLobby, resetLobby } from "./lobby-model.js";
import { snapshotCalendarIds, applyCalendarIds, resetCalendarIds } from "./calendar-ids.js";
import { snapshotLineBotIds, snapshotLineBotToken, snapshotLineRelayUrl, applyLineBotIds, resetLineBotIds } from "./line-bot-ids.js";
import { bindBowlEmails, cleanBowlEmails } from "./bowl-emails.js";
import { showToast } from "./toast.js";
import { bindReads, unbindReads } from "./reminder-reads.js";
import { snapshotAutoLogin, applyAutoLogin, resetAutoLogin } from "./autologin.js";
import { privateKey } from "./nickname.js";

const BLANK = () => ({ version: 1, firebaseServer: null, firebasePrivate: null, defaults: null, settings: null });
let cfg = BLANK();
bindBowlEmails(() => cfg.defaults?.bowlEmails); // 換誰洗碗可進入的電子郵件：只看雲端硬碟 default 檔的 bowlEmails（登出後 cfg 清空 = 自動擋住）
let fileId = null;
const conns = { server: null, private: null };
let session = 0;        // 每次登入/登出加一，用來丟棄過期的非同步結果
let driveLoaded = false; // 設定檔載入完成前不可寫回（避免用預設值蓋掉雲端設定）
let applying = false;
let saveTimer = null;
let dirty = false;       // 有設定變更還沒寫進雲端硬碟

export const isCloudMode = () => isGoogleConfigured();
state.cloud.mode = isCloudMode() ? "google" : "demo";

/* ---------- 狀態 ---------- */
function setStatus(key, status, detail = "") {
  state.cloud[key] = status;
  state.cloud.detail[key] = detail;
  emit("cloud:change", { ...state.cloud });
}

// 手動匯出 / 匯入 / 載入時，讓「網頁狀態」對應的資料來源顯示「同步中…」
const busyCount = {};
async function withBusy(keys, fn) {
  keys.forEach((k) => { busyCount[k] = (busyCount[k] || 0) + 1; });
  state.cloud.busy = Object.keys(busyCount).filter((k) => busyCount[k] > 0);
  emit("cloud:change", { ...state.cloud });
  try { return await fn(); }
  finally {
    keys.forEach((k) => { busyCount[k] -= 1; });
    state.cloud.busy = Object.keys(busyCount).filter((k) => busyCount[k] > 0);
    emit("cloud:change", { ...state.cloud });
  }
}

export function friendlyError(e, scope = "") {
  const code = String(e?.code || "");
  const msg = String(e?.message || e || "");
  if (code.includes("permission-denied") || /insufficient permissions/i.test(msg)) return "沒有權限：請確認 Firestore 規則" + (scope === "server" ? "，且你的 Google 帳號在允許名單內" : "");
  if (code.includes("operation-not-allowed") || code.includes("configuration-not-found")) {
    return `${scope === "server" ? "家庭共用" : "私人端"} Firebase 專案尚未啟用「匿名」登入（Authentication → Sign-in method → Anonymous）`;
  }
  if (code.includes("invalid-api-key") || code.includes("api-key-not-valid")) return "apiKey 不正確，請重新貼上 firebaseConfig";
  if (code.includes("unauthorized-domain")) return "網站網域未加入 Firebase 的「已授權網域」";
  if (code.includes("network") || /Failed to fetch|NetworkError/i.test(msg)) return "網路連線失敗";
  const detail = String(e?.detail || "");
  if (/has not been used|is disabled|accessNotConfigured/i.test(detail)) return "Google Cloud 專案尚未啟用 Google Drive API（API 和服務 → 程式庫 → Google Drive API → 啟用）";
  if (/insufficient/i.test(detail) || e?.code === "scope") return "沒有授權雲端硬碟存取：請登出後重新登入，並勾選雲端硬碟（應用程式專屬資料）的權限";
  if (e?.status === 403) return "Google 雲端硬碟拒絕存取" + (detail ? `（${detail}）` : "");
  if (e?.status === 401) return "Google 授權已過期，請重新登入";
  return msg || "發生未知錯誤";
}

/* ---------- 設定快照 / 套用 ---------- */
const snapshotSettings = () => ({ theme: snapshotTheme(), shortcuts: [...state.shortcuts], dockVisible: state.dockVisible !== false, apps: snapshotApps(), lobby: snapshotLobby(), cards: snapshotCards(), nickname: state.nickname || "", storage: { ...state.storage }, calendarIds: snapshotCalendarIds(), lineBotToken: snapshotLineBotToken(), lineRelayUrl: snapshotLineRelayUrl(), lineBotIds: snapshotLineBotIds(), autoLogin: snapshotAutoLogin() });

function applySettings(s) {
  if (!s) return;
  applying = true;
  try {
    applySavedTheme(s.theme);
    if (typeof s.nickname === "string") { state.nickname = s.nickname.trim().slice(0, 20); emit("nickname:change", state.nickname); }
    const ok = Array.isArray(s.shortcuts) && s.shortcuts.length === 5 &&
      s.shortcuts.every((id) => availableFeatures.some((f) => f.id === id));
    if (ok) { // 舊資料若沒有「大廳」，補在中間（第 3 格），符合「至少一個大廳」規則
      state.shortcuts = [...s.shortcuts];
      if (!state.shortcuts.includes("大廳")) state.shortcuts[2] = "大廳";
      emit("dock:change", [...state.shortcuts]);
    }
    if (typeof s.dockVisible === "boolean") { state.dockVisible = s.dockVisible; emit("dock:change", [...state.shortcuts]); } // 快捷列開關（舊設定檔沒有這欄時不動）
    if (s.storage && typeof s.storage === "object") {
      const ok = (v) => (v === "google" || v === "private" || v === "server" ? v : "none");
      state.storage = { memos: ok(s.storage.memos), ledger: ok(s.storage.ledger) };
      emit("storage:sync", { ...state.storage });
    }
    applyLineBotIds(s.lineBotIds, s.lineBotToken, s.lineRelayUrl); // LINE Bot：Token 與接收對象（舊設定檔沒有這欄時不動）
    applyCalendarIds(s.calendarIds); // 家庭日曆 ID設定（舊設定檔沒有這欄時不動）
    if (s.readReminders && typeof s.readReminders === "object") { // 舊版把已讀存在雲端硬碟：只當「待搬家」資料讀進畫面，連上伺服器後會補寫過去，之後不再寫回雲端硬碟
      const m = { ...state.readReminders };
      for (const [k, v] of Object.entries(s.readReminders)) if (typeof v === "number" && !(k in m)) m[k] = v;
      state.readReminders = m;
    }
    applyAutoLogin(s.autoLogin); // 自動登入開關（舊設定檔沒有這欄 = 關閉）
    applyCards(s.cards); // 生活圖卡設定：格式大小、排序方式、自訂編號（舊設定檔沒有 cards 時不動）
    applyApps(s.apps); // 所有應用頁：排序方式、自訂編號、擴充插件（舊設定檔沒有 apps 時不動）
    applyLobby(s.lobby); // 大廳設定：顯示/隱藏、大廳順序（舊設定檔沒有 lobby 時不動；要在 applyApps 之後，才認得插件 id）
  } finally { applying = false; }
}

// 系統設定是否已填寫 firebaseConfig（scope：server / private）
export const isFirebaseConfigured = (scope) => !!(scope === "server" ? cfg.firebaseServer : cfg.firebasePrivate);

const configForUi = () => ({ server: cfg.firebaseServer, private: cfg.firebasePrivate });

/* ---------- Firebase 連線 ---------- */
// 可選儲存位置的資料集（我的筆記、記帳本）只有「選了 Firebase 私人端」才跟著私人端連線；其他資料集照原本的 scope
const reposOf = (scope) => allRepos().filter((r) => (r.choosable ? state.storage[r.name] === scope : r.scope === scope));
const choosables = () => allRepos().filter((r) => r.choosable);
const STORE_LABEL = { memos: "我的筆記", ledger: "記帳本" };

// 把某個資料集切到指定儲存位置。carry = 從「不保存」切走時，是否把畫面上已有的資料一起帶過去
// Firestore 分區名稱：伺服器＝使用者信箱（小寫）；私人端＝暱稱（見 core/nickname.js 的 privateKey）
const ownerFor = (scope) => (scope === "server" ? (state.account?.email || "").toLowerCase() : privateKey());

async function setRepoMode(r, want, carry) {
  const wantOwner = want === "private" || want === "server" ? ownerFor(want) : null;
  if (r.mode() === want && (r.owner() || null) === wantOwner) return; // 位置與分區都沒變才略過（改暱稱要重新綁）
  const keep = carry && r.mode() === "none" ? await r.list() : [];
  await r.flush(); // 舊的 Google 雲端資料先寫完
  r.unbind();       // 回到記憶體（舊位置的資料不會被刪除）
  try {
    if (want === "google") {
      await r.bindDrive(createDriveBackend(r.name, { label: STORE_LABEL[r.name], onError: (e) => friendlyError(e) }));
    } else if (want === "private") {
      if (!conns.private) throw new Error("私人端尚未連線");
      if (!wantOwner) throw new Error("沒有暱稱，無法決定私人端分區");
      await r.bind(conns.private, { owner: wantOwner });
    } else if (want === "server") {
      if (!conns.server) throw new Error("伺服器尚未連線");
      await r.bind(conns.server, { owner: wantOwner }); // 依使用者信箱分區
    }
    if (keep.length && want !== "none") await r.importMany(keep);
  } catch (e) {
    r.unbind();
    throw e;
  }
}

// 依 state.storage 讓各資料集切到對應位置（登入載入設定後呼叫；不帶走訪客在畫面上輸入的資料）
async function applyStorage(my = session) {
  for (const r of choosables()) {
    const want = state.storage[r.name] || "none";
    if (want === "google" && !(state.isLoggedIn && isCloudMode())) { state.storage[r.name] = "none"; continue; }
    try { await setRepoMode(r, want, false); }
    catch (e) { if (my === session) { showToast(`${STORE_LABEL[r.name]}無法連到${want === "google" ? " Google 雲端" : "私人端"}：${friendlyError(e)}`, 5000); state.storage[r.name] = "none"; } }
  }
  emit("storage:sync", { ...state.storage });
}

// 重新讀取 Google 雲端模式的資料（立即同步用）
async function reloadDriveRepos() {
  for (const r of choosables()) {
    if (r.mode() !== "google") continue;
    try { await r.flush(); await r.bindDrive(createDriveBackend(r.name, { label: STORE_LABEL[r.name], onError: (e) => friendlyError(e) })); }
    catch (e) { showToast(`${STORE_LABEL[r.name]}重新讀取失敗：${friendlyError(e)}`, 5000); }
  }
}

// 設定頁按〔儲存並同步〕：套用使用者選的儲存位置。回傳要顯示的訊息陣列
async function commitStorage(sel) {
  const msgs = [];
  for (const r of choosables()) {
    const want = sel[r.name] || "none";
    if (want === state.storage[r.name] && r.mode() === want) continue;
    const label = STORE_LABEL[r.name];
    if (want === "google" && !(state.isLoggedIn && isCloudMode())) { msgs.push(`${label}：Google 雲端要先登入帳號`); continue; }
    if (want === "private" && !conns.private) { msgs.push(`${label}：私人端還沒連線，請先貼上 firebaseConfig`); continue; }
    if (want === "server" && !conns.server) { msgs.push(`${label}：${isFirebaseConfigured("server") ? "請先登入Google並等伺服器連線完成" : "未設定伺服器，請先到系統設定貼上 firebaseConfig"}`); continue; }
    try {
      await setRepoMode(r, want, true);
      state.storage[r.name] = want;
      msgs.push(`${label}→${want === "google" ? "Google 雲端" : want === "private" ? "Firebase 私人端" : want === "server" ? "Firebase 伺服器" : "不保存"}`);
    } catch (e) { msgs.push(`${label}：${friendlyError(e, "private")}`); }
  }
  emit("storage:change", { ...state.storage });
  return msgs;
}

async function teardownScope(scope) {
  if (scope === "private") guestSync = false;
  reposOf(scope).forEach((r) => r.unbind());
  if (scope === "server") unbindReads();
  const c = conns[scope];
  conns[scope] = null;
  await disconnect(c);
}

async function connectScope(scope, accessToken, my = session) {
  if (scope === "private" && guestSync && guestDirty && !state.isLoggedIn) await saveGuest(); // 重連前先把訪客還沒存的設定寫掉
  await teardownScope(scope);
  const raw = scope === "server" ? cfg.firebaseServer : cfg.firebasePrivate;
  if (!raw) return setStatus(scope, "unset");
  setStatus(scope, "loading");
  try {
    const conn = await connect(scope, raw, accessToken);
    if (my !== session) { disconnect(conn); return; }
    conns[scope] = conn;
    if (scope === "server") bindReads(conn, state.account?.email); // 最新提醒已讀：存伺服器，每位使用者各一份
    const repos = reposOf(scope);
    const results = await Promise.allSettled(repos.map((r) => (r.choosable ? r.bind(conn, { owner: ownerFor(scope) }) : r.bind(conn))));
    if (my !== session) return;
    const bad = results.findIndex((r) => r.status === "rejected");
    if (bad >= 0) setStatus(scope, "error", friendlyError(results[bad].reason, scope));
    else setStatus(scope, "ok", conn.email || "");
    if (scope === "private" && !state.isLoggedIn) await guestLoad(my); // 訪客：載入 / 建立這個暱稱的設定，並把我的筆記、記帳本接到私人端
  } catch (e) {
    if (my === session) setStatus(scope, "error", friendlyError(e, scope));
  }
}

/* ---------- 訪客：私人端存「全部」（設定 + 資料），依暱稱分區 ---------- */
// 設定：user_data/<暱稱>/settings/main（整份設定轉成 JSON 字串存放，避免 Firestore 不支援巢狀陣列）
// 資料：user_data/<暱稱>/memos、user_data/<暱稱>/ledger（見 core/repo.js 的 bind）
// 已登入時設定改存 Google 雲端硬碟，私人端只放 我的筆記、記帳本。
let guestSync = false;  // 訪客且私人端已連線、設定已載入：之後的設定變更才會寫回私人端
let guestKey = "";      // 目前同步中的暱稱分區
let guestDirty = false;
let guestTimer = null;

async function guestLoad(my) {
  const c = conns.private;
  const key = privateKey();
  if (!c || !key || state.isLoggedIn || my !== session) return;
  let found = false;
  try {
    const snap = await timeout(c.sdk.getDoc(c.sdk.doc(c.db, "user_data", key, "settings", "main")), 15000);
    if (my !== session || state.isLoggedIn) return;
    if (snap.exists()) {
      const s = JSON.parse(snap.data().json || "{}");
      delete s.nickname; // 暱稱就是分區名稱，不從設定裡蓋回去
      applySettings(s);
      found = true;
    }
  } catch (e) {
    if (my === session) showToast("私人端設定讀取失敗：" + friendlyError(e, "private"), 5000);
    return; // 讀失敗就不開同步，避免用預設值蓋掉私人端原有的設定
  }
  guestKey = key;
  guestSync = true;
  if (!found) { state.storage = { memos: "private", ledger: "private" }; emit("storage:sync", { ...state.storage }); } // 新暱稱：預設資料也存私人端
  // 新暱稱：訪客先前在畫面上輸入的（還沒保存的）筆記 / 帳目一併帶進私人端
  const keep = [];
  if (!found) for (const r of choosables()) if (r.mode() === "none") keep.push([r, await r.list()]);
  await applyStorage(my);
  for (const [r, list] of keep) if (list.length && r.mode() === "private") { try { await r.importMany(list); } catch { /* 之後可重新輸入 */ } }
  if (!found) scheduleGuestSave(true);
}

function scheduleGuestSave(now = false) {
  if (applying || state.isLoggedIn || !guestSync) return;
  guestDirty = true;
  clearTimeout(guestTimer);
  guestTimer = setTimeout(() => saveGuest(), now ? 0 : 1500);
}

async function saveGuest(key = guestKey) {
  const c = conns.private;
  if (!guestSync || !c || !key || state.isLoggedIn) return;
  clearTimeout(guestTimer);
  guestDirty = false;
  try {
    await timeout(c.sdk.setDoc(c.sdk.doc(c.db, "user_data", key, "settings", "main"), { json: JSON.stringify(snapshotSettings()), updatedAt: Date.now() }), 15000);
  } catch (e) { guestDirty = true; showToast("設定尚未存到私人端：" + friendlyError(e, "private"), 5000); }
}

// 暱稱改變（停止輸入 0.9 秒後）：資料分區跟著換
//   訪客：先把舊暱稱還沒存的設定寫掉，再讀新暱稱的設定與資料
//   已登入：只有「儲存位置選私人端」的我的筆記、記帳本要換分區
let rekeyTimer = null;
on("nickname:change", () => {
  clearTimeout(rekeyTimer);
  rekeyTimer = setTimeout(async () => {
    const my = session;
    if (state.isLoggedIn) {
      if (!conns.private) return;
      for (const r of choosables()) {
        if (r.mode() !== "private" || r.owner() === privateKey()) continue;
        try { await setRepoMode(r, "private", false); }
        catch (e) { showToast(`${STORE_LABEL[r.name]}換暱稱後無法連到私人端：${friendlyError(e, "private")}`, 5000); }
      }
    } else if (guestSync && conns.private && privateKey() !== guestKey) {
      if (guestDirty) await saveGuest(guestKey);
      if (my !== session) return;
      guestSync = false;
      await guestLoad(my);
    }
  }, 900);
});

/* ---------- 登入後自動載入 ---------- */
// 1) 讀雲端硬碟：系統設定 + 兩組 firebaseConfig（沒有資料 = 全部用預設）
// 2) 套用系統設定
// 3) 立刻連線兩個 Firebase 並同步資料
export async function afterLogin(accessToken) {
  if (!isCloudMode()) return;
  const my = ++session;
  guestSync = false; guestDirty = false; clearTimeout(guestTimer); // 登入：訪客的私人端設定同步到此結束（設定改存 Google 雲端硬碟）
  choosables().forEach((r) => { if (r.mode() === "private") r.unbind(); }); // 訪客暱稱分區的資料換成帳號暱稱分區，由 applyStorage 重新綁
  state.storage = { memos: "none", ledger: "none" };
  const guestPrivate = cfg.firebasePrivate; // 未登入時已經貼好的私人端設定：雲端硬碟沒有的話就沿用
  cfg = BLANK(); fileId = null; driveLoaded = false;
  setStatus("drive", "loading");
  let carried = false, migrate = false;
  try {
    const r = await readConfig(accessToken);
    if (my !== session) return;
    fileId = r.fileId;
    migrate = !!r.legacy; // 舊版單一設定檔：連線完成後寫成 default / settings / notify 三個新檔
    cfg = { ...BLANK(), ...(r.data || {}) };
    if (!cfg.firebasePrivate && guestPrivate) { cfg.firebasePrivate = guestPrivate; carried = true; }
    driveLoaded = true;
    setStatus("drive", "ok", r.data ? "已載入雲端設定" : "尚未建立設定檔（使用預設值）");
  } catch (e) {
    if (my !== session) return;
    cfg.firebasePrivate = guestPrivate; // 雲端硬碟讀不到時，私人端仍維持原狀（它不依賴 Google 登入）
    setStatus("drive", "error", friendlyError(e));
    setStatus("server", "unset");
    return;
  }
  applySettings(cfg.settings);
  emit("cloud:config", configForUi());
  const samePrivate = !!conns.private && state.cloud.private === "ok" && JSON.stringify(cfg.firebasePrivate) === JSON.stringify(guestPrivate);
  await Promise.all([
    connectScope("server", accessToken, my),
    samePrivate ? null : connectScope("private", accessToken, my),
  ]);
  if (my !== session) return;
  await applyStorage(my); // 我的筆記 / 記帳本：依設定檔裡選的儲存位置載入資料
  if (my !== session) return;
  if (carried || migrate) { try { await pushDrive(accessToken); } catch (e) { markPending(e); } } // 把未登入時貼的私人端設定、舊版設定檔一併存進雲端硬碟
  ensureDataFile(); // data 檔（我的筆記、記帳本）不存在時先建一個空白的
  state.cloud.ready = true;
  emit("cloud:ready");
}

export async function afterLogout(onStep = () => {}) {
  // 登出前把還沒存的設定（例如剛改的主色調）寫進雲端硬碟，不然 1.5 秒內登出會遺失
  if (dirty && driveLoaded && state.isLoggedIn) {
    onStep("正在儲存設定...");
    clearTimeout(saveTimer);
    try { await pushDrive(await getAccessToken()); }
    catch (e) { showToast("登出前設定沒能存到雲端：" + friendlyError(e)); }
  }
  onStep("正在儲存資料...");
  await Promise.allSettled(choosables().map((r) => r.flush())); // Google 雲端的資料先寫完，再清空
  onStep("正在清除資料...");
  session++;
  guestSync = false; guestDirty = false; clearTimeout(guestTimer);
  clearTimeout(saveTimer);
  driveLoaded = false; fileId = null; cfg = BLANK(); dirty = false;
  resetLineBotIds(); // LINE Bot Token 與接收對象不留在共用手機上
  resetCalendarIds(); // 日曆 ID 不留在共用手機上
  resetCards(); // 生活圖卡設定回到預設
  resetLobby(); // 大廳設定回到預設（全部顯示、順序跟所有應用相同）
  resetApps(); // 插件網址與自訂編號不留在共用手機上（driveLoaded 已為 false，不會觸發存檔）
  resetTheme(); // 主色調、字體大小、深淺色也回到預設
  state.shortcuts = [...DEFAULT_SHORTCUTS]; state.dockVisible = true; emit("dock:change", [...state.shortcuts]); // 底欄快捷回到預設
  await Promise.all([teardownScope("server"), teardownScope("private")]);
  choosables().forEach((r) => r.unbind()); // 含 Google 雲端模式：資料不留在共用裝置上
  resetDriveData();
  state.readReminders = {}; emit("reminders:read", {}); // 已讀紀錄不留在共用手機上
  state.storage = { memos: "none", ledger: "none" };
  emit("storage:sync", { ...state.storage });
  clearToken(); forgetAccount(); resetAutoLogin(); pending = false;
  document.removeEventListener?.("click", flushOnTap, true);
  state.cloud.ready = false;
  setStatus("drive", "off"); setStatus("server", "off"); setStatus("private", "off");
  emit("cloud:config", configForUi());
  emit("cloud:ready"); // 通知畫面重新整理（資料已清空）
}

/* ---------- 寫回雲端硬碟 ---------- */
// 授權過期（401）時換新 token 重試一次。換新 token 可能需要彈窗，所以只在「使用者點擊」時才一定成功。
// 平常只寫 settings 檔；withDefault = true 才連 default 檔一起寫（只有〔API 資料更新〕會這樣用，default 不讓使用者改寫）
async function pushDrive(token, withDefault = false) {
  cfg.settings = snapshotSettings();
  fileId ||= {};
  try {
    fileId = await writeConfig(token, fileId, cfg, withDefault);
  } catch (e) {
    if (e?.status !== 401) throw e;
    clearToken();
    fileId = await writeConfig(await getAccessToken(), fileId, cfg, withDefault);
  }
  dirty = false;
}

// 「待補存」：背景存檔失敗時不丟掉，記下來；使用者下一次點擊畫面時，在點擊動作內換 token 並補存。
let pending = false;
const flushOnTap = () => {
  if (!pending) return;
  pending = false;
  document.removeEventListener?.("click", flushOnTap, true);
  pushDrive(getAccessToken()).then(
    () => setStatus("drive", "ok", "已補存到雲端"),
    (e) => { markPending(e); }
  );
};
function markPending(e) {
  if (!pending) showToast("設定尚未存到雲端：" + friendlyError(e));
  pending = true;
  setStatus("drive", "error", "設定尚未存到雲端：" + friendlyError(e) + "（點一下畫面任何地方會自動補存）");
  document.removeEventListener?.("click", flushOnTap, true);
  document.addEventListener?.("click", flushOnTap, true);
}
window.addEventListener?.("beforeunload", (ev) => { if (pending) { ev.preventDefault(); ev.returnValue = ""; } });

function scheduleSettingsSave() {
  if (!state.isLoggedIn) return scheduleGuestSave(); // 訪客：設定存私人端
  if (applying || !isCloudMode() || !driveLoaded) return;
  dirty = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      // token 已過期時，背景換新通常會被瀏覽器擋彈窗 → 直接記成「待補存」，等使用者下一次點擊
      if (!hasValidToken()) throw Object.assign(new Error("Google 授權已過期"), { status: 401 });
      await pushDrive(await getAccessToken());
      pending = false;
      setStatus("drive", "ok", "已儲存到雲端");
    } catch (e) { markPending(e); }
  }, 1500);
}
on("theme:change", scheduleSettingsSave);
on("dock:change", scheduleSettingsSave);
on("nickname:change", scheduleSettingsSave);
on("apps:change", scheduleSettingsSave);
on("lobby:change", scheduleSettingsSave); // 大廳顯示/隱藏與順序
on("cards:change", scheduleSettingsSave); // 生活圖卡排序
on("cards:view", scheduleSettingsSave); // 生活圖卡格式大小
on("apps:view", scheduleSettingsSave); // 格式大小（圖卡/清單、大小、每行數量）
on("storage:change", scheduleSettingsSave);
on("autologin:change", scheduleSettingsSave); // 自動登入開關
on("linebotids:change", scheduleSettingsSave); // LINE Bot（Token、接收對象）
on("calendarids:change", scheduleSettingsSave); // 家庭日曆 ID設定 // 儲存位置（我的筆記 / 記帳本）

/* ---------- 設定頁按鈕呼叫的動作 ---------- */
// 雲端硬碟 / 伺服器端要登入；私人端不用（見 saveFirebaseConfig / pullFromDrive / syncNow）
function needCloud() {
  if (!isCloudMode()) { showToast("尚未設定 Google 用戶端 ID（core/config.js 的 GOOGLE_CLIENT_ID）"); return false; }
  if (!state.isLoggedIn) { showToast("請先登入 Google 帳號"); return false; }
  if (!driveLoaded) { showToast("雲端設定還在載入，請稍候"); return false; }
  return true;
}

// 儲存輸入框內的 firebaseConfig 並立即連線。text 空白 = 移除該設定
//   伺服器：一定要登入，存進雲端硬碟。
//   私人端：登入時存進雲端硬碟；未登入時只存在記憶體（登出 / 重新整理就消失），但一樣能連線使用。
export async function saveFirebaseConfig(scope, text) {
  const viaDrive = state.isLoggedIn && isCloudMode();
  if (scope === "server") { if (!needCloud()) return; }
  else if (viaDrive && !driveLoaded) return showToast("雲端設定還在載入，請稍候");
  const parsed = parseFirebaseConfig(text);
  if (parsed.error) return showToast(parsed.error);
  const key = scope === "server" ? "firebaseServer" : "firebasePrivate";
  if (parsed.empty) {
    if (!cfg[key]) return showToast("輸入框是空的");
    if (!confirm("確定移除這組 firebaseConfig？（雲端資料不會被刪除）")) return;
  }
  try {
    let token = null;
    if (viaDrive) token = await getAccessToken();
    cfg[key] = parsed.empty ? null : parsed.config;
    if (viaDrive) {
      await pushDrive(token);
      showToast(parsed.empty ? "已移除設定" : "已儲存到雲端硬碟，連線中…");
    } else {
      showToast(parsed.empty ? "已移除設定" : "連線中…（未登入：設定只暫存在這個畫面）");
    }
    await connectScope(scope, token);
    state.cloud.ready = true;
    emit("cloud:ready");
    if (state.cloud[scope] === "ok") showToast("已連線");
  } catch (e) { showToast("儲存失敗：" + friendlyError(e, scope)); }
}

// 設定頁唯一的〔儲存並同步〕：一次處理兩個輸入框（texts.server / texts.private，null = 該框不可用，略過）＋儲存位置（storageSel）
//   有變更 → 存進雲端硬碟（登入時）→ 立刻連線 Firebase 並同步資料；沒變更但還沒連上 → 重新連線
//   最後套用「儲存位置」：我的筆記、記帳本各自改存 不保存 / Google 雲端 / Firebase 私人端
//   未登入：只有私人端可存，設定只暫存在畫面。
let savingFb = false;
export async function saveFirebaseConfigs(texts, storageSel = null) {
  if (savingFb) return;
  const viaDrive = state.isLoggedIn && isCloudMode();
  const scopes = ["server", "private"].filter((s) => texts[s] != null);
  if (scopes.includes("server") && !needCloud()) return;
  if (viaDrive && !driveLoaded) return showToast("雲端設定還在載入，請稍候");
  const label = { server: "伺服器", private: "私人端" };
  const jobs = [];
  for (const scope of scopes) {
    const parsed = parseFirebaseConfig(texts[scope]);
    if (parsed.error) return showToast(`${label[scope]}：${parsed.error}`);
    const key = scope === "server" ? "firebaseServer" : "firebasePrivate";
    const next = parsed.empty ? null : parsed.config;
    const same = JSON.stringify(next) === JSON.stringify(cfg[key]);
    if (same && (next === null || state.cloud[scope] === "ok")) continue;
    jobs.push({ scope, key, next, changed: !same, remove: next === null });
  }
  const storageChanged = !!storageSel && choosables().some((r) => (storageSel[r.name] || "none") !== state.storage[r.name]);
  if (!jobs.length && !storageChanged) return showToast("沒有變更");
  if (jobs.some((j) => j.remove) && !confirm("確定移除這組 firebaseConfig？（雲端資料不會被刪除）")) return;
  // 私人端被移除後，選「Firebase 私人端」的資料集會失去連線 → 一併改回「不保存」
  if (jobs.some((j) => j.scope === "private" && j.remove) && storageSel) {
    choosables().forEach((r) => { if (storageSel[r.name] === "private") storageSel[r.name] = "none"; });
  }
  savingFb = true;
  try {
    const parts = [];
    const token = viaDrive ? await getAccessToken() : null; // 在點擊動作內先取得授權，之後寫雲端硬碟才不會被擋彈窗
    if (jobs.length) {
      jobs.forEach((j) => { if (j.changed) cfg[j.key] = j.next; });
      if (viaDrive && jobs.some((j) => j.changed)) await pushDrive(token);
      showToast(viaDrive ? "已儲存到雲端硬碟，連線中…" : "連線中…（未登入：設定只暫存在這個畫面）");
      await Promise.all(jobs.map((j) => connectScope(j.scope, token)));
      jobs.forEach((j) => {
        const st = state.cloud[j.scope];
        parts.push(`${label[j.scope]}${j.remove ? "已移除" : st === "ok" ? "已連線" : "連線失敗（" + (state.cloud.detail[j.scope] || "未知原因") + "）"}`);
      });
    }
    if (storageSel) {
      parts.push(...(await commitStorage(storageSel)));
      // 儲存位置的選擇（連同系統設定）立刻寫進 Google 雲端硬碟，不等背景延遲存檔
      if (viaDrive && storageChanged) {
        clearTimeout(saveTimer);
        try { await pushDrive(token); pending = false; setStatus("drive", "ok", "已儲存到雲端"); parts.push("儲存位置已存到雲端硬碟"); }
        catch (e) { markPending(e); }
      }
    }
    state.cloud.ready = true;
    emit("cloud:ready");
    showToast((viaDrive && jobs.length ? "已儲存｜" : "") + (parts.join("｜") || "已儲存"), 5000);
  } catch (e) { showToast("儲存失敗：" + friendlyError(e), 5000); }
  finally { savingFb = false; }
}

// 從雲端硬碟重新讀取（設定 + 兩組 firebaseConfig），並重新連線。scopes 預設兩個都重連
// 未登入時只有私人端可用：用目前畫面上的設定重新連線。
export const pullFromDrive = (scopes) => withBusy(["drive", "server", "private"], () => _pullFromDrive(scopes));
async function _pullFromDrive(scopes = ["server", "private"]) {
  if (!state.isLoggedIn) {
    if (!scopes.includes("private")) return showToast("請先登入 Google 帳號");
    if (!cfg.firebasePrivate) return showToast("尚未貼上私人端 firebaseConfig");
    await connectScope("private");
    state.cloud.ready = true; emit("cloud:ready");
    return showToast(state.cloud.private === "ok" ? "私人端已重新連線" : "私人端連線失敗");
  }
  if (!needCloud()) return;
  try {
    const token = await getAccessToken();
    const r = await readConfig(token);
    fileId = r.fileId;
    if (!r.data) { setStatus("drive", "ok", "尚未建立設定檔"); return showToast("雲端硬碟還沒有設定檔"); }
    cfg = { ...BLANK(), ...r.data };
    setStatus("drive", "ok", "已載入雲端設定");
    applySettings(cfg.settings);
    emit("cloud:config", configForUi());
    for (const s of scopes) await connectScope(s, token);
    state.cloud.ready = true;
    emit("cloud:ready");
    showToast("已從雲端硬碟載入");
  } catch (e) { showToast("載入失敗：" + friendlyError(e)); }
}

// 「網頁狀態」的〔立即同步〕：
//   已登入：先把還沒存的設定寫回 → 重新讀取雲端硬碟（設定 + 兩組 firebaseConfig）→ 套用 → 重新連線伺服器與私人端（重新抓 Firestore 資料）
//   未登入：只重新連線私人端
export async function syncNow() {
  if (state.cloud.syncing) return;
  state.cloud.syncing = true;
  emit("cloud:change", { ...state.cloud });
  try {
    if (state.isLoggedIn && isCloudMode()) {
      if (!driveLoaded) return showToast("雲端設定還在載入，請稍候");
      const token = await getAccessToken();
      if (dirty) { clearTimeout(saveTimer); await pushDrive(token); pending = false; }
      setStatus("drive", "loading");
      const r = await readConfig(token);
      fileId = r.fileId;
      if (r.data) cfg = { ...BLANK(), ...r.data };
      setStatus("drive", "ok", r.data ? "已同步雲端設定" : "尚未建立設定檔（使用預設值）");
      applySettings(cfg.settings);
      emit("cloud:config", configForUi());
      await Promise.all([connectScope("server", token), connectScope("private", token)]);
      await reloadDriveRepos();
    } else {
      if (!cfg.firebasePrivate) return showToast("尚未設定私人端 firebaseConfig；登入 Google 帳號後可同步伺服器端");
      await connectScope("private");
    }
    state.cloud.ready = true;
    emit("cloud:ready");
    const name = { ok: "已連線", error: "失敗", unset: "未設定", off: "離線", loading: "連線中" };
    const c = state.cloud;
    showToast(state.isLoggedIn
      ? `同步完成：伺服器${name[c.server]}、私人端${name[c.private]}`
      : `同步完成：私人端${name[c.private]}`);
  } catch (e) {
    setStatus("drive", "error", friendlyError(e));
    showToast("同步失敗：" + friendlyError(e));
  } finally {
    state.cloud.syncing = false;
    emit("cloud:change", { ...state.cloud });
  }
}

// 「備份還原」的〔API 資料更新〕：
//   已登入：重新取得 Google 授權 → 讀伺服器 Firestore 的 default/default → 強制複寫雲端硬碟的 default 檔
//   （Firestore 文件裡有的欄位才覆寫：firebaseServer、calendarIds、lineBotToken、lineBotIds、plugins、bowlEmails；
//    firebasePrivate 不在 Firestore，維持雲端硬碟原本的）→ 做一次完整同步 → 通知日曆重新讀取
//   未登入：只能重新連線私人端
const timeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("讀取逾時，請檢查網路")), ms))]);

export const refreshApiData = () => withBusy(["drive", "server"], _refreshApiData);
async function _refreshApiData() {
  if (state.cloud.syncing) return;
  if (!state.isLoggedIn || !isCloudMode()) { await syncNow(); return; }
  if (!driveLoaded) return showToast("雲端設定還在載入，請稍候");
  clearToken(); // 一定要在第一個 await 之前，授權續期才算「使用者點擊」
  try {
    const token = await getAccessToken();
    if (!cfg.firebaseServer) return showToast("尚未設定伺服器 firebaseConfig，讀不到 Firestore 的 default");
    if (!conns.server || state.cloud.server !== "ok") await connectScope("server", token);
    if (!conns.server) return showToast("伺服器端沒連上：" + (state.cloud.detail.server || "請檢查 firebaseConfig"), 5000);
    const { sdk, db } = conns.server;
    const snap = await timeout(sdk.getDoc(sdk.doc(db, "default", "default")), 15000);
    if (!snap.exists()) return showToast("伺服器 Firestore 沒有 default 集合底下的 default 文件，雲端硬碟沒有變動", 5000);
    const src = snap.data() || {};

    let nextServer = null;
    if (src.firebaseServer !== undefined) {
      const p = parseFirebaseConfig(JSON.stringify(src.firebaseServer || {}));
      if (p.error || p.empty) return showToast("Firestore default 的 firebaseServer 不完整：" + (p.error || "是空的") + "；雲端硬碟沒有變動", 5000);
      nextServer = p.config;
    }

    applying = true; // 套用時不要觸發背景存檔：下面統一寫一次
    try {
      const nd = { ...(cfg.defaults || {}) };
      if (nextServer) { cfg.firebaseServer = nextServer; nd.firebaseServer = nextServer; } // 預設與目前設定同步成 Firestore 的
      if (Array.isArray(src.calendarIds)) { applyCalendarIds(src.calendarIds); nd.calendarIds = snapshotCalendarIds(); }
      if (typeof src.lineBotToken === "string" || typeof src.lineRelayUrl === "string" || Array.isArray(src.lineBotIds)) {
        applyLineBotIds(src.lineBotIds, src.lineBotToken, src.lineRelayUrl);
        if (typeof src.lineRelayUrl === "string") nd.lineRelayUrl = snapshotLineRelayUrl();
        if (typeof src.lineBotToken === "string") nd.lineBotToken = snapshotLineBotToken();
        if (Array.isArray(src.lineBotIds)) nd.lineBotIds = snapshotLineBotIds();
      }
      if (Array.isArray(src.plugins)) { applyApps({ ...snapshotApps(), plugins: src.plugins }); nd.plugins = snapshotApps().plugins; }
      if (Array.isArray(src.bowlEmails)) nd.bowlEmails = cleanBowlEmails(src.bowlEmails); // 換誰洗碗可進入的電子郵件（只存在 default，不進使用者設定）
      cfg.defaults = Object.keys(nd).length ? nd : null; // 這就是雲端硬碟 default 檔的預設參數；目前設定也已同步成預設值
    } finally { applying = false; }

    await pushDrive(token, true); // 強制複寫雲端硬碟的 default（settings 檔裡跟預設一樣的項目會一併移除）。default 只有這裡會寫
    pending = false;
    emit("cloud:config", configForUi());
    await syncNow(); // 重新讀取雲端硬碟、重新連線（伺服器 firebaseConfig 若有變也會用新的）
    if (state.cloud.drive !== "error") {
      emit("api:refresh");
      showToast("已用 Firestore 的 default 覆寫雲端硬碟的 default，並完成同步", 5000);
    }
  } catch (e) { showToast("API 資料更新失敗：" + friendlyError(e, "server"), 5000); }
}

// 〔還原預設參數〕：不連 Firestore，直接讀雲端硬碟 default 檔的預設參數（日曆 ID、LINE Bot、擴充插件）套用到目前設定。
// 使用者自己改過的會被取代；settings 檔裡對應的項目會一併移除，之後就是「沒改過 = 用 default」。
export const restoreDefaults = () => withBusy(["drive"], _restoreDefaults);
async function _restoreDefaults() {
  if (!needCloud()) return;
  try {
    const token = await getAccessToken();
    const r = await readConfig(token);
    fileId = r.fileId;
    const d = r.data?.defaults;
    if (!d) return showToast("雲端硬碟的 default 還沒有預設參數，請先按「API 資料更新」");
    if (!confirm("要用雲端硬碟 default 的預設參數還原嗎？\n日曆 ID、LINE Bot、擴充插件會回到預設值（你自己改過的會被取代）。")) return;
    cfg.defaults = d;
    const serverChanged = !!d.firebaseServer && JSON.stringify(d.firebaseServer) !== JSON.stringify(cfg.firebaseServer);
    if (serverChanged) cfg.firebaseServer = d.firebaseServer;
    applying = true;
    try {
      if (Array.isArray(d.calendarIds)) applyCalendarIds(d.calendarIds);
      if (typeof d.lineBotToken === "string" || typeof d.lineRelayUrl === "string" || Array.isArray(d.lineBotIds)) applyLineBotIds(d.lineBotIds, d.lineBotToken, d.lineRelayUrl);
      if (Array.isArray(d.plugins)) applyApps({ ...snapshotApps(), plugins: d.plugins });
    } finally { applying = false; }
    clearTimeout(saveTimer);
    await pushDrive(token);
    pending = false;
    if (serverChanged) { emit("cloud:config", configForUi()); await connectScope("server", token); }
    emit("api:refresh");
    showToast("已還原成雲端硬碟 default 的預設參數");
  } catch (e) { showToast("還原失敗：" + friendlyError(e), 5000); }
}

// 把目前設定 + firebaseConfig 立即寫到雲端硬碟
export const pushToDrive = () => withBusy(["drive"], _pushToDrive);
async function _pushToDrive() {
  if (!needCloud()) return;
  try { await pushDrive(await getAccessToken()); pending = false; setStatus("drive", "ok", "已儲存到雲端"); showToast("已匯出至雲端硬碟"); }
  catch (e) { showToast("匯出失敗：" + friendlyError(e)); }
}

/* ---------- 完整資料包（下載 / 還原 JSON 檔） ---------- */
// 這個資料集現在「真的」能讀寫嗎？（guest 服務隨時能用，只是未連線時只存記憶體；
// 其他服務要登入且對應的資料庫連線成功；私人端連線成功時，未登入也算）
const usable = (r) => {
  if (r.guest) return true;
  if (r.scope === "private" && state.cloud.private === "ok") return true;
  if (!state.isLoggedIn) return false;
  if (!isCloudMode()) return true;
  return state.cloud[r.scope] === "ok";
};

export const exportBundle = () => withBusy(["server", "private"], _exportBundle);
async function _exportBundle() {
  const data = {};
  for (const r of allRepos()) {
    if (!usable(r)) continue;
    try { data[r.name] = await r.list(); } catch { /* 該集合讀不到就略過 */ }
  }
  const bundle = {
    app: "OurHome", version: 1, exportedAt: new Date().toISOString(),
    settings: snapshotSettings(),
    firebase: state.isLoggedIn ? { server: cfg.firebaseServer, private: cfg.firebasePrivate } : null,
    data,
  };
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `ourhome-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  const n = Object.values(data).reduce((s, l) => s + l.length, 0);
  showToast(`已匯出資料包（${n} 筆資料）`);
}

export const importBundleFile = (file) => withBusy(["drive", "server", "private"], () => _importBundleFile(file));
async function _importBundleFile(file) {
  let bundle;
  try { bundle = JSON.parse(await file.text()); } catch { return showToast("檔案不是有效的 JSON"); }
  if (bundle?.app !== "OurHome") return showToast("這不是「我們的家」的資料包");
  const names = Object.keys(bundle.data || {});
  if (!confirm(`要還原這份資料包嗎？\n含 ${names.length} 個資料集；同編號的資料會被覆蓋，其他資料不會被刪除。`)) return;
  applySettings(bundle.settings);
  let n = 0, skipped = [];
  for (const r of allRepos()) {
    const list = bundle.data?.[r.name];
    if (!Array.isArray(list) || !list.length) continue;
    if (!usable(r)) { skipped.push(r.name); continue; }
    try { n += await r.importMany(list); } catch (e) { skipped.push(r.name); }
  }
  if (state.isLoggedIn && isCloudMode() && driveLoaded && bundle.firebase) {
    const f = bundle.firebase;
    if (f.server || f.private) {
      cfg.firebaseServer = f.server || cfg.firebaseServer;
      cfg.firebasePrivate = f.private || cfg.firebasePrivate;
      try { await pushDrive(await getAccessToken()); emit("cloud:config", configForUi()); } catch { /* 之後可手動匯出 */ }
    }
  }
  emit("cloud:ready");
  showToast(skipped.length ? `已還原 ${n} 筆；略過：${skipped.join("、")}` : `已還原 ${n} 筆資料`);
}

/* ---------- Google 雲端硬碟（appDataFolder）⇄ JSON 檔 ---------- */
// 儲存位置不變：系統設定與兩組 firebaseConfig 仍存在 appDataFolder（隱藏資料夾）。
// 匯出：把 appDataFolder 裡的設定下載成 JSON 檔；匯入：選一個這種 JSON 檔，寫回 appDataFolder 並套用。
const DRIVE_FILE_TYPE = "drive-config";
const isCfgObj = (v) => v === null || v === undefined || (typeof v === "object" && !Array.isArray(v));

export const exportDriveConfig = () => withBusy(["drive"], _exportDriveConfig);
async function _exportDriveConfig() {
  if (!needCloud()) return;
  try {
    const token = await getAccessToken();
    if (dirty) { clearTimeout(saveTimer); await pushDrive(token); pending = false; } // 先把還沒存的設定寫進 appDataFolder
    let r = await readConfig(token);
    if (!r.data) { await pushDrive(token); r = await readConfig(token); }             // 雲端還沒有設定檔：先建立再匯出
    const { defaults: _d, ...exported } = r.data; // 匯出檔維持原格式（firebaseServer、firebasePrivate、settings）
    const file = { app: "OurHome", type: DRIVE_FILE_TYPE, version: 1, exportedAt: new Date().toISOString(), config: exported };
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ourhome-drive-config-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    setStatus("drive", "ok", "已匯出設定檔");
    showToast("已把雲端硬碟的設定匯出成 JSON 檔");
  } catch (e) { showToast("匯出失敗：" + friendlyError(e), 5000); }
}

export const importDriveConfigFile = (file) => withBusy(["drive", "server", "private"], () => _importDriveConfigFile(file));
async function _importDriveConfigFile(file) {
  if (!needCloud()) return;
  let json;
  try { json = JSON.parse(await file.text()); } catch { return showToast("檔案不是有效的 JSON"); }
  if (json?.app !== "OurHome" || json?.type !== DRIVE_FILE_TYPE || !json.config || typeof json.config !== "object") {
    return showToast("這不是「匯出 Google 雲端硬碟」產生的設定檔");
  }
  const inc = json.config;
  if (!isCfgObj(inc.firebaseServer) || !isCfgObj(inc.firebasePrivate) || !isCfgObj(inc.settings)) return showToast("設定檔內容格式不正確");
  if (!confirm("要用這個檔案取代雲端硬碟裡的設定嗎？\n目前的系統設定與 firebaseConfig 會被覆蓋，並重新連線伺服器與私人端。")) return;
  try {
    const token = await getAccessToken();
    cfg = { ...BLANK(), firebaseServer: inc.firebaseServer || null, firebasePrivate: inc.firebasePrivate || null, defaults: cfg.defaults, settings: inc.settings || null }; // 匯入的是使用者設定：寫進 settings，不動 default
    applySettings(cfg.settings);
    await pushDrive(token); // 寫回 appDataFolder
    pending = false;
    setStatus("drive", "ok", "已從檔案匯入設定");
    emit("cloud:config", configForUi());
    await Promise.all([connectScope("server", token), connectScope("private", token)]);
    state.cloud.ready = true;
    emit("cloud:ready");
    showToast("已匯入設定並寫入雲端硬碟");
  } catch (e) { showToast("匯入失敗：" + friendlyError(e), 5000); }
}
