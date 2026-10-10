# 我們的家 (OurHome App)

家庭用的輕量 Web App，部署在 GitHub Pages，純前端 ES Modules，不用 Cookie / localStorage（無痕）。
介面為長輩友善設計：大字、圖示卡片、高對比。

- 網頁：https://ji3ap7ru8.github.io/OurHome/

---

## 1. 目錄結構

```
index.html                  App Shell 入口（骨架、掛載點、大廳背景）
main.js                     ES Module 進入點
sw.js                       Service Worker
assets/css/app.css          全域樣式（主題 CSS 變數、大廳玻璃化、我的筆記紙張樣式…）
core/                       核心：狀態、雲端、資料模型
  config.js                 可選功能清單、預設快捷列、字體範圍、Google 授權範圍、雲端硬碟檔名
  store.js                  記憶體狀態 + 事件匯流排（on / emit）
  actions.js                事件委派（data-action / data-input / data-change）
  shared-actions.js         跨元件共用 action（開關視窗、登入登出）
  app.js                    啟動流程、服務註冊
  router.js                 navigate()：把大廳 / 服務渲染到 #viewOutlet；訪客鎖定、儲存位置提醒橫幅
  overlay.js                Backdrop / Bottom Sheet / 設定視窗開關
  theme.js                  外觀主題、主色調、字體縮放
  auth.js / google.js       登入狀態、Google 登入（GIS token）與授權續期
  drive.js                  Google 雲端硬碟 appDataFolder 讀寫、設定檔拆分 / 合併
  drive-store.js            「儲存位置：Google 雲端」的資料後端（我的筆記、記帳本）
  firebase.js / fbconfig.js Firebase SDK 動態載入、連線；firebaseConfig 解析
  repo.js                   通用資料倉庫：記憶體 / Google 雲端 / Firestore 同一套介面
  cloud.js                  雲端總管：登入後自動載入設定、連線、儲存位置切換、API 資料更新、資料包匯出入
  reminders.js / reminder-reads.js  最新提醒與已讀紀錄
  apps-model.js             所有應用：排序、自訂編號、擴充插件
  cards-model.js            生活圖卡設定：格式大小、排序
  lobby-model.js            大廳設定：顯示管理、排序、各服務的顯示方式
  lobby-feed.js             大廳各服務「簡略資訊」的挑選與整理（純邏輯，可用 Node 測試）
  gcal.js                   Google Calendar API
  calendar-ids.js / line-bot-ids.js / line-send.js / bowl-emails.js   日曆 ID、LINE Bot、洗碗可進入名單
  nickname.js / avatar.js / autologin.js / admin.js / storage-note.js / app-icon.js / chips.js /
  alarm.js / wakelock.js / accordion.js / loading.js / toast.js / viewport.js   其他小工具
components/                 UI 元件（*.template.js 是 HTML 模板）
  header / dock / bottom-sheet     頂部列、底欄快捷列、最新提醒與登入視窗
  lobby.js / lobby-settings.js     大廳畫面、大廳設定（顯示管理 / 大廳排序）
  apps.js / apps-options.js        所有應用頁、所有應用設定
  settings-panel.js / cloud-settings.js   系統設定視窗、雲端狀態與按鈕
  cards-options / bowl-options / calendar-ids / line-bot-ids / admin-reminder   各 ︙ 設定與管理視窗
services/                   服務模組（每個服務一個資料夾，介面見 services/README.md）
  notes/      家庭公告        cards/    生活圖卡      calendar/  家庭日曆
  memo/       我的筆記        bowl/     換誰洗碗      ledger/    記帳本
  calculator/ translator/ timer/ stopwatch/   計算機、翻譯機、計時器、碼表
```

**本機預覽**：ES Modules 不能直接雙擊開啟，請用本機伺服器：`python3 -m http.server 8000`，再開 http://localhost:8000。

**部署**：把整個資料夾推到 GitHub repo 的 `main` 分支根目錄 → Settings → Pages → Deploy from a branch（`main` / root）。所有資源路徑為相對路徑，放在子路徑下也能運作。

---

## 2. 內部儲存架構與方式

資料分成三軌，各管各的；沒有任何東西存在 Cookie / localStorage（Firebase Auth 用 `inMemoryPersistence`，Firestore 只用記憶體快取）。

