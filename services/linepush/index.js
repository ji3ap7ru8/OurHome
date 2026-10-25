// LINE推播 — 挑一款圖卡模版、改文字與顏色、預覽，再用 LINE Bot 發給系統設定裡的接收對象。
// 圖卡資料／預覽／Flex 格式搬自 Apps Script 版「推播服務」：templates.js（26 款模版）、render.js（預覽）、flex.js（實際送出的訊息）。
// 送出方式：瀏覽器把「Bot Token + 接收對象 + 訊息」POST 給系統設定 → LINE Notify → Apps Script 的中繼站網址，由中繼站（apps-script/Code.gs）呼叫 LINE API。
import { closeTips } from "../../core/tips.js";
import { state, on } from "../../core/store.js";
import { showToast } from "../../core/toast.js";
import { categories, templates, DEFAULT_IMG } from "./templates.js";
import { renderTemplateHTML } from "./render.js";
import { generateFlexPayload } from "./flex.js";

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (id) => document.getElementById(id);

let root = null;
let view = "lobby";        // lobby（模版清單）｜editor（編輯）
let category = "all";
let activeTpl = null;
let offBot = null;
let sending = false;

const INPUT = "select-text w-full px-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none theme-focus-border";
const LABEL = "text-[11px] font-bold text-slate-700 dark:text-slate-200";
const CHIP = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[11px] font-bold text-slate-600 dark:text-slate-200 active:scale-95 transition";
const NO_PLAIN = ["textOnly", "purePhoto", "sticker"]; // 這三款沒有「製作：某某」署名

const PALETTES = [["#06C755", "LINE 綠"], ["#0867D7", "科技藍"], ["#996047", "大地棕"], ["#FF7D00", "暖橘色"], ["#E11D48", "玫瑰紅"], ["#9333EA", "高雅紫"]];
const CARD_BGS = [["#ffffff", "珍珠白"], ["#f0f9ff", "粉藍色"], ["#f0fdf4", "淺青綠"], ["#fffbeb", "暖奶油"], ["#fdf2f8", "柔粉色"], ["#1e293b", "深石墨"]];

/* ---------- 畫面 ---------- */
function render() {
  if (!root) return;
  root.innerHTML = `<div class="px-5 pt-1 pb-6 space-y-4">${view === "lobby" ? lobbyHTML() : editorHTML()}</div><div id="lpModal"></div>`;
  if (view === "editor") fillEditor();
}

function lobbyHTML() {
  const list = category === "all" ? templates : templates.filter((t) => t.cat === category);
  const chips = categories.map((c) => {
    const n = c.id === "all" ? templates.length : templates.filter((t) => t.cat === c.id).length;
    const on = c.id === category;
    return `<button type="button" data-lp="cat" data-id="${c.id}" class="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-black border transition active:scale-95 ${on ? "text-white border-transparent" : "bg-white/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-700"}" ${on ? 'style="background:#06c755"' : ""}>${esc(c.name)} (${n})</button>`;
  }).join("");
  const cards = list.map((t) => `
    <article class="rounded-2xl bg-white/85 dark:bg-slate-800/85 border border-white/70 dark:border-slate-700/70 p-2.5 flex flex-col gap-2 soft-shadow-sm">
      <span class="text-[11px] font-black text-slate-700 dark:text-slate-100 leading-tight">${esc(t.name)}</span>
      <span class="self-start text-[10px] font-bold text-white px-2 py-0.5 rounded-full" style="background:#06c755">${esc(t.tag)}</span>
      <div class="rounded-xl overflow-hidden relative pointer-events-none" style="background:#849cb8;height:170px">
        <div class="line-tpl-root absolute left-1/2 top-2" style="width:300px;transform:translateX(-50%) scale(.56);transform-origin:top center">
          ${renderTemplateHTML(t, "#0867d7", "#ffffff", t.cardBg || "#ffffff", t.textColor || "#111111")}
        </div>
      </div>
      <button type="button" data-lp="use" data-id="${t.id}" class="w-full py-2 rounded-xl text-white text-xs font-black active:scale-95 transition" style="background:#06c755">選擇此模版</button>
    </article>`).join("");
  return `
    ${setupHint()}
    <div class="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1">${chips}</div>
    <div class="grid grid-cols-2 gap-3">${cards}</div>`;
}

