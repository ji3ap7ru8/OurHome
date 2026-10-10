// 暱稱：預設就是 Google 帳號名稱；自訂後大廳顯示「Google帳號(暱稱)」。
import { state, emit } from "./store.js";

export const NICKNAME_MAX = 20;

// 目前生效的暱稱（空＝使用 Google 名稱）
export const effectiveNickname = () => {
  const n = (state.nickname || "").trim();
  return n && n !== state.account?.name ? n : "";
};

// 大廳顯示：Google帳號(暱稱)；沒設定暱稱時只顯示 Google 帳號名稱
export function displayName(account = state.account) {
  if (!account) return "已登入";
  const nick = effectiveNickname();
  return nick ? `${account.name}(${nick})` : account.name;
}

// 訪客暱稱：沒登入 Google 時隨機產生一組（例如「訪客K7P2」）。訪客也可自己改成固定暱稱，之後用同一個暱稱就能讀回私人端的資料。
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function randomGuestNickname() {
  let s = "";
  for (let i = 0; i < 4; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return "訪客" + s;
}
export function ensureGuestNickname() {
  if (state.isLoggedIn || (state.nickname || "").trim()) return;
  state.nickname = randomGuestNickname();
  emit("nickname:change", state.nickname);
}

// 私人端的分區名稱（Firestore：user_data/<這個名稱>/…）：登入＝暱稱，沒設暱稱就用 Google 帳號名稱；訪客＝訪客暱稱。
// 加前綴 n_ 並編碼，避免 / . __x__ 這類 Firestore 不允許的文件編號。
export function privateKey() {
  const n = state.isLoggedIn ? (effectiveNickname() || state.account?.name || "") : (state.nickname || "").trim();
  return n ? "n_" + encodeURIComponent(n).replace(/\./g, "%2E") : "";
}

export function setNickname(value) {
  let v = String(value ?? "").trim().slice(0, NICKNAME_MAX);
  if (!v && !state.isLoggedIn) v = randomGuestNickname(); // 訪客清空 = 重新隨機
  if (v === state.nickname) return;
  state.nickname = v;
  emit("nickname:change", v);
}
