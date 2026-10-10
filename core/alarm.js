// 鬧鈴：Web Audio 嗶聲 + 震動。瀏覽器規定聲音必須由使用者點擊後才能播放，
// 所以按下「開始」時先呼叫 unlockAudio()，時間到時才響得出來。
let ctx = null;
let master = null;
let nodes = [];
let vibId = null;

export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
  } catch (_) {}
}

// 每 1.2 秒一組「嗶嗶嗶」，一次排好 seconds 秒的聲音（不靠 setInterval，背景分頁也不會斷）
export function startAlarm({ sound = true, vibrate = true, seconds = 60 } = {}) {
  stopAlarm();
  if (sound && ctx) {
    try {
      if (ctx.state === "suspended") ctx.resume();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
      const t0 = ctx.currentTime + 0.05;
      for (let c = 0; c < Math.ceil(seconds / 1.2); c++) {
        for (let b = 0; b < 3; b++) {
          const start = t0 + c * 1.2 + b * 0.28;
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = 988;
          g.gain.setValueAtTime(0, start);
          g.gain.linearRampToValueAtTime(1, start + 0.02);
          g.gain.linearRampToValueAtTime(0, start + 0.18);
          osc.connect(g).connect(master);
          osc.start(start);
          osc.stop(start + 0.2);
          nodes.push(osc);
        }
      }
    } catch (_) {}
  }
  if (vibrate && navigator.vibrate) {
    const buzz = () => navigator.vibrate([350, 150, 350, 150, 350]);
    buzz();
    vibId = setInterval(buzz, 1800);
  }
}

export function stopAlarm() {
  nodes.forEach((o) => { try { o.stop(); } catch (_) {} });
  nodes = [];
  try { master?.disconnect(); } catch (_) {}
  master = null;
  if (vibId) clearInterval(vibId);
  vibId = null;
  navigator.vibrate?.(0);
}
