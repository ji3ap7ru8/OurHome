// 讀寫 Google 日曆：直接呼叫 Google Calendar API v3，用使用者登入時取得的權限（scope: calendar.events）。
// 不需要 Apps Script、沒有任何網址或密碼放在程式碼裡；只有被分享該日曆的帳號才讀得到。
import { state } from "./store.js";
import { getAccessToken, hasCalendarScope } from "./google.js";

const API = "https://www.googleapis.com/calendar/v3/calendars/";
const pad = (n) => String(n).padStart(2, "0");
// 本地時間字串 "YYYY-MM-DDTHH:mm"（和 <input type="datetime-local"> 相同）
const local = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

// 連結 / 是否視訊會議：Google 日曆沒有對應欄位，附在備註最後一行
const LINK_RE = /\n*(💻 會議連結|🔗 附加連結)：(\S+)\s*$/;
const encodeDesc = (r) => (String(r.description || "") + (r.link ? `\n\n${r.isMeeting ? "💻 會議連結" : "🔗 附加連結"}：${r.link}` : "")).trim();
function decodeDesc(text) {
  const m = LINK_RE.exec(text || "");
  return m ? { description: text.slice(0, m.index).trim(), link: m[2], isMeeting: m[1].startsWith("💻") } : { description: (text || "").trim(), link: "", isMeeting: false };
}

async function call(method, calId, { path = "", query, body } = {}) {
  if (!state.isLoggedIn) throw new Error("請先登入 Google 帳號，才能讀取 Google 日曆");
  let token;
  try { token = await getAccessToken(); } catch (e) { throw new Error(e?.message || "取得 Google 授權失敗，請重新登入"); }
  if (!hasCalendarScope()) throw new Error("沒有授權日曆權限：請登出後重新登入，並勾選「查看及編輯日曆活動」");
  const url = API + encodeURIComponent(calId) + "/events" + path + (query ? "?" + new URLSearchParams(query) : "");
  let res;
  try {
    res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error("連不上 Google 日曆，請檢查網路");
  }
  if (res.status === 204) return null;
  let j = {};
  try { j = await res.json(); } catch { /* 沒有內容 */ }
  if (!res.ok) {
    const msg = j?.error?.message || "";
    if (res.status === 401) throw new Error("Google 授權已過期，請重新登入");
    if (res.status === 404) throw new Error("找不到這個日曆：請確認 ID 正確，且日曆已分享給目前登入的帳號");
    if (res.status === 403 && /insufficient|scope/i.test(msg)) throw new Error("沒有授權日曆權限：請登出後重新登入，並勾選「查看及編輯日曆活動」");
    if (res.status === 403) throw new Error(/has not been used|disabled/i.test(msg) ? "尚未在 Google Cloud 啟用 Calendar API" : "沒有這個日曆的權限：請確認日曆已分享給目前帳號（需可更改活動才能新增／修改）" + (msg ? `（${msg}）` : ""));
    throw new Error(msg || "Google 日曆操作失敗");
  }
  return j;
}

const iso = (l) => new Date(l).toISOString();
const toBody = (r) => ({
  summary: r.title,
  start: { dateTime: iso(r.startTime) },
  end: { dateTime: iso(r.endTime) },
  location: r.location || "",
  description: encodeDesc(r),
});

function toEvent(it, calId, meta) {
  const allDay = !!it.start?.date;
  let startTime, endTime;
  if (allDay) {
    const s = it.start.date, e = it.end?.date || s;
    startTime = `${s}T00:00`;
    endTime = e > s ? `${e}T00:00` : local(new Date(new Date(`${s}T00:00`).getTime() + 864e5)); // 整天行程的結束日是「隔天」（不含）
  } else {
    startTime = local(new Date(it.start.dateTime));
    endTime = local(new Date(it.end.dateTime));
  }
  const d = decodeDesc(it.description);
  return {
    id: `g:${calId}:${it.id}`, gid: it.id, gcal: calId,
    title: it.summary || "（無標題）",
    startTime, endTime,
    location: it.location || "",
    description: d.description, link: d.link, isMeeting: d.isMeeting,
    colorId: it.colorId || "",
    hex: meta.hex || "",                              // 沒指定行程顏色時，用這個日曆的代表色
    readOnly: !!(allDay || it.recurringEventId),     // 整天 / 重複行程暫不在這裡修改（避免改到整個系列）
    calName: meta.name || calId,
  };
}

export const gcalApi = {
  async list(calId, from, to, meta = {}) {
    const items = [];
    let pageToken = "";
    do {
      const j = await call("GET", calId, { query: { timeMin: from.toISOString(), timeMax: to.toISOString(), singleEvents: "true", orderBy: "startTime", maxResults: "250", ...(pageToken ? { pageToken } : {}) } });
      items.push(...(j.items || []));
      pageToken = j.nextPageToken || "";
    } while (pageToken);
    return items.filter((it) => it.status !== "cancelled" && (it.start?.dateTime || it.start?.date)).map((it) => toEvent(it, calId, meta));
  },
  async create(calId, rec) { await call("POST", calId, { body: { ...toBody(rec), ...(rec.colorId ? { colorId: rec.colorId } : {}) } }); return true; },
  async update(calId, rec) { await call("PATCH", calId, { path: "/" + encodeURIComponent(rec.id), body: { ...toBody(rec), colorId: rec.colorId || null } }); return true; },
  async remove(calId, gid) { await call("DELETE", calId, { path: "/" + encodeURIComponent(gid) }); return true; },
};
