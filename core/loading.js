// 載入中遮罩：登入等會卡一下的動作用 showLoading() / hideLoading()；啟動畫面用 hideSplash()。
// 樣式（.oh-spinner）內嵌在 index.html，不依賴其他檔案。
let count = 0;
let el = null;

export function showLoading(text = "載入中...") {
  count++;
  if (!el) {
    el = document.createElement("div");
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.className = "fixed inset-0 z-[90] flex flex-col items-center justify-center gap-3 bg-slate-900/45 backdrop-blur-[2px] text-white font-bold text-sm";
    el.innerHTML = '<div class="oh-spinner"></div><div data-role="text"></div>';
    document.body.appendChild(el);
  }
  el.querySelector('[data-role="text"]').textContent = text;
}

// 載入中遮罩開著時，換掉底下的說明文字（例如「登出中…」→「清除資料中…」）
export function setLoadingText(text) {
  el?.querySelector('[data-role="text"]')?.replaceChildren(document.createTextNode(text));
}

export function hideLoading() {
  count = Math.max(0, count - 1);
  if (count === 0 && el) { el.remove(); el = null; }
}

export function hideSplash() {
  const s = document.getElementById("appSplash");
  if (!s) return;
  // 等兩個畫面幀，讓大廳先畫好再淡出，避免閃一下空白
  requestAnimationFrame(() => requestAnimationFrame(() => {
    s.classList.add("hide");
    setTimeout(() => s.remove(), 300);
  }));
}
