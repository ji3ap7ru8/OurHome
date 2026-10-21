// 翻譯機 — Stage 4：純前端 UI 與邏輯。
// 訪客可用。不寫入任何永久儲存；離開頁面後輸入與結果保留在記憶體直到重新整理。
import { showTipHint, closeTips } from "../../core/tips.js";
import { on, emit } from "../../core/store.js";
import { holdAwake, releaseAwake } from "../../core/wakelock.js";
import { LANGS, AUTO, langOf, googleUrl, MAX_CHARS, translatorApi } from "./data.js";

const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let root = null;
let st = { from: "zh-TW", to: "en", text: "", result: "", status: "idle", offline: false, detected: null };
let seq = 0;            // 避免舊回應蓋掉新結果
let ctrl = null;        // 取消進行中的請求
let rec = null;         // 語音辨識實例
let listening = false;
// 即時翻譯：持續聆聽、邊說邊翻，語音辨識中斷時自動接續
let live = { on: false, items: [], interim: "", interimTr: "", rec: null, timer: null, iseq: 0, restarts: 0 };
let offLive = null;

const SR = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

const opts = (list, sel) => list.map((l) => `<option value="${l.code}" ${l.code === sel ? "selected" : ""}>${l.name}</option>`).join("");

function render() {
  root.innerHTML = `
    <div class="px-4 pt-3 pb-28">
      <div class="flex items-center gap-2 mb-3">
        <select data-from aria-label="來源語言" class="flex-1 min-w-0 h-12 px-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-base soft-shadow-sm border-0">${opts([AUTO, ...LANGS], st.from)}</select>
        <button data-tip="tr-swap" data-swap aria-label="對調語言" class="w-12 h-12 shrink-0 rounded-full theme-bg-light theme-text-primary text-lg active:scale-90 transition"><i class="fa-solid fa-right-left"></i></button>
        <select data-to aria-label="目標語言" class="flex-1 min-w-0 h-12 px-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-base soft-shadow-sm border-0">${opts(LANGS, st.to)}</select>
      </div>

      ${live.on ? liveCard() : `<div class="bg-white/95 dark:bg-slate-800/95 rounded-3xl soft-shadow-md p-4 mb-3">
        <textarea data-text rows="4" maxlength="${MAX_CHARS}" placeholder="輸入要翻譯的文字…" class="w-full bg-transparent resize-none outline-none text-xl font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 select-text">${esc(st.text)}</textarea>
        <div class="flex items-center gap-2 mt-2">
          ${SR ? `<button data-tip="tr-mic" data-mic aria-label="語音輸入" class="w-12 h-12 rounded-full ${listening ? "bg-rose-500 text-white animate-pulse" : "theme-bg-light theme-text-primary"} text-lg active:scale-90 transition"><i class="fa-solid fa-microphone"></i></button>` : ""}
          <button data-tip="tr-clear" data-clear aria-label="清除" class="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 active:scale-90 transition"><i class="fa-solid fa-xmark"></i></button>
          <span data-count class="text-xs font-bold text-slate-400 ml-1">${st.text.length}/${MAX_CHARS}</span>
          <button data-tip="tr-go" data-go class="ml-auto h-12 px-6 rounded-full theme-bg-primary text-white font-black text-lg soft-shadow-md active:scale-95 transition"><i class="fa-solid fa-language"></i> 翻譯</button>
        </div>
      </div>`}

      <div data-result-box></div>

    </div>`;
  renderResult();
  if (live.on) renderLive();
}

function liveCard() {
  return `<div class="bg-white/95 dark:bg-slate-800/95 rounded-3xl soft-shadow-md p-4 mb-3">
    <div class="flex items-center gap-2 mb-2">
      <span data-live-dot class="w-3 h-3 rounded-full ${listening ? "bg-rose-500 animate-pulse" : "bg-slate-300"}"></span>
      <span data-live-state class="text-sm font-black text-slate-600 dark:text-slate-200">${listening ? "聆聽中，請直接說話…" : SR ? "已暫停" : "此瀏覽器不支援語音辨識"}</span>
      <button data-live-clear aria-label="清除紀錄" class="ml-auto w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 active:scale-90 transition"><i class="fa-solid fa-xmark"></i></button>
      ${SR ? `<button data-live-pause aria-label="${listening ? "暫停" : "繼續"}" class="h-10 px-4 rounded-full theme-bg-primary text-white font-black active:scale-95 transition"><i class="fa-solid ${listening ? "fa-pause" : "fa-microphone"}"></i> ${listening ? "暫停" : "繼續"}</button>` : ""}
    </div>
    <div data-live-log class="max-h-[52vh] overflow-y-auto space-y-3 select-text"></div>
  </div>`;
}

