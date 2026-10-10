// 管理 Backdrop、Bottom Sheet、右側設定視窗的開關狀態。
// 兩個視窗互斥：開其中一個會先關閉另一個（維持原型行為）。

import { state, emit } from "./store.js";

const backdrop = () => document.getElementById("backdrop");

function syncBackdrop() {
  const el = backdrop();
  if (!el) return;
  const anyOpen = state.overlay.sheet || state.overlay.settings || state.overlay.apps || state.overlay.admin;
  el.classList.toggle("pointer-events-none", !anyOpen);
  el.classList.toggle("opacity-0", !anyOpen);
  el.classList.toggle("opacity-100", !!anyOpen);
}

export function openSheet(type = "notification") {
  state.overlay.admin = null;
  state.overlay.settings = null;
  state.overlay.apps = null;
  state.overlay.sheet = type;
  syncBackdrop();
  emit("overlay:change", { ...state.overlay });
}

// 管理員驗證視窗：和「最新提醒」同一個底部彈窗，但不關閉系統設定（驗證完回到設定繼續用）
export function openAdminVerify() {
  state.overlay.sheet = "admin";
  syncBackdrop();
  emit("overlay:change", { ...state.overlay });
}

export function closeSheet() {
  state.overlay.sheet = null;
  syncBackdrop();
  emit("overlay:change", { ...state.overlay });
}

export function openSettings(mode = "all") {
  state.overlay.admin = null;
  state.overlay.sheet = null;
  state.overlay.apps = null;
  state.overlay.settings = mode;
  syncBackdrop();
  emit("overlay:change", { ...state.overlay });
}

export function closeSettings() {
  state.overlay.admin = null;
  state.overlay.settings = null;
  syncBackdrop();
  emit("overlay:change", { ...state.overlay });
}

// 應用程式頁的 ︙ 選項視窗（右側滑出，和系統設定互斥）
export function openAppsOptions() {
  state.overlay.admin = null;
  state.overlay.sheet = null;
  state.overlay.settings = null;
  state.overlay.apps = "options";
  syncBackdrop();
  emit("overlay:change", { ...state.overlay });
}

// 家庭日曆的 ︙ ID設定視窗（右側滑出，和系統設定互斥；關閉沿用 closeAppsOptions）
export function openCalendarId() {
  state.overlay.admin = null;
  state.overlay.sheet = null;
  state.overlay.settings = null;
  state.overlay.apps = "calendarId";
  syncBackdrop();
  emit("overlay:change", { ...state.overlay });
}

// 生活圖卡頁的 ︙ 生活圖卡設定視窗（右側滑出，和系統設定互斥；關閉沿用 closeAppsOptions）
export function openCardsOptions() {
  state.overlay.admin = null;
  state.overlay.sheet = null;
  state.overlay.settings = null;
  state.overlay.apps = "cards";
  syncBackdrop();
  emit("overlay:change", { ...state.overlay });
}

// 換誰洗碗頁的 ︙ 換誰洗碗設定視窗（右側滑出，和系統設定互斥；關閉沿用 closeAppsOptions）
export function openBowlOptions() {
  state.overlay.admin = null;
  state.overlay.sheet = null;
  state.overlay.settings = null;
  state.overlay.apps = "bowl";
  syncBackdrop();
  emit("overlay:change", { ...state.overlay });
}

export function closeAppsOptions() {
  state.overlay.apps = null;
  syncBackdrop();
  emit("overlay:change", { ...state.overlay });
}

export function closeAll() {
  state.overlay.admin = null;
  state.overlay.sheet = null;
  state.overlay.settings = null;
  state.overlay.apps = null;
  syncBackdrop();
  emit("overlay:change", { ...state.overlay });
}

// 管理員「最新提醒」編輯視窗：疊在系統設定上面（設定視窗保持開著，返回就回到設定）
export function openAdminReminder() {
  state.overlay.sheet = null;
  state.overlay.admin = "reminder";
  syncBackdrop();
  emit("overlay:change", { ...state.overlay });
}

export function closeAdminReminder() {
  if (!state.overlay.admin) return;
  state.overlay.admin = null;
  syncBackdrop();
  emit("overlay:change", { ...state.overlay });
}
