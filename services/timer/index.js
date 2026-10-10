// 倒數計時器 — 純前端 UI，運算邏輯在 engine.js。
// 訪客可用（不設 requiresLogin）。不寫入任何永久儲存；重新整理即重置。
// 計時狀態放在模組層級：切換到其他服務時仍會繼續倒數，時間到會全螢幕提醒。
import { showTipHint, closeTips } from "../../core/tips.js";
import { createTimer, fmtClock, fmtSpoken, fromHMS, splitHMS, PRESETS } from "./engine.js";
import { unlockAudio, startAlarm, stopAlarm } from "../../core/alarm.js";
import { holdAwake, releaseAwake, wakeLockSupported } from "../../core/wakelock.js";
import { setChip } from "../../core/chips.js";
import { navigate } from "../../core/router.js";

const ID = "計時器";
const RING_R = 110;
const RING_C = 2 * Math.PI * RING_R;
const LABEL_IDEAS = ["煮飯", "燉湯", "泡茶", "吃藥", "洗衣"];
const FIELD_MAX = { h: 99, m: 59, s: 59 };
const FIELD_STEP = { h: 1, m: 1, s: 5 };

const timer = createTimer();
let soundOn = true;
let awakeOn = true;
let cancelArmed = false;

let root = null;
let renderedStatus = null;
let tickId = null;
let endId = null;
let cancelId = null;
let holdTimer = null;
let holdRepeat = null;
let alarmEl = null;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- 背景執行：計時 / 時間到 ---------- */

function schedule() {
  clearInterval(tickId);
  clearTimeout(endId);
  tickId = endId = null;
  if (timer.status !== "running") return;
  tickId = setInterval(tick, 250);
  endId = setTimeout(tick, timer.remaining() + 30);
}

function tick() {
  if (timer.check()) {
    schedule();
    onFinish();
  }
  refreshLive();
}

function syncSideEffects() {
  schedule();
  if (timer.status === "running" && awakeOn) holdAwake(ID);
  else releaseAwake(ID);
  refreshChip();
}

function refreshChip() {
  const st = timer.status;
  if (st === "running" || st === "paused") {
    setChip(ID, {
      icon: "fa-solid fa-hourglass-half",
      text: `${st === "paused" ? "暫停 " : ""}${fmtClock(timer.remaining())}`,
      aria: `計時器${st === "paused" ? "已暫停" : "計時中"}，剩 ${fmtSpoken(timer.remaining())}，點一下回到計時器`,
      route: ID,
      dim: st === "paused",
      onClick: () => navigate(ID),
    });
  } else {
    setChip(ID, null);
  }
}

function onFinish() {
  releaseAwake(ID);
  setChip(ID, null);
  startAlarm({ sound: soundOn, seconds: 60 });
  showAlarm();
  if (root) render();
}

/* ---------- 全螢幕「時間到」提醒 ---------- */

function showAlarm() {
  hideAlarm(false);
  alarmEl = document.createElement("div");
  alarmEl.setAttribute("role", "alertdialog");
  alarmEl.setAttribute("aria-label", "計時時間到");
  alarmEl.className = "absolute inset-0 z-[60] bg-rose-600 text-white flex flex-col items-center justify-center px-8 text-center";
  alarmEl.innerHTML = `
    <i class="fa-solid fa-bell ring-shake text-7xl mb-6"></i>
    <h2 class="text-4xl font-black mb-3">時間到了！</h2>
    ${timer.label ? `<p class="text-3xl font-black mb-3 break-all">${esc(timer.label)}</p>` : ""}
    <p class="text-lg font-bold opacity-90 mb-10">已倒數 ${fmtSpoken(timer.totalMs)}</p>
    <button data-tip="tm-alarm-stop" data-alarm="stop" class="w-full max-w-xs h-16 rounded-full bg-white text-rose-600 text-2xl font-black soft-shadow-lg active:scale-95 transition mb-4">關閉</button>
    <button data-tip="tm-alarm-more" data-alarm="more" class="w-full max-w-xs h-14 rounded-full border-2 border-white/80 text-white text-xl font-black active:scale-95 transition">再 1 分鐘</button>`;
  alarmEl.addEventListener("click", (e) => {
    const b = e.target.closest("[data-alarm]");
    if (!b) return;
    if (b.dataset.alarm === "more") {
      unlockAudio();
      timer.add(60_000);
      syncSideEffects();
    } else {
      timer.reset();
      syncSideEffects();
    }
    hideAlarm(true);
  });
  document.getElementById("appContainer").appendChild(alarmEl);
  alarmEl.querySelector("[data-alarm=stop]").focus();
}

