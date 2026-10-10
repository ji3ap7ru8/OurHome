// 浮動狀態小膠囊：計時器 / 碼表在背景執行時，顯示在 Dock 上方，點一下回到該服務。
// 只在「不在該服務頁面」時顯示。必須掛在 #appContainer 內才會套用深色模式。
import { state, on } from "./store.js";

const chips = new Map(); // id -> { el, textEl, route, text }
let box = null;

function ensureBox() {
  if (box && box.isConnected) return box;
  box = document.createElement("div");
  box.className = "absolute left-0 right-0 bottom-24 z-20 flex flex-col items-center gap-2 pointer-events-none";
  document.getElementById("appContainer").appendChild(box);
  return box;
}

function syncVisibility() {
  chips.forEach((c) => c.el.classList.toggle("hidden", state.route === c.route));
}

export function setChip(id, data) {
  const old = chips.get(id);
  if (!data) {
    if (old) {
      old.el.remove();
      chips.delete(id);
    }
    return;
  }
  if (old) {
    if (old.text !== data.text) {
      old.textEl.textContent = data.text;
      old.text = data.text;
    }
    old.el.classList.toggle("opacity-70", !!data.dim);
    return;
  }
  const el = document.createElement("button");
  el.type = "button";
  el.setAttribute("aria-label", data.aria || data.text);
  el.className =
    "pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full theme-bg-primary text-white font-black text-base soft-shadow-md active:scale-95 transition";
  el.innerHTML = `<i class="${data.icon}"></i><span class="tabular-nums"></span>`;
  const textEl = el.querySelector("span");
  textEl.textContent = data.text;
  el.addEventListener("click", data.onClick);
  ensureBox().appendChild(el);
  chips.set(id, { el, textEl, route: data.route, text: data.text });
  syncVisibility();
}

on("route:change", syncVisibility);