// 還沒設好中繼站 / Token / 接收對象時，在模版清單上方提醒
function setupHint() {
  const miss = [];
  if (!state.lineRelayUrl) miss.push("Apps Script 中繼站 URL");
  if (!state.lineBotToken) miss.push("Bot Token");
  if (!state.lineBotIds.length) miss.push("接收對象");
  if (!miss.length) return "";
  return `<div class="rounded-2xl border border-amber-300/70 bg-amber-50/90 dark:bg-amber-900/20 dark:border-amber-700/60 px-3.5 py-2.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 leading-relaxed">
    <i class="fa-solid fa-circle-info mr-1"></i>要發送訊息，請先到「系統設定 → LINE Notify」填入：${miss.join("、")}。（登入 Google 後才會讀取到設定；現在仍可先製作與預覽圖卡）
    <button type="button" data-action="open-settings" data-mode="all" class="block mt-1.5 underline">開啟系統設定</button></div>`;
}

function editorHTML() {
  const pal = PALETTES.map(([c, n]) => `<button type="button" data-lp="palette" data-color="${c}" class="${CHIP}"><span class="w-3 h-3 rounded-full border border-black/10" style="background:${c}"></span>${n}</button>`).join("");
  const bgs = CARD_BGS.map(([c, n]) => `<button type="button" data-lp="cardbg" data-color="${c}" class="${CHIP}"><span class="w-3 h-3 rounded-full border border-black/10" style="background:${c}"></span>${n}</button>`).join("");
  const colorBox = (id, label, val) => `<label for="${id}" class="flex items-center justify-between gap-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2"><span class="text-[11px] font-bold text-slate-600 dark:text-slate-200 whitespace-nowrap">${label}</span><input type="color" id="${id}" value="${val}" class="w-7 h-7 p-0 border-0 bg-transparent rounded cursor-pointer"></label>`;
  const grp = (id, label, field) => `<div id="${id}" class="flex flex-col gap-1.5">${label}${field}</div>`;
  const lbl = (f, t) => `<label for="${f}" class="${LABEL}">${t}</label>`;
  const ta = (id) => `<textarea id="${id}" rows="1" class="${INPUT} resize-none overflow-hidden"></textarea>`;
  const num = (id, label, v, max) => `<label class="rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2 block"><span class="text-[10px] font-bold text-slate-500 dark:text-slate-300">${label}</span><input type="number" id="${id}" value="${v}" min="0" ${max ? `max="${max}"` : ""} class="select-text w-full bg-transparent text-sm font-black text-slate-700 dark:text-slate-100 focus:outline-none"></label>`;
  return `
    <div class="flex items-center justify-between gap-2">
      <button type="button" data-lp="back" class="px-3 py-2 rounded-xl bg-white/85 dark:bg-slate-800/85 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-600 dark:text-slate-200 active:scale-95 transition"><i class="fa-solid fa-arrow-left mr-1"></i>返回模版</button>
      <button type="button" data-lp="clear" class="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-xs font-black text-rose-500 active:scale-95 transition"><i class="fa-solid fa-eraser mr-1"></i>清除</button>
    </div>
    <h3 id="lpEditorTitle" class="text-base font-black text-slate-800 dark:text-slate-100"></h3>
    <div class="rounded-2xl bg-white/85 dark:bg-slate-800/85 border border-white/70 dark:border-slate-700/70 p-3.5 space-y-3 soft-shadow-sm">
      <div id="paletteSection" class="space-y-2">
        <p class="${LABEL}"><i class="fa-solid fa-palette mr-1" style="color:#06c755"></i>主題與按鈕色彩建議</p>
        <div class="flex flex-wrap gap-2">${pal}</div>
        <p class="${LABEL} pt-1"><i class="fa-regular fa-image mr-1" style="color:#06c755"></i>卡片背景顏色建議</p>
        <div class="flex flex-wrap gap-2">${bgs}</div>
        <div class="grid grid-cols-2 gap-2 pt-1">
          ${colorBox("primaryColor", "主題色彩", "#0867d7")}${colorBox("textColor", "文字顏色", "#111111")}
          ${colorBox("btnTextColor", "按鈕文字", "#ffffff")}${colorBox("cardBgColor", "圖卡背景", "#ffffff")}
        </div>
      </div>
      ${grp("grpTagText", lbl("fieldTagText", "版本標籤 (Tag 文字)"), `<input type="text" id="fieldTagText" placeholder="例如：NEW RELEASE" class="${INPUT}">`)}
      ${grp("grpStars", lbl("fieldStars", "評分星星數量"), `<select id="fieldStars" class="${INPUT}">${[5, 4, 3, 2, 1].map((n) => `<option value="${n}">${"★".repeat(n)}${"☆".repeat(5 - n)} (${n} 星)</option>`).join("")}</select>`)}
      <div id="grpCountdown" class="space-y-1.5"><p class="${LABEL}">⏳ 倒數時間設定</p>
        <div class="grid grid-cols-3 gap-2">${num("fieldCountHours", "時", 12)}${num("fieldCountMins", "分", 45, 59)}${num("fieldCountSecs", "秒", 30, 59)}</div></div>
      ${grp("grpWeatherIcon", lbl("fieldWeatherIcon", "天氣預報主要圖示"), `<select id="fieldWeatherIcon" class="${INPUT}">${[["☀️", "晴天"], ["⛅", "多雲"], ["🌧️", "雨天"], ["🌩️", "雷雨"], ["❄️", "下雪"], ["🌫️", "濃霧"], ["🌂", "雨傘"], ["🏖️", "陽光沙灘"]].map(([v, n]) => `<option value="${v}">${v} ${n}</option>`).join("")}</select>`)}
      ${grp("grpProgress", lbl("fieldProgressPct", "物流進度百分比 (%)"), `<div class="flex items-center gap-3"><input type="range" id="fieldProgressRange" min="0" max="100" value="65" class="flex-1" style="accent-color:#06c755"><input type="number" id="fieldProgressPct" min="0" max="100" value="65" class="${INPUT} !w-20"> %</div>`)}
      ${grp("grpTitle", lbl("fieldTitle", "主要標題"), ta("fieldTitle"))}
      ${grp("grpSubtitle", lbl("fieldSubtitle", "副標題 / 備註資訊"), ta("fieldSubtitle"))}
      ${grp("grpContent", `<label id="lblContent" for="fieldContent" class="${LABEL}">主要內容 (支援換行，可用 | 分隔)</label>`, ta("fieldContent"))}
      ${grp("grpButton", lbl("fieldButton", "行動按鈕文字 (多顆按鈕可用 | 分隔)"), ta("fieldButton"))}
      ${grp("grpButtonUrl", lbl("fieldButtonUrl", "按鈕連結網址 (多顆按鈕可用 | 分隔)"), `<input type="text" id="fieldButtonUrl" placeholder="https://… 或自訂網址" autocapitalize="off" spellcheck="false" class="${INPUT}">`)}
      ${grp("grpImage", lbl("fieldImage", "圖片網址"), ta("fieldImage"))}
      <div id="grpSticker" class="grid grid-cols-2 gap-2">
        <div class="flex flex-col gap-1.5">${lbl("fieldPkgId", "Package ID (貼圖包)")}${ta("fieldPkgId")}</div>
        <div class="flex flex-col gap-1.5">${lbl("fieldStickerId", "Sticker ID (貼圖)")}${ta("fieldStickerId")}</div>
      </div>
      <a id="btnStickerLink" href="https://developers.line.biz/en/docs/messaging-api/sticker-list/" target="_blank" rel="noopener noreferrer" class="items-center justify-center gap-1.5 py-2 rounded-xl text-white text-xs font-black" style="background:#06c755"><i class="fa-solid fa-arrow-up-right-from-square"></i>查看 LINE 貼圖列表</a>
    </div>
    <button type="button" data-lp="preview" class="w-full py-3 rounded-2xl text-white text-sm font-black flex items-center justify-center gap-2 active:scale-95 transition" style="background:#06c755"><i class="fa-solid fa-eye"></i>預覽與發送</button>`;
}

