// 底部浮動快捷列（Dock）：依 state.shortcuts 動態渲染
import { availableFeatures } from "../core/config.js";
import { state, on, emit } from "../core/store.js";
import { registerChangeActions } from "../core/actions.js";
import { isEnabled } from "../core/apps-model.js";

const DOCK_ACTIONS = {
  settings: { action: "open-settings", mode: "all" },
  notification: { action: "open-sheet", sheet: "notification" },
  status: { action: "open-settings", mode: "status" },
  logout: { action: "logout" },
};

export function mountDock() {
  registerChangeActions({
    "dock-shortcut": (el) => { if (!updateDockShortcut(Number(el.dataset.index), el.value)) el.value = state.shortcuts[Number(el.dataset.index)]; },
  });
  on("dock:change", renderDock);
  on("apps:change", renderDock); // 管理應用：停用的應用不能用快捷列
  on("route:change", renderDock);
  renderDock();
}

export function setDockVisible(visible) {
  state.dockVisible = !!visible;
  emit("dock:change", [...state.shortcuts]); // 同時觸發重畫與雲端存檔
}

// 規則：5 個快捷至少要有一個「大廳」。回傳 false 代表被擋下（沒有更動）。
export function updateDockShortcut(index, featureId) {
  const cur = state.shortcuts[index];
  const lobbyCount = state.shortcuts.filter((id) => id === "大廳").length;
  if (cur === "大廳" && featureId !== "大廳" && lobbyCount <= 1) return false;
  state.shortcuts[index] = featureId;
  emit("dock:change", [...state.shortcuts]);
  return true;
}

function renderDock() {
  const dock = document.getElementById("dockContainer");
  if (!dock) return;
  dock.innerHTML = "";

  // 快捷列關閉：大廳頁完全不顯示；其他頁只留一個小小的「回大廳」按鈕，避免進了應用後回不去
  const wrap = dock.parentElement;
  const app = document.getElementById("appContainer");
  const off = state.dockVisible === false;
  const lobby = state.route === "大廳";
  wrap.classList.toggle("flex", off);
  wrap.classList.toggle("justify-center", off);
  wrap.hidden = off && lobby;
  app?.style.setProperty("--dock-pad", off && lobby ? "1.5rem" : "5rem");
  if (off) {
    if (!lobby) {
      const back = document.createElement("button");
      back.dataset.action = "nav";
      back.dataset.feature = "大廳";
      back.className = "flex items-center gap-1.5 px-1 text-sm font-bold theme-text-primary active:scale-95 transition-all";
      back.innerHTML = '<i class="fa-solid fa-house text-base"></i><span>回大廳</span>';
      dock.appendChild(back);
    }
    return;
  }

  state.shortcuts.forEach((featureId) => {
    if (!isEnabled(featureId)) return; // 已停用的應用：快捷列不顯示（設定仍保留，重新啟用後自動回來）
    const feat =
      availableFeatures.find((f) => f.id === featureId) ||
      { id: featureId, name: featureId, icon: "fa-regular fa-square", action: "normal" };

    const button = document.createElement("button");
    const isActive = featureId === state.route;
    button.className =
      "flex flex-col items-center justify-center transition-all w-12 " +
      (isActive ? "theme-text-primary" : "text-slate-400 dark:text-slate-400 hover:text-slate-600");

    Object.assign(button.dataset, DOCK_ACTIONS[feat.action] || {});
    if (["active", "normal", "service"].includes(feat.action)) {
      button.dataset.action = "nav";
      button.dataset.feature = featureId;
    }

    button.innerHTML = `
      <i class="${feat.icon} text-base"></i>
      <span class="text-[10px] ${isActive ? "font-bold" : "font-medium"} mt-0.5">${feat.name}</span>
    `;
    dock.appendChild(button);
  });
}
