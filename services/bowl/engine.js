// 換誰洗碗：純邏輯（無 DOM，可直接用 Node 測試）。
// 一天的紀錄：{ clear: 成員id|null, wash: 成員id|null, off: 是否休假 }
// （原型 bowl.html 用 "---" / "休假" 字串；這裡改用 null / off，並以成員 id 取代名字，之後改名不會斷）

export const WINDOW = { back: 5, ahead: 5 }; // 歷史 5 天 + 今天 + 未來 5 天（畫面可再往後新增，最多到 MAX_AHEAD）
export const MAX_AHEAD = 30;
export const MAX_MEMBERS = 8;
export const MAX_NAME = 6;
export const MIN_CHORE = 2; // 至少 2 人輪值才有「輪流」可言

const p2 = (n) => String(n).padStart(2, "0");
export const ymd = (d = new Date()) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
// 以「年月日」重新建日期再加減，避開夏令時間造成的日期錯位
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export function daysGrid(today = new Date(), ahead = WINDOW.ahead) {
  const out = [];
  for (let i = -WINDOW.back; i <= ahead; i++) out.push({ dateStr: ymd(addDays(today, i)), offset: i });
  return out;
}

export const emptyDay = () => ({ clear: null, wash: null, off: false });
export const isEmptyDay = (r) => !r || (!r.off && !r.clear && !r.wash);

/** 點同一人再點一次 = 取消；休假日不能指派 */
export function toggleTask(rec = emptyDay(), task, id) {
  if (rec.off) return rec;
  return { ...rec, [task]: rec[task] === id ? null : id };
}

/** 休假：收碗/洗碗一併清空；再按一次取消休假 */
export function toggleOff(rec = emptyDay()) {
  return rec.off ? emptyDay() : { clear: null, wash: null, off: true };
}

export function nextPerson(order, lastId) {
  if (!order.length) return null;
  return order[(order.indexOf(lastId) + 1) % order.length]; // 找不到(-1)時從第一位開始
}

/**
 * 自動排班：從「歷史中最後一位」接著輪，今天起（含）每天往下一位；休假日跳過且不佔輪次。
 * 今天已排好的人保留；之後每天依「歷史＋已排的次數」補欠（欠最多的人優先，次數一樣才照順序輪），同一天收碗、洗碗不同人。
 * 未來已手動指定的人會被覆蓋（休假日除外）。
 * 兩人時：收碗、洗碗每天剛好錯開，與原型行為一致。
 */
export function autoSchedule(days, records, order) {
  const out = { ...records };
  if (!order.length) return out;
  let lastClear = order[order.length - 1];
  let lastWash = order[0];
  for (const d of days) {
    if (d.offset >= 0) continue;
    const r = records[d.dateStr];
    if (!r || r.off) continue;
    if (order.includes(r.clear)) lastClear = r.clear;
    if (order.includes(r.wash)) lastWash = r.wash;
  }
  // 已發生的次數（歷史 + 今天已排好的）：之後每排一天就累加，用來「補欠」
  const cnt = { clear: {}, wash: {} };
  order.forEach((id) => { cnt.clear[id] = 0; cnt.wash[id] = 0; });
  for (const d of days) {
    if (d.offset > 0) continue;
    const r = records[d.dateStr];
    if (!r || r.off) continue;
    if (r.clear in cnt.clear) cnt.clear[r.clear]++;
    if (r.wash in cnt.wash) cnt.wash[r.wash]++;
  }
  const n = order.length;
  const dist = (last, id) => ((order.indexOf(id) - order.indexOf(last) + n) % n) || n; // 1 = 下一位 … n = 同一人
  for (const d of days) {
    if (d.offset < 0) continue;
    const r = records[d.dateStr];
    if (r?.off) continue;
    // 今天已經排好的人保留；其餘由「欠最多的人優先」決定，次數一樣才照順序輪
    const fc = d.offset === 0 && order.includes(r?.clear) ? r.clear : null;
    const fw = d.offset === 0 && order.includes(r?.wash) ? r.wash : null;
    let best = null;
    for (const c of fc ? [fc] : order) for (const w of fw ? [fw] : order) {
      if (n >= 2 && c === w && !(fc && fw)) continue; // 同一天收碗、洗碗不同人（手動排好的今天除外）
      const score = [cnt.clear[c] + cnt.wash[w], dist(lastClear, c) + dist(lastWash, w)];
      if (!best || score[0] < best.score[0] || (score[0] === best.score[0] && score[1] < best.score[1])) best = { c, w, score };
    }
    lastClear = best.c; lastWash = best.w;
    cnt.clear[best.c] += fc ? 0 : 1; cnt.wash[best.w] += fw ? 0 : 1;
    out[d.dateStr] = { clear: best.c, wash: best.w, off: false };
  }
  return out;
}

