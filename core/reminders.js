// 最新提醒的資料存取層：存在「firebaseConfig (伺服器 Server)」的 Firestore（集合 reminders）。
// 管理員在系統設定 → 管理員 → 最新提醒 發布，所有登入且連上伺服器端的人都會在「最新提醒」看到。
// 未連線時只存記憶體（重新整理即消失）；登出會清空。
import { createRepo } from "./repo.js";

export const LEVELS = {
  info: { label: "一般", icon: "fa-bell", border: "theme-border-primary", iconBox: "theme-bg-light theme-text-primary", dot: "theme-bg-primary" },
  important: { label: "重要", icon: "fa-circle-exclamation", border: "border-amber-400", iconBox: "bg-amber-50 text-amber-600", dot: "bg-amber-500" },
  urgent: { label: "緊急", icon: "fa-triangle-exclamation", border: "border-rose-400", iconBox: "bg-rose-50 text-rose-600", dot: "bg-rose-500" },
};
export const levelOf = (v) => LEVELS[v] || LEVELS.info;
export const MAX_TITLE = 40;
export const MAX_CONTENT = 500;

const repo = createRepo({ name: "reminders", scope: "server", prefix: "r", sort: (a, b) => (b.createdAt || 0) - (a.createdAt || 0) });

export const remindersApi = {
  list: () => repo.list(),
  save: (r) => repo.save(r),
  remove: (id) => repo.remove(id),
  onChange: (fn) => repo.onChange(fn),
};

// 時間顯示：今天 08:30 / 昨天 18:00 / 10/5 09:00
export function timeText(ts) {
  if (!ts) return "";
  const d = new Date(ts), now = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const hm = `${p(d.getHours())}:${p(d.getMinutes())}`;
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 864e5);
  if (diff === 0) return `今天 ${hm}`;
  if (diff === 1) return `昨天 ${hm}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
}

export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
