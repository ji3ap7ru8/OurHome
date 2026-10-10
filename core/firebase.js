// Firebase 連線：動態載入官方 SDK（ES Module CDN），兩邊都用匿名登入連線。
// 兩套專案各一個 app 實例：「server」家庭共用庫、「private」個人私人庫。
// 兩邊都用 Firebase「匿名登入」連線，和 Google 帳號完全無關：
//   Google 登入（Drive API）只負責存「系統設定 + 兩組 firebaseConfig」；Firebase 只負責存各服務的資料。
// 為了符合「無痕」原則：Auth 使用 inMemoryPersistence（不寫 localStorage / IndexedDB），Firestore 也只用記憶體快取。
import { CLOUD } from "./config.js";

let sdkPromise = null;
export function loadSdk() {
  if (!sdkPromise) {
    const base = `https://www.gstatic.com/firebasejs/${CLOUD.FIREBASE_SDK}`;
    sdkPromise = Promise.all([
      import(`${base}/firebase-app.js`),
      import(`${base}/firebase-auth.js`),
      import(`${base}/firebase-firestore.js`),
    ]).then((mods) => Object.assign({}, ...mods)).catch((e) => { sdkPromise = null; throw e; });
  }
  return sdkPromise;
}

const withTimeout = (p, ms, msg) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms))]);

// label: "server" | "private"。回傳 { sdk, app, auth, db, uid, email, label }
// Firebase 專案要在 Authentication → Sign-in method 啟用「匿名 Anonymous」。
// 「伺服器端要登入 Google 才能用」由 App 控制：伺服器的 firebaseConfig 存在使用者自己的雲端硬碟，沒登入就拿不到。
export async function connect(label, config) {
  const sdk = await withTimeout(loadSdk(), 15000, "載入 Firebase 元件逾時，請檢查網路");
  const name = `ourhome-${label}`;
  const old = sdk.getApps().find((a) => a.name === name);
  if (old) await sdk.deleteApp(old);

  const app = sdk.initializeApp(config, name);
  const auth = sdk.initializeAuth(app, { persistence: sdk.inMemoryPersistence });
  const res = await withTimeout(sdk.signInAnonymously(auth), 15000, "Firebase 登入逾時");
  const db = sdk.getFirestore(app);
  return { sdk, app, auth, db, label, uid: res.user.uid, email: res.user.email || "" };
}

export async function disconnect(conn) {
  if (!conn) return;
  try { await conn.sdk.signOut(conn.auth); } catch { /* ignore */ }
  try { await conn.sdk.deleteApp(conn.app); } catch { /* ignore */ }
}