/** 重設未來：只清「明天起」，今天與歷史保留（與原型一致） */
export function clearFuture(days, records) {
  const out = { ...records };
  for (const d of days) if (d.offset > 0) delete out[d.dateStr];
  return out;
}

/** 統計視窗內每人收碗/洗碗次數 */
export function tally(days, records, order) {
  const t = { clear: {}, wash: {} };
  order.forEach((id) => { t.clear[id] = 0; t.wash[id] = 0; });
  for (const d of days) {
    const r = records[d.dateStr];
    if (!r || r.off) continue;
    if (r.clear in t.clear) t.clear[r.clear]++;
    if (r.wash in t.wash) t.wash[r.wash]++;
  }
  return t;
}

/** 誰欠幾次：最少的人欠（與最多者的差）。兩人時等同原型的「X 欠 N 次」 */
export function owed(counts, order) {
  if (!order.length) return { state: "none" };
  const vals = order.map((id) => counts[id] || 0);
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  if (max === 0) return { state: "none" };
  if (max === min) return { state: "even", each: max };
  return { state: "owe", diff: max - min, owers: order.filter((id) => (counts[id] || 0) === min) };
}

// ---------- 成員與瀏覽權限的規則（UI 與資料層共用） ----------

/** 回傳錯誤訊息；沒問題回傳 null。actorId = 目前操作的人 */
export function checkMemberPatch(members, id, patch, actorId) {
  const m = members.find((x) => x.id === id);
  if (!m) return "找不到這位成員";
  if (patch.canView === false) {
    if (id === actorId) return "不能關閉自己的瀏覽權限，否則你自己會被鎖在外面";
    if (!members.some((x) => x.id !== id && x.canView)) return "至少要有一位成員可以瀏覽";
  }
  if (patch.chore === false && m.chore && members.filter((x) => x.chore && x.id !== id).length < MIN_CHORE) {
    return `至少要有 ${MIN_CHORE} 位成員輪值`;
  }
  return null;
}

export function checkRemove(members, id, actorId) {
  const m = members.find((x) => x.id === id);
  if (!m) return "找不到這位成員";
  if (id === actorId) return "不能移除自己";
  if (m.chore && members.filter((x) => x.chore && x.id !== id).length < MIN_CHORE) return `至少要有 ${MIN_CHORE} 位成員輪值`;
  if (!members.some((x) => x.id !== id && x.canView)) return "至少要有一位成員可以瀏覽";
  return null;
}

/** 檢查新成員；回傳 { error } 或 { name } */
export function checkNewMember(members, { name, emoji }) {
  const n = String(name ?? "").trim();
  if (!n) return { error: "請輸入名字" };
  if ([...n].length > MAX_NAME) return { error: `名字最多 ${MAX_NAME} 個字` };
  if (members.length >= MAX_MEMBERS) return { error: `最多 ${MAX_MEMBERS} 位成員` };
  if (members.some((m) => m.name === n)) return { error: "已經有同名的成員" };
  if (!emoji) return { error: "請選一個圖示" };
  if (members.some((m) => m.emoji === emoji)) return { error: "這個圖示已被使用，請換一個" };
  return { name: n };
}
