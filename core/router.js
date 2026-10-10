// 極簡路由：把大廳 / 應用程式 / 服務模組渲染到 #viewOutlet，並處理訪客權限鎖定。
import { state, on, emit } from "./store.js";
import { registerActions } from "./actions.js";
import { renderLobby } from "../components/lobby.js";
import { renderApps } from "../components/apps.js";
import { isEnabled } from "./apps-model.js";
import { showToast } from "./toast.js";
import { requestOpenCard } from "./cards-model.js";

const services = new Map();
let active = null;

export const registerService = (svc) => services.set(svc.id, svc);

export function initRouter() {
  registerActions({
    nav: (el) => {
      requestOpenCard(el.dataset.openCard); // 大廳的圖卡小卡：進入生活圖卡後直接打開那一張（其他按鈕沒有 data-open-card）
      navigate(el.dataset.feature);
      requestOpenCard(null); // 沒進得去（例如訪客被鎖住）就不要留到下次
    },
  });
  on("auth:change", () => navigate(state.route)); // 登入/登出後重新判斷是否鎖定
  on("cloud:ready", () => navigate(state.route)); // 雲端連線完成/重新載入後，用最新資料重畫目前畫面
  const redrawApps = () => {
    if (!isEnabled(state.route)) return navigate("大廳"); // 目前所在的應用剛被停用 → 回大廳
    if (state.route === "應用程式") renderApps(document.getElementById("viewOutlet"), services);
  };
  on("apps:view", redrawApps);   // 格式大小改變
  on("apps:change", redrawApps); // 排序 / 自訂編號 / 擴充插件改變
  on("cloud:change", () => updateBanner()); // 連線狀態改變時更新提示條
}

export function navigate(id = "大廳") {
  if (!isEnabled(id)) { showToast("這個應用已停用，可到「所有應用設定 → 管理應用」重新啟用"); id = "大廳"; }
  const outlet = document.getElementById("viewOutlet");
  if (active) active.unmount?.();
  active = null;
  outlet.innerHTML = "";
  state.route = id;
  document.getElementById("appContainer")?.setAttribute("data-view", id === "應用程式" ? "apps" : id === "家庭公告" ? "notes" : id === "家庭日曆" ? "calendar" : id === "生活圖卡" ? "cards" : id === "換誰洗碗" ? "bowl" : id === "個人記事本" ? "memo" : "");
  emit("route:change", id);

  const svc = services.get(id);
  if (id === "大廳") return renderLobby(outlet, services);
  if (id === "應用程式") return renderApps(outlet, services);
  if (!svc) return renderNotice(outlet, "fa-hammer", id, "這個功能預計在後續階段推出，敬請期待！");
  if (svc.requiresLogin && !state.isLoggedIn) {
    return renderNotice(outlet, "fa-lock", id, "訪客模式無法使用此功能，請先登入 Google 帳號。", true);
  }
  active = svc;
  svc.mount(outlet, { state, on, emit });
  updateBanner();
}

// 服務要用的雲端資料庫還沒連上時，提醒「現在資料不會被保存」
function updateBanner() {
  const outlet = document.getElementById("viewOutlet");
  outlet?.querySelector("[data-cloud-banner]")?.remove();
  // 我的筆記 / 記帳本（storageKey）：只有在「設定 → 儲存位置」選了 Firebase 私人端才需要這個提醒
  const target = active?.storageKey ? (state.storage[active.storageKey] === "private" ? "private" : null) : active?.storage;
  if (!target || !outlet) return;
  const c = state.cloud;
  if (c[target] === "ok") return;
  if (target === "private") {
    // 私人端不用登入也能用：訪客沒設定 / 沒連線時不打擾（本來就只存記憶體）
    if (!state.isLoggedIn && ["off", "unset"].includes(c.private)) return;
  } else if (c.mode !== "google" || !state.isLoggedIn) return;
  const name = target === "server" ? "家庭共用資料庫" : "私人資料庫";
  const why = { loading: "連線中…", unset: "尚未設定 firebaseConfig", error: c.detail?.[target] || "連線失敗", off: "尚未連線" }[c[target]] || "尚未連線";
  const el = document.createElement("div");
  el.dataset.cloudBanner = "";
  el.className = "mx-4 mt-2 mb-1 px-4 py-2.5 rounded-2xl bg-amber-100 text-amber-900 text-sm font-bold flex items-center gap-2";
  el.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i><span class="flex-1">${name}：${why}。目前資料只暫存在這個畫面，重新整理會消失。</span><button data-action="open-settings" data-mode="status" class="underline shrink-0">設定</button>`;
  outlet.insertBefore(el, outlet.firstChild);
}

function renderNotice(el, icon, title, msg, needLogin = false) {
  el.innerHTML = `
    <div class="px-6 py-16 text-center">
      <div class="w-20 h-20 mx-auto rounded-full bg-white dark:bg-slate-800 soft-shadow-md flex items-center justify-center mb-5">
        <i class="fa-solid ${icon} text-3xl theme-text-primary"></i>
      </div>
      <h2 class="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">${title}</h2>
      <p class="text-base text-slate-500 dark:text-slate-400 font-medium leading-relaxed">${msg}</p>
      ${needLogin ? `<button data-action="open-sheet" data-sheet="login" class="mt-6 theme-bg-primary text-white font-bold text-base px-8 py-3 rounded-full soft-shadow-md">登入 Google 帳號</button>` : ""}
    </div>`;
}
