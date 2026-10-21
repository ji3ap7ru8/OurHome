// 菜單的資料存取層：家庭共用 Firestore（集合 menus），未連線時只存記憶體。
// 每筆：{ id, name, iconUrl（選填，https 圖片）, imageUrl（選填，菜單圖片直接連結）, orderUrl（選填，線上點餐網址） }；imageUrl 與 orderUrl 至少一個
import { createRepo } from "../../core/repo.js";

const repo = createRepo({ name: "menus", scope: "server", prefix: "u" });

export const menuApi = {
  list: () => repo.list(),
  save: (m) => repo.save(m),
  remove: (id) => repo.remove(id),
  onChange: (fn) => repo.onChange(fn),
};
