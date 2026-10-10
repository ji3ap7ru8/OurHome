// 操作提示說明：系統設定 > 個人化的開關（預設開）。
// 做法：開關開著時，「長按」任何有 data-tip="鍵" 的按鈕 / 便利貼，就在它旁邊跳出小視窗：一段會動的示範動畫（手指點擊）+ 一句話。
// 長按不會觸發原本的點擊動作。每次登入 / 重新進入網頁後，第一次進入某個畫面會先淡淡提醒一次「長按可看說明」（3 秒自動消失）。
// 用法：
//   1. 在要說明的元素加 data-tip="notes-sort"，並在下面 TIPS 登記標題與說明
//   2. 服務 mount 時呼叫 showTipHint("notes")、unmount 時呼叫 closeTips()
import { state, emit, on } from "./store.js";

// ---------- 示範場景（純 HTML + CSS 動畫）----------
const NOTE = { y: ["#fef3c7", "#fcd34d", "#78350f"], g: ["#dcfce7", "#86efac", "#14532d"] }; // 便利貼配色：黃（重要）、綠（一般）
const note = (cls, c, inner) => `<div class="sn ${cls}" style="background:${c[0]};border-color:${c[1]};color:${c[2]}"><span class="sn-tape"></span>${inner}<i class="sb"></i><i class="sb" style="width:60%"></i></div>`;
const finger = (style = "") => `<span class="tip-finger" style="${style}">👆</span>`;

// 三張便利貼，最後一張（帶圈起來的記號）自己滑到最前面
function reorder(markHtml) {
  return `<div class="sc">
    ${note("sn-a", NOTE.g, '<b class="sl">一般</b>')}
    ${note("sn-b", NOTE.g, '<b class="sl">一般</b>')}
    ${note("sn-c", NOTE.y, `<b class="sl">重要</b><span class="sm">${markHtml}<span class="sm-ring"></span></span>`)}
  </div>`;
}
// 點便利貼 → 打開完整內容
const openScene = `<div class="sc">
  ${note("so-small", NOTE.y, '<b class="sl">重要</b>')}
  <div class="so-big" style="background:${NOTE.y[0]};border-color:${NOTE.y[1]};color:${NOTE.y[2]}"><b class="sl">重要</b><i class="sb"></i><i class="sb"></i><i class="sb" style="width:70%"></i></div>
  ${finger("left:calc(50% - 6px);top:36px")}
</div>`;
// 點「管理」→ 新增一張便利貼
const manageScene = `<div class="sc">
  <span class="tip-pill sp-btn" style="position:absolute;left:30px;top:26px;background:#d97706;border-color:#d97706;color:#fff">⚙ 管理</span>
  <div class="sp-new" style="background:${NOTE.g[0]};border-color:${NOTE.g[1]};color:${NOTE.g[2]}"><span class="sn-tape"></span><b class="sl" style="font-size:18px">＋</b><i class="sb"></i></div>
  ${finger("left:62px;top:36px")}
</div>`;

// ---------- 生活圖卡的示範場景 ----------
const BAR = "background:repeating-linear-gradient(90deg,#111827 0 2px,transparent 2px 4px,#111827 4px 5px,transparent 5px 8px,#111827 8px 11px,transparent 11px 12px)";
// 點圖卡 → 顯示條碼
const cardOpenScene = `<div class="sc">
  <div class="scc"><span class="scc-ic"></span><i class="sb" style="width:34px"></i></div>
  <div class="so-big" style="background:#fff;border-color:#cbd5e1;color:#111827;border-top-width:2px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px"><div style="${BAR};width:96px;height:38px"></div><b style="font-size:10px;letter-spacing:2px">0912345678</b></div>
  ${finger("left:calc(50% - 6px);top:36px")}
</div>`;
// 點條碼 → 放大（再點一下轉橫向）
const cardZoomScene = `<div class="sc">
  <div class="scc" style="width:84px;height:44px;top:24px;left:calc(50% - 42px)"><div style="${BAR};width:60px;height:24px"></div></div>
  <div class="so-big" style="background:#fff;border-color:#cbd5e1;color:#111827;border-top-width:2px;left:calc(50% - 90px);width:180px;display:flex;align-items:center;justify-content:center"><div style="${BAR};width:150px;height:56px"></div></div>
  ${finger("left:calc(50% - 6px);top:40px")}
</div>`;
// 點 ︙ → 跳出選單（新增圖卡、排序）
const cardMenuScene = `<div class="sc">
  <span class="scm-btn"><b>︙</b></span>
  <div class="scm-menu"><span>＋ 新增圖卡</span><span>⇅ 排序方式</span><span>▦ 大小</span></div>
  ${finger("right:20px;top:16px")}
</div>`;

