// 右側滑出式系統設定視窗：網頁狀態 / 個人化 / 資料管理
import { settingsPanelTemplate } from "./settings-panel.template.js";
import { availableFeatures, FONT_SCALE } from "../core/config.js";
import { state, on } from "../core/store.js";
import { registerActions, registerInputActions, registerChangeActions } from "../core/actions.js";
import { setAppTheme, setThemeColor, setFontScale, stepFontSize } from "../core/theme.js";
import { fillAvatar } from "../core/avatar.js";
import { initAccordion, setAccordionOpen } from "../core/accordion.js";
import { isEnabled } from "../core/apps-model.js";
import { updateDockShortcut, setDockVisible } from "./dock.js";
import { mountLobbySettings } from "./lobby-settings.js";
import { setNickname, effectiveNickname } from "../core/nickname.js";
import { openAdminVerify } from "../core/overlay.js";
import { lockAdmin } from "../core/admin.js";
import { showToast } from "../core/toast.js";
import { mountLineBotIds } from "./line-bot-ids.js";
import { setAutoLogin } from "../core/autologin.js";
import { setTips } from "../core/tips.js";

const $ = (id) => document.getElementById(id);

const THEME_BTN_BASE =
  "py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all";
const THEME_BTN_ACTIVE =
  "py-2 rounded-xl border theme-border-primary theme-bg-light theme-text-primary text-xs font-bold flex items-center justify-center gap-1.5 transition-all";

export function mountSettingsPanel(mountEl) {
  mountEl.innerHTML = settingsPanelTemplate;
  initAccordion();
  mountLobbySettings();

  registerActions({
    "set-theme": (el) => setAppTheme(el.dataset.theme),
    "set-color": (el) => {
      const { primary, light, dark, name } = el.dataset;
      setThemeColor(primary, light, dark, name);
    },
    "font-step": (el) => stepFontSize(Number(el.dataset.delta)),
    "admin-open-verify": () => (state.isLoggedIn ? openAdminVerify() : showToast("請先登入 Google 帳號才能使用管理員功能")),
    "admin-lock": () => lockAdmin(),
    "shortcut-pick": (el) => openShortcutPicker(Number(el.dataset.index)),
    "nickname-reset": () => { setNickname(""); renderNickname(true); }, // 回到預設：Google 帳號名稱
  });
  registerChangeActions({
    "dock-visible": (el) => setDockVisible(el.checked),
    tips: (el) => { setTips(el.checked); showToast(el.checked ? "已開啟操作提示說明" : "已關閉操作提示說明"); },
    "auto-login": (el) => {
      if (!state.isLoggedIn) { el.checked = false; return showToast("請先登入 Google 帳號才能開啟自動登入"); }
      setAutoLogin(el.checked);
      showToast(el.checked ? "已開啟自動登入：之後進入網頁不用重新登入" : "已關閉自動登入：之後每次進入都要登入");
    },
  });
  registerInputActions({
    "font-scale": (el) => setFontScale(el.value),
    nickname: (el) => setNickname(el.value),
  });

  mountLineBotIds();
  renderShortcutSlots();
  on("overlay:change", ({ settings }) => renderOpenState(settings));
  on("auth:change", renderAuth);
  on("auth:change", renderAutoLogin);
  on("autologin:change", renderAutoLogin);
  on("tips:change", renderTips);
  on("auth:change", paintAdmin);
  on("admin:change", paintAdmin);
  on("nickname:change", () => renderNickname(false));
  on("theme:change", renderTheme);
  on("dock:change", () => { renderShortcutSlots(); refreshShortcutPicker(); });
  on("apps:change", renderShortcutSlots); // 管理應用：停用的應用不能選

  paintAdmin();
  renderAutoLogin();
  renderAuth({ isLoggedIn: state.isLoggedIn });
  renderTheme(state.theme);
  renderNickname(true);
}