function renderLive() {
  const box = root?.querySelector("[data-live-log]");
  if (!box) return;
  const row = (src, tr, dim) => `<div class="${dim ? "opacity-60" : ""}"><p class="text-sm font-semibold text-slate-500 dark:text-slate-400 break-words">${esc(src)}</p><p class="text-xl font-black text-slate-900 dark:text-white leading-snug break-words">${esc(tr) || "…"}</p></div>`;
  box.innerHTML = live.items.map((i) => row(i.src, i.tr)).join("") + (live.interim ? row(live.interim, live.interimTr, true) : "") ||
    `<p class="text-slate-400 font-semibold py-6 text-center">說話後，原文與翻譯會即時出現在這裡</p>`;
  box.scrollTop = box.scrollHeight;
}

function setLiveStatus() {
  const d = root?.querySelector("[data-live-dot]");
  if (d) d.className = `w-3 h-3 rounded-full ${listening ? "bg-rose-500 animate-pulse" : "bg-slate-300"}`;
  const t = root?.querySelector("[data-live-state]");
  if (t) t.textContent = listening ? "聆聽中，請直接說話…" : "已暫停";
  const b = root?.querySelector("[data-live-pause]");
  if (b) b.innerHTML = listening ? `<i class="fa-solid fa-pause"></i> 暫停` : `<i class="fa-solid fa-microphone"></i> 繼續`;
}

async function liveTranslate(text, from) {
  const r = await translatorApi.translate(text, from, st.to);
  return r.text;
}

const liveFrom = () => (st.from === "auto" ? "zh-TW" : st.from);

function startLive() {
  if (!SR || !live.on) return;
  stopRec();
  const rc = new SR();
  live.rec = rc;
  rc.lang = langOf(liveFrom()).speech;
  rc.continuous = true;
  rc.interimResults = true;
  rc.onstart = () => { listening = true; live.restarts = 0; setLiveStatus(); };
  rc.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      const said = (r[0]?.transcript || "").trim();
      if (r.isFinal) {
        live.interim = ""; live.interimTr = "";
        if (said) {
          const item = { src: said, tr: "" };
          live.items.push(item);
          if (live.items.length > 40) live.items.shift();
          const from = liveFrom();
          liveTranslate(said, from).then((t) => { item.tr = t; }).catch(() => { item.tr = "（翻譯失敗）"; }).finally(() => live.on && renderLive());
        }
      } else if (said) {
        live.interim = said;
        clearTimeout(live.timer);
        const my = ++live.iseq;
        live.timer = setTimeout(async () => { // 稍停頓才翻譯暫時結果，避免狂送請求
          try { const t = await liveTranslate(said, liveFrom()); if (my === live.iseq && live.on) { live.interimTr = t; renderLive(); } } catch {}
        }, 450);
      }
    }
    renderLive();
  };
  rc.onerror = (e) => {
    if (e.error === "not-allowed" || e.error === "service-not-allowed") { toast("無法使用麥克風，請確認已允許權限"); setLive(false); }
  };
  rc.onend = () => { // 瀏覽器會自動結束辨識（靜音、時間上限）：只要開關還開著就接續
    listening = false;
    if (live.rec === rc) live.rec = null;
    if (!live.on || live.paused) return setLiveStatus();
    setLiveStatus();
    live.restarts++;
    setTimeout(() => { if (live.on && !live.paused && !live.rec) startLive(); }, Math.min(300 * live.restarts, 2000));
  };
  try { rc.start(); } catch { listening = false; setLiveStatus(); }
}

function stopRec() {
  const rc = live.rec;
  live.rec = null;
  if (rc) { rc.onend = null; rc.onresult = null; rc.onerror = null; try { rc.abort(); } catch {} }
  listening = false;
}

function setLive(v) {
  if (v && !SR) toast("此瀏覽器不支援語音辨識，請改用 Chrome / Safari");
  v = !!v && !!SR;
  live.on = v; live.paused = false;
  clearTimeout(live.timer);
  live.iseq++;
  if (v) { stopAll(); live.items = []; live.interim = ""; live.interimTr = ""; holdAwake("translator-live"); }
  else { stopRec(); releaseAwake("translator-live"); live.interim = ""; live.interimTr = ""; }
  emit("translator:live-set", live.on);
  if (!root) return;
  render();
  if (v) startLive();
}