function hideAlarm(stopSound) {
  if (stopSound) stopAlarm();
  alarmEl?.remove();
  alarmEl = null;
  if (root) render();
}

/* ---------- 畫面 ---------- */

function ringSvg() {
  const off = RING_C * (1 - timer.progress());
  const paused = timer.status === "paused";
  return `
    <div class="relative mx-auto w-full max-w-[18rem] aspect-square" role="timer" aria-label="剩餘 ${fmtSpoken(timer.remaining())}">
      <svg viewBox="0 0 260 260" class="w-full h-full">
        <circle cx="130" cy="130" r="${RING_R}" fill="none" stroke-width="16" class="stroke-slate-200 dark:stroke-slate-700"/>
        <circle data-ring cx="130" cy="130" r="${RING_R}" fill="none" stroke-width="16" stroke-linecap="round"
          stroke="var(--primary-color)" stroke-dasharray="${RING_C.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}"
          transform="rotate(-90 130 130)" opacity="${paused ? 0.45 : 1}"/>
        <text data-clock x="130" y="132" text-anchor="middle" font-size="40" font-weight="900" class="fill-slate-900 dark:fill-white" style="font-variant-numeric:tabular-nums">${fmtClock(timer.remaining())}</text>
        <text x="130" y="168" text-anchor="middle" font-size="17" font-weight="700" class="fill-slate-500 dark:fill-slate-400">${paused ? "已暫停" : esc(timer.label || "倒數中")}</text>
      </svg>
    </div>`;
}

function stepperPanel() {
  const { h, m, s } = splitHMS(timer.setMs);
  const col = (f, val, name) => `
    <div class="flex-1 flex flex-col items-center gap-2">
      <button data-step="${f}" data-dir="1" aria-label="${name}加" class="w-full h-14 rounded-2xl theme-bg-light theme-text-primary text-xl active:scale-95 transition select-none touch-none"><i class="fa-solid fa-chevron-up"></i></button>
      <div class="text-5xl font-black tabular-nums text-slate-900 dark:text-white leading-none py-1">${String(val).padStart(2, "0")}</div>
      <button data-step="${f}" data-dir="-1" aria-label="${name}減" class="w-full h-14 rounded-2xl theme-bg-light theme-text-primary text-xl active:scale-95 transition select-none touch-none"><i class="fa-solid fa-chevron-down"></i></button>
      <span class="text-sm font-extrabold text-slate-500 dark:text-slate-400">${name}</span>
    </div>`;
  return `
    <div class="bg-white/95 dark:bg-slate-800/95 rounded-3xl soft-shadow-md px-4 py-5 mb-4" data-clock-panel>
      <div class="flex items-start gap-1">
        ${col("h", h, "時")}<span class="text-4xl font-black text-slate-300 dark:text-slate-600 pt-[4.3rem]">:</span>
        ${col("m", m, "分")}<span class="text-4xl font-black text-slate-300 dark:text-slate-600 pt-[4.3rem]">:</span>
        ${col("s", s, "秒")}
      </div>
    </div>
    <div class="grid grid-cols-6 gap-2 mb-4">
      ${PRESETS.map((p) => `<button data-tip="tm-preset" data-tip-name="${p.label}" data-preset="${p.ms}" class="col-span-2 h-12 rounded-xl font-black text-base active:scale-95 transition ${timer.setMs === p.ms ? "theme-bg-primary text-white" : "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200"}">${p.label}</button>`).join("")}
    </div>
    <div class="mb-4">
      <input data-label type="text" maxlength="20" value="${esc(timer.label)}" placeholder="要提醒什麼？（可不填）" class="w-full h-12 px-4 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold text-base">
      <div class="flex flex-wrap gap-2 mt-2">
        ${LABEL_IDEAS.map((l) => `<button data-tip="tm-idea" data-tip-name="${l}" data-idea="${l}" class="px-3 h-9 rounded-full bg-white dark:bg-slate-800 soft-shadow-sm text-sm font-bold text-slate-600 dark:text-slate-300 active:scale-95 transition">${l}</button>`).join("")}
      </div>
    </div>`;
}

