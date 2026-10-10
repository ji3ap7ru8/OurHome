// 最新提醒「已讀紀錄」：存在 firebaseConfig (伺服器 Server) 的 Firestore。
// 集合 reminder_reads，每位使用者一份文件（文件 ID = Google 信箱小寫），彼此互不影響：
//   reminder_reads/<email> = { email, reads: { <提醒編號>: <已讀當下的發布時間> }, updatedAt }
// - 登入並連上伺服器後 bind(conn)：用 onSnapshot 即時同步，同一帳號多台裝置也會一致
// - 寫入用 merge，只動「自己文件裡」被標示的那幾筆
// - 未連線 / 訪客：只留在畫面記憶體（state.readReminders）；登出會清空
import { state, emit } from "./store.js";
import { showToast } from "./toast.js";

const COL = "reminder_reads";
let cur = null; // { sdk, ref, unsub }

const docIdOf = (email) => String(email || "").trim().toLowerCase().replace(/\//g, "_");
const cleanMap = (o) => {
  const m = {};
  if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) if (typeof v === "number") m[k] = v;
  return m;
};
let warned = false;
const warn = (e) => {
  if (warned) return; warned = true;
  showToast("已讀紀錄無法同步到伺服器：" + (/permission|insufficient/i.test(String(e?.code || e?.message || e)) ? "沒有權限，請確認 Firestore 規則（reminder_reads）" : (e?.message || "未知錯誤")), 5000);
};

export function unbindReads() {
  if (cur) { try { cur.unsub(); } catch { /* ignore */ } }
  cur = null;
}

// 連上伺服器後呼叫：載入我的已讀紀錄，並把畫面上已有、伺服器還沒有的（例如訪客時按過的、舊版設定檔搬來的）補寫上去
export function bindReads(conn, email) {
  unbindReads();
  const id = docIdOf(email);
  if (!conn || !id) return;
  const { sdk, db } = conn;
  const ref = sdk.doc(db, COL, id);
  let first = true;
  const unsub = sdk.onSnapshot(
    ref,
    (snap) => {
      const server = cleanMap(snap.exists() ? snap.data().reads : null);
      if (first) {
        first = false;
        const extra = {};
        for (const [k, v] of Object.entries(state.readReminders)) if (!(k in server)) extra[k] = v;
        state.readReminders = { ...server, ...extra };
        if (Object.keys(extra).length) saveReads(extra);
      } else {
        state.readReminders = server; // 以伺服器為準（含本機剛寫入、尚未送出的變更），這樣「恢復未讀」也會同步到其他裝置
      }
      emit("reminders:read", { ...state.readReminders });
    },
    (e) => warn(e)
  );
  cur = { sdk, ref, unsub, email: String(email).trim().toLowerCase() };
}

// 把新標示已讀的幾筆寫進自己的文件（沒連上伺服器就略過，只留記憶體）
export function saveReads(entries) {
  if (!cur || !entries || !Object.keys(entries).length) return;
  const { sdk, ref, email } = cur;
  Promise.resolve(sdk.setDoc(ref, { email, reads: entries, updatedAt: Date.now() }, { merge: true })).catch(warn);
}

// 恢復為未讀：把這幾筆從自己的文件刪掉
export function removeReads(ids) {
  if (!cur || !ids || !ids.length) return;
  const { sdk, ref, email } = cur;
  const reads = {};
  ids.forEach((id) => { reads[id] = sdk.deleteField(); });
  Promise.resolve(sdk.setDoc(ref, { email, reads, updatedAt: Date.now() }, { merge: true })).catch(warn);
}
