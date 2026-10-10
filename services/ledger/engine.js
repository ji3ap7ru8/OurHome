// 記帳純邏輯（無 DOM，可直接用 Node 測試）。金額一律以「分」整數運算避免浮點誤差。
export const EXPENSE_CATS = [
  { name: "餐飲", icon: "fa-utensils", color: "#f97316" },
  { name: "交通", icon: "fa-bus", color: "#0ea5e9" },
  { name: "購物", icon: "fa-bag-shopping", color: "#ec4899" },
  { name: "居家", icon: "fa-house", color: "#84cc16" },
  { name: "醫療", icon: "fa-kit-medical", color: "#ef4444" },
  { name: "娛樂", icon: "fa-gamepad", color: "#8b5cf6" },
  { name: "教育", icon: "fa-book", color: "#14b8a6" },
  { name: "其他", icon: "fa-ellipsis", color: "#64748b" },
];
export const INCOME_CATS = [
  { name: "薪資", icon: "fa-briefcase", color: "#16a34a" },
  { name: "獎金", icon: "fa-gift", color: "#eab308" },
  { name: "紅包", icon: "fa-envelope", color: "#dc2626" },
  { name: "投資", icon: "fa-chart-line", color: "#0891b2" },
  { name: "其他", icon: "fa-ellipsis", color: "#64748b" },
];
export const catsOf = (type) => (type === "income" ? INCOME_CATS : EXPENSE_CATS);
export const catInfo = (type, name) => catsOf(type).find((c) => c.name === name) || catsOf(type).at(-1);

const p2 = (n) => String(n).padStart(2, "0");
export const ymd = (d = new Date()) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const monthKey = (d = new Date()) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}`;
export const shiftMonth = (key, delta) => {
  const [y, m] = key.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1)); // 以每月 1 號為基準，31 號不會跳月
};

/** 解析金額字串 → 正數（最多兩位小數、上限 9,999,999.99）；不合法回傳 null */
export function parseAmount(str) {
  const s = String(str ?? "").replace(/[,，\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const cents = Math.round(parseFloat(s) * 100);
  return cents > 0 && cents <= 999999999 ? cents / 100 : null;
}

const toCents = (n) => Math.round(n * 100);
export function summarize(list, key) {
  let inc = 0, exp = 0;
  for (const r of list) {
    if (!r.date.startsWith(key)) continue;
    if (r.type === "income") inc += toCents(r.amount); else exp += toCents(r.amount);
  }
  return { income: inc / 100, expense: exp / 100, balance: (inc - exp) / 100 };
}

export function byCategory(list, key, type = "expense") {
  const map = new Map();
  for (const r of list) if (r.type === type && r.date.startsWith(key)) map.set(r.category, (map.get(r.category) || 0) + toCents(r.amount));
  const total = [...map.values()].reduce((a, b) => a + b, 0);
  return [...map].map(([name, c]) => ({ name, total: c / 100, pct: total ? (c / total) * 100 : 0 })).sort((a, b) => b.total - a.total);
}

export function groupByDay(list, key) {
  const days = new Map();
  for (const r of list.filter((x) => x.date.startsWith(key)).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)) {
    if (!days.has(r.date)) days.set(r.date, []);
    days.get(r.date).push(r);
  }
  return [...days].map(([date, items]) => {
    const net = items.reduce((s, r) => s + (r.type === "income" ? 1 : -1) * toCents(r.amount), 0) / 100;
    return { date, items, net };
  });
}