function controls() {
  const big = "h-16 rounded-full text-2xl font-black active:scale-95 transition";
  const st = timer.status;
  if (st === "idle") {
    const off = timer.setMs <= 0;
    return `<div class="grid grid-cols-3 gap-3">
      <button data-tip="tm-clear" data-act="clear" class="${big} text-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-100">清除</button>
      <button data-tip="tm-start" data-act="start" ${off ? "disabled" : ""} class="${big} col-span-2 ${off ? "bg-slate-300 dark:bg-slate-700 text-slate-500" : "theme-bg-primary text-white soft-shadow-md"}"><i class="fa-solid fa-play mr-2"></i>開始</button>
    </div>`;
  }
  return `
    <div class="grid grid-cols-2 gap-3 mb-3">
      <button data-tip="${st === "running" ? "tm-pause" : "tm-start"}" data-act="${st === "running" ? "pause" : "start"}" class="${big} theme-bg-primary text-white soft-shadow-md"><i class="fa-solid ${st === "running" ? "fa-pause" : "fa-play"} mr-2"></i>${st === "running" ? "暫停" : "繼續"}</button>
      <button data-tip="tm-plus" data-act="plus" class="${big} bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-xl">＋1 分鐘</button>
    </div>
    <button data-tip="tm-cancel" data-act="cancel" class="w-full h-12 rounded-full font-black text-base active:scale-95 transition ${cancelArmed ? "bg-red-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-100"}">${cancelArmed ? "再按一次確定取消" : "取消計時"}</button>`;
}

function options() {
  const sw = (key, on, text) => `
    <button data-tip="tm-toggle" data-tip-name="${text}" data-toggle="${key}" role="switch" aria-checked="${on}" class="flex items-center justify-between w-full px-1 py-2 text-base font-bold text-slate-700 dark:text-slate-200">
      <span>${text}</span>
      <span class="w-12 h-7 rounded-full p-0.5 transition ${on ? "theme-bg-primary" : "bg-slate-300 dark:bg-slate-600"}"><span class="block w-6 h-6 rounded-full bg-white transition ${on ? "translate-x-5" : ""}"></span></span>
    </button>`;
  return `<div class="mt-5 bg-white/80 dark:bg-slate-800/80 rounded-2xl px-4 py-1 soft-shadow-sm">
    ${sw("sound", soundOn, '<i class="fa-solid fa-volume-high theme-text-primary mr-2"></i>響鈴聲音')}
    ${wakeLockSupported() ? sw("awake", awakeOn, '<i class="fa-solid fa-sun theme-text-primary mr-2"></i>計時中螢幕保持亮著') : ""}
  </div>
  <p class="text-sm font-medium text-slate-500 dark:text-slate-400 mt-3 px-1 leading-relaxed">離開這一頁，計時仍會繼續；時間到會全螢幕提醒。請勿關閉或重新整理網頁，也建議不要讓手機鎖屏太久。</p>`;
}

function render() {
  if (!root) return;
  renderedStatus = timer.status;
  const st = timer.status;
  root.innerHTML = `
    <div class="px-4 pt-2 pb-28">
      <h2 class="text-2xl font-black text-slate-800 dark:text-slate-100 mb-3 px-1"><i class="fa-solid fa-hourglass-half theme-text-primary"></i> 計時器</h2>
      ${st === "idle" ? stepperPanel() : `<div class="mb-5">${ringSvg()}</div>`}
      ${controls()}
      ${options()}
    </div>`;
}

// 只更新會變動的數字與進度環，不重畫整頁（避免打斷按鈕點擊與輸入框）
function refreshLive() {
  refreshChip();
  if (!root) return;
  if (renderedStatus !== timer.status) return render();
  const clock = root.querySelector("[data-clock]");
  if (clock && timer.status !== "idle") {
    const t = fmtClock(timer.remaining());
    if (clock.textContent !== t) clock.textContent = t;
    root.querySelector("[data-ring]")?.setAttribute("stroke-dashoffset", (RING_C * (1 - timer.progress())).toFixed(2));
  }
}