function renderResult() {
  const box = root.querySelector("[data-result-box]");
  if (!box) return;
  const to = langOf(st.to);
  if (st.status === "loading") {
    box.innerHTML = `<div class="bg-white/95 dark:bg-slate-800/95 rounded-3xl soft-shadow-md p-6 flex items-center justify-center gap-3 text-slate-500 dark:text-slate-300 font-bold"><span class="cal-spin"></span> 翻譯中…</div>`;
  } else if (st.status === "error") {
    box.innerHTML = `
      <div class="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-3xl p-5">
        <p class="text-base font-black text-red-600 dark:text-red-300 mb-1"><i class="fa-solid fa-triangle-exclamation"></i> 目前無法連線翻譯</p>
        <p class="text-sm font-medium text-red-600/80 dark:text-red-300/80 mb-3">請檢查網路，或改用 Google 翻譯網頁開啟。</p>
        <div class="flex gap-2">
          <button data-tip="tr-go" data-go class="flex-1 h-11 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-100 font-bold">再試一次</button>
          <a data-tip="tr-google" data-open-google href="${esc(googleUrl(st.from, st.to, st.text))}" target="_blank" rel="noopener noreferrer" class="flex-1 h-11 rounded-2xl theme-bg-primary text-white font-bold flex items-center justify-center">用 Google 翻譯開啟</a>
        </div>
      </div>`;
  } else if (st.result) {
    const known = LANGS.find((l) => l.code === st.detected);
    const detected = st.from === "auto" && st.detected ? `（偵測為：${esc(known ? known.name : st.detected)}）` : "";
    box.innerHTML = `
      <div class="bg-white/95 dark:bg-slate-800/95 rounded-3xl soft-shadow-md p-5 border-2 theme-border-primary">
        <p class="text-xs font-extrabold theme-text-primary mb-2">${to.name}${detected}</p>
        <p class="text-2xl font-black text-slate-900 dark:text-white leading-relaxed break-words select-text">${esc(st.result)}</p>
        <div class="flex flex-wrap gap-2 mt-4">
          ${canSpeak && to.speech ? `<button data-tip="tr-speak" data-speak class="h-11 px-4 rounded-full theme-bg-light theme-text-primary font-bold"><i class="fa-solid fa-volume-high"></i> 朗讀</button>` : ""}
          <button data-tip="tr-copy" data-copy class="h-11 px-4 rounded-full theme-bg-light theme-text-primary font-bold"><i class="fa-regular fa-copy"></i> 複製</button>
          <button data-tip="tr-big" data-big class="h-11 px-4 rounded-full theme-bg-light theme-text-primary font-bold"><i class="fa-solid fa-expand"></i> 放大給對方看</button>
        </div>
      </div>`;
  } else {
    box.innerHTML = "";
  }
}

// ---------- 行為 ----------
function stopAll() {
  seq++;
  ctrl?.abort();
  ctrl = null;
  rec?.abort?.();
  rec = null;
  listening = false;
  if (canSpeak) window.speechSynthesis.cancel();
}

async function translate() {
  const text = st.text.trim();
  if (!text) return toast("請先輸入要翻譯的文字");
  if (st.from !== "auto" && st.from === st.to) { st.result = text; st.status = "idle"; st.offline = false; return renderResult(); }
  ctrl?.abort();
  ctrl = new AbortController();
  const my = ++seq;
  const timer = setTimeout(() => ctrl?.abort(), 8000);
  st.status = "loading"; st.result = ""; st.offline = false;
  renderResult();
  try {
    const r = await translatorApi.translate(text, st.from, st.to, { signal: ctrl.signal });
    if (my !== seq) return;
    st.result = r.text; st.detected = r.detected; st.status = "idle";
  } catch (e) {
    if (my !== seq) return; // 已被新請求或離開頁面取代
    st.status = "error";
  } finally {
    clearTimeout(timer);
  }
  if (my === seq && root) renderResult();
}

function changeLang(which, code) {
  const prev = st[which];
  st[which] = code;
  const other = which === "from" ? "to" : "from";
  if (st[other] === code && code !== "auto") st[other] = prev === "auto" ? (code === "en" ? "zh-TW" : "en") : prev; // 避免兩邊相同
  st.result = ""; st.status = "idle"; st.offline = false;
  render();
  if (live.on && !live.paused) startLive(); // 即時翻譯中換語言：以新語言重新聆聽
}

function swap() {
  if (st.from === "auto") return toast("「自動偵測」無法對調，請先選擇來源語言");
  [st.from, st.to] = [st.to, st.from];
  st.text = st.result || st.text; // 把譯文帶回輸入框，方便回譯
  st.result = ""; st.status = "idle"; st.offline = false;
  render();
  if (live.on && !live.paused) startLive();
}

