// 登入狀態。
// Google 登入 → 取得名稱 / 信箱 / 頭貼 → core/cloud.js 自動讀取雲端硬碟設定、連線 Firebase。
// config.js 沒填 GOOGLE_CLIENT_ID 時無法登入（沒有任何模擬帳號）。
import { state, emit } from "./store.js";
import { openSettings, closeSheet, closeSettings, openSheet } from "./overlay.js";
import { isGoogleConfigured, signIn, silentSignIn, getRememberedAccount, forgetRemembered, preloadGoogle } from "./google.js";
import { afterLogin, afterLogout } from "./cloud.js";
import { showToast } from "./toast.js";
import { showLoading, hideLoading, setLoadingText } from "./loading.js";
import { showAutoLoginNotice } from "./autologin.js";
import { ensureGuestNickname } from "./nickname.js";

function setLoggedIn(value, account = null) {
  state.isLoggedIn = value;
  state.account = value ? account : null;
  if (state.nickname) { state.nickname = ""; emit("nickname:change", ""); } // 登入 / 登出：暱稱各屬於各自的設定（訪客隨機暱稱 or 帳號雲端設定），先清掉
  if (!value) ensureGuestNickname(); // 登出後回到訪客：重新隨機一組
  emit("auth:change", { isLoggedIn: value, account: state.account });
}

let busy = false;
// 注意：這個函式要「直接」由點擊觸發，且第一步就呼叫 signIn()（見 core/google.js 說明）
export async function loginWithGoogle() {
  if (state.isLoggedIn) { closeSheet(); return; }
  if (!isGoogleConfigured()) { showToast("尚未設定 Google 用戶端 ID（core/config.js 的 GOOGLE_CLIENT_ID）"); return; }
  if (busy) return;
  busy = true;
  showLoading("登入中...");
  const auto = !!getRememberedAccount();
  const notice = auto ? showAutoLoginNotice() : null; // 自動登入：一開始載入就顯示提醒
  try {
    // 有記住的帳號 = 自動登入：這一點直接進入，不用再選帳號
    const { accessToken, profile } = await (auto ? silentSignIn() : signIn());
    closeSheet();
    setLoggedIn(true, profile);
    // 讀取雲端設定、連線 Firebase 也是會卡的階段：遮罩撐到完成（最多 12 秒，之後在背景繼續，進度看設定頁「網頁狀態」）
    await Promise.race([afterLogin(accessToken), new Promise((r) => setTimeout(r, 12000))]);
    notice?.finish(); // 載入完成後再停留 3 秒消失
  } catch (e) {
    notice?.cancel();
    if (getRememberedAccount() && !/取消/.test(e?.message || "")) forgetRemembered(); // 記住的帳號失效（授權被撤銷等）→ 下次改走選帳號
    showToast(e?.message || "Google 登入失敗");
  } finally {
    hideLoading();
    busy = false;
  }
}

// 開啟網頁時：沒登入（首次 / 自動登入）一律先跳出「帳號登入」視窗。
// 有記住的帳號（自動登入）→ 點「使用 Google 帳號登入」一下就直接進入（見 loginWithGoogle）；首次 → 選帳號登入。
// 彈窗一定要由使用者點擊觸發，所以不再嘗試背景自動登入。
export function autoLogin() {
  if (state.isLoggedIn) return;
  preloadGoogle();
  openSheet("login");
}

// 登出：整個畫面蓋上「登出中...」遮罩，等資料確實清乾淨才放行（清除途中關閉網頁會跳出提醒）
let loggingOut = false;
const leaveGuard = (e) => { e.preventDefault(); e.returnValue = ""; };
export async function logout() {
  if (loggingOut) return;
  if (state.isLoggedIn) {
    loggingOut = true;
    showLoading("登出中...");
    window.addEventListener("beforeunload", leaveGuard);
    try {
      await afterLogout(setLoadingText); // 先存好設定、清空雲端連線與私人資料
    } catch (e) {
      console.error("登出清除時發生錯誤：", e); // 就算清除出錯，也一定要登出並清空畫面上的資料
    }
    setLoggedIn(false);
    setLoadingText("資料已清除 ✓");
    await new Promise((r) => setTimeout(r, 700)); // 讓使用者看到「已清除」再收起遮罩
    window.removeEventListener("beforeunload", leaveGuard);
    hideLoading();
    loggingOut = false;
  }
  closeSettings();
}

// 點大廳左上角帳號：已登入 → 網頁狀態；未登入 → 登入視窗
export function handleUserHeaderClick() {
  if (state.isLoggedIn) openSettings("status");
  else openSheet("login");
}
