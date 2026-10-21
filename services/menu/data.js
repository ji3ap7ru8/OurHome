// 菜單的資料存取層：家庭共用 Firestore（集合 menus），未連線時只存記憶體。
// 每筆：{ id, name, iconUrl（選填，https 圖片）, imageUrl（菜單圖片，https 圖片直接連結） }
import { createRepo } from "../../core/repo.js";

const repo = createRepo({ name: "menus", scope: "server", prefix: "u" });

export const menuApi = {
  list: () => repo.list(),
  save: (m) => repo.save(m),
  remove: (id) => repo.remove(id),
  onChange: (fn) => repo.onChange(fn),
};