function speak() {
  if (!canSpeak) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(st.result);
  u.lang = langOf(st.to).speech;
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

async function copy() {
  try {
    await navigator.clipboard.writeText(st.result);
    toast("已複製");
  } catch {
    const ta = Object.assign(document.createElement("textarea"), { value: st.result });
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand("copy"); } catch {}
    ta.remove();
    toast(ok ? "已複製" : "複製失敗，請長按文字手動複製");
  }
}

function showBig() {
  const o = document.createElement("div");
  o.className = "fixed inset-0 z-[60] bg-white dark:bg-slate-900 flex items-center justify-center p-6";
  o.innerHTML = `
    <button data-tip="tr-x" data-x aria-label="關閉" class="absolute top-6 right-6 w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 text-xl text-slate-700 dark:text-slate-100"><i class="fa-solid fa-xmark"></i></button>
    <p class="font-black text-slate-900 dark:text-white text-center break-words leading-snug" style="font-size:${st.result.length > 40 ? "2rem" : st.result.length > 15 ? "2.8rem" : "3.6rem"}">${esc(st.result)}</p>`;
  o.onclick = () => o.remove();
  root.appendChild(o);
}

function toggleMic() {
  if (!SR) return;
  if (listening) { rec?.stop(); return; }
  rec = new SR();
  rec.lang = st.from === "auto" ? "zh-TW" : langOf(st.from).speech;
  rec.interimResults = false;
  rec.onresult = (e) => {
    const said = e.results?.[0]?.[0]?.transcript || "";
    if (said) { st.text = (st.text ? st.text + " " : "") + said; }
  };
  rec.onerror = () => toast("無法使用麥克風，請確認已允許權限");
  rec.onend = () => { listening = false; rec = null; if (root) { render(); } };
  try { rec.start(); listening = true; render(); } catch { listening = false; }
}

function toast(msg) {
  if (!root) return;
  root.querySelector("[data-toast]")?.remove();
  const t = document.createElement("div");
  t.dataset.toast = "";
  t.className = "fixed left-1/2 -translate-x-1/2 bottom-28 z-[70] bg-slate-700 text-white font-bold px-4 py-2 rounded-xl max-w-[85vw] text-center";
  t.textContent = msg;
  root.appendChild(t);
  setTimeout(() => t.remove(), 1800);
}

function onClick(e) {
  const q = (s) => e.target.closest(s);
  if (q("[data-go]")) return translate();
  if (q("[data-swap]")) return swap();
  if (q("[data-clear]")) { stopAll(); st.text = ""; st.result = ""; st.status = "idle"; st.offline = false; render(); return root.querySelector("[data-text]")?.focus(); }
  if (q("[data-speak]")) return speak();
  if (q("[data-copy]")) return copy();
  if (q("[data-big]")) return showBig();
  if (q("[data-mic]")) return toggleMic();
  if (q("[data-live-clear]")) { live.items = []; live.interim = ""; live.interimTr = ""; return renderLive(); }
  if (q("[data-live-pause]")) { if (listening || live.rec) { live.paused = true; stopRec(); setLiveStatus(); } else { live.paused = false; startLive(); } return; }
}

function onInput(e) {
  if (!e.target.matches("[data-text]")) return;
  st.text = e.target.value;
  const c = root.querySelector("[data-count]");
  if (c) c.textContent = `${st.text.length}/${MAX_CHARS}`;
}

function onChange(e) {
  if (e.target.matches("[data-from]")) changeLang("from", e.target.value);
  else if (e.target.matches("[data-to]")) changeLang("to", e.target.value);
}

function onKeydown(e) {
  if (e.target.matches?.("[data-text]") && e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); translate(); }
}

export default {
  id: "翻譯機",
  access: "public",
  mount(el) {
    root = el;
    showTipHint("translator");
    live = { on: false, items: [], interim: "", interimTr: "", rec: null, timer: null, iseq: 0, restarts: 0, paused: false };
    emit("translator:live-set", false); // 每次進入翻譯機，即時翻譯預設關閉
    offLive = on("translator:live", setLive);
    if (st.status === "loading") st.status = "idle";
    render();
    root.addEventListener("click", onClick);
    root.addEventListener("input", onInput);
    root.addEventListener("change", onChange);
    root.addEventListener("keydown", onKeydown);
  },
  unmount() {
    closeTips();
    offLive?.(); offLive = null;
    clearTimeout(live.timer);
    stopRec(); live.on = false; releaseAwake("translator-live");
    emit("translator:live-set", false);
    stopAll();
    root?.removeEventListener("click", onClick);
    root?.removeEventListener("input", onInput);
    root?.removeEventListener("change", onChange);
    root?.removeEventListener("keydown", onKeydown);
    if (st.status === "loading") st.status = "idle";
    root = null;
  },
};