const TIPS = {
  "cards-open": { scene: cardOpenScene, text: "點一下圖卡，顯示條碼。" },
  "cards-zoom": { scene: cardZoomScene, text: "點一下條碼會放大，再點一下轉成橫向，方便掃描。" },
  "cards-menu": { scene: cardMenuScene, text: "按這裡新增圖卡，或調整排序與大小。" },
  "notes-sort-pinned": { scene: reorder('<i class="fa-solid fa-thumbtack"></i>'), text: "這是釘選，會自動往前排放。" },
  "notes-sort-date": { scene: reorder('<span class="sm-txt">最新</span>'), text: "最新發布的公告，會排在最前面。" },
  "notes-sort-expire": { scene: reorder('<span class="sm-txt">剩1天</span>'), text: "快到期的公告，會自動往前排放。" },
  "notes-open": { scene: openScene, text: "點一下便利貼，打開完整內容。" },
  "notes-manage": { scene: manageScene, text: "登入後，按這裡新增或編輯公告。" },
};

const HOLD_MS = 500;
const STAY_MS = 8000;
let shown = new Set();        // 這次使用中已提醒過「長按可看說明」的畫面
let pop = null, popTimer = null, hintEl = null, hintTimer = null;
let swallow = false;          // 長按剛跳出說明：吃掉隨後的那一次點擊

const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const snapshotTips = () => state.tips !== false;

export function setTips(v) {
  state.tips = !!v;
  if (!state.tips) closeTips(); else shown.clear();
  emit("tips:change", state.tips);
}

export function applyTips(v) {
  state.tips = v !== false;
  emit("tips:change", state.tips);
}