/* ---------- 編輯頁：填值 / 顯示欄位 ---------- */
function fillEditor() {
  const t = activeTpl;
  const set = (id, v) => { const el = $(id); if (el) el.value = v; };
  $("lpEditorTitle").textContent = t.name;
  set("fieldTitle", t.title || "");
  set("fieldSubtitle", t.subtitle || "");
  set("fieldContent", t.content || "");
  set("fieldButton", t.button || "");
  set("fieldButtonUrl", t.buttonUrl || "");
  set("fieldImage", t.image || "");
  set("cardBgColor", t.cardBg || "#ffffff");
  set("textColor", t.textColor || (t.cardBg === "#1e293b" ? "#ffffff" : "#111111"));
  set("fieldTagText", t.tagText || "NEW RELEASE");
  set("fieldStars", t.stars || "5");
  set("fieldCountHours", t.hours || "12");
  set("fieldCountMins", t.mins || "45");
  set("fieldCountSecs", t.secs || "30");
  if (t.weatherIcon) set("fieldWeatherIcon", t.weatherIcon);
  if (t.progressPct !== undefined) { set("fieldProgressPct", t.progressPct); set("fieldProgressRange", t.progressPct); }
  if (t.packageId) set("fieldPkgId", t.packageId);
  if (t.stickerId) set("fieldStickerId", t.stickerId);
  configureForm(t.id);
  root.querySelectorAll("textarea").forEach(autoResize);
}