/* ---------- 開關與顯示模式 ---------- */
let lastMode = null;
function renderOpenState(mode) {
  const page = $("settingsPage");
  if (!page) return;
  if (mode === lastMode) return; // 管理員驗證視窗開關也會觸發 overlay:change，設定視窗沒變就不要重畫（卡片會被收合）
  lastMode = mode;

  if (!mode) {
    lockAdmin(); // 關閉設定視窗 → 管理員功能重新上鎖
    page.classList.remove("translate-x-0");
    page.classList.add("translate-x-full");
    return;
  }

  const cardStatus = $("cardStatus");
  const cardPersonal = $("cardPersonal");
  const cardStorage = $("cardStorage");
  const cardData = $("cardData");
  const cardBackup = $("cardBackup");
  const cardAdmin = $("cardAdmin");
  const cardLobby = [$("cardLobbyShow"), $("cardLobbyOrder")];
  const privacy = $("privacyNotice");
  const headerTitle = $("settingsHeaderTitle");
  const headerIcon = $("settingsHeaderIcon");

  $("settingsLogoutBox").classList.toggle("hidden", !state.isLoggedIn);

  const setHeader = (title, icon) => {
    headerTitle.innerText = title;
    headerIcon.className = `${icon} text-base theme-text-primary`;
  };
  $("settingsGearBtn")?.classList.toggle("hidden", mode !== "personal"); // 大廳設定：取消鈕左邊的齒輪 → 系統設定
  page.querySelectorAll('[data-only="system"]').forEach((el) => el.classList.toggle("hidden", mode === "personal")); // 大廳設定不含個人化功能
  const pt = $("personalTitle"); if (pt) pt.textContent = mode === "personal" ? "大廳設定" : "個人化";
  const pd = $("personalDesc"); if (pd) pd.textContent = mode === "personal" ? "操作提示與底部快捷功能" : "主題、主色調、字體與介面排版";
  const show = (el, visible) => el.classList.toggle("hidden", !visible);
  const setCard = (key, expanded) => setAccordionOpen(key, expanded);

  if (mode === "personal") {
    setHeader("大廳設定", "fa-solid fa-palette");
    show(cardStatus, false); show(cardStorage, false); show(cardData, false); show(cardBackup, false); show(cardAdmin, false); show(privacy, false); show(cardPersonal, false); cardLobby.forEach((c) => c && show(c, true)); // 大廳設定：顯示管理 + 大廳排序
  } else if (mode === "status") {
    setHeader("網頁狀態", "fa-solid fa-server");
    show(cardStatus, true); show(privacy, true); show(cardPersonal, false); show(cardStorage, false); show(cardData, false); show(cardBackup, false); show(cardAdmin, false);
    cardLobby.forEach((c) => c && show(c, false));
  } else {
    setHeader("系統設定", "fa-solid fa-gear");
    show(cardStatus, true); show(privacy, true); show(cardPersonal, true); show(cardStorage, true); show(cardData, true); show(cardBackup, true); show(cardAdmin, true);
    cardLobby.forEach((c) => c && show(c, false));
    setCard("personal", false);
    setCard("storage", false);
    setCard("data", false);
    setCard("backup", false);
    setCard("admin", false);
  }

  page.classList.remove("translate-x-full");
  page.classList.add("translate-x-0");
}

/* ---------- 管理員卡片：上鎖 / 解鎖 ---------- */
function paintAdmin() {
  const unlocked = !!state.adminUnlocked && state.isLoggedIn;
  $("adminLocked")?.classList.toggle("hidden", unlocked);
  const entry = $("adminContent");
  if (entry) { entry.classList.toggle("hidden", !unlocked); entry.classList.toggle("flex", unlocked); }
  $("adminUnlockedBar")?.classList.toggle("hidden", !unlocked);
  const btn = $("adminVerifyBtn");
  if (btn) btn.disabled = !state.isLoggedIn;
  const hint = $("adminLockHint");
  if (hint) {
    hint.textContent = state.isLoggedIn ? "請按〔驗證〕並輸入管理員密碼才能使用。" : "未登入 Google 帳號，禁止使用。請先登入帳號，再輸入管理員密碼。";
    hint.className = "text-[10px] leading-relaxed " + (state.isLoggedIn ? "text-slate-400" : "text-rose-500 font-bold");
  }
}

/* ---------- 暱稱 ---------- */
// 輸入框顯示「目前生效的暱稱」；沒自訂時就是 Google 帳號名稱。正在輸入時不覆寫，避免游標跳掉。
function renderNickname(force) {
  const input = $("nicknameInput");
  const btn = $("nicknameResetBtn");
  if (!input || !btn) return;
  const on = state.isLoggedIn;
  input.disabled = false; // 訪客也能改暱稱：私人端依暱稱分區，用同一個暱稱就能讀回資料
  btn.disabled = on ? !effectiveNickname() : false;
  btn.textContent = on ? "預設Google名稱" : "重新隨機";
  input.placeholder = on ? "" : "訪客暱稱";
  const note = $("nicknameNote");
  if (note) note.textContent = on
    ? "大廳會顯示「Google帳號(暱稱)」，設定會同步儲存到你的 Google 雲端硬碟。私人端的我的筆記、記帳本也依這個暱稱分區。"
    : "訪客暱稱每次進入會隨機產生；私人端依暱稱分區儲存全部設定與資料，下次輸入同一個暱稱即可讀回。";
  if (force || document.activeElement !== input) input.value = on ? (effectiveNickname() || state.account?.name || "") : state.nickname;
}

