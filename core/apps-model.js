// 所有應用頁的資料與規則（不碰 DOM，可直接用 Node 測試）：
//   - 排序方式：default 預設 / name 名稱（筆畫）/ custom 自訂（編號）
//   - 自訂排序：state.apps.order 是「應用 id 的完整順序」；編號 = 順序位置 + 1
//   - 擴充插件：新增時要填「標題」和「網址」；標題顯示在所有應用，點擊後在新分頁開啟
// 內建服務與插件都用同一份排序，所以自訂排序可以把插件排在任何位置。
// 狀態只在記憶體；登入後由 core/cloud.js 隨「系統設定」存取 Google 雲端硬碟（apps:change / apps:view 觸發自動存檔）。
// 所有應用設定的參數（格式大小、排序方式、自訂編號、插件、停用的應用）都在 snapshotApps() 裡。
// 管理應用：state.apps.disabled 是「停用的應用 id」，預設空陣列＝全部啟用；停用的應用不出現在所有應用頁，也不能放進底欄快捷功能。
import { state, emit } from "./store.js";
import { availableFeatures } from "./config.js";

export const SORTS = ["default", "name", "custom"];
export const DEFAULT_VIEW = { mode: "card", size: "m", cols: 2 };
const VIEW_OK = { mode: ["card", "list"], size: ["l", "m", "s"], cols: [2, 3, 4] };
export const PLUGIN_ICON = "fa-solid fa-puzzle-piece";

const HIDDEN = ["大廳", "應用程式"];
let collator;
const byName = (a, b) => {
  if (!collator) {
    try { collator = new Intl.Collator("zh-Hant-TW-u-co-stroke"); } catch { collator = new Intl.Collator("zh-Hant"); }
  }
  return collator.compare(a.name, b.name);
};

/* ---------- 網址 ---------- */
// 回傳 { url } 或 { error }。沒寫 http(s):// 時自動補 https://；只接受 http / https（擋掉 javascript: 等）。
export function normalizeUrl(input) {
  let s = String(input ?? "").trim();
  if (!s) return { error: "請先貼上網址" };
  if (s.length > 2000) return { error: "網址太長了" };
  if (/\s/.test(s)) return { error: "網址裡不能有空白" };
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = "https://" + s;
  let u;
  try { u = new URL(s); } catch { return { error: "這不是有效的網址" }; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return { error: "只能新增 http 或 https 開頭的網址" };
  if (u.username || u.password) return { error: "網址裡不能包含帳號或密碼" };
  if (!u.hostname.includes(".") && u.hostname !== "localhost") return { error: "網址看起來不完整" };
  return { url: u.href };
}

// 名稱由網址產生：網域（去掉 www.）＋第一層路徑，例如 ji3ap7ru8.github.io/OurHome
export function pluginName(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./i, "");
    const seg = u.pathname.split("/").filter(Boolean)[0];
    let name = host;
    if (seg) { try { name += "/" + decodeURIComponent(seg); } catch { name += "/" + seg; } }
    return name;
  } catch { return String(url); }
}

export const TITLE_MAX = 20;
// 標題：去頭尾空白、連續空白合成一個、最多 20 字
export const cleanTitle = (t) => Array.from(String(t ?? "").replace(/\s+/g, " ").trim()).slice(0, TITLE_MAX).join("");
// 圖示連結（選填）：空白 = 用預設圖示；有填就必須是 https:// 開頭的圖片直接連結。回傳 { iconUrl } 或 { error }
export function normalizeIconUrl(input) {
  const s = String(input ?? "").trim();
  if (!s) return { iconUrl: "" };
  if (s.length > 2000) return { error: "圖示連結太長了" };
  if (/\s/.test(s)) return { error: "圖示連結裡不能有空白" };
  let u;
  try { u = new URL(s); } catch { return { error: "圖示連結需以 https:// 開頭" }; }
  if (u.protocol !== "https:") return { error: "圖示連結需以 https:// 開頭" };
  if (u.username || u.password) return { error: "圖示連結裡不能包含帳號或密碼" };
  return { iconUrl: u.href };
}
const makePlugin = (p) => ({ id: p.id, url: p.url, name: cleanTitle(p.name) || pluginName(p.url), iconUrl: p.iconUrl || "", icon: PLUGIN_ICON, plugin: true });
const newId = () => "plg_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ---------- 清單 ---------- */
export const builtinApps = () =>
  availableFeatures
    .filter((f) => ["service", "normal"].includes(f.action) && !HIDDEN.includes(f.id))
    .map((f) => ({ id: f.id, name: f.name, icon: f.icon, plugin: false }));