function configureForm(id) {
  const show = (gid, d) => { const el = $(gid); if (el) el.style.display = d; };
  const hide = (...g) => g.forEach((x) => show(x, "none"));
  ["grpTitle", "grpSubtitle", "grpContent", "grpButton", "grpButtonUrl", "grpImage"].forEach((g) => show(g, "flex"));
  show("paletteSection", "block");
  hide("grpSticker", "btnStickerLink", "grpWeatherIcon", "grpProgress", "grpTagText", "grpStars", "grpCountdown");
  const lc = $("lblContent");
  lc.textContent = "主要內容 (支援換行，可用 | 分隔)";
  if (id === "changelog") show("grpTagText", "flex");
  else if (id === "rating") { show("grpStars", "flex"); hide("grpImage"); }
  else if (id === "countdown") { show("grpCountdown", "block"); hide("grpImage"); }
  else if (id === "textOnly") { hide("paletteSection", "grpTitle", "grpSubtitle", "grpButton", "grpButtonUrl", "grpImage"); lc.textContent = "純文字對話內容"; }
  else if (id === "purePhoto") hide("paletteSection", "grpTitle", "grpSubtitle", "grpContent", "grpButton", "grpButtonUrl");
  else if (id === "sticker") { hide("paletteSection", "grpTitle", "grpSubtitle", "grpContent", "grpButton", "grpButtonUrl", "grpImage"); show("grpSticker", "grid"); show("btnStickerLink", "flex"); }
  else if (id === "weather") { hide("grpImage"); show("grpWeatherIcon", "flex"); lc.textContent = "天氣項目 (支援換行)"; }
  else if (id === "progressTracker") { hide("grpImage"); show("grpProgress", "flex"); lc.textContent = "狀態文字描述 (例如: 已抵達區域轉運中心)"; }
  else if (id === "birthday" || id === "mapLocation") hide("grpImage");
  else if (id === "videoCard") hide("grpContent");
  else if (id === "stats") { hide("grpImage"); lc.textContent = "數據指標 (每行一項，例: 總學習時長: 18.5 小時)"; }
  else if (id === "poll") { hide("grpImage"); lc.textContent = "選項名稱 | 百分比 (支援多行，例如: 選項A|58)"; }
  else if (["itinerary", "receipt", "notice", "booking", "coupon", "memberCard", "multiBtn", "compare", "barcode", "faq"].includes(id)) hide("grpImage");
}

function autoResize(el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }

function clearFields() {
  ["fieldTitle", "fieldSubtitle", "fieldContent", "fieldButton", "fieldButtonUrl", "fieldImage", "fieldPkgId", "fieldStickerId", "fieldTagText", "fieldCountHours", "fieldCountMins", "fieldCountSecs"].forEach((id) => { const el = $(id); if (el) el.value = ""; });
  if ($("fieldStars")) $("fieldStars").value = "5";
  root.querySelectorAll("textarea").forEach(autoResize);
  refreshPreview();
}

