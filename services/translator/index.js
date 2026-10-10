// 翻譯機 — Stage 4：純前端 UI 與邏輯。
// 訪客可用。不寫入任何永久儲存；離開頁面後輸入與結果保留在記憶體直到重新整理。
import { LANGS, AUTO, langOf, PHRASES, phraseFor, googleUrl, MAX_CHARS, translatorApi } from "./data.js";

const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let root = null;
let st = { from: "zh-TW", to: "en", text: "", result: "", status: "idle", offline: false, detected: null };
let seq = 0;            // 避免舊回應蓋掉新結果
let ctrl = null;        // 取消進行中的請求
let rec = null;         // 語音辨識實例
let listening = false;

const SR = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

const opts = (list, sel) => list.map((l) => `<option value="${l.code}" ${l.code === sel ? "selected" : ""}>${l.name}</option>`).join("");

function render() {
  const phrases = st.from === "zh-TW" ? PHRASES.filter((p) => phraseFor(p, st.to)) : [];
  root.innerHTML = `
    <div class="px-4 pt-2 pb-28">
      <h2 class="text-2xl font-black text-slate-800 dark:text-slate-100 mb-3 px-1"><i class="fa-solid fa-language theme-text-primary"></i> 翻譯機</h2>

      <div class="flex items-center gap-2 mb-3">
        <select data-from aria-label="來源語言" class="flex-1 min-w-0 h-12 px-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-base soft-shadow-sm border-0">${opts([AUTO, ...LANGS], st.from)}</select>
        <button data-swap aria-label="對調語言" class="w-12 h-12 shrink-0 rounded-full theme-bg-light theme-text-primary text-lg active:scale-90 transition"><i class="fa-solid fa-right-left"></i></button>
        <select data-to aria-label="目標語言" class="flex-1 min-w-0 h-12 px-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-base soft-shadow-sm border-0">${opts(LANGS, st.to)}</select>
      </div>

      <div class="bg-white/95 dark:bg-slate-800/95 rounded-3xl soft-shadow-md p-4 mb-3">
        <textarea data-text rows="4" maxlength="${MAX_CHARS}" placeholder="輸入要翻譯的文字…" class="w-full bg-transparent resize-none outline-none text-xl font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 select-text">${esc(st.text)}</textarea>
        <div class="flex items-center gap-2 mt-2">
          ${SR ? `<button data-mic aria-label="語音輸入" class="w-12 h-12 rounded-full ${listening ? "bg-rose-500 text-white animate-pulse" : "theme-bg-light theme-text-primary"} text-lg active:scale-90 transition"><i class="fa-solid fa-microphone"></i></button>` : ""}
          <button data-clear aria-label="清除" class="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 active:scale-90 transition"><i class="fa-solid fa-xmark"></i></button>
          <span data-count class="text-xs font-bold text-slate-400 ml-1">${st.text.length}/${MAX_CHARS}</span>
          <button data-go class="ml-auto h-12 px-6 rounded-full theme-bg-primary text-white font-black text-lg soft-shadow-md active:scale-95 transition"><i class="fa-solid fa-language"></i> 翻譯</button>
        </div>
      </div>

      <div data-result-box></div>

      ${phrases.length ? `
      <div class="mt-5">
        <p class="text-sm font-extrabold text-slate-600 dark:text-slate-300 px-1 mb-2"><i class="fa-solid fa-bolt theme-text-primary"></i> 快捷常用句（點一下直接翻譯，不用網路）</p>
        <div class="flex flex-wrap gap-2">
          ${phrases.map((p, i) => `<button data-phrase="${PHRASES.indexOf(p)}" class="px-4 h-11 rounded-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-base soft-shadow-sm active:scale-95 transition">${esc(p.zh)}</button>`).join("")}
        </div>
      </div>` : ""}
    </div>`;
  renderResult();
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
          <button data-go class="flex-1 h-11 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-100 font-bold">再試一次</button>
          <a data-open-google href="${esc(googleUrl(st.from, st.to, st.text))}" target="_blank" rel="noopener noreferrer" class="flex-1 h-11 rounded-2xl theme-bg-primary text-white font-bold flex items-center justify-center">用 Google 翻譯開啟</a>
        </div>
      </div>`;
  } else if (st.result) {
    const known = LANGS.find((l) => l.code === st.detected);
    const detected = st.from === "auto" && st.detected ? `（偵測為：${esc(known ? known.name : st.detected)}）` : "";
    box.innerHTML = `
      <div class="bg-white/95 dark:bg-slate-800/95 rounded-3xl soft-shadow-md p-5 border-2 theme-border-primary">
        <p class="text-xs font-extrabold theme-text-primary mb-2">${to.name}${detected}${st.offline ? " ・內建常用句" : ""}</p>
        <p class="text-2xl font-black text-slate-900 dark:text-white leading-relaxed break-words select-text">${esc(st.result)}</p>
        <div class="flex flex-wrap gap-2 mt-4">
          ${canSpeak && to.speech ? `<button data-speak class="h-11 px-4 rounded-full theme-bg-light theme-text-primary font-bold"><i class="fa-solid fa-volume-high"></i> 朗讀</button>` : ""}
          <button data-copy class="h-11 px-4 rounded-full theme-bg-light theme-text-primary font-bold"><i class="fa-regular fa-copy"></i> 複製</button>
          <button data-big class="h-11 px-4 rounded-full theme-bg-light theme-text-primary font-bold"><i class="fa-solid fa-expand"></i> 放大給對方看</button>
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
}

function swap() {
  if (st.from === "auto") return toast("「自動偵測」無法對調，請先選擇來源語言");
  [st.from, st.to] = [st.to, st.from];
  st.text = st.result || st.text; // 把譯文帶回輸入框，方便回譯
  st.result = ""; st.status = "idle"; st.offline = false;
  render();
}

function usePhrase(i) {
  const p = PHRASES[i];
  const t = phraseFor(p, st.to);
  if (!t) return;
  seq++; ctrl?.abort();
  st.text = p.zh; st.result = t; st.status = "idle"; st.offline = true;
  render();
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
    <button data-x aria-label="關閉" class="absolute top-6 right-6 w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 text-xl text-slate-700 dark:text-slate-100"><i class="fa-solid fa-xmark"></i></button>
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
  const ph = q("[data-phrase]");
  if (ph) return usePhrase(Number(ph.dataset.phrase));
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
    if (st.status === "loading") st.status = "idle";
    render();
    root.addEventListener("click", onClick);
    root.addEventListener("input", onInput);
    root.addEventListener("change", onChange);
    root.addEventListener("keydown", onKeydown);
  },
  unmount() {
    stopAll();
    root?.removeEventListener("click", onClick);
    root?.removeEventListener("input", onInput);
    root?.removeEventListener("change", onChange);
    root?.removeEventListener("keydown", onKeydown);
    if (st.status === "loading") st.status = "idle";
    root = null;
  },
};