// 預設順序：內建服務（依系統排列）→ 插件（依新增先後）
export const defaultApps = () => [...builtinApps(), ...state.apps.plugins.map(makePlugin)];

// 依排序方式排好的清單（所有應用頁與自訂編號清單都用這個）。
// 預設只回傳「已啟用」的；all = true 時連停用的也一起回傳（管理應用清單、存檔用）。
export function orderedApps(sort = state.apps.sort, all = false) {
  const list = defaultApps();
  let out;
  if (sort === "name") out = list.map((a, i) => [a, i]).sort((x, y) => byName(x[0], y[0]) || x[1] - y[1]).map((x) => x[0]);
  else if (sort === "custom") {
    const rank = new Map(state.apps.order.map((id, i) => [id, i]));
    // 沒有編號的（例如剛新增的插件）接在最後，維持預設先後
    out = list.map((a, i) => [a, i]).sort((x, y) => (rank.get(x[0].id) ?? 1e9) - (rank.get(y[0].id) ?? 1e9) || x[1] - y[1]).map((x) => x[0]);
  } else out = list;
  return all ? out : out.filter((a) => isEnabled(a.id));
}

/* ---------- 管理應用：啟用 / 停用 ---------- */
export const isEnabled = (id) => !state.apps.disabled.includes(id);

export function setEnabled(id, on) {
  if (!defaultApps().some((a) => a.id === id)) return false;
  const has = state.apps.disabled.includes(id);
  if (on === !has) return false; // 沒有變化
  state.apps.disabled = on ? state.apps.disabled.filter((x) => x !== id) : [...state.apps.disabled, id];
  commit();
  return true;
}

export function enableAll() {
  if (!state.apps.disabled.length) return false;
  state.apps.disabled = [];
  commit();
  return true;
}

const commit = (extra) => { emit("apps:change", { ...state.apps, ...extra }); };

/* ---------- 排序 ---------- */
export function setSort(sort) {
  if (!SORTS.includes(sort) || sort === state.apps.sort) return;
  // 第一次切到自訂：從「目前看到的順序」開始編號，不會突然整個洗牌
  if (sort === "custom" && !state.apps.order.length) state.apps.order = orderedApps(undefined, true).map((a) => a.id);
  state.apps.sort = sort;
  commit();
}

// 把某個應用移到第 n 號（1 起算，只算「已啟用」的），其他的自動往後/往前補位並重新編號。
// 停用的應用保留在原本的位置，之後重新啟用就會回到原處。
export function moveApp(id, number) {
  const full = orderedApps("custom", true).map((a) => a.id);
  const ids = full.filter(isEnabled);
  const from = ids.indexOf(id);
  if (from < 0) return false;
  const to = Math.min(Math.max(Math.round(Number(number)) - 1, 0), ids.length - 1);
  if (!Number.isFinite(to) || to === from) return false;
  ids.splice(to, 0, ids.splice(from, 1)[0]);
  let k = 0;
  state.apps.order = full.map((x) => (isEnabled(x) ? ids[k++] : x));
  commit({ moved: id });
  return true;
}
export const stepApp = (id, delta) => {
  const i = orderedApps("custom").findIndex((a) => a.id === id);
  return i >= 0 && moveApp(id, i + 1 + delta);
};

export function resetOrder() {
  state.apps.order = [];
  state.apps.sort = state.apps.sort === "custom" ? "default" : state.apps.sort;
  commit();
}

/* ---------- 插件 ---------- */
// 回傳 { plugin } 或 { error }
export function addPlugin(title, text, iconText = "") {
  const name = cleanTitle(title);
  if (!name) return { error: "請先輸入標題" };
  const r = normalizeUrl(text);
  if (r.error) return r;
  const ic = normalizeIconUrl(iconText);
  if (ic.error) return ic;
  const dup = state.apps.plugins.find((p) => p.url === r.url);
  if (dup) return { error: `這個網址已經新增過了（${makePlugin(dup).name}）` };
  const p = { id: newId(), url: r.url, name, iconUrl: ic.iconUrl };
  state.apps.plugins.push({ id: p.id, url: p.url, name: p.name, iconUrl: p.iconUrl });
  // 自訂排序中：新插件排在最後，並補上編號
  if (state.apps.order.length) state.apps.order.push(p.id);
  commit({ added: p.id });
  return { plugin: p };
}

