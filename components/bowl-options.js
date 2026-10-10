// 換誰洗碗頁的 ︙ 換誰洗碗設定視窗：開關與展開動畫，以及「成員權限」卡片：只能查看可進入的成員名單。
//   名單 = 雲端硬碟 default 檔的 bowlEmails（core/bowl-emails.js）；App 裡不能新增、修改或移除，
//   管理員要在 Firestore 的 default/default 手動編輯 bowlEmails，再到〔系統設定 → API 資料更新〕同步。
import { bowlOptionsTemplate } from "./bowl-options.template.js";
import { on, state } from "../core/store.js";
import { canEnterBowl, getBowlEmails, normEmail } from "../core/bowl-emails.js";
import { initAccordion, setAccordionOpen } from "../core/accordion.js";

let wasOpen = false;
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function mountBowlOptions(mountEl) {
  mountEl.innerHTML = bowlOptionsTemplate;
  initAccordion();
  on("overlay:change", ({ apps }) => { render(apps === "bowl"); if (apps === "bowl") renderMembers(); });
  for (const ev of ["auth:change", "cloud:ready", "api:refresh"]) on(ev, renderMembers); // 登入 / 雲端載入 / API 資料更新後名單會變
  renderMembers();
}

function renderMembers() {
  const box = document.getElementById("bowlMembersBody");
  if (!box) return;
  const intro = `<p class="text-[10px] text-slate-400 leading-relaxed">只有名單內的 Google 帳號電子郵件才能進入「換誰洗碗」。這裡只能查看，名單由管理員設定。</p>`;
  const note = (t) => `<p class="text-xs font-bold text-slate-500 text-center py-3 leading-relaxed">${t}</p>`;
  if (!state.isLoggedIn) { box.innerHTML = intro + note("請先登入 Google 帳號，才能查看名單。"); return; }
  const list = getBowlEmails();
  if (!list.length) { box.innerHTML = intro + note("還沒有設定可進入的成員。<br>請管理員在 Firestore 的 default 填入 bowlEmails，再按「API 資料更新」。"); return; }
  if (!canEnterBowl(state.account?.email)) { box.innerHTML = intro + note("你的電子郵件不在名單內，看不到名單。"); return; }
  const me = normEmail(state.account?.email);
  box.innerHTML = intro + `<p class="text-[10px] font-bold text-slate-400">可進入的成員（${list.length}）</p><div class="space-y-1.5">` + list.map((e) => `
    <div class="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 px-2.5 py-2">
      <span class="w-8 h-8 rounded-lg theme-bg-light flex items-center justify-center shrink-0"><i class="fa-solid fa-envelope text-sm theme-text-primary"></i></span>
      <span class="flex-1 min-w-0 text-xs font-bold text-slate-700 dark:text-slate-200 truncate">${esc(e)}${e === me ? ' <span class="text-[10px] font-bold text-slate-400">（你）</span>' : ""}</span>
    </div>`).join("") + "</div>";
}

function render(open) {
  const page = document.getElementById("bowlOptionsPage");
  if (!page) return;
  page.classList.toggle("translate-x-0", open);
  page.classList.toggle("translate-x-full", !open);
  if (open && !wasOpen) setAccordionOpen("bmembers", true); // 打開時先展開「成員權限」
  wasOpen = open;
}