// ---------- 樣式 ----------
function injectStyle() {
  if (document.getElementById("tipsStyle")) return;
  const st = document.createElement("style");
  st.id = "tipsStyle";
  st.textContent = `
body.tips-on [data-tip] { -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; }
.tip-pop { animation: tipIn .2s ease-out; }
@keyframes tipIn { from { opacity: 0; transform: translateY(6px) scale(.96); } to { opacity: 1; transform: none; } }
.sc { position: relative; height: 92px; margin: 2px 0 6px; }
.sn { position: absolute; top: 18px; width: 52px; height: 62px; border-top: 5px solid; border-radius: 0 0 7px 7px; padding: 6px 5px; box-shadow: 0 3px 6px rgba(0,0,0,.18); }
.sn-tape { position: absolute; top: -10px; left: 50%; width: 22px; height: 8px; margin-left: -11px; background: rgba(255,255,255,.75); border: 1px dashed rgba(0,0,0,.2); }
.sl { display: block; font-size: 9px; font-weight: 900; line-height: 1; border: 1.5px solid currentColor; border-radius: 4px; padding: 2px 3px; width: max-content; margin-bottom: 5px; }
.sb { display: block; height: 5px; border-radius: 3px; background: currentColor; opacity: .45; margin-top: 4px; }
.sn-a { left: 24px; animation: sA 4s ease-in-out infinite; }
.sn-b { left: 90px; animation: sB 4s ease-in-out infinite; }
.sn-c { left: 156px; animation: sC 4s ease-in-out infinite; }
@keyframes sA { 0%,22% { transform: translateX(0); } 42%,90% { transform: translateX(66px); } 100% { transform: translateX(0); } }
@keyframes sB { 0%,22% { transform: translateX(0); } 42%,90% { transform: translateX(66px); } 100% { transform: translateX(0); } }
@keyframes sC { 0%,22% { transform: translateX(0); } 42%,90% { transform: translateX(-132px); } 100% { transform: translateX(0); } }
.sm { position: absolute; top: -12px; right: -9px; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; font-size: 13px; color: #dc2626; }
.sm-txt { font-size: 9px; font-weight: 900; white-space: nowrap; color: #b91c1c; }
.sm-ring { position: absolute; inset: -4px; border: 2.5px solid #ef4444; border-radius: 50%; animation: smRing 1.4s ease-in-out infinite; }
@keyframes smRing { 0%,100% { transform: scale(.9); opacity: .6; } 50% { transform: scale(1.12); opacity: 1; } }
.so-small { left: calc(50% - 26px); animation: soSmall 3.6s ease-in-out infinite; }
.so-big { position: absolute; left: calc(50% - 62px); top: 6px; width: 124px; height: 80px; border: 2px solid; border-top-width: 6px; border-radius: 0 0 8px 8px; padding: 8px; box-shadow: 0 5px 10px rgba(0,0,0,.2); opacity: 0; animation: soBig 3.6s ease-in-out infinite; }
@keyframes soSmall { 0%,38% { opacity: 1; } 46%,92% { opacity: 0; } 100% { opacity: 1; } }
@keyframes soBig { 0%,40% { opacity: 0; transform: scale(.5); } 52%,90% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(.5); } }
.sp-btn { animation: tipPress 3.6s ease-in-out infinite; }
.sp-new { position: absolute; right: 30px; top: 20px; width: 52px; height: 58px; border: 2px solid; border-top-width: 5px; border-radius: 0 0 7px 7px; padding: 6px 5px; text-align: center; box-shadow: 0 3px 6px rgba(0,0,0,.18); opacity: 0; animation: spNew 3.6s ease-in-out infinite; }
@keyframes spNew { 0%,40% { opacity: 0; transform: scale(.4) rotate(-8deg); } 55%,90% { opacity: 1; transform: scale(1) rotate(2deg); } 100% { opacity: 0; transform: scale(.4); } }
.scc { position: absolute; top: 16px; left: calc(50% - 35px); width: 70px; height: 62px; border-radius: 14px; background: #fff; border: 2px solid #e2e8f0; box-shadow: 0 3px 6px rgba(0,0,0,.15); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; animation: soSmall 3.6s ease-in-out infinite; }
.scc-ic { width: 24px; height: 24px; border-radius: 8px; background: #bae6fd; }
.scm-btn { position: absolute; right: 26px; top: 10px; width: 36px; height: 36px; border-radius: 12px; background: #fff; border: 2px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,.12); display: flex; align-items: center; justify-content: center; color: #0284c7; font-size: 16px; animation: tipPress 3.6s ease-in-out infinite; }
.scm-menu { position: absolute; right: 26px; top: 50px; width: 118px; border-radius: 12px; background: #fff; border: 2px solid #e2e8f0; box-shadow: 0 5px 10px rgba(0,0,0,.18); padding: 4px 8px; font-size: 12px; font-weight: 900; color: #1e293b; opacity: 0; transform-origin: 100% 0; animation: spNew 3.6s ease-in-out infinite; }
.scm-menu span { display: block; padding: 4px 0; }
.tip-pill { display: inline-block; padding: 8px 16px; border-radius: 999px; background: #fff; border: 2px solid #f59e0b; font-weight: 900; font-size: 14px; }
.tip-finger { position: absolute; font-size: 30px; line-height: 1; animation: tipFinger 3.6s ease-in-out infinite; pointer-events: none; }
@keyframes tipFinger { 0%,25%,100% { transform: translate(8px, 22px); opacity: 0; } 8% { opacity: 1; } 15%,30% { transform: translate(8px, 2px); opacity: 1; } 38% { transform: translate(8px, 22px); opacity: 0; } }
@keyframes tipPress { 0%,12%,24%,100% { transform: scale(1); } 18% { transform: scale(.92); } }
`;
  document.head.appendChild(st);
}

