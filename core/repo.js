// 通用資料倉庫：同一套介面，背後可以是「記憶體」或「Firestore」。
//   - 未連線（訪客 / 尚未設定 Firebase）→ 只存在記憶體，重新整理即消失（無痕）
//   - 連線後 bind(conn) → 讀寫 Firestore，並用 onSnapshot 即時同步
//   - 登出 unbind() → 回到記憶體並清空（私人資料不會留在共用手機上）
// scope: "server" = 家庭共用庫（伺服器 Firebase）/<name>/<id>；"private" = 私人庫（私人端 Firebase）/<name>/<id>
//   兩者是不同的 Firebase 專案，所以路徑相同也不會混在一起。
import { emit } from "./store.js";

const registry = new Map();
export const allRepos = () => [...registry.values()];

const clone = (o) => JSON.parse(JSON.stringify(o));
const byCreated = (a, b) => (a.createdAt || 0) - (b.createdAt || 0);
const withTimeout = (p, ms) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("連線逾時，請確認網路後再試")), ms))]);

// choosable: true = 使用者可在「設定 → 儲存位置」選 不保存 / Google 雲端 / Firebase 私人端（目前：我的筆記、記帳本）
export function createRepo({ name, scope, seed = null, sort = byCreated, guest = false, prefix = name[0], choosable = false }) {
  const makeSeed = () => (seed ? seed() : []);
  let mem = makeSeed();
  let rows = mem;
  let remote = null; // { sdk, col, unsub, ready }
  let driveBk = null;    // Google 雲端後端（core/drive-store.js）
  let driveReady = null; // 雲端資料讀完的 Promise
  const listeners = new Set();

  const sorted = () => { rows.sort(sort); };
  const notify = () => { listeners.forEach((fn) => fn()); emit("data:change", { name }); };
  const newId = () => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const waitReady = async () => { if (remote) await remote.ready; if (driveReady) await driveReady; };
  const persist = () => { if (driveBk) driveBk.write(rows.map(clone)); };

  function unbind() {
    if (remote) { try { remote.unsub(); } catch { /* ignore */ } }
    remote = null;
    driveBk = null; driveReady = null;
    mem = makeSeed(); // 回到記憶體並重置
    rows = mem;
    notify();
  }

  const repo = {
    name, scope, guest, choosable,
    isRemote: () => !!remote,
    // 目前實際的儲存位置："none" 只在記憶體 / "google" Google 雲端硬碟 / "private" Firestore
    mode: () => (driveBk ? "google" : remote ? remote.kind : "none"),
    // 目前 Firestore 分區（user_data/<owner>/<name>）；null = 整個集合（家庭共用）或非 Firestore
    owner: () => (remote ? remote.owner : null),

    // 改存 Google 雲端硬碟：讀取雲端檔案當作目前資料，之後每次異動都整份寫回
    bindDrive(bk) {
      if (remote) { try { remote.unsub(); } catch { /* ignore */ } remote = null; }
      driveBk = bk;
      rows = [];
      driveReady = bk.read().then((list) => { rows = list; sorted(); notify(); });
      driveReady.catch(() => {}); // 錯誤由呼叫端處理
      return driveReady;
    },
    flush: () => (driveBk ? driveBk.flush() : Promise.resolve()),

    // opts.owner：依使用者分區，路徑 user_data/<owner>/<name>/<id>（我的筆記、記帳本用）
    bind(conn, opts = {}) {
      if (remote) { try { remote.unsub(); } catch { /* ignore */ } remote = null; }
      driveBk = null; driveReady = null;
      const { sdk, db } = conn;
      const owner = opts.owner || null;
      const col = owner ? sdk.collection(db, "user_data", owner, name) : sdk.collection(db, name);
      rows = [];
      let ok, fail, done = false;
      const ready = new Promise((res, rej) => { ok = res; fail = rej; });
      ready.catch(() => {}); // 避免「未處理的 rejection」警告；錯誤由 list()/bind 回傳值處理
      const unsub = sdk.onSnapshot(
        col,
        (snap) => {
          rows = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
          sorted();
          if (!done) { done = true; ok(); }
          notify();
        },
        (err) => { if (!done) { done = true; fail(err); } else emit("cloud:error", { name, err }); }
      );
      remote = { sdk, db, col, unsub, ready, owner, kind: conn.label === "server" ? "server" : "private" };
      return ready;
    },
    unbind,

    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    async list() {
      await waitReady();
      return rows.map(clone);
    },
    async get(id) {
      await waitReady();
      const r = rows.find((x) => x.id === id);
      return r ? clone(r) : null;
    },

    async save(rec) {
      const r = clone(rec);
      if (!r.id) r.id = newId();
      if (!r.createdAt) r.createdAt = Date.now();
      if (remote) {
        await remote.ready;
        await withTimeout(remote.sdk.setDoc(remote.sdk.doc(remote.col, r.id), r), 15000);
        return clone(r);
      }
      if (driveReady) await driveReady;
      const i = rows.findIndex((x) => x.id === r.id);
      if (i >= 0) rows[i] = r; else rows.push(r);
      sorted();
      notify();
      persist();
      return clone(r);
    },

    async remove(id) {
      if (remote) {
        await remote.ready;
        await withTimeout(remote.sdk.deleteDoc(remote.sdk.doc(remote.col, id)), 15000);
        return;
      }
      if (driveReady) await driveReady;
      rows = mem = rows.filter((x) => x.id !== id);
      notify();
      persist();
    },

    async clear() {
      const ids = (await repo.list()).map((r) => r.id);
      await repo.removeMany(ids);
    },

    async removeMany(ids) {
      if (!ids.length) return;
      if (!remote) { if (driveReady) await driveReady; const s = new Set(ids); rows = mem = rows.filter((x) => !s.has(x.id)); notify(); persist(); return; }
      await remote.ready;
      const { sdk } = remote;
      for (let i = 0; i < ids.length; i += 400) {
        const batch = sdk.writeBatch(remote.db);
        ids.slice(i, i + 400).forEach((id) => batch.delete(sdk.doc(remote.col, id)));
        await withTimeout(batch.commit(), 20000);
      }
    },

    // 備份還原用：依 id 新增或覆蓋，不會刪除其他資料。回傳筆數
    async importMany(list) {
      const items = list.map((x) => ({ ...clone(x), id: x.id || newId(), createdAt: x.createdAt || Date.now() }));
      if (!remote) {
        if (driveReady) await driveReady;
        for (const r of items) { const i = rows.findIndex((x) => x.id === r.id); if (i >= 0) rows[i] = r; else rows.push(r); }
        sorted(); notify(); persist();
        return items.length;
      }
      await remote.ready;
      const { sdk } = remote;
      for (let i = 0; i < items.length; i += 400) {
        const batch = sdk.writeBatch(remote.db);
        items.slice(i, i + 400).forEach((r) => batch.set(sdk.doc(remote.col, r.id), r));
        await withTimeout(batch.commit(), 20000);
      }
      return items.length;
    },
  };

  sorted();
  registry.set(name, repo);
  return repo;
}
