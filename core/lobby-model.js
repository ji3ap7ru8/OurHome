// 大廳設定的資料與規則（不碰 DOM，可直接用 Node 測試）：
//   - 顯示管理：列出「已啟用」的應用（順序同所有應用的排序方式），可個別開/關大廳要不要顯示；預設全部關閉
//   - 大廳排序：只排「已啟用 + 大廳有開啟」的應用；state.lobby.order 是完整順序，空 = 跟所有應用排序相同
// 狀態只在記憶體；登入後由 core/cloud.js 隨「系統設定」存取 Google 雲端硬碟（lobby:change 觸發自動存檔）。
import { state, emit } from "./store.js";
import { orderedApps, defaultApps } from "./apps-model.js";

const commit = (extra) => emit("lobby:change", { shown: [...state.lobby.shown], order: [...state.lobby.order], mode: { ...state.lobby.mode }, cards: [...state.lobby.cards], ...extra });

// 各服務在大廳的顯示方式（第一個選項是預設）。沒有列在這裡的服務 = 暫時沒有選項，只保留「>」
export const LOBBY_MODES = {
  "家庭公告": [{ value: "expiring", label: "即將截止" }, { value: "latest", label: "最新發布" }],
  "家庭日曆": [{ value: "today", label: "今日" }, { value: "week", label: "未來7天" }, { value: "days14", label: "未來14天" }, { value: "month", label: "這個月" }],
  "換誰洗碗": [{ value: "today", label: "今日" }],
  "個人記事本": [{ value: "all", label: "全部" }, { value: "pinned", label: "釘選" }], // 我的筆記：只顯示標題；全部 = 所有筆記、釘選 = 只放置頂的；另外每個分類各有一個選項（值 "cat:分類名"，選項由設定視窗依現有分類補上）
};
export const modeOptions = (id) => LOBBY_MODES[id] || [];
// 我的筆記可以選某個分類（"cat:分類名"）：分類是動態的，只檢查格式
export const isCatMode = (id, v) => id === "個人記事本" && typeof v === "string" && v.startsWith("cat:") && v.length > 4 && v.length <= 40;
const validMode = (id, v) => modeOptions(id).some((o) => o.value === v) || isCatMode(id, v);
export const getMode = (id) => {
  const opts = modeOptions(id);
  const v = state.lobby.mode?.[id];
  if (isCatMode(id, v)) return v;
  return opts.find((o) => o.value === v)?.value ?? opts[0]?.value ?? null;
};
// 生活圖卡：大廳要顯示哪幾張（可多選，空 = 都不顯示）。existing = 目前還存在的圖卡 id（依圖卡順序），已被刪掉的自動剔除
export const lobbyCards = () => [...state.lobby.cards];
export function toggleLobbyCard(id, existing) {
  if (!existing.includes(id)) return false;
  const on = new Set(state.lobby.cards.filter((x) => existing.includes(x)));
  on.has(id) ? on.delete(id) : on.add(id);
  state.lobby.cards = existing.filter((x) => on.has(x));
  commit();
  return true;
}

export function setMode(id, value) {
  if (!validMode(id, value) || getMode(id) === value) return false;
  state.lobby.mode = { ...state.lobby.mode, [id]: value };
  commit();
  return true;
}

// 大廳區塊標題旁顯示的文字（顯示方式的名稱）
export const modeLabelOf = (id) => { const v = getMode(id); return isCatMode(id, v) ? v.slice(4) : modeOptions(id).find((o) => o.value === v)?.label || ""; };

export const isShown = (id) => state.lobby.shown.includes(id); // 預設全部關閉，要在「顯示管理」自己開

// 顯示管理清單：已啟用的應用，依「所有應用」目前的排序方式
export const lobbyCandidates = () => orderedApps();