| 儲存 | 放什麼 | 是否要登入 Google |
|---|---|---|
| **Google 雲端硬碟**（appDataFolder，隱藏、僅本 App 可讀） | 系統設定、兩組 firebaseConfig、預設參數；我的筆記 / 記帳本（儲存位置選 Google 雲端時） | 要 |
| **Firebase 伺服器**（家庭共用 Firestore） | 家庭公告、生活圖卡、家庭日曆、換誰洗碗、最新提醒與已讀；我的筆記 / 記帳本（儲存位置選伺服器時，依使用者分區） | 要 |
| **Firebase 私人端**（個人 Firestore，匿名連線） | 我的筆記 / 記帳本（儲存位置選私人端時） | 不用（未登入時 firebaseConfig 只存在畫面） |
| **記憶體** | 訪客、或儲存位置選「不保存」時的資料 | — |

### 2.1 Google 雲端硬碟（四個檔案）

| 檔案 | 內容 |
|---|---|
| `ourhome-default.json` | **預設參數**：`firebaseServer`、`calendarIds`、`lineBotToken`、`lineBotIds`、`plugins`（另有洗碗可進入名單 `bowlEmails`）。使用者不能改寫，只有〔API 資料更新〕會寫入 |
| `ourhome-settings.json` | 使用者的一切設定：個人化、大廳、所有應用、生活圖卡、暱稱、**儲存位置**，以及 `firebaseServer` / `firebasePrivate`、預設參數中「使用者改過的值」 |
| `ourhome-notify.json` | 通知，目前留白 |
| `ourhome-data.json` | 我的筆記、記帳本 `{ memos: [], ledger: [] }`（儲存位置選 Google 雲端才有資料） |

- 程式裡是同一份設定，只有讀寫雲端硬碟時才拆開 / 合併（`core/drive.js` 的 `splitConfig()` / `joinConfig()`）。
- 載入：settings 有的項目用 settings，沒有的用 default。寫入：日常操作只寫 settings，且「跟 default 一樣就不寫」。
- 舊版單一檔 `ourhome-config.json` 等：第一次登入時自動搬進新檔，舊檔不刪除、之後不再使用。
- 設定改動 1.5 秒後自動存檔；授權過期時記為「待補存」，使用者下一次點擊畫面時自動補存（`core/cloud.js`）。

### 2.2 Firebase 伺服器（家庭共用）

| 集合 / 路徑 | 用途 |
|---|---|
| `notes` | 家庭公告 |
| `cards` | 生活圖卡 |
| `calendar` | 家庭日曆的 App 內行程（沒有新增 Google 日曆時使用） |
| `bowl_members`、`bowl_days`、`bowl_settings` | 換誰洗碗 |
| `reminders`、`reminder_reads/<信箱>` | 最新提醒、每人各一份已讀紀錄 |
| `default/default` | 預設參數來源（〔API 資料更新〕讀取） |
| `user_data/<使用者信箱小寫>/memos`、`.../ledger` | 我的筆記 / 記帳本選「Firebase 伺服器」時的資料，**依使用者信箱分區**，不會和其他人混在一起，介面也不顯示是誰建立的 |

- 一定要先登入 Google（firebaseConfig 存在使用者自己的雲端硬碟，沒登入拿不到）。
- Firestore 規則要允許已登入的家人讀寫上述集合；`user_data` 範例：
  ```
  match /user_data/{email}/{document=**} {
    allow read, write: if isFamily() && request.auth.token.email.lower() == email;
  }
  ```
  （`isFamily()` 代表你原本的家人名單檢查。）
- 洗碗名單目前只是畫面層篩選；要真正擋住資料，需用規則限制可讀寫 `bowl_*` 的信箱。

### 2.3 Firebase 私人端

