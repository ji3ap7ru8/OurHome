// 管理員功能的上鎖 / 解鎖：要先登入 Google 帳號，再輸入管理員密碼才能解鎖。
// 解鎖狀態只存在記憶體（state.adminUnlocked）；登出或關閉設定視窗就重新上鎖。
// 注意：這是純前端的簡易門檻（密碼寫在網頁程式裡），只能擋一般使用者，不是真正的安全機制；
// 管理員功能實際接上資料庫時，要再用 Firestore 規則限制誰能寫入。
import { state, on, emit } from "./store.js";

const ADMIN_PASSWORD = "admin";

export function tryUnlockAdmin(password) {
  if (!state.isLoggedIn) return { ok: false, msg: "請先登入 Google 帳號" };
  if (String(password) !== ADMIN_PASSWORD) return { ok: false, msg: "密碼不正確" };
  state.adminUnlocked = true;
  emit("admin:change", true);
  return { ok: true };
}

export function lockAdmin() {
  if (!state.adminUnlocked) return;
  state.adminUnlocked = false;
  emit("admin:change", false);
}

// 登出（或帳號切換）→ 上鎖
on("auth:change", () => { if (!state.isLoggedIn) lockAdmin(); });
