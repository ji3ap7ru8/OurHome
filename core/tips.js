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

// 依圖卡類型：小圖卡 → 點開後的大字 / 條碼
const kindScene = (icon, face) => `<div class="sc">
  <div class="scc"><span class="scc-ic"><i class="fa-solid ${icon}" style="font-size:12px;color:#0369a1"></i></span><i class="sb" style="width:34px"></i></div>
  <div class="so-big" style="background:#fff;border-color:#cbd5e1;color:#111827;border-top-width:2px;left:calc(50% - 90px);width:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px">${face}</div>
  ${finger("left:calc(50% - 6px);top:36px")}
</div>`;
const WHITE = ["#ffffff", "#cbd5e1", "#1e293b"];
const cardsSortScene = `<div class="sc">
  ${["sn-a", "sn-b", "sn-c"].map((c, i) => note(c, WHITE, `<span class="scc-ic" style="width:20px;height:20px;margin-bottom:5px"></span>${i === 2 ? '<span class="sm"><b style="font-size:13px">1</b><span class="sm-ring"></span></span>' : ""}`)).join("")}
</div>`;
const cardsAddScene = `<div class="sc">
  <span class="tip-pill sp-btn" style="position:absolute;left:16px;top:26px;background:#fff;border:2px dashed #0284c7;color:#0284c7">＋ 新增圖卡</span>
  <div class="sp-new" style="background:#fff;border-color:#cbd5e1;color:#1e293b;border-top-width:2px;border-radius:12px;display:flex;align-items:center;justify-content:center"><span class="scc-ic"></span></div>
  ${finger("left:56px;top:36px")}
</div>`;
const cardsFormatScene = `<div class="sc">
  <div class="fmt fmt-a">${[0,1,2,3].map(() => '<div class="fmt-t"><span class="scc-ic" style="width:18px;height:18px"></span></div>').join("")}</div>
  <div class="fmt fmt-b">${[0,1,2].map(() => '<div class="fmt-r"><span class="scc-ic" style="width:18px;height:18px"></span><i class="sb" style="flex:1;margin:0"></i></div>').join("")}</div>
</div>`;
// ---------- 生活圖卡設定視窗的示範場景 ----------
const tile = (w, h, extra = "") => `<div class="gt" style="width:${w}px;height:${h}px;${extra}"><span class="scc-ic" style="width:${Math.round(w * .4)}px;height:${Math.round(w * .4)}px"></span></div>`;
const popGrid = (n, cols, w, h) => `<div class="gtg" style="grid-template-columns:repeat(${cols},${w}px)">${Array.from({ length: n }, (_, i) => tile(w, h, `animation-delay:${(i * 0.18).toFixed(2)}s`)).join("")}</div>`;
const popList = (n) => `<div class="gtl">${Array.from({ length: n }, (_, i) => `<div class="gt gl" style="animation-delay:${(i * 0.22).toFixed(2)}s"><span class="scc-ic" style="width:16px;height:16px"></span><i class="sb" style="flex:1;margin:0"></i></div>`).join("")}</div>`;
const modeScene = (list) => `<div class="sc">${list ? popList(3) : popGrid(4, 2, 56, 38)}${finger("left:calc(50% + 40px);top:34px")}</div>`;
const colsScene = (n) => `<div class="sc">${popGrid(n * 2, n, n === 2 ? 58 : 40, 34)}</div>`;
const sizeScene = (t) => `<div class="sc" style="display:flex;align-items:flex-end;justify-content:center;gap:12px;padding-bottom:10px">
  ${[["s", 28, "小"], ["m", 40, "中"], ["l", 54, "大"]].map(([k, s, l]) => `<div style="text-align:center"><div class="gt-s${k === t ? " gt-on" : ""}" style="width:${s}px;height:${s}px"><span class="scc-ic" style="width:${Math.round(s * .4)}px;height:${Math.round(s * .4)}px"></span></div><b style="font-size:11px">${l}</b></div>`).join("")}
  ${finger(`left:calc(50% + ${t === "s" ? -42 : t === "m" ? -4 : 38}px);top:30px`)}
</div>`;
const rowsScene = (rows, extra = "") => `<div class="sc">${rows.map((r, i) => `<div class="rw" style="top:${6 + i * 28}px;--dy:${r.dy}px">${r.html}</div>`).join("")}${extra}</div>`;
const rwBody = (num, name, tail = "") => `<b class="rw-n"${Array.isArray(num) ? ' style="position:relative"' : ""}>${Array.isArray(num) ? `<span class="num-a">${num[0]}</span><span class="num-b">${num[1]}</span>` : num}</b><span style="flex:1;font-size:11px;font-weight:900">${name}</span>${tail}`;
const ARW = (c) => `<span class="rw-a">${c}</span>`;
const orderNumScene = rowsScene([
  { dy: 28, html: rwBody([1, 2], "圖卡甲") }, { dy: 28, html: rwBody([2, 3], "圖卡乙") },
  { dy: -56, html: rwBody([3, 1], "圖卡丙") },
], finger("left:36px;top:60px"));
const orderUpScene = rowsScene([{ dy: 28, html: rwBody([1, 2], "圖卡甲", ARW("▼")) }, { dy: -28, html: rwBody([2, 1], "圖卡乙", ARW("▲")) }, { dy: 0, html: rwBody(3, "圖卡丙", ARW("")) }], finger("right:22px;top:36px"));
const orderDownScene = rowsScene([{ dy: 28, html: rwBody([1, 2], "圖卡甲", ARW("▼")) }, { dy: -28, html: rwBody([2, 1], "圖卡乙", ARW("▲")) }, { dy: 0, html: rwBody(3, "圖卡丙", ARW("")) }], finger("right:6px;top:8px"));
const orderResetScene = rowsScene([{ dy: 56, html: rwBody([1, 3], "圖卡丙") }, { dy: -28, html: rwBody([2, 1], "圖卡甲") }, { dy: -28, html: rwBody([3, 2], "圖卡乙") }], `<span class="rw-reset">↺</span>${finger("right:20px;top:46px")}`);
const sortNameScene = `<div class="sc">
  ${[["sn-a", "B"], ["sn-b", "C"], ["sn-c", "A"]].map(([c, l], i) => note(c, WHITE, `<b style="display:block;font-size:20px;text-align:center;margin-top:6px">${l}</b>${i === 2 ? '<span class="sm"><b style="font-size:11px">A</b><span class="sm-ring"></span></span>' : ""}`)).join("")}
</div>`;
const sortDefaultScene = `<div class="sc" style="text-align:center">
  <div style="display:flex;justify-content:center;gap:12px;margin-top:10px">${["第1張", "第2張", "第3張"].map((t, i) => `<div class="gt" style="width:50px;height:44px;animation-delay:${(i * 0.5).toFixed(1)}s;flex-direction:column;gap:2px"><span class="scc-ic" style="width:18px;height:18px"></span><b style="font-size:10px">${t}</b></div>`).join("")}</div>
  <div class="arr"><i></i></div><b style="font-size:10px;color:#64748b">先建立 → 後建立</b>
</div>`;
const panelScene = (open) => `<div class="sc">
  <span class="scm-btn" style="right:14px;top:4px;width:30px;height:30px;font-size:14px;animation:none${open ? "" : ";opacity:.6"}">${open ? "⚙" : "✕"}</span>
  <div class="pnl ${open ? "pnl-in" : "pnl-out"}"><b style="font-size:11px">${open ? "系統設定" : "生活圖卡設定"}</b><i class="sb"></i><i class="sb" style="width:60%"></i><i class="sb"></i></div>
  ${finger(`right:10px;top:12px`)}
</div>`;
const editScene = `<div class="sc">
  ${rowsScene([{ dy: 0, html: rwBody("", "我的圖卡", '<span class="rw-a" style="background:#e0f2fe">✎</span>') }]).replace('<div class="sc">', '').replace(/<\/div>$/, '')}
  <div class="sp-new" style="right:24px;top:26px;width:110px;height:56px;background:#fff;border-color:#cbd5e1;border-top-width:2px;border-radius:12px;padding:8px"><i class="sb"></i><i class="sb"></i><i class="sb" style="width:60%"></i></div>
  ${finger("left:116px;top:6px")}
</div>`;
const delScene = `<div class="sc">
  <div class="rw" style="top:30px;animation:rwGone 3.6s ease-in-out infinite"><b style="flex:1;font-size:11px;font-weight:900;padding-left:6px">我的圖卡</b><span class="rw-a del-a">🗑</span><span class="rw-a del-b">確定刪除</span></div>
  ${finger("right:22px;top:40px")}
</div>`;
const loginScene = (out) => `<div class="sc">
  ${out ? "" : `<span class="tip-pill" style="position:absolute;left:30px;top:22px;font-size:12px;padding:8px 14px;animation:fmtA 3.6s ease-in-out infinite">G 使用 Google 帳號登入</span>`}
  <div class="${out ? "" : "sp-new "}acct" style="${out ? "" : "right:auto;left:30px;top:18px;width:200px;"}"><span class="acct-av"></span><span style="flex:1"><i class="sb" style="width:60%;margin:0 0 4px"></i><i class="sb" style="width:85%;margin:0"></i></span></div>
  ${out ? `<span class="tip-pill sp-btn" style="position:absolute;left:50%;margin-left:-60px;top:54px;background:#fff1f2;border-color:#fda4af;color:#e11d48;font-size:12px;padding:6px 18px">登出帳號</span>${finger("left:calc(50% + 10px);top:62px")}` : finger("left:100px;top:34px")}
</div>`;