/* ---------- 登入狀態連動 ---------- */
function renderAuth({ isLoggedIn, account }) {
  const gStatus = $("gdriveStatusBadge");
  $("gdriveGuestBox").classList.toggle("hidden", isLoggedIn);
  $("gdriveUserBox").classList.toggle("hidden", !isLoggedIn);
  $("settingsLogoutBox").classList.toggle("hidden", !isLoggedIn);

  if (account) {
    fillAvatar($("gdriveAvatar"), account);
    $("gdriveName").innerText = account.name || "";
    $("gdriveEmail").innerText = account.email || "";
  } else {
    $("gdriveAvatar").innerHTML = '<i class="fa-solid fa-circle-check text-xs"></i>';
    $("gdriveName").innerText = "";
    $("gdriveEmail").innerText = "";
  }
  renderNickname(true);
  gStatus.innerText = isLoggedIn ? "已連結帳號" : "訪客模式"; // 雲端同步中的文字由 cloud-settings.js 接手覆蓋
  gStatus.className = isLoggedIn
    ? "text-[10px] text-emerald-600 dark:text-emerald-400 font-bold"
    : "text-[10px] text-slate-400";


  const lock = $("firebaseServerBadge");
  lock.innerHTML = isLoggedIn
    ? '<i class="fa-solid fa-lock-open text-[9px] text-emerald-500"></i> 已解鎖'
    : '<i class="fa-solid fa-lock text-[9px]"></i> 需登入帳號';
  lock.className = isLoggedIn
    ? "text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1"
    : "text-[10px] text-slate-400 font-bold flex items-center gap-1";
}

/* ---------- 主題 / 色調 / 字體連動 ---------- */
function renderTheme(theme) {
  const ids = { light: "themeLightBtn", dark: "themeDarkBtn", system: "themeSystemBtn" };
  Object.entries(ids).forEach(([mode, id]) => {
    $(id).className = theme.mode === mode ? THEME_BTN_ACTIVE : THEME_BTN_BASE;
  });

  $("colorSwatchName").innerText = theme.colorName;
  document.querySelectorAll('[data-action="set-color"]').forEach((btn) => {
    const selected = btn.dataset.name === theme.colorName;
    btn.classList.remove("ring-sky-500");
    btn.classList.toggle("ring-2", selected);
    btn.classList.toggle("ring-offset-2", selected);
    btn.classList.toggle("dark:ring-offset-slate-800", selected);
    if (selected) btn.style.setProperty("--tw-ring-color", btn.dataset.primary);
    else btn.style.removeProperty("--tw-ring-color");
  });

  const val = theme.fontScale;
  let label = val + "%";
  if (val === FONT_SCALE.default) label += " (標準)";
  else if (val >= 130) label += " (長輩清晰)";
  else if (val <= 85) label += " (精簡)";
  $("fontScaleLabel").innerText = label;
  $("fontSizeRange").value = val;
}

function renderTips() {
  const t = $("tipsToggle");
  if (t) t.checked = state.tips !== false;
}

function renderAutoLogin() {
  const t = $("autoLoginToggle");
  if (t) t.checked = !!state.autoLogin;
}

/* ---------- 底欄快捷功能：5 個格子 + 選擇面板 ---------- */
const featureOf = (id) =>
  availableFeatures.find((f) => f.id === id) || { id, name: id, icon: "fa-regular fa-square" };

function renderShortcutSlots() {
  const toggle = $("dockVisibleToggle");
  if (toggle) toggle.checked = state.dockVisible !== false;
  for (let i = 0; i < 5; i++) {
    const slot = $(`selectShortcut${i}`);
    if (!slot) continue;
    const feat = featureOf(state.shortcuts[i]);
    const off = !isEnabled(feat.id);
    slot.title = `第 ${i + 1} 格：${feat.name}（點一下更換）`;
    slot.classList.toggle("opacity-50", state.dockVisible === false); // 快捷列關閉時：格子變淡，仍可先設定好
    slot.innerHTML = `
      <span class="text-[9px] text-slate-400 font-normal leading-none">${i + 1}</span>
      <i class="${feat.icon} text-base theme-text-primary ${off ? "opacity-40" : ""}"></i>
      <span class="text-[10px] font-bold leading-tight ${off ? "text-slate-400" : "text-slate-700 dark:text-slate-200"}">${feat.name}</span>
      <i class="fa-solid fa-chevron-down text-[8px] text-slate-400"></i>`;
  }
}

