// 自動登入（不登出）：系統設定 > 網頁狀態 的開關，預設關閉。
// 開啟 = 瀏覽器記住 Google 帳號（名稱/信箱/頭貼，不含 token），下次進入網頁自動登入（見 core/auth.js 的 autoLogin）。
// 開關的值隨系統設定存在 Google 雲端硬碟；關閉開關或登出會清掉瀏覽器裡記住的帳號。
import { state, emit } from "./store.js";
import { rememberAccount, forgetRemembered } from "./google.js";

export const snapshotAutoLogin = () => !!state.autoLogin;

function syncRemember() {
  if (state.autoLogin && state.isLoggedIn && state.account) rememberAccount(state.account);
  else forgetRemembered();
}

// 使用者在設定頁切換開關
export function setAutoLogin(on) {
  state.autoLogin = !!on;
  syncRemember();
  emit("autologin:change", state.autoLogin);
}

// 登入後讀到雲端硬碟的設定（沒有這個欄位的舊設定檔 = 關閉）
export function applyAutoLogin(v) {
  state.autoLogin = v === true;
  syncRemember();
  emit("autologin:change", state.autoLogin);
}

// 登出：回到預設（記住的帳號由 forgetAccount() 清除）
export function resetAutoLogin() {
  state.autoLogin = false;
  emit("autologin:change", false);
}

// 自動登入提醒：登入一開始（載入中）就顯示，載入完成後再停留 3 秒自動消失，也可按「了解」立刻關閉。
// 回傳 { finish(), cancel() }：finish = 載入完成（3 秒後消失）；cancel = 登入失敗（立刻消失）。
const STAY_MS = 3000;
let noticeEl = null;
export function showAutoLoginNotice() {
  noticeEl?.remove();
  const el = document.createElement("div");
  el.setAttribute("role", "alert");
  el.className = "fixed left-1/2 z-[95] w-[94vw] max-w-md -translate-x-1/2 rounded-2xl border-2 border-amber-400 bg-amber-100 px-4 py-3 text-amber-950 shadow-2xl ring-4 ring-amber-300/60 flex items-center gap-3 text-sm font-black leading-snug transition-opacity duration-300";
  el.style.top = "calc(env(safe-area-inset-top, 0px) + 12px)";
  el.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-2xl text-amber-600 shrink-0"></i><span class="flex-1">目前是自動登入<br><span class="font-bold">如在公共場所使用，請務必登出，確保 Google 帳號安全。</span></span><button type="button" class="shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-white shadow">了解</button>';
  document.body.appendChild(el);
  noticeEl = el;
  let timer = null;
  const close = () => { clearTimeout(timer); if (noticeEl !== el) return; noticeEl = null; el.style.opacity = "0"; setTimeout(() => el.remove(), 300); };
  el.querySelector("button").addEventListener("click", close);
  return { finish: () => { clearTimeout(timer); timer = setTimeout(close, STAY_MS); }, cancel: close };
}