const TIPS = {
  "cards-gear": { scene: panelScene(true), text: "按這裡打開系統設定。" },
  "cards-close": { scene: panelScene(false), text: "按這裡關閉設定視窗。" },
  "cards-mode-card": { scene: modeScene(false), text: "圖卡：一張張方塊排開，一眼看到圖示。" },
  "cards-mode-list": { scene: modeScene(true), text: "清單：一條一條由上往下排，名稱更清楚。" },
  "cards-size-l": { scene: sizeScene("l"), text: "大：圖卡放大，長輩看更清楚。" },
  "cards-size-m": { scene: sizeScene("m"), text: "中：預設大小。" },
  "cards-size-s": { scene: sizeScene("s"), text: "小：圖卡縮小，一個畫面放更多張。" },
  "cards-cols-2": { scene: colsScene(2), text: "每行 2 個：每張比較大。" },
  "cards-cols-3": { scene: colsScene(3), text: "每行 3 個：每張比較小，一次看更多。" },
  "cards-sort-default": { scene: sortDefaultScene, text: "預設：依建立先後排列，先建立的在前面。" },
  "cards-sort-name": { scene: sortNameScene, text: "名稱：依名稱筆畫自動排列。" },
  "cards-sort-custom": { scene: cardsSortScene, text: "自訂：自己訂編號，決定每張圖卡的位置。" },
  "cards-order-num": { scene: orderNumScene, text: "點編號選新位置，其他圖卡會自動順延。" },
  "cards-order-up": { scene: orderUpScene, text: "▲ 往前移一格。" },
  "cards-order-down": { scene: orderDownScene, text: "▼ 往後移一格。" },
  "cards-order-reset": { scene: orderResetScene, text: "恢復成預設的排列順序。" },
  "cards-edit": { scene: editScene, text: "按鉛筆，修改這張圖卡的內容。" },
  "cards-del": { scene: delScene, text: "按垃圾桶，再按一次「確定刪除」才會真的刪除。" },
  "cards-login": { scene: loginScene(false), text: "登入後，設定會自動存到你的 Google 雲端硬碟，換手機也帶著走。" },
  "cards-logout": { scene: loginScene(true), text: "登出帳號。在公共場所用完，記得登出。" },
  "cards-kind-bar": { scene: kindScene("fa-barcode", `<div style="${BAR};width:96px;height:36px"></div><b style="font-size:10px;letter-spacing:2px">/ABC1234</b>`), text: "會員、載具、條碼類，會畫成條碼，點開就能直接掃描。" },
  "cards-kind-phone": { scene: kindScene("fa-phone", '<b style="font-size:22px;letter-spacing:1px">02-1234-5678</b>'), text: "電話號碼用大字顯示，方便念給對方聽。" },
  "cards-kind-mail": { scene: kindScene("fa-envelope", '<b style="font-size:15px">name@example.com</b>'), text: "電子郵件用大字顯示，清楚好唸。" },
  "cards-kind-plate": { scene: kindScene("fa-car", '<b style="font-size:24px;letter-spacing:2px;border:3px solid #1e293b;border-radius:8px;padding:2px 12px">ABC-1234</b>'), text: "車牌號碼用大字顯示，停車登記一目了然。" },
  "cards-kind-other": { scene: kindScene("fa-tag", '<b style="font-size:14px">想放的文字內容</b>'), text: "其他類型，內容以文字顯示。" },
  "cards-format": { scene: cardsFormatScene, text: "切換圖卡或清單，也能調整大小與每行數量。" },
  "cards-sort": { scene: cardsSortScene, text: "排序可選預設、名稱，或自訂編號，編號小的排前面。" },
  "cards-manage": { scene: cardsAddScene, text: "按這裡新增圖卡，也能編輯或刪除。" },
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
.scc-ic { width: 24px; height: 24px; border-radius: 8px; background: #bae6fd; display: flex; align-items: center; justify-content: center; }
.scm-btn { position: absolute; right: 26px; top: 10px; width: 36px; height: 36px; border-radius: 12px; background: #fff; border: 2px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,.12); display: flex; align-items: center; justify-content: center; color: #0284c7; font-size: 16px; animation: tipPress 3.6s ease-in-out infinite; }
.scm-menu { position: absolute; right: 26px; top: 50px; width: 118px; border-radius: 12px; background: #fff; border: 2px solid #e2e8f0; box-shadow: 0 5px 10px rgba(0,0,0,.18); padding: 4px 8px; font-size: 12px; font-weight: 900; color: #1e293b; opacity: 0; transform-origin: 100% 0; animation: spNew 3.6s ease-in-out infinite; }
.scm-menu span { display: block; padding: 4px 0; }
.fmt { position: absolute; left: 50%; top: 8px; width: 150px; margin-left: -75px; }
.fmt-a { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; animation: fmtA 4s ease-in-out infinite; }
.fmt-b { display: flex; flex-direction: column; gap: 5px; top: 10px; opacity: 0; animation: fmtB 4s ease-in-out infinite; }
.fmt-t { height: 34px; border-radius: 10px; background: #fff; border: 2px solid #e2e8f0; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,.1); }
.fmt-r { height: 22px; border-radius: 8px; background: #fff; border: 2px solid #e2e8f0; display: flex; align-items: center; gap: 6px; padding: 0 6px; box-shadow: 0 2px 4px rgba(0,0,0,.1); }
@keyframes fmtA { 0%,40% { opacity: 1; } 50%,90% { opacity: 0; } 100% { opacity: 1; } }
@keyframes fmtB { 0%,40% { opacity: 0; } 50%,90% { opacity: 1; } 100% { opacity: 0; } }
.gtg { position: absolute; left: 50%; top: 6px; transform: translateX(-50%); display: grid; gap: 6px; }
.gtl { position: absolute; left: 50%; top: 6px; width: 150px; margin-left: -75px; display: flex; flex-direction: column; gap: 5px; }
.gt { border-radius: 10px; background: #fff; border: 2px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,.12); display: flex; align-items: center; justify-content: center; opacity: 0; animation: gtPop 3.6s ease-in-out infinite; }
.gt.gl { height: 22px; border-radius: 8px; padding: 0 6px; gap: 6px; justify-content: flex-start; }
@keyframes gtPop { 0%,6% { opacity: 0; transform: scale(.4); } 18%,88% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(.4); } }
.gt-s { border-radius: 10px; background: #fff; border: 2px solid #e2e8f0; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,.12); margin: 0 auto 2px; }
.gt-on { border-color: #0284c7; animation: gtOn 1.4s ease-in-out infinite; }
@keyframes gtOn { 0%,100% { box-shadow: 0 0 0 0 rgba(2,132,199,.5); } 50% { box-shadow: 0 0 0 5px rgba(2,132,199,0); } }
.rw { position: absolute; left: 18px; right: 18px; height: 24px; display: flex; align-items: center; gap: 6px; padding: 0 6px; border-radius: 8px; background: #fff; border: 2px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,.1); animation: rwMove 3.6s ease-in-out infinite; }
@keyframes rwMove { 0%,25% { transform: translateY(0); } 45%,90% { transform: translateY(var(--dy, 0px)); } 100% { transform: translateY(0); } }
.rw-n { width: 18px; height: 18px; border-radius: 5px; background: #e0f2fe; color: #0369a1; font-size: 11px; display: flex; align-items: center; justify-content: center; }
.rw-n span { position: absolute; }
.num-a { animation: fmtA 3.6s ease-in-out infinite; } .num-b { animation: fmtB 3.6s ease-in-out infinite; }
.rw-a { width: 18px; height: 18px; border-radius: 5px; background: #f1f5f9; font-size: 9px; display: flex; align-items: center; justify-content: center; }
.rw-reset { position: absolute; right: 22px; top: 36px; width: 26px; height: 26px; border-radius: 50%; background: #fff; border: 2px solid #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 900; color: #0369a1; }
.pnl { position: absolute; left: 30px; right: 30px; top: 22px; height: 64px; padding: 8px 10px; border-radius: 10px; background: #fff; border: 2px solid #e2e8f0; box-shadow: 0 4px 8px rgba(0,0,0,.15); }
.pnl-in { animation: pnlIn 3.6s ease-in-out infinite; } .pnl-out { animation: pnlOut 3.6s ease-in-out infinite; }
@keyframes pnlIn { 0%,36% { opacity: 0; transform: translateX(40px); } 52%,90% { opacity: 1; transform: none; } 100% { opacity: 0; transform: translateX(40px); } }
@keyframes pnlOut { 0%,36% { opacity: 1; transform: none; } 52%,90% { opacity: 0; transform: translateX(40px); } 100% { opacity: 1; transform: none; } }
@keyframes rwGone { 0%,55% { opacity: 1; transform: none; } 75%,92% { opacity: 0; transform: translateX(30px); } 100% { opacity: 1; transform: none; } }
.del-a { background: #fee2e2; animation: fmtA 3.6s ease-in-out infinite; } .del-b { position: absolute; right: 6px; width: auto; padding: 0 6px; background: #e11d48; color: #fff; font-size: 9px; font-weight: 900; opacity: 0; animation: fmtB 3.6s ease-in-out infinite; }
.arr { position: relative; margin: 8px 30px 3px; height: 4px; border-radius: 2px; background: #e2e8f0; overflow: hidden; } .arr i { position: absolute; left: 0; top: 0; bottom: 0; background: #0284c7; animation: arrGrow 3.6s ease-in-out infinite; }
@keyframes arrGrow { 0% { width: 0; } 60%,90% { width: 100%; } 100% { width: 0; } }
.acct { display: flex; align-items: center; gap: 8px; margin: 18px 30px 0; padding: 8px 10px; border-radius: 12px; background: #ecfdf5; border: 2px solid #a7f3d0; }
.acct-av { width: 22px; height: 22px; border-radius: 50%; background: #10b981; flex-shrink: 0; }
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
  wrap.className = "fixed inset-0";
  wrap.style.zIndex = "2147483000"; // 蓋過所有設定視窗
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
