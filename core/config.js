// 靜態設定：可選功能清單、主色調、預設值。
// Stage 2~4 新增服務時，把 action: "service" 的項目加進 availableFeatures 即可。

export const availableFeatures = [
  { id: "大廳",     name: "大廳",     icon: "fa-solid fa-house",          action: "active" },
  { id: "應用程式", name: "所有應用",  icon: "fa-solid fa-border-all",     action: "normal" },
  { id: "家庭公告", name: "家庭公告", icon: "fa-solid fa-bullhorn",       action: "service" },
  { id: "生活圖卡", name: "生活圖卡", icon: "fa-solid fa-images",         action: "service" },
  { id: "個人記事本", name: "我的筆記", icon: "fa-solid fa-book-open",   action: "service" },
  { id: "家庭日曆", name: "家庭日曆", icon: "fa-solid fa-calendar-days",  action: "service" },
  { id: "記帳",     name: "記帳本", icon: "fa-solid fa-wallet",         action: "service" },
  { id: "換誰洗碗", name: "換誰洗碗", icon: "fa-solid fa-utensils",       action: "service" },
  { id: "計算機",   name: "計算機",   icon: "fa-solid fa-calculator",     action: "service" },
  { id: "翻譯機",   name: "翻譯機",   icon: "fa-solid fa-language",       action: "service" },
  { id: "計時器",   name: "計時器",   icon: "fa-solid fa-hourglass-half", action: "service" },
  { id: "碼表",     name: "碼表",     icon: "fa-solid fa-stopwatch",      action: "service" },
  { id: "設定",     name: "設定",     icon: "fa-solid fa-gear",           action: "settings" },
  { id: "最新提醒", name: "最新提醒", icon: "fa-solid fa-bell",           action: "notification" },
  { id: "網頁狀態", name: "網頁狀態", icon: "fa-solid fa-server",         action: "status" },
  { id: "登出",     name: "登出",     icon: "fa-solid fa-right-from-bracket", action: "logout" },
];

export const DEFAULT_SHORTCUTS = ["家庭公告", "生活圖卡", "大廳", "應用程式", "設定"];

export const FONT_SCALE = { min: 80, max: 150, step: 5, default: 100 };

export const DEFAULT_THEME = { mode: "light" };

// ---- Stage 8：雲端整合設定 ---------------------------------------------
// GOOGLE_CLIENT_ID 留空 = 尚未設定（登入時會提示，無法登入）。
// 填入 OAuth 用戶端 ID 後，登入走真正的 Google 登入，並自動讀取雲端硬碟設定、連線 Firestore。
// 用戶端 ID 不是機密（會出現在網頁原始碼），安全性靠「授權的 JavaScript 來源」與 Firestore 規則。
export const CLOUD = {
  GOOGLE_CLIENT_ID: "479593643043-3l98vttnmlrbniar4ljh6fk97h8a8cjq.apps.googleusercontent.com",
  SCOPES: "openid email profile https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/calendar.events",
  DRIVE_FILE: "ourhome-config.json", // 舊版單一設定檔：只在第一次登入時讀來搬家，之後不再寫入
  // Google 雲端硬碟（appDataFolder）的四個檔案
  DRIVE_FILES: {
    default: "ourhome-default.json",   // firebase 伺服器 / 私人端設定、日曆 ID、LINE Bot Token 與接收對象、擴充插件
    settings: "ourhome-settings.json", // 其餘系統設定：個人化、大廳、所有應用、生活圖卡、儲存位置
    notify: "ourhome-notify.json",     // 通知（目前留白）
    data: "ourhome-data.json",         // 我的筆記、記帳本（儲存位置選 Google 雲端時才有資料）
  },
  FIREBASE_SDK: "10.14.1",
};
