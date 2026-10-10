// 系統設定「LINE Bot」的資料與規則（不碰 DOM）：一組 Bot Token ＋ 可一直新增的「名稱、User ID」清單，不限數量。
// state.lineBotToken：LINE Bot 的 Channel access token（字串）。
// state.lineBotIds 每筆 { id, name, userId }：id 是內部編號，name 顯示名稱（最多 20 字，可不填），userId 是 LINE User ID。
// （舊版存的是 botId，讀取時會自動當成 userId。）
// 狀態只在記憶體；登入後由 core/cloud.js 隨「系統設定」存到使用者自己的 Google 雲端硬碟（linebotids:change 觸發自動存檔）。
import { state, emit } from "./store.js";

export const MAX_NAME = 20;
const MAX_USER_ID = 100;
const MAX_TOKEN = 500;
const newId = () => "line_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const commit = () => emit("linebotids:change", [...state.lineBotIds]);

// 設定中繼站 URL（Google Apps Script 網頁應用程式網址；空字串＝清除）。回傳 { url } 或 { error }
export function setLineRelayUrl(v) {
  const u = String(v ?? "").trim();
  if (u && !validRelayUrl(u)) return { error: "請貼上 https:// 開頭的網址" };
  if (u !== state.lineRelayUrl) { state.lineRelayUrl = u; commit(); }
  return { url: u };
}
const validRelayUrl = (u) => /^https:\/\/[^\s]+$/.test(u) && u.length <= 500;

// 設定 Bot Token（空字串＝清除）。回傳 { token } 或 { error }
export function setLineBotToken(v) {
  const t = cleanToken(v);
  if (/\s/.test(t)) return { error: "Bot Token 不能有空白" };
  if (t.length > MAX_TOKEN) return { error: "Bot Token 太長" };
  if (t !== state.lineBotToken) { state.lineBotToken = t; commit(); }
  return { token: t };
}
const cleanName = (v) => String(v ?? "").trim().slice(0, MAX_NAME);
// 去掉頭尾空白與引號（從 JSON / 文件複製時常會多帶 " 或 '）
const cleanUserId = (v) => String(v ?? "").trim().replace(/^[\s"'“”‘’]+|[\s"'“”‘’]+$/g, "");
const cleanToken = (v) => String(v ?? "").trim();

// 回傳 { item } 或 { error }
export function addLineBotId(name, userId) {
  const uid = cleanUserId(userId);
  if (!uid) return { error: "請先輸入 User ID" };
  if (/\s/.test(uid)) return { error: "User ID 不能有空白" };
  if (uid.length > MAX_USER_ID) return { error: "User ID 太長" };
  if (state.lineBotIds.some((x) => x.userId.toLowerCase() === uid.toLowerCase())) return { error: "這個 User ID 已經新增過了" };
  const item = { id: newId(), name: cleanName(name), userId: uid };
  state.lineBotIds.push(item);
  commit();
  return { item };
}

// 修改一筆（名稱、User ID）。回傳 { item } 或 { error }
export function updateLineBotId(id, name, userId) {
  const it = state.lineBotIds.find((x) => x.id === id);
  if (!it) return { error: "找不到這筆資料" };
  const uid = cleanUserId(userId);
  if (!uid) return { error: "請先輸入 User ID" };
  if (/\s/.test(uid)) return { error: "User ID 不能有空白" };
  if (uid.length > MAX_USER_ID) return { error: "User ID 太長" };
  if (state.lineBotIds.some((x) => x.id !== id && x.userId.toLowerCase() === uid.toLowerCase())) return { error: "這個 User ID 已經新增過了" };
  it.name = cleanName(name);
  it.userId = uid;
  commit();
  return { item: it };
}

export function removeLineBotId(id) {
  const n = state.lineBotIds.length;
  state.lineBotIds = state.lineBotIds.filter((x) => x.id !== id);
  if (state.lineBotIds.length !== n) commit();
}

export const snapshotLineBotIds = () => state.lineBotIds.map((x) => ({ id: x.id, name: x.name, userId: x.userId }));
export const snapshotLineBotToken = () => state.lineBotToken || "";
export const snapshotLineRelayUrl = () => state.lineRelayUrl || "";

// 套用雲端讀到的設定：壞掉或重複的項目直接略過
export function applyLineBotIds(list, token, relayUrl) {
  if (typeof relayUrl === "string") { const u = relayUrl.trim(); state.lineRelayUrl = validRelayUrl(u) ? u : ""; }
  if (typeof token === "string") { const t = cleanToken(token); state.lineBotToken = /\s/.test(t) || t.length > MAX_TOKEN ? "" : t; }
  if (!Array.isArray(list)) { if (typeof token === "string" || typeof relayUrl === "string") commit(); return; }
  const seen = new Set();
  const out = [];
  for (const x of list) {
    const userId = cleanUserId(x?.userId ?? x?.botId); // 舊設定檔欄位叫 botId
    if (!userId || /\s/.test(userId) || userId.length > MAX_USER_ID || seen.has(userId.toLowerCase())) continue;
    seen.add(userId.toLowerCase());
    out.push({ id: typeof x.id === "string" && x.id ? x.id : newId(), name: cleanName(x?.name), userId });
  }
  state.lineBotIds = out;
  commit();
}

export function resetLineBotIds() {
  state.lineBotToken = "";
  state.lineRelayUrl = "";
  state.lineBotIds = [];
  commit();
}
