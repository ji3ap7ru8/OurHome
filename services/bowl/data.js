// 換誰洗碗的常數與資料存取層（Stage 8：連線後存家庭共用 Firestore；未連線只存記憶體）。
// 兩個集合：bowl_members（成員，文件 id = 成員 id）、bowl_days（排班，文件 id = 日期 YYYY-MM-DD）。
// 瀏覽權限在這裡只是「畫面層」的篩選；真正的安全性要靠之後 Firestore 規則（見 README）。
import {
  daysGrid, MAX_AHEAD, ymd, nextPerson, toggleTask, toggleOff, isEmptyDay, autoSchedule, clearFuture,
  checkMemberPatch, checkRemove, checkNewMember,
} from "./engine.js";
import { createRepo } from "../../core/repo.js";

export const MEMBER_EMOJIS = ["🐮", "🐯", "🐰", "🐶", "🐱", "🐻", "🐼", "🦊", "🐸", "🐵", "🐷", "🐧"];
export const MEMBER_COLORS = ["#2563eb", "#e11d48", "#059669", "#7c3aed", "#ea580c", "#0891b2", "#be185d", "#4d7c0f"];
export const VACATION_COLOR = "#d97706";

// 預設成員取自原型 bowl.html（牛牛、虎虎）
const seedMembers = () => [
  { id: "m-niuniu", name: "牛牛", emoji: "🐮", color: MEMBER_COLORS[0], chore: true, canView: true },
  { id: "m-huhu", name: "虎虎", emoji: "🐯", color: MEMBER_COLORS[1], chore: true, canView: true },
];

// 示範資料：過去 5 天已輪過；今天與未來留白，讓使用者自己試「自動排班」
function seedRecords(members) {
  const order = members.map((m) => m.id);
  const out = {};
  let c = order[order.length - 1];
  let w = order[0];
  for (const d of daysGrid().filter((x) => x.offset < 0)) {
    c = nextPerson(order, c);
    w = nextPerson(order, w);
    out[d.dateStr] = { clear: c, wash: w, off: false };
  }
  return out;
}


// 伺服器上每天一份文件 bowl_days/<日期>：{ id, date, clear, wash, off, createdAt }。
//   clear / wash 存成員的圖示（🐮 牛牛、🐯 虎虎…），沒安排是 ""；off = 是否休假（休假時 clear / wash 為 ""）。
const toDoc = (dateStr, r, members, createdAt = Date.now()) => {
  const icon = (id) => (r.off ? "" : members.find((m) => m.id === id)?.emoji || "");
  return { id: dateStr, date: dateStr, clear: icon(r.clear), wash: icon(r.wash), off: !!r.off, createdAt };
};
const fromDoc = (d, members) => {
  const pick = (v) => members.find((m) => m.emoji === v)?.id || members.find((m) => m.id === v)?.id || null; // 也相容舊格式（直接存成員 id）
  if (d.off || (d.clear === "🏖️" && d.wash === "🏖️")) return { clear: null, wash: null, off: true };
  return { clear: pick(d.clear), wash: pick(d.wash), off: false };
};
const isTidy = (d, members) => {
  const t = toDoc(d.id, fromDoc(d, members), members, d.createdAt);
  return !!d.createdAt && typeof d.off === "boolean" && ["id", "date", "clear", "wash", "off"].every((k) => d[k] === t[k]) && Object.keys(d).length === 6;
};

const membersRepo = createRepo({
  name: "bowl_members", scope: "server", prefix: "m",
  seed: () => seedMembers().map((m, i) => ({ ...m, idx: i })),
  sort: (a, b) => (a.idx || 0) - (b.idx || 0),
});
const daysRepo = createRepo({
  name: "bowl_days", scope: "server", prefix: "d",
  seed: () => Object.entries(seedRecords(seedMembers())).map(([d, r]) => toDoc(d, r, seedMembers())),
  sort: (a, b) => (a.id < b.id ? -1 : 1),
});

// 畫面參數（目前：往後顯示到「今天 + N 天」）：存在伺服器 Firestore 的 bowl_settings/view，全家共用
const settingsRepo = createRepo({ name: "bowl_settings", scope: "server", prefix: "s", sort: (a, b) => (a.id < b.id ? -1 : 1) });

const clone = (o) => JSON.parse(JSON.stringify(o));
const fail = (msg) => { throw new Error(msg); };
const order = (members) => members.filter((m) => m.chore).map((m) => m.id);

async function current() {
  const [members, days] = await Promise.all([membersRepo.list(), daysRepo.list()]);
  const records = {};
  days.forEach((d) => { records[d.id] = fromDoc(d, members); });
  return { members, records, days };
}

// 把「改完的 records」與「改之前的 records」做比對，只寫入有變動的日子
async function commitRecords(next, prev) {
  const [members, rows] = await Promise.all([membersRepo.list(), daysRepo.list()]);
  const made = new Map(rows.map((x) => [x.id, x.createdAt])); // 已存在的日子保留原本的 createdAt
  for (const d of Object.keys(prev)) if (!next[d]) await daysRepo.remove(d);
  for (const [d, r] of Object.entries(next)) {
    if (JSON.stringify(prev[d]) !== JSON.stringify(r)) await daysRepo.save(toDoc(d, r, members, made.get(d) || Date.now()));
  }
}

