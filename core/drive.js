// Google 雲端硬碟「應用程式專用資料夾」(appDataFolder)：default / settings / notify / data 四個檔案（見下方說明）。
// 只有本 App（同一個 OAuth 用戶端）讀得到，不會出現在使用者的一般雲端硬碟檔案列表裡。
import { CLOUD } from "./config.js";

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";

async function call(url, token, opt = {}) {
  const res = await fetch(url, { ...opt, headers: { Authorization: `Bearer ${token}`, ...(opt.headers || {}) } });
  if (!res.ok) {
    const err = new Error(`Drive ${res.status}`);
    err.status = res.status;
    try { err.detail = (await res.json())?.error?.message; } catch { /* ignore */ }
    throw err;
  }
  return res;
}

// 讀 appDataFolder 裡指定檔名的 JSON。回傳 { fileId, data }；檔案不存在時 data 為 null
export async function readJsonFile(token, fileName) {
  const q = encodeURIComponent(`name='${fileName}' and trashed=false`);
  const list = await (await call(`${API}/files?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime)&orderBy=modifiedTime desc&pageSize=1`, token)).json();
  const f = list.files?.[0];
  if (!f) return { fileId: null, data: null };
  const data = await (await call(`${API}/files/${f.id}?alt=media`, token)).json();
  return { fileId: f.id, data };
}

// 建立或更新 appDataFolder 裡指定檔名的 JSON，回傳 fileId
export async function writeJsonFile(token, fileId, fileName, data) {
  const body = JSON.stringify(data);
  if (fileId) {
    await call(`${UPLOAD}/files/${fileId}?uploadType=media`, token, { method: "PATCH", headers: { "Content-Type": "application/json" }, body });
    return fileId;
  }
  const boundary = "ourhome" + Math.random().toString(36).slice(2);
  const meta = JSON.stringify({ name: fileName, parents: ["appDataFolder"], mimeType: "application/json" });
  const multipart =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;
  const res = await call(`${UPLOAD}/files?uploadType=multipart&fields=id`, token, {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body: multipart,
  });
  return (await res.json()).id;
}

/* ---------- 系統設定：拆成 default / settings / notify 三個檔 ---------- */
// 程式裡仍用同一份 cfg：{ version, firebaseServer, firebasePrivate, defaults, settings }，只有讀寫雲端硬碟時才拆開 / 合併。
//   default ：預設參數 = firebaseServer、calendarIds、lineBotToken、lineBotIds、plugins、bowlEmails（洗碗可進入的電子郵件，只存在 default、使用者不能改）。
//             **使用者不能改寫**：只有設定頁的〔API 資料更新〕會寫入（用伺服器 Firestore 的 default 覆蓋）。
//   settings：使用者的一切設定與修改：theme、shortcuts、apps、cards、nickname、storage…，
//             以及 firebaseServer / firebasePrivate、五項預設參數「使用者改過的值」（沒改過的不寫，載入時用 default）。
//   notify  ：目前留白
// 「我的筆記、記帳本」另存在 data 檔（見 drive-store.js）。
const F = CLOUD.DRIVE_FILES;
const DEF_KEYS = ["calendarIds", "lineBotToken", "lineRelayUrl", "lineBotIds"]; // 加上 apps.plugins 與 firebaseServer，共五項預設參數
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const meta = (type) => ({ app: "OurHome", type, version: 1, savedAt: new Date().toISOString() });

// default 檔內容 → 預設參數物件（只留這幾項；都沒有就回傳 null）
export function pickDefaults(d) {
  if (!d || typeof d !== "object") return null;
  const out = {};
  for (const k of ["firebaseServer", ...DEF_KEYS, "plugins", "bowlEmails"]) if (k in d && d[k] !== undefined) out[k] = d[k];
  if (out.firebaseServer == null) delete out.firebaseServer;
  return Object.keys(out).length ? out : null;
}

// cfg → { def, settings }。def 只是目前讀到的預設參數（原樣帶出，只有 API 資料更新時才會真的寫檔）；
// settings 檔：實際設定 + 使用者改過的值（跟 default 一樣就不寫；default 沒有這項時，空值也不寫）
export function splitConfig(cfg) {
  const base = cfg.defaults || {};
  const s = { ...(cfg.settings || {}) };
  const isDefault = (k, v) => (k in base ? same(v, base[k]) : v === "" || (Array.isArray(v) && !v.length));
  for (const k of DEF_KEYS) if (k in s && isDefault(k, s[k])) delete s[k];
  if (s.apps && typeof s.apps === "object") {
    const { plugins, ...rest } = s.apps;
    s.apps = plugins !== undefined && !isDefault("plugins", plugins) ? s.apps : rest;
  }
  const server = cfg.firebaseServer && !same(cfg.firebaseServer, base.firebaseServer) ? cfg.firebaseServer : null;
  return { def: { ...base }, settings: s, server, priv: cfg.firebasePrivate ?? null };
}

// 合併：settings 檔裡有的用 settings（使用者的），沒有的用 default 檔的預設參數
export function joinConfig(def, set) {
  if (!def && !set) return null;
  const d = def || {};
  const st = { ...((set && set.settings) || {}) };
  for (const k of DEF_KEYS) if (!(k in st) && k in d) st[k] = d[k];
  if ("plugins" in d && !(st.apps && "plugins" in st.apps)) st.apps = { ...(st.apps || {}), plugins: d.plugins };
  return {
    version: 1,
    firebaseServer: set?.firebaseServer || d.firebaseServer || null,
    firebasePrivate: set?.firebasePrivate || d.firebasePrivate || null, // d.firebasePrivate：相容舊版 default 檔
    defaults: pickDefaults(d),
    settings: Object.keys(st).length ? st : null,
  };
}

// 讀三個檔。回傳 { fileId: { default, settings, notify }, data: cfg | null, legacy? }
// 新檔都還不存在、但有舊版單一檔（ourhome-config.json）時，用舊檔的內容當使用者設定（default 不會被寫入），並標記 legacy（呼叫端會立刻寫進 settings 檔）
export async function readConfig(token) {
  const [d, s, n] = await Promise.all([readJsonFile(token, F.default), readJsonFile(token, F.settings), readJsonFile(token, F.notify)]);
  const ids = { default: d.fileId, settings: s.fileId, notify: n.fileId };
  if (d.data || s.data) return { fileId: ids, data: joinConfig(d.data, s.data) };
  const old = await readJsonFile(token, CLOUD.DRIVE_FILE);
  if (old.data) return { fileId: ids, data: { ...old.data, defaults: null }, legacy: true };
  return { fileId: ids, data: null };
}

// 寫檔。ids 會被原地更新（中途失敗重試時不會重複建立檔案）。
// 預設只寫 settings 檔（與第一次建立 notify 檔）；default 檔只有 withDefault = true 才寫 —— 只有〔API 資料更新〕會這樣呼叫。
export async function writeConfig(token, ids, cfg, withDefault = false) {
  const out = ids || {};
  const { def, settings, server, priv } = splitConfig(cfg);
  if (withDefault) out.default = await writeJsonFile(token, out.default, F.default, { ...meta("default"), ...def });
  out.settings = await writeJsonFile(token, out.settings, F.settings, { ...meta("settings"), firebaseServer: server, firebasePrivate: priv, settings });
  if (!out.notify) out.notify = await writeJsonFile(token, null, F.notify, { ...meta("notify"), items: [] });
  return out;
}