- 另一個 Firebase 專案（每人自備），匿名登入連線；**依暱稱分區**：`user_data/<n_暱稱>/memos`、`.../ledger`、`.../settings/main`（暱稱經編碼並加 `n_` 前綴）。
- 不需登入 Google 也能用；未登入時 firebaseConfig 只存在記憶體，登出或重新整理就消失。
- **訪客**：暱稱每次進入隨機產生（如「訪客K7P2」，可在系統設定改成固定暱稱，下次輸入同一個暱稱即可讀回）。私人端存**全部**：整份系統設定（`settings/main`，JSON 字串）＋我的筆記、記帳本（新暱稱預設自動存私人端，畫面上先輸入的資料會一併帶過去）。改暱稱 0.9 秒後自動切換到新分區。
- **已登入 Google**：設定存 Google 雲端硬碟，私人端**只**存我的筆記、記帳本（儲存位置選「Firebase 私人端」）；改暱稱時資料換到新暱稱分區（沒設暱稱用 Google 帳號名稱）。
- 同一個暱稱 = 同一份資料，沒有密碼；私人端規則至少要允許匿名登入者讀寫 `user_data`：
  ```
  match /user_data/{nick}/{document=**} { allow read, write: if request.auth != null; }
  ```
- 舊版放在私人端根目錄的 `memos`、`ledger` 不會自動讀取（需要的話可在 Firebase 主控台搬到 `user_data/<n_暱稱>/` 底下）。

### 2.4 儲存位置（我的筆記、記帳本）

- 位置：**系統設定 → 儲存位置**，兩個資料集各自選：不保存（預設）／Google 雲端／Firebase 伺服器／Firebase 私人端。
- 選好按〔儲存並同步〕生效。選擇存在系統設定（`state.storage`），登入時隨設定存進 Google 雲端硬碟。
- 從「不保存」切到其他位置時，畫面上已有的資料會一起存過去；切換位置不會刪除舊位置的資料。
- 條件不符時不會切換並顯示原因：Google 雲端需登入；私人端 / 伺服器需先貼 firebaseConfig 並連線成功。
- 實作：`core/repo.js`（`createRepo({ choosable: true })`、`bindDrive()`、`bind(conn, { owner })`、`mode()`）、`core/cloud.js` 的 `commitStorage()` / `setRepoMode()`、`core/drive-store.js`。

### 2.5 訪客與登出

- 訪客不連任何 Firebase：公告、圖卡、洗碗整頁鎖定；日曆、我的筆記、記帳本只存記憶體（關網頁即清除）。
- 登出：解除全部連線並清空記憶體（私人資料不留在共用手機上）。
- 真正的封鎖靠 Firestore 規則（沒登入讀不到），不是只靠畫面。

---

## 3. 系統設定

右側滑出的設定視窗（`components/settings-panel.js`、`cloud-settings.js`），由上而下：

- **網頁狀態**：Google 雲端、Firebase 伺服器、Firebase 私人端三個連線徽章與〔立即同步〕；**自動登入（不登出）** 開關（值存雲端硬碟）。
- **個人化**：暱稱、外觀主題（淺色 / 深色 / 跟隨系統）、外觀主色調、字體大小（80%～150%）。
- **大廳設定 / 所有應用設定 / 生活圖卡設定**：排序下方快捷功能（底欄快捷列）、顯示管理、大廳排序（見第 4 節）；所有應用與生活圖卡各有自己的 ︙ 設定（格式大小、排序方式、擴充插件）。
- **儲存位置**：見 2.4。
- **資料管理**：貼上 Google 雲端硬碟 / Firebase（伺服器、私人端）的 firebaseConfig，LINE Bot（中繼站 URL、Bot Token、接收對象的名稱與 User ID，數量不限）。
- **備份還原**：
  - 〔API 資料更新〕：讀伺服器 Firestore 的 `default/default`，強制複寫雲端硬碟的 `ourhome-default.json`，並把目前生效的預設參數設成預設值，然後重新同步連線。未登入時只會重新連線私人端。
  - 〔還原預設參數〕：不連 Firestore，直接用雲端硬碟 default 的值覆蓋自己改過的項目，不寫 default。
  - 匯出 / 匯入 Google 雲端硬碟設定檔、完整資料包。
- **管理員**（登入並輸入管理員密碼解鎖）：最新提醒的發布 / 編輯 / 刪除，存在伺服器 `reminders`。

**新使用者流程**：登入 → 在資料管理貼上伺服器 firebaseConfig → 儲存並同步 → 按〔API 資料更新〕載入預設參數。

---

## 4. 大廳