// 編輯插件（只在 ︙ 所有應用設定 →「擴充插件」進行）：標題、網址、圖示連結。回傳 { plugin } 或 { error }
export function updatePlugin(id, title, text, iconText = "") {
  const cur = state.apps.plugins.find((p) => p.id === id);
  if (!cur) return { error: "找不到這個插件" };
  const name = cleanTitle(title);
  if (!name) return { error: "請先輸入標題" };
  const r = normalizeUrl(text);
  if (r.error) return r;
  const ic = normalizeIconUrl(iconText);
  if (ic.error) return ic;
  const dup = state.apps.plugins.find((p) => p.id !== id && p.url === r.url);
  if (dup) return { error: `這個網址已經新增過了（${makePlugin(dup).name}）` };
  cur.name = name; cur.url = r.url; cur.iconUrl = ic.iconUrl; // id 不變 → 排序編號、啟用狀態都保留
  commit({ edited: id });
  return { plugin: makePlugin(cur) };
}

export function removePlugin(id) {
  const i = state.apps.plugins.findIndex((p) => p.id === id);
  if (i < 0) return false;
  state.apps.plugins.splice(i, 1);
  state.apps.order = state.apps.order.filter((x) => x !== id);
  state.apps.disabled = state.apps.disabled.filter((x) => x !== id);
  commit();
  return true;
}

/* ---------- 存取雲端硬碟設定 ---------- */
export const snapshotApps = () => ({
  view: { ...state.appsView }, // 格式大小：圖卡/清單、大小、每行數量
  sort: state.apps.sort,
  order: [...state.apps.order],
  disabled: [...state.apps.disabled], // 管理應用：停用的應用 id（空 = 全部啟用）
  plugins: state.apps.plugins.map((p) => ({ id: p.id, url: p.url, name: p.name, iconUrl: p.iconUrl || "" })),
});

// 套用雲端讀到的設定：欄位一律檢查，壞掉的項目直接略過（不會讓整頁壞掉）
export function applyApps(s) {
  if (!s || typeof s !== "object") return;
  if (s.view && typeof s.view === "object") {
    for (const k of Object.keys(VIEW_OK)) if (VIEW_OK[k].includes(s.view[k])) state.appsView[k] = s.view[k];
  }
  const seen = new Set();
  const plugins = [];
  for (const p of Array.isArray(s.plugins) ? s.plugins : []) {
    const r = normalizeUrl(p?.url);
    if (r.error || seen.has(r.url)) continue;
    seen.add(r.url);
    // 舊設定檔沒有標題時，退回用網址產生的名稱
    plugins.push({ id: typeof p.id === "string" && p.id ? p.id : newId(), url: r.url, name: cleanTitle(p?.name) || pluginName(r.url), iconUrl: normalizeIconUrl(p?.iconUrl).iconUrl || "" }); // 舊設定檔沒有圖示連結 = 預設圖示；壞掉的連結直接忽略
  }
  state.apps.plugins = plugins;
  const known = new Set(defaultApps().map((a) => a.id));
  const order = [];
  for (const id of Array.isArray(s.order) ? s.order : []) if (typeof id === "string" && known.has(id) && !order.includes(id)) order.push(id);
  state.apps.order = order;
  // 停用清單：只留下還存在的應用（舊設定檔沒有這欄 = 全部啟用）
  const disabled = [];
  for (const id of Array.isArray(s.disabled) ? s.disabled : []) if (typeof id === "string" && known.has(id) && !disabled.includes(id)) disabled.push(id);
  state.apps.disabled = disabled;
  state.apps.sort = SORTS.includes(s.sort) && (s.sort !== "custom" || order.length) ? s.sort : "default";
  commit();
}

export function resetApps() {
  Object.assign(state.appsView, DEFAULT_VIEW);
  state.apps.sort = "default";
  state.apps.order = [];
  state.apps.plugins = [];
  state.apps.disabled = [];
  commit();
}