/* ---------- 操作 ---------- */

function stepField(field, dir) {
  const cur = splitHMS(timer.setMs);
  const max = FIELD_MAX[field] + 1;
  cur[field] = (((cur[field] + dir * FIELD_STEP[field]) % max) + max) % max;
  timer.setDuration(fromHMS(cur.h, cur.m, cur.s));
  render();
}

function stopHold() {
  clearTimeout(holdTimer);
  clearInterval(holdRepeat);
  holdTimer = holdRepeat = null;
}

function onPointerDown(e) {
  const b = e.target.closest("[data-step]");
  if (!b || timer.status !== "idle") return;
  e.preventDefault();
  const { step, dir } = b.dataset;
  stepField(step, Number(dir));
  stopHold();
  // 長按連續加減
  holdTimer = setTimeout(() => {
    holdRepeat = setInterval(() => {
      if (!root || timer.status !== "idle") return stopHold();
      stepField(step, Number(dir));
    }, 110);
  }, 400);
}

function disarmCancel() {
  clearTimeout(cancelId);
  cancelId = null;
  cancelArmed = false;
}

function onClick(e) {
  // 鍵盤（Enter/Space）啟動步進按鈕：detail 為 0；滑鼠/觸控已由 pointerdown 處理
  const stepBtn = e.target.closest("[data-step]");
  if (stepBtn) {
    if (e.detail === 0 && timer.status === "idle") stepField(stepBtn.dataset.step, Number(stepBtn.dataset.dir));
    return;
  }
  const preset = e.target.closest("[data-preset]");
  if (preset) {
    timer.setDuration(Number(preset.dataset.preset));
    return render();
  }
  const idea = e.target.closest("[data-idea]");
  if (idea) {
    timer.label = idea.dataset.idea;
    return render();
  }
  const tog = e.target.closest("[data-toggle]");
  if (tog) {
    if (tog.dataset.toggle === "sound") soundOn = !soundOn;
    else {
      awakeOn = !awakeOn;
      syncSideEffects();
    }
    return render();
  }
  const act = e.target.closest("[data-act]")?.dataset.act;
  if (!act) return;
  if (act !== "cancel") disarmCancel();

  if (act === "start") {
    unlockAudio(); // 必須在使用者點擊當下，鬧鈴才響得出來
    if (!timer.start()) return;
  } else if (act === "pause") timer.pause();
  else if (act === "plus") timer.add(60_000);
  else if (act === "clear") {
    timer.setDuration(0);
    timer.label = "";
  } else if (act === "cancel") {
    if (!cancelArmed) {
      cancelArmed = true;
      cancelId = setTimeout(() => {
        cancelArmed = false;
        render();
      }, 3000);
      return render();
    }
    disarmCancel();
    timer.reset();
  }
  syncSideEffects();
  render();
}

function onInput(e) {
  const inp = e.target.closest("[data-label]");
  if (inp) timer.label = inp.value;
}

function onVisible() {
  if (!document.hidden) tick(); // 從背景切回來立刻校正並檢查是否已到時間
}
document.addEventListener("visibilitychange", onVisible);

export default {
  id: ID,
  access: "public",
  mount(el) {
    root = el;
    showTipHint("timer");
    cancelArmed = false;
    render();
    root.addEventListener("click", onClick);
    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("input", onInput);
    window.addEventListener("pointerup", stopHold);
    window.addEventListener("pointercancel", stopHold);
    refreshChip();
  },
  unmount() {
    closeTips();
    root?.removeEventListener("click", onClick);
    root?.removeEventListener("pointerdown", onPointerDown);
    root?.removeEventListener("input", onInput);
    window.removeEventListener("pointerup", stopHold);
    window.removeEventListener("pointercancel", stopHold);
    stopHold();
    disarmCancel();
    root = null;
    renderedStatus = null;
    refreshChip(); // 離開頁面後，若仍在倒數就顯示背景小膠囊（計時狀態保留在記憶體）
  },
};
