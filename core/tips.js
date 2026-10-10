// 操作提示說明：系統設定 > 個人化的開關（預設開）。
// 做法：開關開著時，「長按」任何有 data-tip="鍵" 的按鈕 / 便利貼，就在它旁邊跳出小視窗：一段會動的示範動畫（手指點擊）+ 一句話。
// 長按不會觸發原本的點擊動作。每次登入 / 重新進入網頁後，第一次進入某個畫面會先淡淡提醒一次「長按可看說明」（3 秒自動消失）。
// 用法：
//   1. 在要說明的元素加 data-tip="notes-sort"，並在下面 TIPS 登記標題與說明
//   2. 服務 mount 時呼叫 showTipHint("notes")、unmount 時呼叫 closeTips()
import { state, emit, on } from "./store.js";

const TIPS = {
  "notes-sort": { title: "切換排序", text: "點選想要的順序，公告會立刻重新排列。", demo: "tap" },
  "notes-open": { title: "看完整公告", text: "點一下便利貼，打開完整內容。", demo: "tap" },
  "notes-manage": { title: "新增與編輯公告", text: "登入後才會出現。可新增、編輯、刪除；期限可選「綁定期限」到期自動變灰，或「永久顯示」。", demo: "tap" },
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
.tip-demo { position: relative; height: 84px; display: flex; align-items: center; justify-content: center; }
.tip-pill { padding: 8px 18px; border-radius: 999px; background: #fff; border: 2px solid #f59e0b; color: #78350f; font-weight: 900; font-size: 14px; animation: tipPress 1.6s ease-in-out infinite; }
.tip-ring { position: absolute; width: 28px; height: 28px; border-radius: 50%; border: 3px solid #f59e0b; opacity: 0; animation: tipRing 1.6s ease-out infinite; }
.tip-finger { position: absolute; font-size: 34px; line-height: 1; transform-origin: 50% 0; animation: tipFinger 1.6s ease-in-out infinite; }
@keyframes tipFinger { 0%,100% { transform: translate(14px, 30px); } 35%,55% { transform: translate(14px, 12px); } }
@keyframes tipPress { 0%,100% { transform: scale(1); } 40%,55% { transform: scale(.94); } }
@keyframes tipRing { 0%,30% { opacity: 0; transform: scale(.4); } 40% { opacity: .9; transform: scale(.8); } 100% { opacity: 0; transform: scale(2.2); } }
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
  wrap.innerHTML = `<div class="tip-pop absolute w-[260px] rounded-2xl border-2 border-amber-400 bg-amber-50 text-amber-950 shadow-2xl px-4 pt-2 pb-3">
    <div class="tip-demo" aria-hidden="true"><span class="tip-pill">${esc(t.title)}</span><span class="tip-ring"></span><span class="tip-finger">👆</span></div>
    <p class="text-base font-black leading-snug">${esc(t.title)}</p>
    <p class="text-sm font-bold leading-snug mt-1">${esc(t.text)}</p>
    <p class="text-[11px] font-bold text-amber-700/70 mt-2">點空白處關閉</p>
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
