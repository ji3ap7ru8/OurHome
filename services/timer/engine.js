// 倒數計時器純邏輯（無 DOM、無計時器）。
// 以「結束時間點 endAt」計算剩餘時間，而不是每秒減 1，
// 所以分頁被背景凍結、手機暫時休眠後，回來仍然準確。

export const MAX_MS = (99 * 3600 + 59 * 60 + 59) * 1000; // 99:59:59
export const PRESETS = [
  { label: "1 分", ms: 60_000 },
  { label: "3 分", ms: 180_000 },
  { label: "5 分", ms: 300_000 },
  { label: "10 分", ms: 600_000 },
  { label: "15 分", ms: 900_000 },
  { label: "30 分", ms: 1_800_000 },
];

const clamp = (ms) => Math.min(MAX_MS, Math.max(0, Math.round(ms)));

export const fromHMS = (h = 0, m = 0, s = 0) => clamp((h * 3600 + m * 60 + s) * 1000);

export function splitHMS(ms) {
  const t = Math.ceil(clamp(ms) / 1000);
  return { h: Math.floor(t / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 };
}

const pad = (n) => String(n).padStart(2, "0");

// 剩餘時間以「進位到秒」顯示：還有 0.4 秒仍顯示 00:00:01，歸零時才顯示 00:00:00
export function fmtClock(ms) {
  const { h, m, s } = splitHMS(ms);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

// 口語化：1 小時 5 分 3 秒（螢幕閱讀器、提示視窗用）
export function fmtSpoken(ms) {
  const { h, m, s } = splitHMS(ms);
  const parts = [];
  if (h) parts.push(`${h} 小時`);
  if (m) parts.push(`${m} 分`);
  if (s || !parts.length) parts.push(`${s} 秒`);
  return parts.join(" ");
}

// 狀態機：idle(設定中) → running ⇄ paused → done(響鈴中) → idle
export function createTimer(now = () => Date.now()) {
  const t = {
    status: "idle",
    setMs: 0, // 使用者設定的時間（重設時回到這個值）
    totalMs: 0, // 本輪總長（含中途 +1 分），進度環用
    remainMs: 0, // 暫停時凍結的剩餘
    endAt: 0,
    label: "",

    remaining() {
      if (t.status === "running") return Math.max(0, t.endAt - now());
      if (t.status === "paused") return t.remainMs;
      if (t.status === "idle") return t.setMs;
      return 0;
    },
    progress() {
      // 剩餘比例 0~1
      if (t.status === "idle") return 1;
      return t.totalMs > 0 ? Math.min(1, t.remaining() / t.totalMs) : 0;
    },
    setDuration(ms) {
      if (t.status !== "idle") return false;
      t.setMs = clamp(ms);
      return true;
    },
    start() {
      if (t.status === "idle") {
        if (t.setMs <= 0) return false;
        t.totalMs = t.setMs;
        t.endAt = now() + t.setMs;
      } else if (t.status === "paused") {
        t.endAt = now() + t.remainMs;
      } else return false;
      t.status = "running";
      return true;
    },
    pause() {
      if (t.status !== "running") return false;
      t.remainMs = Math.max(0, t.endAt - now());
      t.status = "paused";
      return true;
    },
    // 加時：設定中 → 增加設定值；執行/暫停中 → 延長；響鈴後 → 重新倒數
    add(ms) {
      if (t.status === "idle") {
        t.setMs = clamp(t.setMs + ms);
      } else if (t.status === "running") {
        const next = clamp(t.endAt - now() + ms);
        t.endAt = now() + next;
        t.totalMs = Math.max(t.totalMs, next);
      } else if (t.status === "paused") {
        t.remainMs = clamp(t.remainMs + ms);
        t.totalMs = Math.max(t.totalMs, t.remainMs);
      } else if (t.status === "done") {
        t.totalMs = clamp(ms);
        t.endAt = now() + t.totalMs;
        t.status = "running";
      }
      return true;
    },
    reset() {
      t.status = "idle";
      t.remainMs = 0;
      t.endAt = 0;
      return true;
    },
    // 由外部定時呼叫；剛好跨過終點時回傳 true（只會回傳一次）
    check() {
      if (t.status === "running" && now() >= t.endAt) {
        t.status = "done";
        t.remainMs = 0;
        return true;
      }
      return false;
    },
  };
  return t;
}