function put(map, dateStr, rec) {
  if (isEmptyDay(rec)) delete map[dateStr];
  else map[dateStr] = rec;
}

// 雲端第一次使用（成員集合是空的）時，寫入預設成員，之後家人共用同一份
async function ensureSeed() {
  if (!membersRepo.isRemote()) return;
  if ((await membersRepo.list()).length === 0) await membersRepo.importMany(seedMembers().map((m, i) => ({ ...m, idx: i })));
}

// 舊格式（欄位不齊、clear/wash 存成員 id）的日子文件，整理成標準格式；整理過就不會再動
async function tidyDays() {
  if (!daysRepo.isRemote()) return;
  const [members, rows] = await Promise.all([membersRepo.list(), daysRepo.list()]);
  for (const d of rows) if (!isTidy(d, members)) await daysRepo.save(toDoc(d.id, fromDoc(d, members), members, d.createdAt || Date.now()));
}

function stripFuture(records, id) {
  const today = ymd();
  const next = clone(records);
  for (const [d, r] of Object.entries(next)) {
    if (d < today) continue;
    put(next, d, { ...r, clear: r.clear === id ? null : r.clear, wash: r.wash === id ? null : r.wash });
  }
  return next;
}

export const bowlApi = {
  load: async () => {
    await ensureSeed();
    await tidyDays();
    const view = await settingsRepo.get("view");
    return { ...clone(await current()), ahead: Number(view?.ahead) || 0 };
  },
  synced: () => daysRepo.isRemote() && membersRepo.isRemote() && settingsRepo.isRemote(), // 是否已連上伺服器 Firebase
  setAhead: async (n) => { await settingsRepo.save({ id: "view", ahead: Math.max(0, Math.min(MAX_AHEAD, Math.round(n))) }); },

  // 把畫面上的排班一次存進伺服器（只寫有變動的日子；畫面停手 1.5 秒後由 index.js 呼叫）
  saveAll: async ({ records, ahead }) => {
    const { records: prev } = await current();
    await commitRecords(clone(records), prev);
    const view = await settingsRepo.get("view");
    if ((Number(view?.ahead) || 0) !== (ahead || 0)) await bowlApi.setAhead(ahead || 0);
  },

  // 覆蓋儲存：先刪掉伺服器上整個「換誰洗碗」資料（日子、成員、畫面參數），再存入傳進來的目前資料
  overwrite: async ({ members, records, ahead }) => {
    if (!bowlApi.synced()) fail("尚未連上伺服器 Firebase");
    await daysRepo.clear();
    await membersRepo.clear();
    await settingsRepo.clear();
    await membersRepo.importMany(clone(members));
    await daysRepo.importMany(Object.entries(records).map(([d, r]) => toDoc(d, r, members)));
    if (ahead) await bowlApi.setAhead(ahead);
  },

  toggleTask: async (dateStr, task, id) => {
    if (dateStr < ymd()) fail("歷史紀錄不能修改");
    const { members, records } = await current();
    if (!members.some((m) => m.id === id && m.chore)) fail("這位成員目前沒有參與輪值");
    const next = clone(records);
    put(next, dateStr, toggleTask(records[dateStr], task, id));
    await commitRecords(next, records);
  },
  toggleOff: async (dateStr) => {
    if (dateStr < ymd()) fail("歷史紀錄不能修改");
    const { records } = await current();
    const next = clone(records);
    put(next, dateStr, toggleOff(records[dateStr]));
    await commitRecords(next, records);
  },
  autoSchedule: async (ahead) => {
    const { members, records } = await current();
    await commitRecords(autoSchedule(daysGrid(new Date(), ahead), clone(records), order(members)), records);
  },
  clearFuture: async (ahead) => {
    const { records } = await current();
    await commitRecords(clearFuture(daysGrid(new Date(), ahead), clone(records)), records);
  },

  addMember: async ({ name, emoji }) => {
    const { members } = await current();
    const r = checkNewMember(members, { name, emoji });
    if (r.error) fail(r.error);
    const color = MEMBER_COLORS.find((c) => !members.some((m) => m.color === c)) || MEMBER_COLORS[members.length % MEMBER_COLORS.length];
    const idx = members.reduce((mx, m) => Math.max(mx, m.idx ?? 0), -1) + 1;
    await membersRepo.save({ id: "m" + Date.now() + Math.random().toString(36).slice(2, 5), name: r.name, emoji, color, chore: true, canView: true, idx });
  },
  updateMember: async (id, patch, actorId) => {
    const { members, records } = await current();
    const err = checkMemberPatch(members, id, patch, actorId);
    if (err) fail(err);
    const m = members.find((x) => x.id === id);
    await membersRepo.save({ ...m, ...patch });
    if (patch.chore === false) await commitRecords(stripFuture(records, id), records); // 退出輪值：今天起的指派一併清掉，歷史保留
  },
  removeMember: async (id, actorId) => {
    const { members, records } = await current();
    const err = checkRemove(members, id, actorId);
    if (err) fail(err);
    await membersRepo.remove(id);
    await commitRecords(stripFuture(records, id), records); // 歷史保留（畫面顯示「已移除」）
  },
};
