// 換誰洗碗「可進入的電子郵件」名單（不碰 DOM，可直接用 Node 測試）。
// 名單的唯一來源 = Google 雲端硬碟 default 檔的預設參數 bowlEmails（字串陣列）：
//   管理員在伺服器 Firestore 的 default/default 手動填 bowlEmails，再到〔系統設定 → API 資料更新〕同步進雲端硬碟 default。
//   App 裡不能新增／修改名單（使用者設定檔也不存這項），能不能進入只看 default 檔裡的名單。
// 名單是空的或還沒同步 = 沒有人能進入（寧可擋住，也不要誤開放）。
let source = () => null;
export const bindBowlEmails = (fn) => { source = fn; }; // core/cloud.js 綁定：回傳目前載入的 default.bowlEmails

export const MAX_EMAILS = 50;
export const normEmail = (s) => String(s ?? "").trim().toLowerCase();
const looksLikeEmail = (e) => e.length <= 100 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// 整理成「小寫、不重複、格式正確」的清單；壞掉的項目直接略過
export function cleanBowlEmails(list) {
  const out = [];
  for (const x of Array.isArray(list) ? list : []) {
    const e = normEmail(typeof x === "string" ? x : x?.email);
    if (looksLikeEmail(e) && !out.includes(e)) out.push(e);
    if (out.length >= MAX_EMAILS) break;
  }
  return out;
}

export const getBowlEmails = () => cleanBowlEmails(source());
export const canEnterBowl = (email) => { const e = normEmail(email); return !!e && getBowlEmails().includes(e); };
