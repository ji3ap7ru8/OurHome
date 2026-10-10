// 家庭日曆「ID設定」的資料與規則（不碰 DOM）：Google 日曆 ID 清單，數量不限。
// 每筆 { id, name, calId }：id 是內部編號，name 是顯示名稱（最多 20 字，可不填），calId 是 Google 日曆 ID。
// 狀態只在記憶體；登入後由 core/cloud.js 隨「系統設定」存取 Google 雲端硬碟（calendarids:change 觸發自動存檔）。
import { state, emit } from "./store.js";

export const MAX_NAME = 20;
const MAX_CALID = 200;
const newId = () => "cal_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const commit = () => emit("calendarids:change", [...state.calendarIds]);

const cleanName = (v) => String(v ?? "").trim().slice(0, MAX_NAME);
const cleanCalId = (v) => String(v ?? "").trim();

// 回傳 { item } 或 { error }
export function addCalendarId(name, calId) {
  const cid = cleanCalId(calId);
  if (!cid) return { error: "請先輸入 Google 日曆 ID" };
  if (/\s/.test(cid)) return { error: "日曆 ID 不能有空白" };
  if (cid.length > MAX_CALID) return { error: "日曆 ID 太長" };
  if (state.calendarIds.some((x) => x.calId.toLowerCase() === cid.toLowerCase())) return { error: "這個日曆 ID 已經新增過了" };
  const item = { id: newId(), name: cleanName(name), calId: cid };
  state.calendarIds.push(item);
  commit();
  return { item };
}

export function removeCalendarId(id) {
  const n = state.calendarIds.length;
  state.calendarIds = state.calendarIds.filter((x) => x.id !== id);
  if (state.calendarIds.length !== n) commit();
}

/* ---------- 存取雲端硬碟設定 ---------- */
export const snapshotCalendarIds = () => state.calendarIds.map((x) => ({ id: x.id, name: x.name, calId: x.calId }));

// 套用雲端讀到的設定：壞掉或重複的項目直接略過
export function applyCalendarIds(list) {
  if (!Array.isArray(list)) return;
  const seen = new Set();
  const out = [];
  for (const x of list) {
    const calId = cleanCalId(x?.calId);
    if (!calId || /\s/.test(calId) || calId.length > MAX_CALID || seen.has(calId.toLowerCase())) continue;
    seen.add(calId.toLowerCase());
    out.push({ id: typeof x.id === "string" && x.id ? x.id : newId(), name: cleanName(x?.name), calId });
  }
  state.calendarIds = out;
  commit();
}

export function resetCalendarIds() {
  state.calendarIds = [];
  commit();
}