// ---------- 說明小視窗 ----------
export function closeTips() {
  clearTimeout(popTimer); clearTimeout(hintTimer);
  pop?.remove(); pop = null;
  const h = hintEl; hintEl = null;
  if (h) { h.style.opacity = "0"; setTimeout(() => h.remove(), 250); }
}

function openPop(target) {
  const t = TIPS[target.dataset.tip];
  if (!t) return false;
  injectStyle();
  closePop();
  const wrap = document.createElement("div");
  wrap.className = "fixed inset-0 z-[80]";
  wrap.innerHTML = `<div class="tip-pop absolute w-[260px] rounded-2xl border-2 border-amber-400 bg-amber-50 text-amber-950 shadow-2xl px-4 pt-3 pb-3">
    <div aria-hidden="true">${t.scene}</div>
    <p class="text-base font-black leading-snug text-center">${esc(t.text)}</p>
    <p class="text-[11px] font-bold text-amber-700/70 mt-2 text-center">點空白處關閉</p>
  </div>`;
  document.body.appendChild(wrap);
  const box = wrap.firstElementChild, r = target.getBoundingClientRect();
  const w = 260, h = box.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
  const left = Math.max(8, Math.min(vw - w - 8, r.left + r.width / 2 - w / 2));
  const below = r.bottom + 10 + h <= vh - 8;
  const top = below ? r.bottom + 10 : Math.max(8, r.top - h - 10);
  box.style.left = left + "px"; box.style.top = top + "px";
  wrap.addEventListener("click", closePop);
  pop = wrap;
  popTimer = setTimeout(closePop, STAY_MS);
  return true;
}
function closePop() { clearTimeout(popTimer); pop?.remove(); pop = null; }

// ---------- 長按偵測（全站只裝一次）----------
let wired = false;
function wire() {
  if (wired) return; wired = true;
  let timer = null, sx = 0, sy = 0, tgt = null;
  const cancel = () => { clearTimeout(timer); timer = null; };
  document.addEventListener("pointerdown", (e) => {
    if (state.tips === false) return;
    const el = e.target.closest?.("[data-tip]");
    if (!el || !TIPS[el.dataset.tip]) return;
    tgt = el; sx = e.clientX; sy = e.clientY;
    cancel();
    timer = setTimeout(() => { timer = null; if (tgt && openPop(tgt)) { swallow = true; navigator.vibrate?.(15); } }, HOLD_MS);
  }, true);
  document.addEventListener("pointermove", (e) => { if (timer && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) cancel(); }, true);
  ["pointerup", "pointercancel", "scroll"].forEach((ev) => document.addEventListener(ev, () => { cancel(); }, true));
  document.addEventListener("click", (e) => { // 長按後放開會產生一次點擊，吃掉它，免得觸發原本動作
    if (!swallow) return;
    swallow = false; e.stopPropagation(); e.preventDefault();
  }, true);
  document.addEventListener("contextmenu", (e) => { if (state.tips !== false && e.target.closest?.("[data-tip]")) e.preventDefault(); });
}
wire();

function syncBody() { document.body?.classList.toggle("tips-on", state.tips !== false); }
on("tips:change", syncBody);
syncBody();

// ---------- 進入畫面時的淡淡提醒 ----------
export function showTipHint(id) {
  if (state.tips === false || shown.has(id)) return;
  shown.add(id);
  injectStyle(); syncBody();
  const el = document.createElement("div");
  el.setAttribute("role", "note");
  el.className = "fixed left-1/2 z-[60] -translate-x-1/2 rounded-full bg-amber-500 text-white shadow-lg px-4 py-2 text-sm font-black whitespace-nowrap transition-opacity duration-300 pointer-events-none";
  el.style.bottom = "calc(env(safe-area-inset-bottom, 0px) + 96px)";
  el.innerHTML = '<i class="fa-regular fa-lightbulb mr-1.5"></i>長按按鈕或便利貼，可看操作說明';
  hintEl?.remove(); document.body.appendChild(el); hintEl = el;
  clearTimeout(hintTimer); hintTimer = setTimeout(() => { el.style.opacity = "0"; setTimeout(() => el.remove(), 300); if (hintEl === el) hintEl = null; }, 3500);
}

on("auth:change", () => { shown.clear(); });
