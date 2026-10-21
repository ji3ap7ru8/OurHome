// 菜單設定的資料與規則（同生活菜單設定）（不碰 DOM）：
//   - 格式大小：state.menuView = { mode: card/list, size: l/m/s, cols: 2/3 }
//   - 排序方式：default 預設（建立先後）/ name 名稱（筆畫）/ custom 自訂（編號）
//   - 自訂排序：state.menuSort.order 是「菜單 id 的完整順序」；編號 = 位置 + 1，沒有編號的（新增的菜單）接在最後
// 菜單本身的資料在 services/menu（家庭共用 Firestore）；這裡只記「目前有哪些菜單」（setMenuItems）供自訂排序清單使用。
// 狀態只在記憶體；登入後由 core/cloud.js 隨「系統設定」存取 Google 雲端硬碟（menu:change / menu:view 觸發自動存檔）。
import { state, emit } from "./store.js";

export const MENU_SORTS = ["default", "name", "custom"];
export const DEFAULT_MENU_VIEW = { mode: "card", size: "m", cols: 2 };
const VIEW_OK = { mode: ["card", "list"], size: ["l", "m", "s"], cols: [2, 3] };

let items = []; // 目前的菜單 [{ id, name, kind }]（依預設順序）

let collator;
const byName = (a, b) => {
  if (!collator) {
    try { collator = new Intl.Collator("zh-Hant-TW-u-co-stroke"); } catch { collator = new Intl.Collator("zh-Hant"); }
  }
  return collator.compare(a.name || "", b.name || "");
};

const commit = (extra) => emit("menu:change", { ...state.menuSort, ...extra });

/* ---------- 目前的菜單清單 ---------- */
export function setMenuItems(list) {
  items = (Array.isArray(list) ? list : []).map((c) => ({ id: c.id, name: c.name, kind: c.kind }));
  emit("menu:items", [...items]);
}
export const getMenuItems = () => [...items];


/* ---------- 排序 ---------- */
// 依排序方式排好（傳入任何含 id / name 的陣列都可以）
export function orderedMenus(list, sort = state.menuSort.sort) {
  const base = list.map((c, i) => [c, i]);
  if (sort === "name") return base.sort((x, y) => byName(x[0], y[0]) || x[1] - y[1]).map((x) => x[0]);
  if (sort === "custom") {
    const rank = new Map(state.menuSort.order.map((id, i) => [id, i]));
    return base.sort((x, y) => (rank.get(x[0].id) ?? 1e9) - (rank.get(y[0].id) ?? 1e9) || x[1] - y[1]).map((x) => x[0]);
  }
  return list;
}

export function setMenuSort(sort) {
  if (!MENU_SORTS.includes(sort) || sort === state.menuSort.sort) return;
  // 第一次切到自訂：從「目前看到的順序」開始編號，不會突然整個洗牌
  if (sort === "custom" && !state.menuSort.order.length) state.menuSort.order = orderedMenus(items).map((c) => c.id);
  state.menuSort.sort = sort;
  commit();
}

// 把某張菜單移到第 n 號（1 起算），其他的自動順延並重新編號
export function moveMenu(id, number) {
  const ids = orderedMenus(items, "custom").map((c) => c.id);
  const from = ids.indexOf(id);
  if (from < 0) return false;
  const to = Math.min(Math.max(Math.round(Number(number)) - 1, 0), ids.length - 1);
  if (!Number.isFinite(to) || to === from) return false;
  ids.splice(to, 0, ids.splice(from, 1)[0]);
  state.menuSort.order = ids;
  commit({ moved: id });
  return true;
}
export const stepMenu = (id, delta) => {
  const i = orderedMenus(items, "custom").findIndex((c) => c.id === id);
  return i >= 0 && moveMenu(id, i + 1 + delta);
};

export function resetMenuOrder() {
  state.menuSort.order = [];
  if (state.menuSort.sort === "custom") state.menuSort.sort = "default";
  commit();
}

/* ---------- 格式大小 ---------- */
export function setMenuView(key, value) {
  if (!(key in VIEW_OK)) return;
  const v = key === "cols" ? Number(value) : value;
  if (!VIEW_OK[key].includes(v) || state.menuView[key] === v) return;
  state.menuView[key] = v;
  emit("menu:view", { ...state.menuView });
}

/* ---------- 存取雲端硬碟設定 ---------- */
export const snapshotMenu = () => ({
  view: { ...state.menuView },
  sort: state.menuSort.sort,
  order: [...state.menuSort.order],
});

// 套用雲端讀到的設定：欄位一律檢查，壞掉的項目直接略過
export function applyMenu(s) {
  if (!s || typeof s !== "object") return;
  if (s.view && typeof s.view === "object") {
    for (const k of Object.keys(VIEW_OK)) if (VIEW_OK[k].includes(s.view[k])) state.menuView[k] = s.view[k];
  }
  const order = [];
  for (const id of Array.isArray(s.order) ? s.order : []) if (typeof id === "string" && id && !order.includes(id)) order.push(id);
  state.menuSort.order = order;
  state.menuSort.sort = MENU_SORTS.includes(s.sort) ? s.sort : "default";
  emit("menu:view", { ...state.menuView });
  commit();
}

export function resetMenu() {
  Object.assign(state.menuView, DEFAULT_MENU_VIEW);
  state.menuSort.sort = "default";
  state.menuSort.order = [];
  emit("menu:view", { ...state.menuView });
  commit();
}
