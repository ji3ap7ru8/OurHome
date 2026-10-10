// Google 登入（Google Identity Services 的 token 模式）。
// 注意：requestAccessToken 必須在使用者「點擊」的同一個動作裡呼叫，否則瀏覽器會擋彈出視窗，
// 所以 GIS 腳本在啟動時就預載，signIn() 內第一步就同步呼叫。
import { CLOUD } from "./config.js";

export const isGoogleConfigured = () => !!String(CLOUD.GOOGLE_CLIENT_ID || "").trim();

let loading = null;
export function preloadGoogle() {
  if (!isGoogleConfigured()) return Promise.resolve(false);
  if (window.google?.accounts?.oauth2) return Promise.resolve(true);
  if (!loading) {
    loading = new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.onload = () => resolve(true);
      s.onerror = () => { loading = null; resolve(false); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

let client = null;
let token = null;
let expiresAt = 0;
let waiter = null;
let calendarOk = true; // 這次登入有沒有勾選日曆權限
export const hasCalendarScope = () => calendarOk;
let hintEmail = ""; // 已登入的帳號：續期時帶入，讓 Google 不必再問「選哪個帳號」

function settle(fn) { const w = waiter; waiter = null; if (w) fn(w); }

function ensureClient() {
  if (client) return client;
  client = window.google.accounts.oauth2.initTokenClient({
    client_id: CLOUD.GOOGLE_CLIENT_ID.trim(),
    scope: CLOUD.SCOPES,
    callback: (r) => settle((w) => {
      if (r.error) return w.reject(new Error(r.error_description || r.error));
      const g = window.google.accounts.oauth2;
      const driveScope = String(CLOUD.SCOPES).split(/\s+/).find((x) => x.endsWith("/drive.appdata"));
      if (driveScope && typeof g.hasGrantedAllScopes === "function" && !g.hasGrantedAllScopes(r, driveScope)) {
        return w.reject(Object.assign(new Error("沒有授權雲端硬碟存取：請重新登入，並勾選雲端硬碟（應用程式專屬資料）的權限"), { code: "scope" }));
      }
      calendarOk = typeof g.hasGrantedAllScopes === "function" ? g.hasGrantedAllScopes(r, "https://www.googleapis.com/auth/calendar.events") : true;
      token = r.access_token;
      expiresAt = Date.now() + (Number(r.expires_in) || 3600) * 1000;
      w.resolve(token);
    }),
    error_callback: (e) => settle((w) => w.reject(new Error(e?.type === "popup_closed" ? "已取消登入" : e?.message || "Google 登入失敗"))),
  });
  return client;
}

function request(prompt) {
  if (!window.google?.accounts?.oauth2) return Promise.reject(new Error("Google 登入元件尚未載入，請檢查網路後再試"));
  return new Promise((resolve, reject) => {
    waiter = { resolve, reject };
    const opts = { prompt };
    if (hintEmail) opts.hint = hintEmail;
    ensureClient().requestAccessToken(opts);
  });
}

async function fetchProfile(t) {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${t}` } });
  if (!res.ok) throw new Error("無法取得 Google 帳號資料");
  const p = await res.json();
  return { name: p.name || p.email, email: p.email, picture: p.picture || "", sub: p.sub };
}

// 記住帳號：只把「名稱 / 信箱 / 頭貼」存在這個瀏覽器（localStorage），不存任何 token、也不存私人資料。
// 下次開啟網頁時用信箱當提示，向 Google 無聲換一張新的授權（不用再選帳號）。登出時會一併清掉。
const REMEMBER_KEY = "ourhome:account";
export function getRememberedAccount() {
  try { const v = JSON.parse(localStorage.getItem(REMEMBER_KEY) || "null"); return v && v.email ? v : null; }
  catch { return null; }
}
export function rememberAccount(p) {
  try { localStorage.setItem(REMEMBER_KEY, JSON.stringify({ name: p.name, email: p.email, picture: p.picture, sub: p.sub })); } catch { /* 瀏覽器不讓存就算了 */ }
}

export function forgetRemembered() { try { localStorage.removeItem(REMEMBER_KEY); } catch { /* ignore */ } }

// 是否「記住」由系統設定的「自動登入」開關決定（見 core/autologin.js），這裡登入時不主動記
export async function signIn() {
  const accessToken = await request("select_account");
  const profile = await fetchProfile(accessToken);
  hintEmail = profile.email || "";
  return { accessToken, profile };
}

// 自動登入（用記住的帳號）：prompt 留空 = 已授權過就不再詢問。
// 注意：不是由點擊觸發時，瀏覽器可能擋掉 Google 的彈出視窗；擋掉時由呼叫端等使用者點一下再重試（見 core/auth.js 的 autoLogin）。
export async function silentSignIn() {
  const saved = getRememberedAccount();
  if (!saved) throw new Error("沒有記住的帳號");
  hintEmail = saved.email;
  const accessToken = await request("");
  const profile = await fetchProfile(accessToken);
  hintEmail = profile.email || saved.email;
  return { accessToken, profile };
}

// Token 約 1 小時過期。過期後的「無聲更新」瀏覽器可能擋彈窗；由使用者點擊觸發時一定可用。
export async function getAccessToken() {
  if (token && Date.now() < expiresAt - 60_000) return token;
  return request("");
}

export function clearToken() { token = null; expiresAt = 0; }
export function forgetAccount() { hintEmail = ""; forgetRemembered(); }
// token 還有效嗎？（有效時續期不需要彈窗，可在背景直接存檔）
export const hasValidToken = () => !!token && Date.now() < expiresAt - 60_000;
