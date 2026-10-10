// 通用「發送到 LINE」模板：圓角對話框（黑框 + 彩色立體陰影 + 右下尾巴）+ 主題 + 選擇發送對象 + 發送（需再次確認）。
// 任何服務要發 LINE 訊息，只要呼叫 openLineSendDialog() 並給它「主題」與「怎麼組訊息」就好：
//
//   import { openLineSendDialog } from "../../core/line-send.js";
//   openLineSendDialog({
//     title: "今日執勤",                          // 主題（氣泡標題；確認畫面也會用到）
//     subtitle: "把今天的收碗、洗碗發送到 LINE",     // 可省略
//     buildMessages: () => [flexOrTextMessage],   // 按下「確定發送」當下才組訊息（資料一定是最新的）
//   });
//
// 發送走 Google Apps Script 中繼站（系統設定 > LINE Bot 的中繼站 URL 與 Bot Token）。
import { state } from "./store.js";
import { showToast } from "./toast.js";

const ID = "lineSendDialog";
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------- 發送 ----------
// 回傳實際發送的人數；失敗會 throw Error（訊息可直接顯示給使用者）
export async function sendLineMessages(userIds, messages) {
  const url = state.lineRelayUrl, token = state.lineBotToken;
  if (!url) throw new Error("尚未設定中繼站 URL（系統設定 > LINE Bot）");
  if (!token) throw new Error("尚未設定 Bot Token（系統設定 > LINE Bot）");
  // Apps Script 不支援 CORS 預檢，所以用 text/plain 送出 JSON
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ token, to: userIds, messages }),
  });
  let r;
  try { r = await res.json(); } catch { throw new Error("中繼站回應異常（請確認網址與部署權限為「所有人」）"); }
  if (!r.ok) throw new Error(r.error || "發送失敗");
  return r.sent;
}

// ---------- 樣式（只注入一次） ----------
const TAIL = 34;   // 對話框尾巴佔的高度
const INSET = 8;   // 外框離容器邊緣的距離
const SHADOW = 8;  // 彩色立體陰影的位移（往左下）
const RADIUS = 34; // 圓角半徑
function injectStyle() {
  if (document.getElementById("lineSendDialogStyle")) return;
  const st = document.createElement("style");
  st.id = "lineSendDialogStyle";
  st.textContent = `
#${ID} .lsd-main { fill: #fff; stroke: #111827; stroke-width: 3.5; stroke-linejoin: round; }
#${ID}.dark .lsd-main { fill: #0f172a; stroke: #e2e8f0; }
#${ID} .lsd-shadow { fill: var(--primary-color); stroke: var(--primary-color); stroke-width: 3.5; stroke-linejoin: round; }
#${ID} .lsd-tick { fill: none; stroke: #111827; stroke-width: 2.5; stroke-linecap: round; }
#${ID}.dark .lsd-tick { stroke: #e2e8f0; }
#${ID} .lsd-pop { animation: lsdPop .26s cubic-bezier(.2,1.3,.4,1); transform-origin: 80% 100%; }
@keyframes lsdPop { from { transform: scale(.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
#${ID} .lsd-item { border: 2px solid #e2e8f0; background: #fff; transition: transform .1s, border-color .15s, background .15s; }
#${ID}.dark .lsd-item { border-color: #475569; background: #1e293b; }
#${ID} .lsd-item:active { transform: scale(.98); }
#${ID} .lsd-item.lsd-on { border-color: var(--primary-color); background: color-mix(in srgb, var(--primary-color) 12%, #fff); }
#${ID}.dark .lsd-item.lsd-on { background: color-mix(in srgb, var(--primary-color) 22%, #1e293b); }
#${ID} .lsd-btn { border: 3px solid #111827; box-shadow: 3px 3px 0 #111827; transition: transform .08s, box-shadow .08s, opacity .15s; }
#${ID}.dark .lsd-btn { border-color: #e2e8f0; box-shadow: 3px 3px 0 #e2e8f0; }
#${ID} .lsd-btn:active:not(:disabled) { transform: translate(3px,3px); box-shadow: 0 0 0 transparent; }
#${ID} .lsd-btn:disabled { opacity: .4; }
`;
  document.head.appendChild(st);
}

