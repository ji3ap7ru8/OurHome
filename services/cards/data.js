// 生活圖卡的常數、示範資料與資料存取層（Stage 8：連線後讀寫家庭共用 Firestore，未連線時只存記憶體）。
// 範例碼皆為示範用，請自行換成實際資料。
import { createRepo } from "../../core/repo.js";

export const KINDS = {
  會員條碼: { icon: "fa-id-card", hint: "會員／集點條碼（輸入條碼數字；英數字會畫成條碼，其他以文字顯示）", label: "會員條碼／號碼", ph: "" },
  電子發票載具: { icon: "fa-mobile-screen", hint: "手機載具條碼（Code 39，例如 /ABC1234）", label: "載具條碼", ph: "/ABC1234" },
  電子條碼: { icon: "fa-barcode", hint: "一般條碼（英數字會畫成條碼，其他以文字顯示）", label: "條碼內容", ph: "" },
  電話號碼: { icon: "fa-phone", hint: "電話號碼（以大字顯示）", label: "電話號碼", ph: "02-12345678" },
  電子郵件: { icon: "fa-envelope", hint: "電子郵件地址（以大字顯示）", label: "電子郵件", ph: "name@example.com" },
  車牌號碼: { icon: "fa-car", hint: "車牌號碼（以大字顯示）", label: "車牌號碼", ph: "ABC-1234" },
  其他: { icon: "fa-tag", hint: "其他內容（以文字顯示）", label: "內容", ph: "" },
};
// 舊類型名稱 → 新名稱（已存的舊資料讀出時自動轉換，不必手動改）
const LEGACY_KIND = { 會員: "會員條碼", 載具: "電子發票載具", 條碼: "電子條碼", 車牌: "車牌號碼" };
export const normKind = (k) => LEGACY_KIND[k] || k;
export const MAX_CODES = 10; // 一張圖卡最多可放幾筆內容
const repo = createRepo({ name: "cards", scope: "server", prefix: "c" });

export const cardsApi = {
  list: async () => (await repo.list()).map((c) => ({ ...c, kind: normKind(c.kind) })),
  save: (c) => repo.save(c),
  remove: (id) => repo.remove(id),
  onChange: (fn) => repo.onChange(fn),
};
