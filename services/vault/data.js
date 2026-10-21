// 帳密庫資料存取層：可選 不保存 / Google 雲端；Firebase 伺服器、私人端因帳密安全性上鎖，只能存到個人 Google 雲端。
// 目前頁面還是範例畫面，尚未讀寫資料；先把資料集登記起來，之後做功能時直接用 vaultApi。
import { createRepo } from "../../core/repo.js";

const repo = createRepo({ name: "vault", scope: "private", prefix: "v", choosable: true });

export const vaultApi = {
  list: () => repo.list(),
  save: (r) => repo.save(r),
  remove: (id) => repo.remove(id),
};