let pickerIndex = -1;
const HINT_TEXT = "5 個快捷至少要保留一個「大廳」";

const reducedMotion = () => !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

function closeShortcutPicker() {
  const el = document.getElementById("shortcutPicker");
  document.removeEventListener("keydown", onPickerKey);
  pickerIndex = -1;
  if (!el) return;
  el.removeAttribute("id"); // 動畫收起期間若又打開新面板，不要互相搶 id
  el.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
  el.style.pointerEvents = "none";
  const [backdrop, sheet] = el.children;
  if (reducedMotion() || !el.animate) return el.remove();
  backdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: "ease-in", fill: "forwards" });
  const anim = sheet.animate([{ transform: "translateY(0)" }, { transform: "translateY(100%)" }], { duration: 220, easing: "ease-in", fill: "forwards" });
  anim.onfinish = () => el.remove();
  setTimeout(() => el.remove(), 400); // 保險：動畫沒觸發完成事件也會移除
}
const onPickerKey = (e) => { if (e.key === "Escape") closeShortcutPicker(); };

function pickerTiles() {
  const current = state.shortcuts[pickerIndex];
  return availableFeatures.map((f, k) => {
    const selected = f.id === current;
    const off = !isEnabled(f.id) && !selected; // 已停用的不能新選
    const cls = selected
      ? "theme-border-primary theme-bg-light theme-text-primary"
      : "border-transparent bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-200";
    return `<button type="button" data-pick="${k}" ${off ? "disabled" : ""}
      class="relative flex flex-col items-center justify-center gap-1 py-3 rounded-2xl border-2 ${cls} ${off ? "opacity-40" : "active:scale-95"} transition-all">
      <i class="${f.icon} text-xl"></i>
      <span class="text-[11px] font-bold leading-tight">${f.name}</span>
      ${off ? '<span class="text-[9px] text-slate-400 leading-none">已停用</span>' : ""}
      ${selected ? '<i class="fa-solid fa-circle-check absolute top-1.5 right-1.5 text-[11px]"></i>' : ""}
    </button>`;
  }).join("");
}

function refreshShortcutPicker() {
  const grid = document.getElementById("shortcutPickerGrid");
  if (grid && pickerIndex >= 0) grid.innerHTML = pickerTiles();
}

function openShortcutPicker(index) {
  closeShortcutPicker();
  const host = document.getElementById("appContainer");
  if (!host) return;
  pickerIndex = index;
  const wrap = document.createElement("div");
  wrap.id = "shortcutPicker";
  wrap.className = "absolute inset-0 z-[80] flex items-end";
  wrap.innerHTML = `
    <div data-close class="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"></div>
    <div class="relative w-full max-h-[85%] overflow-y-auto bg-[#fcfbf9] dark:bg-slate-900 rounded-t-[28px] px-4 pt-4 soft-shadow-lg border-t border-slate-200/60 dark:border-slate-800"
         style="padding-bottom: calc(1.25rem + env(safe-area-inset-bottom, 0px))">
      <div class="flex items-center justify-between mb-1">
        <h3 class="text-base font-black text-slate-800 dark:text-slate-100">第 ${index + 1} 格快捷功能</h3>
        <button type="button" data-close aria-label="關閉" class="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <p id="shortcutPickerHint" class="text-[11px] text-slate-400 mb-3">${HINT_TEXT}</p>
      <div id="shortcutPickerGrid" class="grid grid-cols-4 gap-2">${pickerTiles()}</div>
    </div>`;
  wrap.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) return closeShortcutPicker();
    const btn = e.target.closest("[data-pick]");
    if (!btn || btn.disabled) return;
    const next = availableFeatures[Number(btn.dataset.pick)].id;
    if (updateDockShortcut(pickerIndex, next)) return closeShortcutPicker();
    const hint = document.getElementById("shortcutPickerHint"); // 不符合規則：在面板內提示，不關閉
    if (hint) {
      hint.textContent = "不能換掉：5 個快捷至少要保留一個「大廳」，請先把別格改成「大廳」。";
      hint.className = "text-[12px] font-bold text-rose-500 mb-3";
    }
  });
  host.appendChild(wrap);
  document.addEventListener("keydown", onPickerKey);
  if (!reducedMotion() && wrap.animate) { // 彈出效果：背景淡入 + 面板由下往上滑出（微彈性）
    const [backdrop, sheet] = wrap.children;
    backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: "ease-out" });
    sheet.animate([{ transform: "translateY(100%)" }, { transform: "translateY(0)" }], { duration: 340, easing: "cubic-bezier(.22,1.2,.36,1)" });
  }
}
