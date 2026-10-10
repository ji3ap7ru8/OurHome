// 螢幕喚醒鎖：計時中避免手機自動休眠（瀏覽器不支援時靜默略過）。
// 多個服務可同時持有，全部放開才真正釋放；分頁切回前景時自動重新取得。
const holders = new Set();
let lock = null;

async function acquire() {
  if (!("wakeLock" in navigator) || lock || !holders.size || document.hidden) return;
  try {
    lock = await navigator.wakeLock.request("screen");
    lock.addEventListener("release", () => { lock = null; });
  } catch (_) { lock = null; }
}

export const wakeLockSupported = () => "wakeLock" in navigator;

export function holdAwake(key) {
  holders.add(key);
  acquire();
}

export function releaseAwake(key) {
  holders.delete(key);
  if (!holders.size && lock) {
    lock.release().catch(() => {});
    lock = null;
  }
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) acquire();
});
