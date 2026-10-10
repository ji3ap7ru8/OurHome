// 記帳本資料存取層（Stage 8：登入且設定私人 Firebase 後存私人 Firestore；訪客/未連線只存記憶體）。
import { createRepo } from "../../core/repo.js";

const repo = createRepo({ name: "ledger", scope: "private", guest: true, prefix: "l", choosable: true, sort: (a, b) => (b.createdAt || 0) - (a.createdAt || 0) });

export const ledgerApi = {
  list: () => repo.list(),
  save: async (r) => {
    if (r.id) { const old = await repo.get(r.id); return repo.save({ ...(old || {}), ...r }); }
    return repo.save(r);
  },
  remove: (id) => repo.remove(id),
};