- 頂部：帳號、最新提醒鈴鐺、個人化；標題「我們の家」與〔所有應用〕。
- 大廳只顯示在 **大廳設定 → 顯示管理** 打開的服務（預設全部關閉），順序由 **大廳排序** 決定（預設同所有應用）。
- 每個服務一個**玻璃化區塊**（半透明、背景模糊、斜向光澤、按下微放大），內含一排可左右滑動的簡略資訊小卡；背景的彩色圓塊固定不動，介面在上面上下滑動。
- **點擊**：除了生活圖卡，點區塊任何地方都會進入該服務頁；生活圖卡點小卡直接打開那張圖卡，點標題列進生活圖卡頁。
- 各服務在大廳的顯示方式，由大廳排序每列右邊的「>」設定（`core/lobby-model.js` 的 `LOBBY_MODES`）：

| 服務 | 可選顯示方式 |
|---|---|
| 家庭公告 | 即將截止（預設）／最新發布 |
| 生活圖卡 | 多選要顯示哪幾張圖卡 |
| 家庭日曆 | 今日（預設）／未來 7 天／未來 14 天／這個月 |
| 我的筆記 | 全部（預設）／目前有的每個分類／釘選；只顯示標題與分類 |
| 換誰洗碗 | 今日 |

- 設定存在 `settings.lobby`（`shown`、`order`、`mode`、`cards`），隨系統設定存雲端硬碟；未登入只在記憶體。
- 挑資料的規則在 `core/lobby-feed.js`，畫面在 `components/lobby.js`，設定視窗在 `components/lobby-settings.js`。

---

## 5. 家庭公告

- 檔案：`services/notes/`；資料：伺服器 `notes`，即時同步；**需登入**（訪客鎖定）。
- 便利貼風格：標籤（緊急 / 重要 / 一般 / 其他）決定顏色，可置頂；最多 10 張。
- 狀態：**永久顯示** 或 **綁定期限**（截止日期與時間）；過期的自動變灰並排到最後。
- 排序：置頂優先 / 最新發布 / 即將截止。可附加連結（只接受 http / https）。
- 可把便利貼以 Flex Message 發送到 LINE（需先在資料管理設定 LINE Bot 與接收對象）。
- 大廳：即將截止 / 最新發布。

---

## 6. 生活圖卡

- 檔案：`services/cards/`、`core/cards-model.js`、`components/cards-options.js`；資料：伺服器 `cards`；**需登入**。
- 圖卡類型：會員條碼、電子發票載具、電子條碼、電話號碼、電子郵件、車牌號碼、其他；一張圖卡最多 10 筆內容。英數字會畫成 Code 39 條碼（`code39.js`），其他以大字文字顯示；可設定圖示網址。
- **生活圖卡設定**（頁面右上 ︙）：
  - 格式大小：瀏覽方式（圖卡 / 清單）、瀏覽大小（大 / 中 / 小）、每行數量（2 / 3，清單不適用）。
  - 排序方式：預設（建立先後）／名稱（筆畫）／自訂排序（編號下拉或 ▲▼）。
  - 使用者與登出。
- 設定存在 `settings.cards`，隨系統設定存雲端硬碟。
- 大廳：多選要顯示哪幾張圖卡，點小卡直接打開該圖卡。

---

## 7. 家庭日曆

- 檔案：`services/calendar/`、`core/gcal.js`、`components/calendar-ids.js`；訪客可用（只存記憶體）。
- **兩種來源**：
  - 沒有新增 Google 日曆時：讀寫伺服器 `calendar`（App 內行程，家人共用）。
  - 在「︙ ID設定」新增 Google 日曆 ID 後：直接用 Google Calendar API 讀寫（用登入者自己的權限，需登入）。新增 2 個以上才會出現「全部日曆」合併檢視；新增行程時可選要加到哪個日曆。
- 月曆（跨日色條）、點行程看詳情、新增 / 修改 / 刪除、分享、換月與回到今天。
- Google 日曆設定：Cloud Console 啟用 Calendar API → OAuth 同意畫面加入 `calendar.events` 範圍（測試中要加測試使用者）→ 把日曆分享給會登入的帳號（要編輯需「可更改活動」）→ 重新登入授權 → 在 ID設定 新增日曆 ID。
- 限制：整天行程、重複行程只能查看；Google 日曆資料快取 2 分鐘。
- 日曆 ID 屬於預設參數（`calendarIds`），可由〔API 資料更新〕同步。
- 大廳：今日 / 未來 7 天 / 未來 14 天 / 這個月，小卡樣式與日曆詳情視窗一致。

