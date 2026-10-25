// LINE推播 — 做出圖卡，再用 LINE Bot 發送通知。
// 目前只有空白頁（內部功能尚未開發）；預設關閉，要到 ︙ 所有應用設定 → 管理應用 開啟後才會出現在所有應用。
import { closeTips } from "../../core/tips.js";

let root = null;

function render() {
  root.innerHTML = `
    <div class="px-5 pt-1 pb-6 space-y-4">
      <p class="rounded-2xl border-2 border-dashed text-center text-sm font-bold py-3 px-4 leading-relaxed" style="border-color:#06c75566;color:#047a37;background:#ffffffb3"><i class="fa-solid fa-hammer mr-1"></i>功能開發中</p>
    </div>`;
}

export default {
  id: "LINE推播",
  access: "public",
  mount(el) {
    root = document.createElement("div");
    root.className = "min-h-full";
    el.appendChild(root);
    render();
  },
  unmount() { closeTips(); root?.remove(); root = null; },
};
