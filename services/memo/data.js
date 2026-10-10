// 個人記事本的常數與資料存取層（Stage 8：登入且設定私人 Firebase 後存私人 Firestore；訪客/未連線只存記憶體）。
import { createRepo } from "../../core/repo.js";

export const MAX_MEMOS = 100;
const repo = createRepo({ name: "memos", scope: "private", guest: true, prefix: "m", choosable: true, sort: (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0) });

export const memoApi = {
  list: () => repo.list(),
  save: async (m) => {
    if (!m.id && (await repo.list()).length >= MAX_MEMOS) throw new Error(`最多 ${MAX_MEMOS} 則，請先刪除舊的`);
    return repo.save({ ...m, updatedAt: Date.now() });
  },
  remove: (id) => repo.remove(id),
  clear: () => repo.clear(),
};

// 分類可自由新增：「全部」為預設；其他分類由記事本身帶出。顏色一律跟著系統設定的主色調（換主題色會一起變）
export const DEFAULT_CAT = "全部";
export const catStyle = () => ({ accent: "var(--primary-color)", cls: "theme-bg-light theme-text-primary" });