// ---------- 圓角對話框外框（依實際大小用程式畫，邊線粗細不會被拉歪）----------
// 圓角矩形，尾巴在下緣偏右、尖端朝左下；回傳 [外框 path, 兩側小刻痕 path]
function bubblePath(w, h) {
  const L = INSET, T = INSET, R = w - INSET, B = h - TAIL;
  const r = Math.min(RADIUS, (B - T) / 2);
  const f = (n) => n.toFixed(1);
  const d = `M${f(L + r)} ${T} H${f(R - r)} A${r} ${r} 0 0 1 ${R} ${f(T + r)} V${f(B - r)} A${r} ${r} 0 0 1 ${f(R - r)} ${B}`
    + ` H${f(R - 58)} L${f(R - 98)} ${f(h - 3)} L${f(R - 88)} ${B}`
    + ` H${f(L + r)} A${r} ${r} 0 0 1 ${L} ${f(B - r)} V${f(T + r)} A${r} ${r} 0 0 1 ${f(L + r)} ${T} Z`;
  const y1 = T + 30, tick = (x) => `M${f(x)} ${f(y1)} v14 M${f(x)} ${f(y1 + 22)} v.1`;
  return [d, tick(L + 14) + tick(R - 14)];
}

// ---------- 對話框 ----------
export function closeLineSendDialog() { document.getElementById(ID)?.remove(); }