---

## 8. 我的筆記

- 檔案：`services/memo/`（id 為「個人記事本」，顯示名稱「我的筆記」）；訪客可用，不需登入。
- **儲存位置**完全依「系統設定 → 儲存位置 → 我的筆記」（見 2.4），頁面上沒有下拉選單。
- **頁面頂部提示框**依設定顯示對應說明，右側〔了解〕可關閉（同一則提示本次不再出現）：
  - 不保存：只會暫存資料，重整網頁將會清除。
  - Google 雲端：未登入時提示請先登入 Google；已登入則說明存到個人雲端硬碟。
  - Firebase 私人端：未設定時提示「未設定私人端」；已設定說明存到私人端。
  - Firebase 伺服器：未設定提示「未設定伺服器」；未登入提示請先登入；正常時說明依使用者帳號分區存放。
  - 登入、連線或儲存位置變動時自動重新檢查。
- 版面：搜尋欄、共 N 則、新增（鉛筆）按鈕同一行；下方是分類分頁與記事卡。記事卡左側色條與標籤顏色跟著**系統主色調**。
- **分類可自由新增**：預設分類為「全部」；其他分類由記事帶出（沒有固定分類清單，某分類的記事都刪除後該分類就消失）。
- **新增 / 編輯**：橫線筆記紙風格（紅邊線、裝訂孔、膠帶）。標題必填（最多 40 字）、內容選填（最多 2000 字）、可置頂；標題下方與「新增分類」列下方有較粗的分隔線；編輯時可刪除（需再按一次確認）。最多 100 則。
- 排序：置頂優先，其次最近更新。
- 大廳：全部 / 某個分類 / 釘選，只顯示分類與標題，筆記紙風格小卡。

---

## 9. 換誰洗碗

- 檔案：`services/bowl/`、`components/bowl-options.js`；資料：伺服器 `bowl_members`、`bowl_days`、`bowl_settings`。
- **兩道關卡**：訪客一律擋下（需登入）→ 登入帳號的電子郵件必須在雲端硬碟 default 的 `bowlEmails` 名單內，否則顯示「沒有開放給你」。名單只存在 default、App 內不能改；管理員在 Firestore `default/default` 填 `bowlEmails` 後按〔API 資料更新〕同步。名單空白或尚未同步 = 沒有人能進入。
- 畫面：今日執勤卡（收碗 / 洗碗）、歷史 5 日（橫向滑動、唯讀）、今天加未來 2 日（可編輯）、之後的日子（可編輯、可新增天數，最多到今天 +30 天）。
- 排班：自動排班從歷史最後一位接著輪，休假日跳過且不佔輪次，會覆蓋已排的人（需連按兩下確認）；重設未來只清明天起；「欠 N 次」統計支援 2 人以上；可複製今日執勤文字。
- 成員以 id 記錄（改名不會斷）；移除成員會清掉今天起的指派、歷史保留並顯示「已移除」。防鎖死：不能關自己的瀏覽權限、不能移除自己、至少 1 位可瀏覽、至少 2 位輪值。
- **換誰洗碗設定**（頁面右上 ︙）：成員權限卡片只能查看可進入的名單，不能新增 / 移除。
- 未做：LINE 發送洗碗訊息（LINE Bot 目前只保存 Token 與接收對象）。
- 在別台裝置的變動，要重新進入該服務才會更新。
- 大廳：今日的收碗 / 洗碗人員。

---

## 10. 其餘服務與補充

### 10.1 所有應用（`components/apps.js`、`apps-options.js`、`core/apps-model.js`）
- 頁面右上 ︙「所有應用設定」：
  - 格式大小：圖卡 / 清單、大小、每行數量。
  - 排序方式：預設（系統順序，插件接後面）／名稱（筆畫）／自訂排序（編號下拉或 ▲▼，可還原預設）。
  - 擴充插件：填標題（必填、最多 20 字）與網址（沒寫 `https://` 自動補），只接受 http / https，不接受含帳號密碼的網址；同網址不重複；以新分頁開啟（多數網站禁止被嵌入），卡片 / 清單會標示「外部」；刪除需 3 秒內連按兩次。
  - 最底下是 Google 帳號區（登入 / 登出與雲端同步狀態）。
