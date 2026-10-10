// 大廳「簡略資訊」的資料整理（不碰 DOM、不連網路，可直接用 Node 測試）。
// 各服務的原始資料由 components/lobby.js 讀回來，這裡只負責「挑出要顯示哪幾筆、整理成一行小卡要的欄位」。
// 顯示方式（mode）的選項定義在 core/lobby-model.js 的 LOBBY_MODES。

const p2 = (n) => String(n).padStart(2, "0");
export const ymd = (d = new Date()) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const WEEK = ["日", "一", "二", "三", "四", "五", "六"];
const stamp = (d, t, fb) => new Date(`${d}T${t || fb}`);
const ms = (d) => { const v = d.getTime(); return Number.isFinite(v) ? v : 0; };
export const MAX_ITEMS = 12; // 每個服務在大廳最多放幾張小卡

/* ---------- 家庭公告：標籤 + 是否置頂 + 標題 ---------- */
// 所有公告都會顯示，mode 只決定誰先誰後（沒過期的在前、已過期的接在最後）：
//   "expiring" 即將截止：最快截止的在最前面，沒有截止時間的（永久顯示）排在有截止時間的後面
//   "latest"   最新發布：最新發布的在最前面
export function noteItems(notes, mode, now = new Date()) {
  const list = (Array.isArray(notes) ? notes : []).filter((n) => n && n.title);
  const due = (n) => (n.status === "綁定期限" && n.expireDate ? stamp(n.expireDate, n.expireTime, "23:59") : null);
  const expired = (n) => { const d = due(n); return !!d && now > d; };
  const pub = (n) => ms(stamp(n.publishDate, n.publishTime, "00:00"));
  const byPub = (a, b) => pub(b) - pub(a);
  const byDue = (a, b) => {
    const x = due(a), y = due(b);
    if (x && y) return ms(x) - ms(y) || byPub(a, b);
    return x ? -1 : y ? 1 : byPub(a, b);
  };
  const live = list.filter((n) => !expired(n)).sort(mode === "latest" ? byPub : byDue);
  const dead = list.filter(expired).sort(byPub);
  return [...live, ...dead].slice(0, MAX_ITEMS).map((n) => {
    const ex = expired(n);
    return { id: n.id, tag: n.tag || "一般", color: n.color || "gray", title: n.title, pinned: !!n.isPinned && !ex, expired: ex };
  });
}

/* ---------- 我的筆記：只要標題 ---------- */
// mode: "all" 全部：所有筆記 / "pinned" 釘選：只放置頂的 / "cat:分類名"：只放該分類的；一律最近更新的在前
export function memoItems(memos, mode) {
  const upd = (m) => Number(m.updatedAt) || 0;
  const cat = (m) => m.category || "全部";
  const m0 = String(mode || "all");
  const list = (Array.isArray(memos) ? memos : []).filter((m) => m && m.title)
    .filter((m) => (m0 === "pinned" ? m.pinned : m0.startsWith("cat:") ? cat(m) === m0.slice(4) : true))
    .sort((a, b) => upd(b) - upd(a));
  return list.slice(0, MAX_ITEMS).map((m) => ({ id: m.id, title: m.title, category: cat(m), pinned: !!m.pinned }));
}

/* ---------- 家庭日曆：時間 + 行程名稱 ---------- */
// mode: "today" 今日 / "week" 未來 7 天（含今天）/ "days14" 未來 14 天（含今天）/ "month" 這個月（整個月，從 1 號到月底）
export const CAL_DAYS = { today: 1, week: 7, days14: 14 };
const CAL_MAX = { today: MAX_ITEMS, week: MAX_ITEMS, days14: 24, month: 40 }; // 各範圍最多放幾張小卡
export function calendarRange(mode, now = new Date()) {
  if (mode === "month") return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + (CAL_DAYS[mode] || 1));
  return { from, to };
}
// 大廳一次抓的資料範圍：涵蓋所有模式（這個月 + 未來 14 天），切換模式不用重新讀取
export function calendarFetchRange(now = new Date()) {
  const m = calendarRange("month", now), d = calendarRange("days14", now);
  return { from: m.from < d.from ? m.from : d.from, to: m.to > d.to ? m.to : d.to };
}
// 各模式沒有行程時的提示
export const CAL_EMPTY = { today: "今天沒有行程", week: "未來 7 天沒有行程", days14: "未來 14 天沒有行程", month: "這個月沒有行程" };
const isAllDay = (e) => /T00:00$/.test(e.startTime) && /T00:00$/.test(e.endTime) && new Date(e.endTime) > new Date(e.startTime);

export function calendarItems(events, mode, now = new Date()) {
  const r = calendarRange(mode, now);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const from = r.from < today ? today : r.from, to = r.to; // 日期已過的行程不再出現（「這個月」也只從今天起）；跨過今天的長行程仍會顯示
  const seen = new Set();
  const inRange = (Array.isArray(events) ? events : []).filter((e) => {
    if (!e || !e.startTime || !e.endTime || seen.has(e.id)) return false;
    seen.add(e.id);
    const s = new Date(e.startTime), en = new Date(e.endTime);
    if (!Number.isFinite(+s) || !Number.isFinite(+en)) return false;
    return s < to && (en > from || (+en === +s && s >= from)); // 與區間有交集（零長度行程算在起點）
  }).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  return inRange.slice(0, CAL_MAX[mode] || MAX_ITEMS).map((e) => {
    const s = new Date(e.startTime);
    const shown = s < from ? from : s; // 之前就開始的長行程：標在區間第一天
    const clock = isAllDay(e) ? "全天" : s < from ? "進行中" : `${p2(s.getHours())}:${p2(s.getMinutes())}`;
    const label = mode !== "today" ? `${shown.getMonth() + 1}/${shown.getDate()} 週${WEEK[shown.getDay()]} ${clock}` : clock;
    return { id: e.id, title: e.title || "（無標題）", label, month: shown.getMonth() + 1, day: shown.getDate(), hex: e.hex || "" , colorId: e.colorId || "" };
  });
}

/* ---------- 換誰洗碗：今天誰收碗、誰洗碗 ---------- */
// data = { members, records }（bowlApi.load 的結果）；回傳一排小卡
export function bowlItems(data, now = new Date()) {
  const members = data?.members || [];
  const rec = data?.records?.[ymd(now)];
  if (rec?.off) return [{ label: "今天", emoji: "🏖️", name: "休假" }];
  if (!rec || (!rec.clear && !rec.wash)) return [{ label: "今天", emoji: "", name: "還沒排班" }];
  const who = (id) => members.find((m) => m.id === id);
  const card = (label, id) => {
    const m = who(id);
    return m ? { label, emoji: m.emoji || "", name: m.name, color: m.color || "" } : { label, emoji: "", name: "未安排" };
  };
  return [card("收碗", rec.clear), card("洗碗", rec.wash)];
}

/* ---------- 生活圖卡：名稱 + 類型 ---------- */
export function cardItems(cards, ids) {
  const pick = new Set(Array.isArray(ids) ? ids : []);
  return (Array.isArray(cards) ? cards : []).filter((c) => c && pick.has(c.id)).slice(0, MAX_ITEMS)
    .map((c) => ({ id: c.id, name: c.name || "（未命名）", kind: c.kind || "", iconUrl: c.iconUrl || "" }));
}
