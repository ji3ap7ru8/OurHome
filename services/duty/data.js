// 值班表資料存取層：可在「系統設定 → 儲存位置」選 不保存 / Google 雲端 / Firebase 伺服器 / Firebase 私人端。
// 目前頁面還是範例畫面，尚未讀寫資料；先把資料集登記起來，之後做功能時直接用 dutyApi。
import { createRepo } from "../../core/repo.js";

const repo = createRepo({ name: "duty", scope: "private", guest: true, prefix: "d", choosable: true });

export const dutyApi = {
  list: () => repo.list(),
  save: (r) => repo.save(r),
  remove: (id) => repo.remove(id),
};
