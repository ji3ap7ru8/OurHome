// App Shell 啟動流程：註冊事件 → 掛載元件 → 套用預設外觀
import { initActions } from "./actions.js";
import { initSharedActions } from "./shared-actions.js";
import { setAppTheme } from "./theme.js";
import { DEFAULT_THEME } from "./config.js";
import { mountHeader } from "../components/header.js";
import { mountDock } from "../components/dock.js";
import { mountBottomSheet } from "../components/bottom-sheet.js";
import { mountSettingsPanel } from "../components/settings-panel.js";
import { mountAdminReminder } from "../components/admin-reminder.js";
import { mountCalendarIds } from "../components/calendar-ids.js";
import { mountAppsOptions } from "../components/apps-options.js";
import { mountCardsOptions } from "../components/cards-options.js";
import { mountBowlOptions } from "../components/bowl-options.js";
import { mountCloudSettings } from "../components/cloud-settings.js";
import { preloadGoogle } from "./google.js";
import { hideSplash } from "./loading.js";
import { autoLogin } from "./auth.js";
import { ensureGuestNickname } from "./nickname.js";
import { registerService, initRouter, navigate } from "./router.js";
import notes from "../services/notes/index.js";
import cards from "../services/cards/index.js";
import calendar from "../services/calendar/index.js";
import translator from "../services/translator/index.js";
import calculator from "../services/calculator/index.js";
import timer from "../services/timer/index.js";
import stopwatch from "../services/stopwatch/index.js";
import memo from "../services/memo/index.js";
import ledger from "../services/ledger/index.js";
import bowl from "../services/bowl/index.js";

export function bootstrap() {
  initActions(document);
  ensureGuestNickname(); // 訪客暱稱：啟動時隨機產生一組
  initSharedActions();

  mountHeader(document.getElementById("headerMount"));
  mountDock();
  mountBottomSheet(document.getElementById("bottomSheetMount"));
  mountSettingsPanel(document.getElementById("settingsMount"));
  mountAdminReminder();
  mountAppsOptions(document.getElementById("appsOptionsMount"));
  const calMount = document.createElement("div"); // 家庭日曆的 ︙ ID設定視窗：掛在所有應用設定旁邊
  calMount.id = "calendarIdMount";
  document.getElementById("appsOptionsMount").insertAdjacentElement("afterend", calMount);
  mountCalendarIds(calMount);
  const cardsMount = document.createElement("div"); // 生活圖卡的 ︙ 生活圖卡設定視窗
  cardsMount.id = "cardsOptionsMount";
  calMount.insertAdjacentElement("afterend", cardsMount);
  mountCardsOptions(cardsMount);
  const bowlMount = document.createElement("div"); // 換誰洗碗的 ︙ 換誰洗碗設定視窗
  bowlMount.id = "bowlOptionsMount";
  cardsMount.insertAdjacentElement("afterend", bowlMount);
  mountBowlOptions(bowlMount);
  mountCloudSettings();
  preloadGoogle(); // 預載 Google 登入元件，點「登入」時才能立刻彈出視窗

  registerService(notes);
  registerService(cards);
  registerService(calendar);
  registerService(translator);
  registerService(calculator);
  registerService(timer);
  registerService(stopwatch);
  registerService(memo);
  registerService(ledger);
  registerService(bowl);
  initRouter();
  navigate("大廳");

  setAppTheme(DEFAULT_THEME.mode);
  hideSplash();
  autoLogin(); // 沒登入就先跳出帳號登入視窗（有記住帳號 = 點一下直接進入）
}
