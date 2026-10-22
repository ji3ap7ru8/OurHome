// 系統提示框（共用模板）：全站所有提示（自動登入提醒、儲存成功、錯誤訊息…）都用這一個樣式。
// 顏色跟著「主題色」(--primary-color) 與深色模式走，不再各自寫死黑 / 琥珀色。
//   showNotice({ msg, title?, icon?, button?, ms?, pos?, error?, sticky? })
//     msg    內文；title 有給時，title 是粗體標題、msg 是說明
//     icon   Font Awesome class（預設：一般 fa-circle-info、錯誤 fa-triangle-exclamation）
//     button 有給就顯示按鈕（例如「了解」），按了關閉；onClick 可另外接 returned.el
//     ms     停留毫秒（預設 3200）；sticky=true 不自動消失（要自己呼叫 close / finish）
//     pos    "top"（預設）或 "bottom"（算機、翻譯機這類底部有快捷列的畫面）
//     error  true = 錯誤色（紅）
//   回傳 { el, close(), finish(ms?) }：finish = 再停留 ms 後關閉（預設 3000）
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let current = null; // 同一時間只留一個一般提示，新的取代舊的（避免疊成一排）

export function showNotice({ msg = "", title = "", icon = "", button = "", ms = 3200, pos = "top", error = false, sticky = false, key = "" } = {}) {
  const dark = document.getElementById("appContainer")?.classList.contains("dark");
  const el = document.createElement("div");
  el.setAttribute("role", error ? "alert" : "status");
  el.className = `sys-notice sys-notice--${pos}${error ? " sys-notice--err" : ""}${dark ? " dark" : ""}`;
  const ic = icon || (error ? "fa-solid fa-triangle-exclamation" : "fa-solid fa-circle-info");
  el.innerHTML =
    `<i class="${esc(ic)} sys-notice__icon"></i>` +
    `<span class="sys-notice__text">${title ? `<b class="sys-notice__title">${esc(title)}</b>` : ""}${title && msg ? "<br>" : ""}${msg ? `<span class="${title ? "sys-notice__msg" : ""}">${esc(msg)}</span>` : ""}</span>` +
    (button ? `<button type="button" data-tip="sys-notice-ok" class="sys-notice__btn">${esc(button)}</button>` : "");
  const same = key || "toast";
  if (!sticky && !button && current && current.key === same) current.close();
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("is-in"));

  let timer = null, closed = false;
  const close = () => {
    if (closed) return; closed = true; clearTimeout(timer);
    if (current && current.el === el) current = null;
    el.classList.remove("is-in");
    setTimeout(() => el.remove(), 300);
  };
  const finish = (t = 3000) => { clearTimeout(timer); timer = setTimeout(close, t); };
  el.querySelector("button")?.addEventListener("click", close);
  if (!sticky) finish(ms);
  if (!button && !sticky) current = { el, key: same, close };
  return { el, close, finish };
}
