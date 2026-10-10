// 所有應用的圖示（DOM-free 字串產生 + 載入失敗時換回預設小圖示）。
// 擴充插件可設定 iconUrl（https 圖片直接連結）；沒設定或圖片載入失敗 → 用預設圖示（拼圖）。
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// 圖示框「裡面」的內容；外層框請加 overflow-hidden
export function appIcon(a, sizeCls) {
  const fb = `${a.icon} ${sizeCls} theme-text-primary`;
  if (a.iconUrl) return `<img data-appicon data-fb="${esc(fb)}" src="${esc(a.iconUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer" class="w-full h-full object-contain">`;
  return `<i class="${esc(fb)}"></i>`;
}

// 畫完 innerHTML 後呼叫：圖片連不上就換回預設圖示
export function fixAppIcons(scope) {
  scope?.querySelectorAll("img[data-appicon]").forEach((im) => {
    im.addEventListener("error", () => { const i = document.createElement("i"); i.className = im.dataset.fb; im.replaceWith(i); }, { once: true });
  });
}
