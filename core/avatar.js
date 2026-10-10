// 帳號頭貼：有 Google 頭貼就顯示圖片；沒有或載入失敗時，退回名字第一個字。
// 一律用 DOM API 建立元素（不拼 innerHTML），避免名稱含特殊字元造成注入。
export function initialOf(account) {
  const s = String(account?.name || account?.email || "").trim();
  return s ? Array.from(s)[0].toUpperCase() : "?";
}

const safeUrl = (u) => /^https:\/\//i.test(String(u || "")) ? u : "";

export function fillAvatar(el, account) {
  if (!el) return;
  el.replaceChildren();
  const fallback = () => { el.replaceChildren(); el.textContent = initialOf(account); };
  const url = safeUrl(account?.picture);
  if (!url) return fallback();
  const img = document.createElement("img");
  img.alt = account?.name || "";
  img.referrerPolicy = "no-referrer"; // Google 頭貼網址在帶 referrer 時偶爾會 403
  img.className = "w-full h-full object-cover";
  img.onerror = fallback;
  img.src = url;
  el.appendChild(img);
}
