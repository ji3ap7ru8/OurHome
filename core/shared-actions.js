// 跨元件共用的 data-action（開關視窗、登入/登出）。
import { registerActions } from "./actions.js";
import { openSheet, closeSheet, openSettings, closeSettings, openAppsOptions, closeAppsOptions, openCardsOptions, openBowlOptions, closeAll } from "./overlay.js";
import { loginWithGoogle, logout, handleUserHeaderClick } from "./auth.js";

export function initSharedActions() {
  registerActions({
    "open-sheet": (el) => openSheet(el.dataset.sheet || "notification"),
    "close-sheet": () => closeSheet(),
    "open-settings": (el) => openSettings(el.dataset.mode || "all"),
    "close-settings": () => closeSettings(),
    "open-apps-options": () => openAppsOptions(),
    "open-cards-options": () => openCardsOptions(),
    "open-bowl-options": () => openBowlOptions(),
    "close-apps-options": () => closeAppsOptions(),
    "close-all": () => closeAll(),
    "open-login-from-settings": () => openSheet("login"),
    "login-google": () => loginWithGoogle(),
    "logout": () => logout(),
    "header-user": () => handleUserHeaderClick(),
  });
}
