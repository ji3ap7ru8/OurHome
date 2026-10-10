// 外觀主題 / 主色調 / 字體縮放。
// 只改 DOM 與記憶體狀態；Stage 8 起登入後由 core/cloud.js 與 Google 雲端硬碟同步設定值。

import { state, emit } from "./store.js";
import { FONT_SCALE } from "./config.js";

const media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

function applyDark(isDark) {
  document.getElementById("appContainer").classList.toggle("dark", isDark);
}

export function setAppTheme(mode) {
  state.theme.mode = mode;
  applyDark(mode === "dark" || (mode === "system" && !!media && media.matches));
  emit("theme:change", { ...state.theme });
}

export function setThemeColor(primary, light, dark, name) {
  const root = document.documentElement.style;
  root.setProperty("--primary-color", primary);
  root.setProperty("--primary-light", light);
  root.setProperty("--primary-dark", dark);
  state.theme.colorName = name;
  state.theme.primary = primary;
  state.theme.light = light;
  state.theme.dark = dark;
  emit("theme:change", { ...state.theme });
}

export function setFontScale(value) {
  const val = Math.min(FONT_SCALE.max, Math.max(FONT_SCALE.min, parseInt(value, 10) || FONT_SCALE.default));
  document.documentElement.style.fontSize = val + "%";
  state.theme.fontScale = val;
  emit("theme:change", { ...state.theme });
}

// 登出用：外觀回到預設值（晨曦藍、字體 100%、淺色），不把上一位使用者的個人化留在共用手機上
export function resetTheme() {
  setThemeColor("#0284c7", "#e0f2fe", "#0369a1", "晨曦藍");
  setFontScale(FONT_SCALE.default);
  setAppTheme("light");
}

export function stepFontSize(delta) {
  setFontScale(state.theme.fontScale + delta);
}

// 「跟隨系統」模式下，系統深淺色改變時即時同步
if (media) {
  media.addEventListener("change", () => {
    if (state.theme.mode === "system") setAppTheme("system");
  });
}

// 雲端設定檔用：目前外觀的可儲存快照 / 還原
export const snapshotTheme = () => {
  const { mode, colorName, primary, light, dark, fontScale } = state.theme;
  return { mode, colorName, primary, light, dark, fontScale };
};

export function applySavedTheme(t) {
  if (!t || typeof t !== "object") return;
  const hex = (v) => typeof v === "string" && /^#[0-9a-fA-F]{3,8}$/.test(v);
  if (hex(t.primary) && hex(t.light) && hex(t.dark) && typeof t.colorName === "string") setThemeColor(t.primary, t.light, t.dark, t.colorName);
  if (t.fontScale) setFontScale(t.fontScale);
  if (["light", "dark", "system"].includes(t.mode)) setAppTheme(t.mode);
}
