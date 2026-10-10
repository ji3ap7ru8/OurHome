// 全域狀態 + 極簡事件匯流排（pub/sub）。
// 刻意只放在記憶體：依「無痕隱私」原則，不使用 Cookie / localStorage。
// 唯一例外：開啟「自動登入」時，才會記住 Google 帳號（名稱/信箱/頭貼，見 core/autologin.js），關閉開關或登出即清除。

import { DEFAULT_SHORTCUTS, FONT_SCALE } from "./config.js";

export const state = {
  isLoggedIn: false,
  account: null, // { name, email, picture }
  autoLogin: false, // 自動登入（不登出）開關：預設關閉；開啟時瀏覽器記住帳號，下次進入自動登入。隨系統設定存 Google 雲端硬碟
  nickname: "", // 暱稱：空字串＝使用 Google 帳號名稱；登入後隨系統設定存 Google 雲端硬碟
  // 雲端連線狀態：off 未連線 / unset 尚未設定 / loading 連線中 / ok 已連線 / error 失敗
  cloud: { mode: "demo", drive: "off", server: "off", private: "off", detail: {}, ready: false, syncing: false, busy: [] },
  route: "大廳", // 目前顯示的畫面：大廳 或服務 id
  shortcuts: [...DEFAULT_SHORTCUTS],
  dockVisible: true, // 底部快捷列開關（預設開）；關閉後只在大廳頁操作，其他頁只留「回大廳」小按鈕；隨系統設定存雲端
  theme: { mode: "light", colorName: "晨曦藍", fontScale: FONT_SCALE.default },
  appsView: { mode: "card", size: "m", cols: 2 }, // 所有應用頁瀏覽格式：card/list、l/m/s、2/3/4（登入後隨系統設定存 Google 雲端硬碟）
  apps: { sort: "default", order: [], plugins: [], disabled: [] }, // 所有應用頁：排序方式（default/name/custom）、自訂編號順序（id 陣列）、擴充插件（{id,url,name}）、停用的應用（id 陣列，預設空＝全部啟用）。登入後隨系統設定存到雲端硬碟
  lobby: { shown: [], order: [], mode: {}, cards: [] }, // 大廳設定：shown 大廳要顯示的服務 id（預設空＝全部關閉）、order 大廳自己的服務順序（空＝跟「所有應用」排序相同）、mode 各服務在大廳的顯示方式（沒設定＝用預設）、cards 大廳要顯示的生活圖卡 id（空＝都不顯示）；登入後隨系統設定存 Google 雲端硬碟
  cardsView: { mode: "card", size: "m", cols: 2 }, // 生活圖卡頁瀏覽格式：card/list、l/m/s、2/3（登入後隨系統設定存 Google 雲端硬碟）
  cardsSort: { sort: "default", order: [] }, // 生活圖卡排序：default/name/custom、自訂編號順序（圖卡 id 陣列）
  readReminders: {}, // 最新提醒已讀：{ 提醒編號: 已讀當下的發布時間 }（提醒被編輯、時間更新後會再次顯示未讀）。登入後存在伺服器 Firestore（reminder_reads/<信箱>，每人一份）
  storage: { memos: "none", ledger: "none" }, // 資料儲存位置：none 不保存（預設，只在畫面記憶體）/ google Google 雲端硬碟 / private Firebase 私人端。登入後隨系統設定存 Google 雲端硬碟
  calendarIds: [], // 家庭日曆 ID設定：Google 日曆 ID 清單 [{ id, name, calId }]，數量不限；登入後隨系統設定存 Google 雲端硬碟
  lineRelayUrl: "", // 系統設定 LINE Bot 的中繼站 URL（Google Apps Script 網頁應用程式網址）；隨系統設定存雲端
  lineBotToken: "", // 系統設定 LINE Bot 的 Bot Token（Channel access token）；登入後隨系統設定存 Google 雲端硬碟，登出即清除
  lineBotIds: [], // 系統設定 LINE Bot 的接收對象清單 [{ id, name, userId }]，數量不限；登入後隨系統設定存 Google 雲端硬碟
  adminUnlocked: false, // 管理員功能是否已解鎖：只存記憶體；登出、關閉設定視窗就重新上鎖
  overlay: { sheet: null, settings: null, apps: null, admin: null }, // sheet: 'notification' | 'login' | null；settings: 'all' | 'personal' | 'status' | null
};

const listeners = new Map();

export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
  return () => listeners.get(event).delete(fn);
}

export function emit(event, payload) {
  (listeners.get(event) || []).forEach((fn) => fn(payload));
}
