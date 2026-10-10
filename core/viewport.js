// 手機高度備援：只有「不支援 100dvh」的舊瀏覽器 / 舊 WebView 才會啟用
// 量測實際可視高度寫入 --app-h，視窗大小改變或轉向時更新
export function initViewport() {
  if (window.CSS && CSS.supports && CSS.supports("height", "100dvh")) return; // 支援就交給 CSS
  const root = document.documentElement;
  const set = () => {
    const h = Math.round(window.innerHeight);
    if (h > 0) root.style.setProperty("--app-h", h + "px");
  };
  root.classList.add("vh-js");
  set();
  window.addEventListener("resize", set);
  window.addEventListener("orientationchange", () => setTimeout(set, 200));
}
