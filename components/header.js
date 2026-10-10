// 頂部列：帳號徽章、提醒鈴鐺、個人化按鈕（「應用程式」頁改為 ︙ 所有應用設定）
import { headerTemplate } from "./header.template.js";
import { on, emit, state } from "../core/store.js";
import { fillAvatar } from "../core/avatar.js";
import { displayName } from "../core/nickname.js";
import { registerActions } from "../core/actions.js";
import { openCalendarId } from "../core/overlay.js";

export function mountHeader(mountEl) {
  mountEl.innerHTML = headerTemplate;
  registerActions({ "open-calendar-id": () => openCalendarId(), "calendar-today": () => emit("calendar:today"), "bowl-overwrite": () => emit("bowl:overwrite") }); // 家庭日曆的 ︙ ID設定、回到今天
  on("auth:change", renderAccount);
  on("nickname:change", () => renderAccount({ isLoggedIn: state.isLoggedIn, account: state.account }));
  on("route:change", renderRoute);
  renderAccount({ isLoggedIn: state.isLoggedIn, account: state.account });
  renderRoute(state.route);
}

// 「應用程式」頁：不顯示訪客/使用者，個人化（調色盤）按鈕換成 ︙ 所有應用設定
function renderRoute(id) {
  const apps = id === "應用程式";
  const notes = id === "家庭公告";
  const cards = id === "生活圖卡"; // 生活圖卡頁：不顯示大頭貼 / 名稱 / 信箱，個人化（調色盤）換成 ︙ 生活圖卡設定
  const cal = id === "家庭日曆"; // 家庭日曆頁：不顯示大頭貼 / 名稱 / 信箱，個人化（調色盤）換成 ︙ ID設定
  const bowl = id === "換誰洗碗";
  const memo = id === "個人記事本"; // 我的筆記頁：不顯示大頭貼 / 名稱 / 信箱，左側改放「我的筆記」標題，右側多一個儲存位置下拉選單 // 換誰洗碗頁：不顯示大頭貼 / 名稱 / 信箱，個人化（調色盤）換成 ︙ 換誰洗碗設定
  document.getElementById("headerUser")?.classList.toggle("hidden", apps || notes || cal || cards || bowl || memo);
  document.getElementById("headerPaletteBtn")?.classList.toggle("hidden", apps || notes || cal || cards || bowl || memo);
  const mt = document.getElementById("headerMemoTitle");
  mt?.classList.toggle("hidden", !memo);
  mt?.classList.toggle("flex", memo);
  const bb = document.getElementById("headerBowlBtn");
  bb?.classList.toggle("hidden", !bowl);
  bb?.classList.toggle("flex", bowl);
  const bs = document.getElementById("headerBowlSaveBtn");
  bs?.classList.toggle("hidden", !bowl);
  bs?.classList.toggle("flex", bowl);
  const bt = document.getElementById("headerBowlTitle");
  bt?.classList.toggle("hidden", !bowl);
  bt?.classList.toggle("flex", bowl);
  const cb = document.getElementById("headerCardsBtn");
  cb?.classList.toggle("hidden", !cards);
  cb?.classList.toggle("flex", cards);
  const idb = document.getElementById("headerIdBtn");
  idb?.classList.toggle("hidden", !cal);
  idb?.classList.toggle("flex", cal);
  const ct = document.getElementById("headerCardsTitle");
  ct?.classList.toggle("hidden", !cards);
  ct?.classList.toggle("flex", cards);
  const cs = document.getElementById("headerCalSlot");
  cs?.classList.toggle("hidden", !cal);
  cs?.classList.toggle("flex", cal);
  const tb = document.getElementById("headerTodayBtn");
  tb?.classList.toggle("hidden", !cal);
  tb?.classList.toggle("flex", cal);
  const nt = document.getElementById("headerNotesTitle");
  nt?.classList.toggle("hidden", !notes);
  nt?.classList.toggle("flex", notes);
  const manage = notes && state.isLoggedIn; // 訪客看不到公告，也就不顯示管理
  const mb = document.getElementById("headerManageBtn");
  mb?.classList.toggle("hidden", !manage);
  mb?.classList.toggle("flex", manage);
  const title = document.getElementById("headerTitle");
  title?.classList.toggle("hidden", !apps);
  title?.classList.toggle("flex", apps);
  const more = document.getElementById("headerMoreBtn");
  more?.classList.toggle("hidden", !apps);
  more?.classList.toggle("flex", apps);
}

function renderAccount({ isLoggedIn, account }) {
  const avatar = document.getElementById("userAvatar");
  const name = document.getElementById("userName");
  const status = document.getElementById("userStatus");
  if (!avatar || !name || !status) return;

  if (isLoggedIn) {
    if (account) fillAvatar(avatar, account);
    else avatar.innerHTML = '<i class="fa-solid fa-user-check text-emerald-400"></i>';
    name.innerText = displayName(account);
    status.innerText = account ? account.email : "";
  } else {
    avatar.replaceChildren();
    avatar.innerHTML = '<i class="fa-solid fa-user-large"></i>';
    name.innerText = "訪客";
    status.innerText = "未登入 Google 帳號";
  }
}
