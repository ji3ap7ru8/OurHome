// 懸浮瀏覽視窗：在本站內用 iframe 開啟外部網址（擴充插件「懸浮視窗」模式使用）。
// 「無痕」盡力而為：iframe 加 credentialless（Chrome / Edge 110+ 會用全新的暫存儲存空間、不帶既有登入）、
// 不送 Referrer、不允許對方導走本頁；關閉視窗時清空 iframe。Safari / Firefox 不支援 credentialless，仍會不送 Referrer。
// 限制：對方網站若禁止被嵌入（X-Frame-Options / CSP frame-ancestors），畫面會空白或顯示「拒絕連線」，
// 瀏覽器不會告訴網頁這件事，所以視窗上永遠留著「新分頁開啟」按鈕當備案。
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const DOCK_SPACE = 92; // 預留底部 dock 的高度（px）
const MARGIN = 8;

let win = null;
let onEsc = null;

// Google 首頁預設禁止嵌入；「webhp?igu=1」是 Google 自己留給 iframe 的入口（未實測，若失效請改用新分頁）
function frameUrl(url) {
  try {
    const u = new URL(url);
    if (/^(www\.)?google\.com$/i.test(u.hostname) && (u.pathname === "/" || u.pathname === "") && !u.search) {
      u.pathname = "/webhp";
      u.searchParams.set("igu", "1");
      return u.href;
    }
  } catch { /* 用原網址 */ }
  return url;
}

export function closeBrowserWindow() {
  if (!win) return;
  const f = win.querySelector("iframe");
  if (f) f.src = "about:blank"; // 清掉頁面，不留任何狀態
  win.remove();
  win = null;
  if (onEsc) document.removeEventListener("keydown", onEsc);
  onEsc = null;
}

export function openBrowserWindow({ title = "", url }) {
  if (!url) return;
  closeBrowserWindow();
  const vw = window.innerWidth, vh = window.innerHeight;
  const w = Math.min(vw - MARGIN * 2, 460);
  const h = Math.min(Math.round((vh - DOCK_SPACE) * 0.82), 660);
  const geo = { w, h, x: Math.round((vw - w) / 2), y: Math.max(MARGIN, Math.round((vh - DOCK_SPACE - h) / 2)) };
  let maxed = false;
  let saved = null;

  win = document.createElement("div");
  win.className = "fwin";
  win.setAttribute("role", "dialog");
  win.setAttribute("aria-label", title || url);
  win.innerHTML = `
    <div class="fwin-head" data-fw="drag">
      <i class="fa-solid fa-user-secret fwin-ico" title="無痕瀏覽"></i>
      <span class="fwin-title">${esc(title || url)}</span>
      <button type="button" data-fw="reload" aria-label="重新整理" class="fwin-btn"><i class="fa-solid fa-rotate-right"></i></button>
      <button type="button" data-fw="newtab" aria-label="用新分頁開啟" class="fwin-btn"><i class="fa-solid fa-arrow-up-right-from-square"></i></button>
      <button type="button" data-fw="max" aria-label="放大／縮小" class="fwin-btn"><i class="fa-solid fa-expand"></i></button>
      <button type="button" data-fw="close" aria-label="關閉" class="fwin-btn fwin-x"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="fwin-note">無痕模式：關閉視窗就清除。若畫面空白或顯示拒絕連線，是對方網站不允許嵌入，請按右上「↗」用新分頁開啟。</div>
    <iframe class="fwin-frame" title="${esc(title || url)}" referrerpolicy="no-referrer" allow="clipboard-write; fullscreen"
      sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads"></iframe>
    <div class="fwin-grip" data-fw="resize" aria-hidden="true"></div>`;
  const frame = win.querySelector("iframe");
  frame.setAttribute("credentialless", ""); // 先設屬性再給網址，才會套用
  frame.src = frameUrl(url);
  document.body.appendChild(win);

  const apply = () => {
    win.style.left = geo.x + "px"; win.style.top = geo.y + "px";
    win.style.width = geo.w + "px"; win.style.height = geo.h + "px";
  };
  const clamp = () => {
    geo.x = Math.min(Math.max(geo.x, MARGIN - geo.w + 80), window.innerWidth - 80);
    geo.y = Math.min(Math.max(geo.y, MARGIN), window.innerHeight - DOCK_SPACE - 40);
  };
  apply();

  const toggleMax = () => {
    maxed = !maxed;
    if (maxed) {
      saved = { ...geo };
      Object.assign(geo, { x: MARGIN, y: MARGIN, w: window.innerWidth - MARGIN * 2, h: window.innerHeight - DOCK_SPACE - MARGIN });
    } else Object.assign(geo, saved);
    win.querySelector('[data-fw="max"] i').className = maxed ? "fa-solid fa-compress" : "fa-solid fa-expand";
    apply();
  };

  // 拖曳標題列移動、拖曳右下角縮放（拖曳時暫時關掉 iframe 的指標事件，避免滑鼠被網頁吃掉）
  let drag = null;
  win.addEventListener("pointerdown", (e) => {
    const mode = e.target.closest("[data-fw]")?.dataset.fw;
    if (e.target.closest("button") || (mode !== "drag" && mode !== "resize") || maxed) return;
    drag = { mode, sx: e.clientX, sy: e.clientY, ...geo };
    win.setPointerCapture(e.pointerId);
    frame.style.pointerEvents = "none";
    e.preventDefault();
  });
  win.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (drag.mode === "drag") { geo.x = drag.x + dx; geo.y = drag.y + dy; clamp(); }
    else { geo.w = Math.max(260, Math.min(drag.w + dx, window.innerWidth - geo.x - 4)); geo.h = Math.max(220, Math.min(drag.h + dy, window.innerHeight - geo.y - 4)); }
    apply();
  });
  const endDrag = () => { drag = null; frame.style.pointerEvents = ""; };
  win.addEventListener("pointerup", endDrag);
  win.addEventListener("pointercancel", endDrag);

  win.addEventListener("click", (e) => {
    const act = e.target.closest("button[data-fw]")?.dataset.fw;
    if (act === "close") closeBrowserWindow();
    else if (act === "max") toggleMax();
    else if (act === "reload") { frame.src = "about:blank"; setTimeout(() => { frame.src = frameUrl(url); }, 30); }
    else if (act === "newtab") window.open(url, "_blank", "noopener,noreferrer");
  });
  onEsc = (e) => { if (e.key === "Escape") closeBrowserWindow(); };
  document.addEventListener("keydown", onEsc);
}