export function openLineSendDialog({ title = "發送訊息", subtitle = "", buildMessages, confirmText } = {}) {
  if (document.getElementById(ID)) return;
  if (typeof buildMessages !== "function") throw new Error("openLineSendDialog 需要 buildMessages()");
  injectStyle();
  const list = state.lineBotIds || [];
  const dark = document.getElementById("appContainer")?.classList.contains("dark");

  const wrap = document.createElement("div");
  wrap.id = ID;
  wrap.className = `${dark ? "dark " : ""}fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4`;

  const rows = list.map((x) => `<label class="lsd-item flex items-center gap-2 px-2.5 py-2.5 rounded-2xl cursor-pointer select-none min-w-0"><input type="checkbox" data-uid="${esc(x.userId)}" data-name="${esc(x.name || x.userId)}" class="w-5 h-5 accent-emerald-600 shrink-0"><span class="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">${esc(x.name || x.userId)}</span></label>`).join("");
  const empty = `<p class="text-sm font-medium text-slate-500 dark:text-slate-400 text-center py-4">還沒有 LINE 接收對象，請先到「系統設定 > LINE Bot」新增。</p>`;

  wrap.innerHTML = `
  <div class="lsd-pop relative w-full max-w-[440px]" data-box style="padding-bottom:${TAIL}px">
    <svg data-svg class="absolute inset-0 w-full h-full pointer-events-none" style="overflow:visible" aria-hidden="true">
      <path data-shadow class="lsd-shadow" transform="translate(${-SHADOW} ${SHADOW})"></path>
      <path data-main class="lsd-main"></path>
      <path data-tick class="lsd-tick"></path>
    </svg>
    <div class="relative" style="padding:${INSET + 22}px ${INSET + 22}px ${INSET + 18}px">
      <div data-view-select>
        <div class="text-center mb-3">
          <h3 class="text-xl font-black text-slate-800 dark:text-slate-100 leading-tight"><i class="fa-solid fa-paper-plane theme-text-primary mr-1.5"></i>${esc(title)}</h3>
          ${subtitle ? `<p class="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">${esc(subtitle)}</p>` : ""}
        </div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-black text-slate-500 dark:text-slate-400">發送給（LINE 名稱，可複選）</span>
          ${list.length ? `<button type="button" data-m="all" class="text-xs font-black theme-text-primary">全選 / 取消</button>` : ""}
        </div>
        <div class="grid grid-cols-2 gap-2 max-h-[34vh] overflow-y-auto pr-0.5">${list.length ? rows : empty}</div>
        <p data-m="msg" class="text-xs font-bold text-red-600 min-h-[1rem] mt-2"></p>
        <button type="button" data-m="next" ${list.length ? "" : "disabled"} class="lsd-btn w-full mt-1 py-3 rounded-2xl theme-bg-primary text-white text-base font-black"><i class="fa-solid fa-paper-plane"></i> 發送</button>
      </div>
      <div data-view-confirm class="hidden">
        <div class="text-center mb-3">
          <div class="w-12 h-12 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center text-xl mb-2"><i class="fa-solid fa-circle-question"></i></div>
          <h3 class="text-lg font-black text-slate-800 dark:text-slate-100 leading-tight">${esc(confirmText || `確定要發送「${title}」嗎？`)}</h3>
          <p data-m="count" class="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1"></p>
        </div>
        <div data-m="names" class="flex flex-wrap justify-center gap-1.5 max-h-[22vh] overflow-y-auto mb-2"></div>
        <p data-m="msg2" class="text-xs font-bold text-red-600 min-h-[1rem] text-center"></p>
        <div class="grid grid-cols-2 gap-2.5 mt-1">
          <button type="button" data-m="back" class="lsd-btn py-3 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100 text-sm font-black">返回修改</button>
          <button type="button" data-m="go" class="lsd-btn py-3 rounded-2xl theme-bg-primary text-white text-sm font-black"><i class="fa-solid fa-paper-plane"></i> 確定發送</button>
        </div>
      </div>
    </div>
    <button type="button" data-m="close" aria-label="關閉" class="absolute w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center active:scale-90 transition" style="top:${INSET + 10}px;right:${INSET + 10}px"><i class="fa-solid fa-xmark text-sm"></i></button>
  </div>`;
  document.body.appendChild(wrap);

  const q = (k) => wrap.querySelector(`[data-m="${k}"]`);
  const box = wrap.querySelector("[data-box]");
  const items = () => [...wrap.querySelectorAll("input[data-uid]")];
  const vSel = wrap.querySelector("[data-view-select]"), vCon = wrap.querySelector("[data-view-confirm]");
  const dMain = wrap.querySelector("[data-main]"), dShadow = wrap.querySelector("[data-shadow]"), dTick = wrap.querySelector("[data-tick]");
  let busy = false;

  const draw = () => {
    const w = box.offsetWidth, h = box.offsetHeight;
    if (!w || !h) return;
    const [d, tick] = bubblePath(w, h);
    dMain.setAttribute("d", d); dShadow.setAttribute("d", d); dTick.setAttribute("d", tick);
  };
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(draw) : null;
  ro?.observe(box);
  draw();
  const close = () => { ro?.disconnect(); wrap.remove(); };

  wrap.addEventListener("change", (e) => {
    const cb = e.target.closest("input[data-uid]");
    if (cb) cb.closest("label").classList.toggle("lsd-on", cb.checked);
    q("msg").textContent = "";
  });

  wrap.addEventListener("click", async (e) => {
    if (e.target === wrap || e.target.closest('[data-m="close"]')) { if (!busy) close(); return; }
    if (e.target.closest('[data-m="all"]')) {
      const on = items().some((b) => !b.checked);
      items().forEach((b) => { b.checked = on; b.closest("label").classList.toggle("lsd-on", on); });
      q("msg").textContent = "";
      return;
    }
    if (e.target.closest('[data-m="next"]')) {                 // 第一步：選好對象 → 進入再次確認
      const picked = items().filter((b) => b.checked);
      if (!picked.length) { q("msg").textContent = "請至少選擇一位"; return; }
      q("count").textContent = `將發送給 ${picked.length} 位`;
      q("names").innerHTML = picked.map((b) => `<span class="px-3 py-1 rounded-full text-sm font-black theme-bg-primary text-white">${esc(b.dataset.name)}</span>`).join("");
      q("msg2").textContent = "";
      vSel.classList.add("hidden"); vCon.classList.remove("hidden");
      return;
    }
    if (e.target.closest('[data-m="back"]')) { if (busy) return; vCon.classList.add("hidden"); vSel.classList.remove("hidden"); return; }
    if (e.target.closest('[data-m="go"]')) {                   // 第二步：確定發送
      if (busy) return;
      const ids = items().filter((b) => b.checked).map((b) => b.dataset.uid);
      const go = q("go"), back = q("back");
      busy = true; q("msg2").textContent = ""; go.disabled = true; back.disabled = true;
      go.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 發送中…`;
      try {
        const n = await sendLineMessages(ids, await buildMessages());
        close();
        showToast(`已發送給 ${n} 位`);
      } catch (ex) {
        busy = false; go.disabled = false; back.disabled = false;
        go.innerHTML = `<i class="fa-solid fa-paper-plane"></i> 確定發送`;
        q("msg2").textContent = ex.message || String(ex);
      }
    }
  });
}
