// 碼表 — 純前端 UI，運算邏輯在 engine.js。
// 訪客可用（不設 requiresLogin）。不寫入任何永久儲存；重新整理即重置。
// 計時狀態放在模組層級：切換到其他服務時碼表仍會繼續跑，Dock 上方會出現小膠囊。
import { showTipHint, closeTips } from "../../core/tips.js";
import { createStopwatch, fmtStopwatch } from "./engine.js";
import { setChip } from "../../core/chips.js";
import { holdAwake, releaseAwake } from "../../core/wakelock.js";
import { navigate } from "../../core/router.js";

const ID = "碼表";
const sw = createStopwatch();

let root = null;
let raf = null;
let chipId = null;
let confirmReset = false;
let confirmId = null;

/* ---------- 背景小膠囊 ---------- */

function refreshChip() {
  if (sw.status === "idle") return setChip(ID, null);
  setChip(ID, {
    icon: "fa-solid fa-stopwatch",
    text: `${sw.status === "paused" ? "暫停 " : ""}${fmtStopwatch(sw.elapsed()).replace(/\.\d+$/, "")}`,
    aria: `碼表${sw.status === "paused" ? "已暫停" : "計時中"}，點一下回到碼表`,
    route: ID,
    dim: sw.status === "paused",
    onClick: () => navigate(ID),
  });
}

function syncBackground() {
  clearInterval(chipId);
  chipId = sw.status === "running" ? setInterval(refreshChip, 500) : null;
  if (sw.status === "running") holdAwake(ID);
  else releaseAwake(ID);
  refreshChip();
}

/* ---------- 畫面 ---------- */

function lapRows() {
  if (!sw.laps.length) {
    return `<p class="text-center text-base font-medium text-slate-400 dark:text-slate-500 py-6">計時中按「分圈」，就會記錄每一圈的時間</p>`;
  }
  const { fastest, slowest } = sw.lapStats();
  const rows = [...sw.laps].reverse().map((l) => {
    const tone = l.n === fastest ? "text-emerald-600 dark:text-emerald-400" : l.n === slowest ? "text-rose-600 dark:text-rose-400" : "text-slate-800 dark:text-slate-100";
    const tag = l.n === fastest ? "最快" : l.n === slowest ? "最慢" : "";
    return `<li class="flex items-center px-4 py-3 border-b border-slate-100 dark:border-slate-700 last:border-0 tabular-nums">
      <span class="w-14 text-base font-extrabold text-slate-500 dark:text-slate-400">第 ${l.n} 圈</span>
      <span class="flex-1 text-center text-xl font-black ${tone}">${fmtStopwatch(l.split)}${tag ? `<span class="ml-1 text-xs font-extrabold">${tag}</span>` : ""}</span>
      <span class="w-24 text-right text-base font-bold text-slate-500 dark:text-slate-400">${fmtStopwatch(l.total)}</span>
    </li>`;
  }).join("");
  return `<div class="flex px-4 pb-1 text-xs font-extrabold text-slate-400 dark:text-slate-500"><span class="w-14">圈數</span><span class="flex-1 text-center">這一圈</span><span class="w-24 text-right">累計</span></div><ul>${rows}</ul>`;
}

function render() {
  if (!root) return;
  const st = sw.status;
  const big = "h-16 rounded-full text-2xl font-black active:scale-95 transition";
  root.innerHTML = `
    <div class="px-4 pt-2 pb-28">
      <h2 class="text-2xl font-black text-slate-800 dark:text-slate-100 mb-3 px-1"><i class="fa-solid fa-stopwatch theme-text-primary"></i> 碼表</h2>

      <div class="bg-white/95 dark:bg-slate-800/95 rounded-3xl soft-shadow-md px-4 py-7 mb-4 text-center" role="timer" aria-label="碼表">
        <div data-main class="font-black tabular-nums text-slate-900 dark:text-white leading-none ${st === "paused" ? "opacity-60" : ""}" style="font-size:clamp(2.4rem,13vw,3.6rem)">${fmtStopwatch(sw.elapsed())}</div>
        <div data-split class="mt-3 text-lg font-bold tabular-nums theme-text-primary ${sw.laps.length ? "" : "invisible"}">本圈 ${fmtStopwatch(sw.currentSplit())}</div>
      </div>

      <div class="grid grid-cols-2 gap-3 mb-4">
        ${st === "running"
          ? `<button data-tip="sw-lap" data-act="lap" class="${big} bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200"><i class="fa-solid fa-flag mr-2"></i>分圈</button>`
          : `<button data-tip="sw-reset" data-act="reset" ${st === "idle" ? "disabled" : ""} class="${big} ${st === "idle" ? "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500" : confirmReset ? "bg-red-500 text-white text-xl" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-100"}">${confirmReset ? "再按一次歸零" : "歸零"}</button>`}
        <button data-tip="sw-main" data-act="${st === "running" ? "pause" : "start"}" class="${big} theme-bg-primary text-white soft-shadow-md"><i class="fa-solid ${st === "running" ? "fa-pause" : "fa-play"} mr-2"></i>${st === "running" ? "暫停" : st === "paused" ? "繼續" : "開始"}</button>
      </div>

      <div class="bg-white/90 dark:bg-slate-800/90 rounded-3xl soft-shadow-sm py-3" data-laps>${lapRows()}</div>
    </div>`;
}

// 逐格更新數字（requestAnimationFrame），不重畫整頁
function loop() {
  raf = null;
  if (!root) return;
  const main = root.querySelector("[data-main]");
  if (main) main.textContent = fmtStopwatch(sw.elapsed());
  const split = root.querySelector("[data-split]");
  if (split && sw.laps.length) split.textContent = `本圈 ${fmtStopwatch(sw.currentSplit())}`;
  if (sw.status === "running") raf = requestAnimationFrame(loop);
}

function startLoop() {
  if (root && !raf && sw.status === "running") raf = requestAnimationFrame(loop);
}

function disarmReset() {
  clearTimeout(confirmId);
  confirmId = null;
  confirmReset = false;
}

function act(a) {
  if (a !== "reset") disarmReset();
  if (a === "start") sw.start();
  else if (a === "pause") sw.pause();
  else if (a === "lap") sw.lap();
  else if (a === "reset") {
    // 有圈數紀錄時，歸零要按兩次，避免老人家誤觸清掉成績
    if (sw.laps.length && !confirmReset) {
      confirmReset = true;
      confirmId = setTimeout(() => {
        confirmReset = false;
        render();
      }, 3000);
      return render();
    }
    disarmReset();
    sw.reset();
  }
  syncBackground();
  render();
  startLoop();
}

function onClick(e) {
  const b = e.target.closest("[data-act]");
  if (b && !b.disabled) act(b.dataset.act);
}

// 外接鍵盤（電腦預覽用）：空白鍵 開始/暫停、L 分圈、R 歸零
function onKey(e) {
  if (e.target.closest?.("input, textarea, button") || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === " ") { e.preventDefault(); act(sw.status === "running" ? "pause" : "start"); }
  else if (e.key === "l" || e.key === "L") act("lap");
  else if ((e.key === "r" || e.key === "R") && sw.status === "paused") act("reset");
}

export default {
  id: ID,
  access: "public",
  mount(el) {
    root = el;
    showTipHint("stopwatch");
    confirmReset = false;
    render();
    startLoop();
    root.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    refreshChip();
  },
  unmount() {
    closeTips();
    root?.removeEventListener("click", onClick);
    document.removeEventListener("keydown", onKey);
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    disarmReset();
    root = null;
    refreshChip(); // 離開後若仍在跑，顯示背景小膠囊
  },
};
