// 「儲存位置：Google 雲端」的資料後端：我的筆記、記帳本一起存在 appDataFolder 的同一個 JSON 檔（ourhome-data.json），
// 格式 { memos: [...], ledger: [...] }。兩個資料集共用同一個檔案，所以寫入一律整份寫回（共用延遲、共用佇列）。
// 資料改動後稍等一下（合併連續操作）再寫；寫失敗時記成「待補存」，使用者下一次點擊畫面時在點擊動作內換 token 補存
// （跟系統設定的存檔方式相同，避免瀏覽器擋住換 token 的彈窗）。
import { CLOUD } from "./config.js";
import { getAccessToken, hasValidToken, clearToken } from "./google.js";
import { readJsonFile, writeJsonFile } from "./drive.js";
import { showToast } from "./toast.js";

const DELAY = 700;
const FILE = CLOUD.DRIVE_FILES.data;

let fileId = null;
const store = {};          // { memos: rows, ledger: rows }：目前已知的整份內容
const dirty = new Set();   // 還沒寫成功的資料集
let timer = null;
let chain = Promise.resolve();
let pending = false;       // 有資料還沒寫成功
let describe = (e) => String(e?.message || e);
let label = "資料";

const payload = () => ({ app: "OurHome", type: "data", version: 2, savedAt: new Date().toISOString(), memos: [], ledger: [], ...store });

// token 過期（401）時換新 token 重試一次
async function put(token) {
  const sent = { ...store };
  const body = { ...payload(), ...sent };
  try {
    fileId = await writeJsonFile(token, fileId, FILE, body);
  } catch (e) {
    if (e?.status !== 401) throw e;
    clearToken();
    fileId = await writeJsonFile(await getAccessToken(), fileId, FILE, body);
  }
  Object.keys(sent).forEach((k) => { if (store[k] === sent[k]) dirty.delete(k); });
}

const flushOnTap = () => {
  if (!pending) return;
  pending = false;
  document.removeEventListener?.("click", flushOnTap, true);
  const tp = getAccessToken(); // 必須在點擊動作裡同步呼叫
  chain = chain.then(async () => {
    try { await put(await tp); showToast(`${label}已補存到 Google 雲端`); }
    catch (e) { markPending(e); }
  });
};
function markPending(e) {
  if (!pending) showToast(`${label}尚未存到 Google 雲端：${describe(e)}（點一下畫面會自動補存）`, 5000);
  pending = true;
  document.removeEventListener?.("click", flushOnTap, true);
  document.addEventListener?.("click", flushOnTap, true);
}

function run() {
  timer = null;
  chain = chain.then(async () => {
    if (!dirty.size) return;
    try {
      if (!hasValidToken()) throw Object.assign(new Error("Google 授權已過期"), { status: 401 });
      await put(await getAccessToken());
      pending = false;
    } catch (e) { markPending(e); }
  });
}

export function createDriveBackend(name, { label: lb = name, onError = (e) => String(e?.message || e) } = {}) {
  label = lb; describe = onError;
  return {
    // 讀取雲端資料；檔案或這個資料集還不存在 = 空的（舊版各自一檔 ourhome-data-<名稱>.json 會被讀進來，下次寫入時搬進新檔）
    async read() {
      const get = async (file) => {
        try { return await readJsonFile(await getAccessToken(), file); }
        catch (e) {
          if (e?.status !== 401) throw e;
          clearToken();
          return await readJsonFile(await getAccessToken(), file);
        }
      };
      const r = await get(FILE);
      fileId = r.fileId;
      const d = r.data || {};
      for (const k of Object.keys(d)) if (Array.isArray(d[k]) && !dirty.has(k)) store[k] = d[k];
      if (!Array.isArray(d[name]) && !dirty.has(name)) {
        const old = await get(`ourhome-data-${name}.json`);
        store[name] = Array.isArray(old.data?.rows) ? old.data.rows : [];
        if (store[name].length) { dirty.add(name); timer = timer || setTimeout(run, DELAY); }
      }
      if (!Array.isArray(store[name])) store[name] = [];
      return [...store[name]];
    },
    write(rows) {
      store[name] = rows;
      dirty.add(name);
      clearTimeout(timer);
      timer = setTimeout(run, DELAY);
    },
    // 登出 / 切換儲存位置前：把還在等待的資料立刻寫出去
    flush() {
      if (timer) { clearTimeout(timer); run(); }
      return chain;
    },
  };
}

// 登入後確保 data 檔存在（沒有就建立一個空白的）
export function ensureDataFile() {
  chain = chain.then(async () => {
    if (fileId) return;
    const t = await getAccessToken();
    const r = await readJsonFile(t, FILE);
    if (r.fileId) { fileId = r.fileId; return; }
    fileId = await writeJsonFile(t, null, FILE, payload());
  }).catch(() => {});
  return chain;
}

// 登出：清掉記憶體裡的資料（不留在共用手機上）
export function resetDriveData() {
  clearTimeout(timer); timer = null;
  fileId = null;
  Object.keys(store).forEach((k) => delete store[k]);
  dirty.clear();
  pending = false;
  document.removeEventListener?.("click", flushOnTap, true);
  chain = Promise.resolve();
}
