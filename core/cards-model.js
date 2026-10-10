// 生活圖卡設定的資料與規則（不碰 DOM）：
//   - 格式大小：state.cardsView = { mode: card/list, size: l/m/s, cols: 2/3 }
//   - 排序方式：default 預設（建立先後）/ name 名稱（筆畫）/ custom 自訂（編號）
//   - 自訂排序：state.cardsSort.order 是「圖卡 id 的完整順序」；編號 = 位置 + 1，沒有編號的（新增的圖卡）接在最後
// 圖卡本身的資料在 services/cards（家庭共用 Firestore）；這裡只記「目前有哪些圖卡」（setCardItems）供自訂排序清單使用。
// 狀態只在記憶體；登入後由 core/cloud.js 隨「系統設定」存取 Google 雲端硬碟（cards:change / cards:view 觸發自動存檔）。
import { state, emit } from "./store.js";

export const CARDS_SORTS = ["default", "name", "custom"];
export const DEFAULT_CARDS_VIEW = { mode: "card", size: "m", cols: 2 };
const VIEW_OK = { mode: ["card", "list"], size: ["l", "m", "s"], cols: [2, 3] };

let items = []; // 目前的圖卡 [{ id, name, kind }]（依預設順序）

let collator;
const byName = (a, b) => {
  if (!collator) {
    try { collator = new Intl.Collator("zh-Hant-TW-u-co-stroke"); } catch { collator = new Intl.Collator("zh-Hant"); }
  }
  return collator.compare(a.name || "", b.name || "");
};

const commit = (extra) => emit("cards:change", { ...state.cardsSort, ...extra });

/* ---------- 目前的圖卡清單 ---------- */
export function setCardItems(list) {
  items = (Array.isArray(list) ? list : []).map((c) => ({ id: c.id, name: c.name, kind: c.kind }));
  emit("cards:items", [...items]);
}
export const getCardItems = () => [...items];

// 大廳點圖卡 → 進入生活圖卡後直接打開那一張（router 的 nav 先 requestOpenCard，生活圖卡 mount 時 takeOpenCard 取走）
let openWanted = null;
export const requestOpenCard = (id) => { openWanted = id || null; };
export const takeOpenCard = () => { const v = openWanted; openWanted = null; return v; };

/* ---------- 排序 ---------- */
// 依排序方式排好（傳入任何含 id / name 的陣列都可以）
export function orderedCards(list, sort = state.cardsSort.sort) {
  const base = list.map((c, i) => [c, i]);
  if (sort === "name") return base.sort((x, y) => byName(x[0], y[0]) || x[1] - y[1]).map((x) => x[0]);
  if (sort === "custom") {
    const rank = new Map(state.cardsSort.order.map((id, i) => [id, i]));
    return base.sort((x, y) => (rank.get(x[0].id) ?? 1e9) - (rank.get(y[0].id) ?? 1e9) || x[1] - y[1]).map((x) => x[0]);
  }
  return list;
}

export function setCardsSort(sort) {
  if (!CARDS_SORTS.includes(sort) || sort === state.cardsSort.sort) return;
  // 第一次切到自訂：從「目前看到的順序」開始編號，不會突然整個洗牌
  if (sort === "custom" && !state.cardsSort.order.length) state.cardsSort.order = orderedCards(items).map((c) => c.id);
  state.cardsSort.sort = sort;
  commit();
}

// 把某張圖卡移到第 n 號（1 起算），其他的自動順延並重新編號
export function moveCard(id, number) {
  const ids = orderedCards(items, "custom").map((c) => c.id);
  const from = ids.indexOf(id);
  if (from < 0) return false;
  const to = Math.min(Math.max(Math.round(Number(number)) - 1, 0), ids.length - 1);
  if (!Number.isFinite(to) || to === from) return false;
  ids.splice(to, 0, ids.splice(from, 1)[0]);
  state.cardsSort.order = ids;
  commit({ moved: id });
  return true;
}
export const stepCard = (id, delta) => {
  const i = orderedCards(items, "custom").findIndex((c) => c.id === id);
  return i >= 0 && moveCard(id, i + 1 + delta);
};

export function resetCardsOrder() {
  state.cardsSort.order = [];
  if (state.cardsSort.sort === "custom") state.cardsSort.sort = "default";
  commit();
}

/* ---------- 格式大小 ---------- */
export function setCardsView(key, value) {
  if (!(key in VIEW_OK)) return;
  const v = key === "cols" ? Number(value) : value;
  if (!VIEW_OK[key].includes(v) || state.cardsView[key] === v) return;
  state.cardsView[key] = v;
  emit("cards:view", { ...state.cardsView });
}

/* ---------- 存取雲端硬碟設定 ---------- */
export const snapshotCards = () => ({
  view: { ...state.cardsView },
  sort: state.cardsSort.sort,
  order: [...state.cardsSort.order],
});

// 套用雲端讀到的設定：欄位一律檢查，壞掉的項目直接略過
export function applyCards(s) {
  if (!s || typeof s !== "object") return;
  if (s.view && typeof s.view === "object") {
    for (const k of Object.keys(VIEW_OK)) if (VIEW_OK[k].includes(s.view[k])) state.cardsView[k] = s.view[k];
  }
  const order = [];
  for (const id of Array.isArray(s.order) ? s.order : []) if (typeof id === "string" && id && !order.includes(id)) order.push(id);
  state.cardsSort.order = order;
  state.cardsSort.sort = CARDS_SORTS.includes(s.sort) ? s.sort : "default";
  emit("cards:view", { ...state.cardsView });
  commit();
}

export function resetCards() {
  Object.assign(state.cardsView, DEFAULT_CARDS_VIEW);
  state.cardsSort.sort = "default";
  state.cardsSort.order = [];
  emit("cards:view", { ...state.cardsView });
  commit();
}