// 所有應用（含停用）依大廳順序排好；沒有編號的接在後面，維持所有應用的順序
function fullOrder() {
  const base = orderedApps(undefined, true);
  const rank = new Map(state.lobby.order.map((id, i) => [id, i]));
  return base.map((a, i) => [a, i]).sort((x, y) => (rank.get(x[0].id) ?? 1e9) - (rank.get(y[0].id) ?? 1e9) || x[1] - y[1]).map((x) => x[0]);
}

// 大廳實際顯示的服務（已啟用 + 沒被隱藏），依大廳順序
export const lobbyOrdered = () => {
  const on = new Set(lobbyCandidates().filter((a) => isShown(a.id)).map((a) => a.id));
  return fullOrder().filter((a) => on.has(a.id));
};

export function setShown(id, on) {
  if (!lobbyCandidates().some((a) => a.id === id)) return false;
  const has = state.lobby.shown.includes(id);
  if (on === has) return false;
  state.lobby.shown = on ? [...state.lobby.shown, id] : state.lobby.shown.filter((x) => x !== id);
  commit();
  return true;
}

// 把某個服務移到第 n 位（1 起算，只算大廳有顯示的）；隱藏/停用的保留在原位，之後再打開就回到原處
export function moveLobby(id, number) {
  const full = fullOrder().map((a) => a.id);
  const ids = lobbyOrdered().map((a) => a.id);
  const from = ids.indexOf(id);
  if (from < 0) return false;
  const to = Math.min(Math.max(Math.round(Number(number)) - 1, 0), ids.length - 1);
  if (!Number.isFinite(to) || to === from) return false;
  ids.splice(to, 0, ids.splice(from, 1)[0]);
  const shown = new Set(ids);
  let k = 0;
  state.lobby.order = full.map((x) => (shown.has(x) ? ids[k++] : x));
  commit({ moved: id });
  return true;
}
export const stepLobby = (id, delta) => {
  const i = lobbyOrdered().findIndex((a) => a.id === id);
  return i >= 0 && moveLobby(id, i + 1 + delta);
};

export function resetLobbyOrder() {
  if (!state.lobby.order.length) return false;
  state.lobby.order = [];
  commit();
  return true;
}

/* ---------- 存取雲端硬碟設定 ---------- */
export const snapshotLobby = () => ({ shown: [...state.lobby.shown], order: [...state.lobby.order], mode: { ...state.lobby.mode }, cards: [...state.lobby.cards] });

// 套用雲端讀到的設定：欄位一律檢查，不認得的 id 直接略過（舊設定檔沒有 lobby 時不動）
export function applyLobby(s) {
  if (!s || typeof s !== "object") return;
  const known = new Set(defaultApps().map((a) => a.id));
  const clean = (arr) => {
    const out = [];
    for (const id of Array.isArray(arr) ? arr : []) if (typeof id === "string" && known.has(id) && !out.includes(id)) out.push(id);
    return out;
  };
  state.lobby.shown = clean(s.shown); // 舊設定檔只有 hidden（舊版預設全部顯示）→ 沒有 shown = 回到新預設：全部關閉
  state.lobby.order = clean(s.order);
  const mode = {};
  for (const id of Object.keys(LOBBY_MODES)) { // 只收認得的服務與選項，其餘忽略（舊設定檔沒有 mode = 全部用預設）
    const v = s.mode && typeof s.mode === "object" ? s.mode[id] : null;
    if (validMode(id, v)) mode[id] = v;
  }
  state.lobby.mode = mode;
  const cards = [];
  for (const id of Array.isArray(s.cards) ? s.cards : []) if (typeof id === "string" && id && id.length < 200 && !cards.includes(id) && cards.length < 200) cards.push(id); // 圖卡 id 是動態的，這裡只檢查格式
  state.lobby.cards = cards;
  commit();
}

export function resetLobby() {
  state.lobby.shown = [];
  state.lobby.order = [];
  state.lobby.mode = {};
  state.lobby.cards = [];
  commit();
}