/* ---------- 讀表單 → 訊息 ---------- */
function readFields() {
  const v = (id) => ($(id)?.value ?? "").trim();
  return {
    id: activeTpl.id, title: v("fieldTitle"), subtitle: v("fieldSubtitle"), content: v("fieldContent"),
    button: v("fieldButton"), buttonUrl: v("fieldButtonUrl"), image: v("fieldImage"), tagText: v("fieldTagText"),
    stars: $("fieldStars")?.value || "5", weatherIcon: $("fieldWeatherIcon")?.value || "", progressPct: $("fieldProgressPct")?.value || "",
    packageId: v("fieldPkgId"), stickerId: v("fieldStickerId"),
    hours: $("fieldCountHours")?.value || "12", mins: $("fieldCountMins")?.value || "45", secs: $("fieldCountSecs")?.value || "30",
  };
}
const colors = () => ({ primary: $("primaryColor").value, btnText: $("btnTextColor").value, cardBg: $("cardBgColor").value, text: $("textColor").value });

function buildMessage() {
  if (!activeTpl) return null;
  const c = readFields();
  if (c.id === "textOnly") return { type: "text", text: c.content || "無內容" };
  if (c.id === "purePhoto") { const u = c.image || DEFAULT_IMG; return { type: "image", originalContentUrl: u, previewImageUrl: u }; }
  if (c.id === "sticker") return { type: "sticker", packageId: c.packageId || "11537", stickerId: c.stickerId || "52002734" };
  const k = colors();
  return generateFlexPayload(c, k.primary, k.btnText, k.cardBg, k.text, $("authorSelect")?.value || "");
}

/* ---------- 預覽 / 發送視窗 ---------- */
function openPreview() {
  const names = state.lineBotIds.filter((x) => x.name).map((x) => x.name);
  const def = names.includes(state.nickname) ? state.nickname : (names[0] || "");
  const recips = state.lineBotIds.length
    ? state.lineBotIds.map((x) => `<label class="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[11px] font-bold text-slate-700 dark:text-slate-100 min-w-0"><input type="checkbox" class="lp-cb shrink-0" style="accent-color:#06c755" value="${esc(x.userId)}"><span class="truncate">${esc(x.name || x.userId)}</span></label>`).join("")
    : `<p class="col-span-3 text-[11px] text-slate-400 text-center py-1">還沒有接收對象，請到「系統設定 → LINE Notify」新增 User ID</p>`;
  const authors = [...names.map((n) => `<option value="${esc(n)}" ${n === def ? "selected" : ""}>${esc(n)}</option>`), `<option value="" ${def ? "" : "selected"}>不使用</option>`].join("");
  $("lpModal").innerHTML = `
    <div class="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/50 backdrop-blur-[2px]" data-lp="close-bg">
      <div class="w-full max-w-md max-h-[92dvh] flex flex-col rounded-t-3xl bg-slate-50 dark:bg-slate-900 shadow-2xl" role="dialog" aria-label="預覽與發送">
        <div class="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
          <p class="text-sm font-black text-slate-800 dark:text-slate-100">手機即時訊息預覽</p>
          <button type="button" data-lp="close" aria-label="關閉" class="w-8 h-8 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-500 dark:text-slate-200 flex items-center justify-center active:scale-90 transition"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="overflow-y-auto px-5 pb-2 flex-1 min-h-0">
          <div class="rounded-2xl p-3.5 mx-auto" style="background:#849cb8;max-width:340px"><div class="line-tpl-root" id="modalPreviewRender"></div></div>
        </div>
        <div class="px-5 pt-3 pb-5 space-y-3 shrink-0 border-t border-slate-200/70 dark:border-slate-700">
          <div class="flex items-center justify-between"><p class="${LABEL}">📩 選擇發送對象 (可複選)</p><button type="button" data-lp="none" class="text-[11px] font-bold underline" style="color:#06c755">取消全選</button></div>
          <div class="grid grid-cols-3 gap-1.5">${recips}</div>
          <div class="flex items-center justify-between gap-3">
            <label class="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-200 ${NO_PLAIN.includes(activeTpl.id) ? "hidden" : ""}" id="authorFieldWrap">🏷️ 稱呼
              <select id="authorSelect" class="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs text-slate-700 dark:text-slate-100 focus:outline-none">${authors}</select></label>
            <button type="button" id="btnSendLine" data-lp="send" class="ml-auto px-5 py-2.5 rounded-xl text-white text-sm font-black active:scale-95 transition disabled:opacity-60" style="background:#06c755"><i class="fa-solid fa-paper-plane mr-1"></i>發送訊息</button>
          </div>
          <p class="text-[10px] font-bold text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/60 rounded-lg px-2.5 py-1.5 text-center">⚠️ 請勿大量重複發送，LINE API 用量有限，請適量使用</p>
        </div>
      </div>
    </div>`;
  refreshPreview();
}
const closePreview = () => { const m = $("lpModal"); if (m) m.innerHTML = ""; };

