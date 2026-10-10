// 讓更新後的程式碼立刻生效：本站檔案一律「先向伺服器確認有沒有新版」，沒網路才用快取。
// GitHub Pages 預設會讓瀏覽器快取檔案約 10 分鐘，沒有這支，更新後常常要清除瀏覽器紀錄才看得到新版。
const CACHE = "ourhome-offline-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return; // 只處理本站檔案
  e.respondWith((async () => {
    try {
      const res = await fetch(req, { cache: "no-cache" }); // 向伺服器重新驗證（沒變動時只回 304，很快）
      if (res.ok) { const c = await caches.open(CACHE); c.put(req, res.clone()); }
      return res;
    } catch {
      return (await caches.match(req)) || Response.error();
    }
  })());
});
