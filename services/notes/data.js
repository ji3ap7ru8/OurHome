// 家庭公告的常數、示範資料與資料存取層（Stage 8：連線後讀寫家庭共用 Firestore，未連線時只存記憶體）。
import { createRepo } from "../../core/repo.js";

export const MAX_NOTES = 10;
export const AUTHORS = ["爸爸", "媽媽", "牛牛", "虎虎"];
export const TAGS = ["緊急", "重要", "一般", "其他"];
export const TAG_COLOR = { 一般: "green", 重要: "yellow", 緊急: "red", 其他: "blue" };
export const PALETTE = {
  red: { bg: "#fee2e2", text: "#7f1d1d", border: "#fca5a5" },
  yellow: { bg: "#fef9c3", text: "#713f12", border: "#fde047" },
  green: { bg: "#dcfce7", text: "#14532d", border: "#86efac" },
  blue: { bg: "#dbeafe", text: "#1e3a8a", border: "#93c5fd" },
  gray: { bg: "#f3f4f6", text: "#111827", border: "#d1d5db" },
  expired: { bg: "#e5e7eb", text: "#4b5563", border: "#9ca3af" },
};


const repo = createRepo({ name: "notes", scope: "server", prefix: "n" });

export const notesApi = {
  list: () => repo.list(),
  save: (n) => repo.save(n),
  remove: (id) => repo.remove(id),
  onChange: (fn) => repo.onChange(fn),
};