function refreshPreview() {
  const box = $("modalPreviewRender");
  if (!box || !activeTpl) return;
  const k = colors();
  box.innerHTML = renderTemplateHTML(readFields(), k.primary, k.btnText, k.cardBg, k.text);
}

async function send() {
  if (sending) return;
  const to = [...root.querySelectorAll(".lp-cb:checked")].map((cb) => cb.value);
  if (!to.length) return showToast("請選擇至少一位發送對象", 3200, { error: true });
  if (!state.lineRelayUrl) return showToast("還沒設定中繼站 URL（系統設定 → LINE Notify → Apps Script）", 3600, { error: true });
  if (!state.lineBotToken) return showToast("還沒設定 Bot Token（系統設定 → LINE Notify → Bot Token）", 3600, { error: true });
  const msg = buildMessage();
  if (!msg) return showToast("訊息格式產生失敗", 3200, { error: true });
  const btn = $("btnSendLine");
  sending = true;
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>發送中…'; }
  try {
    // text/plain 是「簡單請求」，不會觸發 CORS 預檢，Apps Script 網頁應用程式才收得到
    const res = await fetch(state.lineRelayUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "push", token: state.lineBotToken, to, messages: [msg] }) });
    const out = await res.json();
    showToast(out.message || (out.success ? "已發送" : "發送失敗"), 3600, out.success ? {} : { error: true });
    if (out.success) closePreview();
  } catch (e) {
    showToast("發送失敗：連不到中繼站，請確認網址是「部署成網頁應用程式（任何人可存取）」的 /exec 網址", 4500, { error: true });
  } finally {
    sending = false;
    const b = $("btnSendLine");
    if (b) { b.disabled = false; b.innerHTML = '<i class="fa-solid fa-paper-plane mr-1"></i>發送訊息'; }
  }
}

/* ---------- 事件 ---------- */
function onClick(e) {
  const el = e.target.closest("[data-lp]");
  if (!el) return;
  const a = el.dataset.lp;
  if (a === "close-bg") { if (e.target === el) closePreview(); return; }
  if (a === "cat") { category = el.dataset.id; render(); }
  else if (a === "use") { activeTpl = JSON.parse(JSON.stringify(templates.find((t) => t.id === el.dataset.id))); view = "editor"; render(); root.closest(".overflow-y-auto")?.scrollTo?.({ top: 0 }); }
  else if (a === "back") { view = "lobby"; activeTpl = null; render(); }
  else if (a === "clear") clearFields();
  else if (a === "palette") { $("primaryColor").value = el.dataset.color; $("btnTextColor").value = "#ffffff"; refreshPreview(); }
  else if (a === "cardbg") { const c = el.dataset.color; $("cardBgColor").value = c; $("textColor").value = c === "#1e293b" ? "#ffffff" : "#111111"; refreshPreview(); }
  else if (a === "preview") openPreview();
  else if (a === "close") closePreview();
  else if (a === "none") root.querySelectorAll(".lp-cb").forEach((cb) => { cb.checked = false; });
  else if (a === "send") send();
}

function onInput(e) {
  const t = e.target;
  if (t.tagName === "TEXTAREA") autoResize(t);
  if (t.id === "fieldProgressRange") $("fieldProgressPct").value = t.value;
  if (t.id === "fieldProgressPct") $("fieldProgressRange").value = t.value;
  refreshPreview();
}

export default {
  id: "LINE推播",
  access: "public",
  mount(el) {
    root = document.createElement("div");
    root.className = "min-h-full";
    el.appendChild(root);
    view = "lobby"; category = "all"; activeTpl = null; sending = false;
    root.addEventListener("click", onClick);
    root.addEventListener("input", onInput);
    root.addEventListener("change", onInput);
    offBot = on("linebotids:change", () => { if (view === "lobby") render(); }); // 設定改了（例如剛登入讀到雲端設定），更新提醒
    render();
  },
  unmount() { closeTips(); offBot?.(); offBot = null; root?.remove(); root = null; activeTpl = null; },
};