- 全部設定存在 `settings.apps`（含插件），隨系統設定存雲端硬碟；未登入只在記憶體，登出恢復預設。

### 10.2 記帳本（`services/ledger/`）
- 儲存位置與我的筆記相同，系統設定的「儲存位置」可選 不保存 / Google 雲端 / 伺服器 / 私人端；訪客可用（僅暫存）。
- 月份切換、結餘 / 收入 / 支出、分類佔比長條圖、依日明細；金額以「分」運算，限大於 0、最多兩位小數；日期不可晚於今天。

### 10.3 生活工具（皆訪客可用、不存任何資料）
- **計算機**：先輸入原價再按「8折」等快算；`100 + 10%` 依手機慣用算法得 110。
- **翻譯機**：繁體中文來源有 10 句內建常用句（英 / 日 / 韓 / 越 / 泰，免網路）；一般翻譯走 Google 翻譯，失敗時提供「用 Google 翻譯開啟」；語音輸入 / 朗讀依瀏覽器支援顯示。
- **計時器、碼表**：切到其他頁仍繼續，底欄上方會出現小膠囊可一鍵回去；時間到全螢幕響鈴 + 震動；計時中保持螢幕亮著；「取消 / 歸零」需 3 秒內連按兩次。網頁無法保證鎖屏後準時響鈴。

### 10.4 最新提醒與管理員
- 鈴鐺內顯示所有登入者可見的提醒（伺服器 `reminders`）；已讀存在 `reminder_reads/<信箱>`，每人一份、多台裝置同步，在提醒內只能標示已讀。
- 管理員（設定 → 管理員，需 Google 登入 + 管理員密碼）可發布 / 編輯 / 刪除提醒。
- 規則範例：
  ```
  match /reminder_reads/{email} {
    allow read, write: if isFamily() && request.auth.token.email.lower() == email;
  }
  ```
  `lineBotToken` 是機密，建議限制只有管理員能讀 `default` 集合。

### 10.5 LINE Bot
- 設定：系統設定 → 資料管理 → LINE Bot：中繼站 URL、Bot Token、接收對象（名稱 + User ID，數量不限）；屬於預設參數，可由〔API 資料更新〕同步。
- 目前家庭公告可發送便利貼到 LINE；換誰洗碗尚未接 LINE 發送。

### 10.6 Google 授權與安全注意
- 授權範圍：`drive.appdata`、`calendar.events` 與基本資料。App 保持私有：OAuth 同意畫面維持「測試」，只加入家人的 Gmail 為測試使用者。
- Google access token 約 1 小時過期，Firebase 連線不受影響；設定超過 1 小時才修改時，背景存檔可能被瀏覽器擋彈窗，此時設定頁會提示，下一次點擊畫面即自動補存（關閉分頁前也會提醒）。
- `firebaseConfig` 的 apiKey 不是機密，真正的保護是 Firestore 規則。設定檔在每位使用者自己的雲端硬碟，**每位家人要各貼一次** firebaseConfig。
- 「完整匯出」資料包含私人筆記與帳目，請只留給自己備份，不要轉傳。

### 10.7 已知限制
- 洗碗的「可進入」名單只是畫面層篩選；日曆、洗碗在別台裝置的變動，需重新進入該服務才會更新（公告、圖卡是即時的）。
- 訪客在暫存狀態下登入，暫存內容不會帶進雲端（登入即切換到雲端資料）。
- 伺服器 Firestore 規則未允許 `user_data` 時，筆記 / 記帳本選「Firebase 伺服器」會顯示沒有權限。
- 開發環境無法連到真正的 Google / Firebase，驗證用假 Drive + 假 Firestore；第一次實機登入請逐項確認。

### 10.8 新增服務的方式
1. 寫 `services/<name>/index.js`，匯出 `{ id, access, requiresLogin?, storage?, mount, unmount }`（介面見 `services/README.md`）。
2. 在 `core/app.js` 以 `registerService()` 註冊，並在 `core/config.js` 把該功能的 `action` 設為 `"service"`。
3. 資料存取一律走 `core/repo.js` 的 `createRepo()`（記憶體 / Google 雲端 / Firestore 同一套介面）。
4. 要出現在大廳：在 `components/lobby.js` 的 `SECTIONS` 加一個區塊、`core/lobby-model.js` 的 `LOBBY_MODES` 加顯示方式。
