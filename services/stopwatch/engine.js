// 碼表純邏輯（無 DOM）。以時間戳計算，不靠每次 tick 累加，因此不會漂移。

const pad = (n, w = 2) => String(n).padStart(w, "0");

// 顯示：59:08.37 / 1:02:03.45（百分之一秒）
export function fmtStopwatch(ms) {
  const cs = Math.floor(Math.max(0, ms) / 10);
  const c = cs % 100;
  const totalSec = Math.floor(cs / 100);
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60) % 60;
  const h = Math.floor(totalSec / 3600);
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}.${pad(c)}` : `${pad(m)}:${pad(s)}.${pad(c)}`;
}

export function createStopwatch(now = () => Date.now()) {
  const w = {
    status: "idle", // idle | running | paused
    accMs: 0, // 已累積（暫停前）的時間
    startAt: 0,
    laps: [], // { n, split, total }，依時間由舊到新

    elapsed() {
      return w.accMs + (w.status === "running" ? now() - w.startAt : 0);
    },
    start() {
      if (w.status === "running") return false;
      w.startAt = now();
      w.status = "running";
      return true;
    },
    pause() {
      if (w.status !== "running") return false;
      w.accMs += now() - w.startAt;
      w.status = "paused";
      return true;
    },
    lap() {
      if (w.status !== "running") return false;
      const total = w.elapsed();
      const prev = w.laps.length ? w.laps[w.laps.length - 1].total : 0;
      w.laps.push({ n: w.laps.length + 1, split: total - prev, total });
      return true;
    },
    reset() {
      w.status = "idle";
      w.accMs = 0;
      w.startAt = 0;
      w.laps = [];
      return true;
    },
    // 目前這一圈已經跑了多久（尚未按分圈）
    currentSplit() {
      const prev = w.laps.length ? w.laps[w.laps.length - 1].total : 0;
      return Math.max(0, w.elapsed() - prev);
    },
    // 3 圈以上才標示最快/最慢（兩圈比較沒有意義）
    lapStats() {
      if (w.laps.length < 3) return { fastest: null, slowest: null };
      let f = w.laps[0], s = w.laps[0];
      for (const l of w.laps) {
        if (l.split < f.split) f = l;
        if (l.split > s.split) s = l;
      }
      return f.n === s.n ? { fastest: null, slowest: null } : { fastest: f.n, slowest: s.n };
    },
  };
  return w;
}
