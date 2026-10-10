# /services — 服務模組（Stage 2 起使用）

每個服務（家庭公告、生活圖卡、計算機…）一個資料夾，例如 `services/notes/index.js`，
匯出下列介面，由大廳/探索頁掛載到 `#viewOutlet`：

```js
export default {
  id: "家庭公告",            // 對應 core/config.js 的 availableFeatures.id
  storage: "server",         // Stage 8：資料庫 "server"（家庭共用）| "private"（私人）；未連線時畫面會顯示提示條
  access: "public",          // "public" | "private" | "members"（訪客模式可用性依計劃案第三節；members = 登入後僅名單內成員可用）
  mount(el, ctx) {},         // 渲染到 el；ctx 內含 state / on / emit
  unmount() {},              // 離開時清理計時器、事件
};
```

資料存取統一走 `core/repo.js`：未連線時是記憶體（Mock），登入並設定 Firebase 後自動改為 Firestore（Stage 8）。
