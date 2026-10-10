// 家庭日曆的常數、Mock 資料與「資料存取層」。
// Stage 8：資料存取層改為 core/repo.js（連線後 Firestore、否則記憶體），介面維持 Promise，UI 不用動。
import { createRepo } from "../../core/repo.js";

export const COLOR_LIST = [
  { id: "",   hex: null,      label: "預設" },
  { id: "1",  hex: "#7986CB", label: "薰衣草紫" },
  { id: "2",  hex: "#33B679", label: "鼠尾草綠" },
  { id: "3",  hex: "#8E24AA", label: "葡萄紫" },
  { id: "4",  hex: "#E67C73", label: "紅鶴粉" },
  { id: "5",  hex: "#F6BF26", label: "香蕉黃" },
  { id: "6",  hex: "#F4511E", label: "橘色" },
  { id: "7",  hex: "#039BE5", label: "孔雀藍" },
  { id: "8",  hex: "#616161", label: "石墨灰" },
  { id: "9",  hex: "#3F51B5", label: "藍莓藍" },
  { id: "10", hex: "#0B8043", label: "羅勒綠" },
  { id: "11", hex: "#D50000", label: "番茄紅" },
];
export const COLOR_MAP = Object.fromEntries(COLOR_LIST.filter((c) => c.hex).map((c) => [c.id, c.hex]));
export const DEFAULT_COLOR = "#5CB881";
export const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

const pad = (n) => String(n).padStart(2, "0");
// 本地時間字串 "YYYY-MM-DDTHH:mm"（不帶時區，與 <input type="datetime-local"> 相同）
export const toLocalStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

// ---- 資料存取層 ------------------------------------------------------------
// Stage 8：連線後存家庭共用 Firestore（calendar 集合）；訪客/未連線只存記憶體。
// 家人在任何裝置新增的行程，下次開啟（或重新載入）就會看到。
const repo = createRepo({ name: "calendar", scope: "server", guest: true, prefix: "e", sort: (a, b) => String(a.startTime).localeCompare(String(b.startTime)) });

export const calendarApi = {
  // 回傳與該月份（含前後補位週）有交集的行程
  async getMonthEvents(year, month) {
    const first = new Date(year, month, 1);
    const from = new Date(year, month, 1 - first.getDay());
    const to = new Date(year, month + 1, 7);
    return (await repo.list()).filter((e) => new Date(e.startTime) < to && new Date(e.endTime) >= from);
  },
  create: (payload) => repo.save({ ...payload, id: undefined }),
  update: async (payload) => { await repo.save(payload); return true; },
  remove: async (id) => { await repo.remove(id); return true; },
  onChange: (fn) => repo.onChange(fn),
};
