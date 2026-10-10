// 操作提示說明：系統設定 > 個人化的開關（預設開）。
// 做法：開關開著時，「長按」任何有 data-tip="鍵" 的按鈕 / 便利貼，就在它旁邊跳出小視窗：一段會動的示範動畫（手指點擊）+ 一句話。
// 長按不會觸發原本的點擊動作。每次登入 / 重新進入網頁後，第一次進入某個畫面會先淡淡提醒一次「長按可看說明」（3 秒自動消失）。
// 用法：
//   1. 在要說明的元素加 data-tip="notes-sort"，並在下面 TIPS 登記標題與說明
//   2. 服務 mount 時呼叫 showTipHint("notes")、unmount 時呼叫 closeTips()
import { state, emit, on } from "./store.js";

// ---------- 示範場景（純 HTML + CSS 動畫）----------
const NOTE = { y: ["#fef3c7", "#fcd34d", "#78350f"], g: ["#dcfce7", "#86efac", "#14532d"] }; // 便利貼配色：黃（重要）、綠（一般）
const note = (cls, c, inner) => `<div class="sn ${cls}" style="background:${c[0]};border-color:${c[1]};color:${c[2]}"><span class="sn-tape"></span>${inner}<i class="sb"></i><i class="sb" style="width:60%"></i></div>`;
const finger = (style = "") => `<span class="tip-finger" style="${style}">👆</span>`;

// 三張便利貼，最後一張（帶圈起來的記號）自己滑到最前面
function reorder(markHtml) {
  return `<div class="sc">
    ${note("sn-a", NOTE.g, '<b class="sl">一般</b>')}
    ${note("sn-b", NOTE.g, '<b class="sl">一般</b>')}
    ${note("sn-c", NOTE.y, `<b class="sl">重要</b><span class="sm">${markHtml}<span class="sm-ring"></span></span>`)}
  </div>`;
}
// 點便利貼 → 打開完整內容
const openScene = `<div class="sc">
  ${note("so-small", NOTE.y, '<b class="sl">重要</b>')}
  <div class="so-big" style="background:${NOTE.y[0]};border-color:${NOTE.y[1]};color:${NOTE.y[2]}"><b class="sl">重要</b><i class="sb"></i><i class="sb"></i><i class="sb" style="width:70%"></i></div>
  ${finger("left:calc(50% - 6px);top:36px")}
</div>`;
// 點「管理」→ 新增一張便利貼
const manageScene = `<div class="sc">
  <span class="tip-pill sp-btn" style="position:absolute;left:30px;top:26px;background:#d97706;border-color:#d97706;color:#fff">⚙ 管理</span>
  <div class="sp-new" style="background:${NOTE.g[0]};border-color:${NOTE.g[1]};color:${NOTE.g[2]}"><span class="sn-tape"></span><b class="sl" style="font-size:18px">＋</b><i class="sb"></i></div>
  ${finger("left:62px;top:36px")}
</div>`;

// ---------- 生活圖卡的示範場景 ----------
const BAR = "background:repeating-linear-gradient(90deg,#111827 0 2px,transparent 2px 4px,#111827 4px 5px,transparent 5px 8px,#111827 8px 11px,transparent 11px 12px)";
// 點圖卡 → 顯示條碼
const cardOpenScene = `<div class="sc">
  <div class="scc"><span class="scc-ic"></span><i class="sb" style="width:34px"></i></div>
  <div class="so-big" style="background:#fff;border-color:#cbd5e1;color:#111827;border-top-width:2px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px"><div style="${BAR};width:96px;height:38px"></div><b style="font-size:10px;letter-spacing:2px">0912345678</b></div>
  ${finger("left:calc(50% - 6px);top:36px")}
</div>`;
// 點條碼 → 放大（再點一下轉橫向）
const cardZoomScene = `<div class="sc">
  <div class="scc" style="width:84px;height:44px;top:24px;left:calc(50% - 42px)"><div style="${BAR};width:60px;height:24px"></div></div>
  <div class="so-big" style="background:#fff;border-color:#cbd5e1;color:#111827;border-top-width:2px;left:calc(50% - 90px);width:180px;display:flex;align-items:center;justify-content:center"><div style="${BAR};width:150px;height:56px"></div></div>
  ${finger("left:calc(50% - 6px);top:40px")}
</div>`;
// 點 ︙ → 跳出選單（新增圖卡、排序）
const cardMenuScene = `<div class="sc">
  <span class="scm-btn"><b>︙</b></span>
  <div class="scm-menu"><span>＋ 新增圖卡</span><span>⇅ 排序方式</span><span>▦ 大小</span></div>
  ${finger("right:20px;top:16px")}
</div>`;

// 依圖卡類型：小圖卡 → 點開後的大字 / 條碼
const kindScene = (icon, face) => `<div class="sc">
  <div class="scc"><span class="scc-ic"><i class="fa-solid ${icon}" style="font-size:12px;color:#0369a1"></i></span><i class="sb" style="width:34px"></i></div>
  <div class="so-big" style="background:#fff;border-color:#cbd5e1;color:#111827;border-top-width:2px;left:calc(50% - 90px);width:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px">${face}</div>
  ${finger("left:calc(50% - 6px);top:36px")}
</div>`;
const WHITE = ["#ffffff", "#cbd5e1", "#1e293b"];
const cardsSortScene = `<div class="sc">
  ${["sn-a", "sn-b", "sn-c"].map((c, i) => note(c, WHITE, `<span class="scc-ic" style="width:20px;height:20px;margin-bottom:5px"></span>${i === 2 ? '<span class="sm"><b style="font-size:13px">1</b><span class="sm-ring"></span></span>' : ""}`)).join("")}
</div>`;
const cardsAddScene = `<div class="sc">
  <span class="tip-pill sp-btn" style="position:absolute;left:16px;top:26px;background:#fff;border:2px dashed #0284c7;color:#0284c7">＋ 新增圖卡</span>
  <div class="sp-new" style="background:#fff;border-color:#cbd5e1;color:#1e293b;border-top-width:2px;border-radius:12px;display:flex;align-items:center;justify-content:center"><span class="scc-ic"></span></div>
  ${finger("left:56px;top:36px")}
</div>`;
const cardsFormatScene = `<div class="sc">
  <div class="fmt fmt-a">${[0,1,2,3].map(() => '<div class="fmt-t"><span class="scc-ic" style="width:18px;height:18px"></span></div>').join("")}</div>
  <div class="fmt fmt-b">${[0,1,2].map(() => '<div class="fmt-r"><span class="scc-ic" style="width:18px;height:18px"></span><i class="sb" style="flex:1;margin:0"></i></div>').join("")}</div>
</div>`;
// ---------- 生活圖卡設定視窗的示範場景 ----------
const tile = (w, h, extra = "") => `<div class="gt" style="width:${w}px;height:${h}px;${extra}"><span class="scc-ic" style="width:${Math.round(w * .4)}px;height:${Math.round(w * .4)}px"></span></div>`;
const popGrid = (n, cols, w, h) => `<div class="gtg" style="grid-template-columns:repeat(${cols},${w}px)">${Array.from({ length: n }, (_, i) => tile(w, h, `animation-delay:${(i * 0.18).toFixed(2)}s`)).join("")}</div>`;
const popList = (n) => `<div class="gtl">${Array.from({ length: n }, (_, i) => `<div class="gt gl" style="animation-delay:${(i * 0.22).toFixed(2)}s"><span class="scc-ic" style="width:16px;height:16px"></span><i class="sb" style="flex:1;margin:0"></i></div>`).join("")}</div>`;
const modeScene = (list) => `<div class="sc">${list ? popList(3) : popGrid(4, 2, 56, 38)}${finger("left:calc(50% + 40px);top:34px")}</div>`;
const colsScene = (n) => `<div class="sc">${popGrid(n * 2, n, n === 2 ? 58 : 40, 34)}</div>`;
const sizeScene = (t) => `<div class="sc" style="display:flex;align-items:flex-end;justify-content:center;gap:12px;padding-bottom:10px">
  ${[["s", 28, "小"], ["m", 40, "中"], ["l", 54, "大"]].map(([k, s, l]) => `<div style="text-align:center"><div class="gt-s${k === t ? " gt-on" : ""}" style="width:${s}px;height:${s}px"><span class="scc-ic" style="width:${Math.round(s * .4)}px;height:${Math.round(s * .4)}px"></span></div><b style="font-size:11px">${l}</b></div>`).join("")}
  ${finger(`left:calc(50% + ${t === "s" ? -42 : t === "m" ? -4 : 38}px);top:30px`)}
</div>`;
const rowsScene = (rows, extra = "") => `<div class="sc">${rows.map((r, i) => `<div class="rw" style="top:${6 + i * 28}px;--dy:${r.dy}px">${r.html}</div>`).join("")}${extra}</div>`;
const rwBody = (num, name, tail = "") => `<b class="rw-n"${Array.isArray(num) ? ' style="position:relative"' : ""}>${Array.isArray(num) ? `<span class="num-a">${num[0]}</span><span class="num-b">${num[1]}</span>` : num}</b><span style="flex:1;font-size:11px;font-weight:900">${name}</span>${tail}`;
const ARW = (c) => `<span class="rw-a">${c}</span>`;
const orderNumScene = rowsScene([
  { dy: 28, html: rwBody([1, 2], "圖卡甲") }, { dy: 28, html: rwBody([2, 3], "圖卡乙") },
  { dy: -56, html: rwBody([3, 1], "圖卡丙") },
], finger("left:36px;top:60px"));
const orderUpScene = rowsScene([{ dy: 28, html: rwBody([1, 2], "圖卡甲", ARW("▼")) }, { dy: -28, html: rwBody([2, 1], "圖卡乙", ARW("▲")) }, { dy: 0, html: rwBody(3, "圖卡丙", ARW("")) }], finger("right:22px;top:36px"));
const orderDownScene = rowsScene([{ dy: 28, html: rwBody([1, 2], "圖卡甲", ARW("▼")) }, { dy: -28, html: rwBody([2, 1], "圖卡乙", ARW("▲")) }, { dy: 0, html: rwBody(3, "圖卡丙", ARW("")) }], finger("right:6px;top:8px"));
const orderResetScene = rowsScene([{ dy: 56, html: rwBody([1, 3], "圖卡丙") }, { dy: -28, html: rwBody([2, 1], "圖卡甲") }, { dy: -28, html: rwBody([3, 2], "圖卡乙") }], `<span class="rw-reset">↺</span>${finger("right:20px;top:46px")}`);
const sortNameScene = `<div class="sc">
  ${[["sn-a", "B"], ["sn-b", "C"], ["sn-c", "A"]].map(([c, l], i) => note(c, WHITE, `<b style="display:block;font-size:20px;text-align:center;margin-top:6px">${l}</b>${i === 2 ? '<span class="sm"><b style="font-size:11px">A</b><span class="sm-ring"></span></span>' : ""}`)).join("")}
</div>`;
const sortDefaultScene = `<div class="sc" style="text-align:center">
  <div style="display:flex;justify-content:center;gap:12px;margin-top:10px">${["第1張", "第2張", "第3張"].map((t, i) => `<div class="gt" style="width:50px;height:44px;animation-delay:${(i * 0.5).toFixed(1)}s;flex-direction:column;gap:2px"><span class="scc-ic" style="width:18px;height:18px"></span><b style="font-size:10px">${t}</b></div>`).join("")}</div>
  <div class="arr"><i></i></div><b style="font-size:10px;color:#64748b">先建立 → 後建立</b>
</div>`;
const panelScene = (open) => `<div class="sc">
  <span class="scm-btn" style="right:14px;top:4px;width:30px;height:30px;font-size:14px;animation:none${open ? "" : ";opacity:.6"}">${open ? "⚙" : "✕"}</span>
  <div class="pnl ${open ? "pnl-in" : "pnl-out"}"><b style="font-size:11px">${open ? "系統設定" : "生活圖卡設定"}</b><i class="sb"></i><i class="sb" style="width:60%"></i><i class="sb"></i></div>
  ${finger(`right:10px;top:12px`)}
</div>`;
const editScene = `<div class="sc">
  ${rowsScene([{ dy: 0, html: rwBody("", "我的圖卡", '<span class="rw-a" style="background:#e0f2fe">✎</span>') }]).replace('<div class="sc">', '').replace(/<\/div>$/, '')}
  <div class="sp-new" style="right:24px;top:26px;width:110px;height:56px;background:#fff;border-color:#cbd5e1;border-top-width:2px;border-radius:12px;padding:8px"><i class="sb"></i><i class="sb"></i><i class="sb" style="width:60%"></i></div>
  ${finger("left:116px;top:6px")}
</div>`;
const delScene = `<div class="sc">
  <div class="rw" style="top:30px;animation:rwGone 3.6s ease-in-out infinite"><b style="flex:1;font-size:11px;font-weight:900;padding-left:6px">我的圖卡</b><span class="rw-a del-a">🗑</span><span class="rw-a del-b">確定刪除</span></div>
  ${finger("right:22px;top:40px")}
</div>`;
const loginScene = (out) => `<div class="sc">
  ${out ? "" : `<span class="tip-pill" style="position:absolute;left:30px;top:22px;font-size:12px;padding:8px 14px;animation:fmtA 3.6s ease-in-out infinite">G 使用 Google 帳號登入</span>`}
  <div class="${out ? "" : "sp-new "}acct" style="${out ? "" : "right:auto;left:30px;top:18px;width:200px;"}"><span class="acct-av"></span><span style="flex:1"><i class="sb" style="width:60%;margin:0 0 4px"></i><i class="sb" style="width:85%;margin:0"></i></span></div>
  ${out ? `<span class="tip-pill sp-btn" style="position:absolute;left:50%;margin-left:-60px;top:54px;background:#fff1f2;border-color:#fda4af;color:#e11d48;font-size:12px;padding:6px 18px">登出帳號</span>${finger("left:calc(50% + 10px);top:62px")}` : finger("left:100px;top:34px")}
</div>`;

// ---------- 最新提醒的示範場景 ----------
const remCard = (dot, btn, style = "", cls = "") => `<div class="rc ${cls}" style="${style}"><div class="rc-top"><span class="rc-pill">一般</span>${dot ? '<span class="rc-dot"></span>' : ""}<i class="sb" style="margin:0 0 0 auto;width:24px"></i></div><i class="sb" style="width:80%"></i>${btn ? '<span class="rc-btn">設為未讀</span>' : '<i class="sb" style="width:55%"></i>'}</div>`;
const remDialog = (inner) => `<div class="so-big" style="background:#f1f5f9;border-color:#cbd5e1;color:#1e293b;border-top-width:2px;border-radius:14px;left:calc(50% - 76px);width:152px;top:2px;height:86px;padding:8px">${inner}</div>`;
const remCardScene = `<div class="sc">
  ${remCard(true, false, "top:20px", "scc-fade")}
  ${remDialog('<div class="rc-pill" style="display:inline-block">一般</div><i class="sb"></i><i class="sb" style="width:70%"></i><span class="rc-ok">知道了</span>')}
  ${finger("left:calc(50% - 6px);top:40px")}
</div>`;
const remFilterScene = `<div class="sc">
  <span class="rc-sel"><span class="num-a">未讀 ▾</span><span class="num-b">已讀 ▾</span></span>
  <div class="fmt fmt-a" style="top:34px;display:block">${remCard(true, false, "position:relative;margin:0 auto;left:0")}</div>
  <div class="fmt fmt-b" style="top:34px;display:block">${remCard(false, true, "position:relative;margin:0 auto;left:0")}</div>
  ${finger("left:30px;top:10px")}
</div>`;
const remUnreadScene = `<div class="sc">
  ${remCard(false, true, "top:8px").replace('class="rc-btn"', 'class="rc-btn" style="animation:fmtA 3.6s ease-in-out infinite"')}
  <div class="rc" style="top:8px;background:transparent;border:0;box-shadow:none;pointer-events:none"><div class="rc-top"><span class="rc-pill" style="opacity:0">一般</span><span class="rc-dot num-b" style="opacity:0"></span></div></div>
  ${finger("left:calc(50% + 20px);top:44px")}
</div>`;
const remSheet = (cls, label) => `<div class="rsh ${cls}"><div class="rsh-top"><b style="font-size:11px">🔔 ${label}</b><span class="rsh-x">✕</span></div>${remCard(true, false, "position:relative;margin:4px auto 0;left:0;width:130px")}</div>`;
const remCloseScene = `<div class="sc">${remSheet("rsh-down", "最新提醒")}${finger("right:30px;top:2px")}</div>`;
const remBellScene = `<div class="sc">
  <span class="scm-btn" style="right:22px;top:2px;width:30px;height:30px;font-size:14px;animation:tipPress 3.6s ease-in-out infinite">🔔<span class="rc-dot" style="position:absolute;right:-2px;top:-2px;width:9px;height:9px"></span></span>
  ${remSheet("rsh-up", "最新提醒").replace("rsh ", "rsh rsh-low ")}
  ${finger("right:20px;top:12px")}
</div>`;
const remBadgeScene = `<div class="sc">
  <span class="rc-badge"><span class="num-a">3 則未讀</span><span class="num-b">2 則未讀</span></span>
  ${remCard(true, false, "top:34px;width:130px;margin-left:-65px", "")}
  ${finger("left:calc(50% + 24px);top:60px")}
</div>`;
const remDlgUnreadScene = `<div class="sc">
  <span class="tip-pill sp-btn" style="position:absolute;left:50%;margin-left:-62px;top:14px;font-size:12px;padding:8px 14px;background:#e2e8f0;border-color:#94a3b8;color:#334155">✉ 恢復為未讀</span>
  <span class="rc-toast">已恢復為未讀</span>
  ${finger("left:calc(50% + 6px);top:26px")}
</div>`;
const remDlgCloseScene = `<div class="sc">
  <div style="position:absolute;left:calc(50% - 70px);top:6px;width:140px;height:76px;border-radius:14px;background:#f1f5f9;border:2px solid #cbd5e1;padding:8px;animation:dlgGone 3.6s ease-in-out infinite"><i class="sb"></i><i class="sb" style="width:70%"></i><span class="rc-ok" style="position:absolute;left:12px;right:12px;bottom:6px">知道了</span></div>
  ${finger("left:calc(50% - 6px);top:58px")}
</div>`;

// ---------- 家庭日曆的示範場景 ----------
const calCells = (hl, extra = "") => `<div class="cg">${Array.from({ length: 21 }, (_, i) => `<span class="cgc${i === hl ? " cgc-on" : ""}"></span>`).join("")}${extra}</div>`;
const calSheet = `<div class="rsh rsh-low rsh-up"><div class="rsh-top"><b style="font-size:11px">10/12 週日</b><span class="rsh-x">✕</span></div><i class="sb"></i><i class="sb" style="width:60%"></i></div>`;
const calDayScene = `<div class="sc">${calCells(9)}${calSheet}${finger("left:calc(50% - 6px);top:26px")}</div>`;
const calBarScene = `<div class="sc">${calCells(-1, '<span class="cgb"></span>')}${calSheet}${finger("left:calc(50% - 20px);top:24px")}</div>`;
const calMonthScene = (next) => `<div class="sc">
  <div class="cmo"><span class="cmo-b">‹</span><b class="cmo-t"><span class="num-a">${next ? "9月" : "11月"}</span><span class="num-b">10月</span></b><span class="cmo-b">›</span></div>
  ${finger(`left:calc(50% + ${next ? 62 : -78}px);top:2px`)}
</div>`;
const calTodayScene = `<div class="sc">
  <span class="tip-pill sp-btn" style="position:absolute;left:14px;top:30px;font-size:12px;padding:6px 12px;border-color:#0284c7;color:#0369a1">📅 今天</span>
  ${calCells(3)}
  <div class="cgt"><span class="cgc cgc-on"></span></div>
  ${finger("left:44px;top:42px")}
</div>`;
const calSrcScene = `<div class="sc">
  <span class="tip-pill sp-btn" style="position:absolute;left:18px;top:6px;font-size:12px;padding:6px 12px;border-color:#0284c7;color:#0369a1">📅 家庭日曆 ⌄</span>
  <div class="scm-menu" style="left:18px;right:auto;top:42px;width:130px;transform-origin:0 0"><span>● 家庭日曆</span><span>● 爸爸的日曆</span></div>
  ${finger("left:80px;top:16px")}
</div>`;
const calAddScene = `<div class="sc">
  <span class="tip-pill sp-btn" style="position:absolute;left:50%;margin-left:-56px;top:2px;font-size:12px;padding:7px 14px;background:#0f172a;border-color:#0f172a;color:#fff">＋ 新增行程</span>
  <div class="so-big" style="top:34px;height:54px;background:#fff;border-color:#cbd5e1;color:#1e293b;border-top-width:2px;border-radius:12px"><b style="font-size:10px">新增行程</b><i class="sb"></i><i class="sb" style="width:60%"></i></div>
  ${finger("left:calc(50% - 6px);top:12px")}
</div>`;
const calViewScene = `<div class="sc">
  <div class="rc scc-fade" style="top:22px;border-left:4px solid #0284c7;border-radius:12px"><b style="font-size:11px">家族聚餐</b><i class="sb" style="width:50%"></i></div>
  <div class="so-big" style="left:calc(50% - 76px);width:152px;top:2px;height:86px;background:#fff;border-color:#cbd5e1;color:#1e293b;border-top-width:6px;border-top-color:#0284c7;border-radius:14px;padding:8px"><b style="font-size:12px">家族聚餐</b><i class="sb"></i><i class="sb" style="width:70%"></i><i class="sb" style="width:50%"></i></div>
  ${finger("left:calc(50% - 6px);top:40px")}
</div>`;
const calEditScene = `<div class="sc">
  <span class="tip-pill sp-btn" style="position:absolute;left:30px;top:4px;font-size:12px;padding:6px 14px;background:#0284c7;border-color:#0284c7;color:#fff">✎ 修改</span>
  <div class="sp-new" style="right:30px;top:26px;width:120px;height:58px;background:#fff;border-color:#cbd5e1;border-top-width:2px;border-radius:12px;padding:8px"><i class="sb"></i><i class="sb"></i><i class="sb" style="width:60%"></i></div>
  ${finger("left:60px;top:14px")}
</div>`;
const calDelScene = `<div class="sc">
  <div class="rw" style="top:30px;animation:rwGone 3.6s ease-in-out infinite"><b style="flex:1;font-size:11px;font-weight:900;padding-left:6px">家族聚餐</b><span class="rw-a del-a">🗑</span><span class="rw-a del-b">再按一次刪除</span></div>
  ${finger("right:22px;top:40px")}
</div>`;
const calCloseScene = remDlgCloseScene.replace("知道了", "關閉");
const calPageScene = (back) => `<div class="sc">
  <span class="tip-pill sp-btn" style="position:absolute;left:50%;margin-left:-44px;top:10px;font-size:12px;padding:7px 16px;background:#0284c7;border-color:#0284c7;color:#fff">${back ? "‹ 上一頁" : "下一頁 ›"}</span>
  <div class="arr" style="margin:48px 40px 3px"><i${back ? ' style="animation-direction:reverse"' : ""}></i></div><b style="display:block;text-align:center;font-size:10px;color:#64748b">${back ? "回到前一步" : "第 1 步 → 第 2 步"}</b>
  ${finger("left:calc(50% - 6px);top:20px")}
</div>`;

// ---------- 日曆設定（︙）的示範場景 ----------
const calSetScene = `<div class="sc">
  <span class="scm-btn" style="right:14px;top:4px;width:30px;height:30px;font-size:14px"><b>︙</b></span>
  <div class="pnl pnl-in"><b style="font-size:11px">日曆設定</b><i class="sb"></i><i class="sb" style="width:60%"></i><i class="sb"></i></div>
  ${finger("right:10px;top:12px")}
</div>`;
const tpi = (txt) => `<div class="tpi"><span class="tpi-t">${txt}</span><span class="tpi-c"></span></div>`;
const calIdNameScene = `<div class="sc"><b style="position:absolute;left:30px;top:6px;font-size:11px">名稱（可不填）</b>${tpi("全家行程")}</div>`;
const calIdValueScene = `<div class="sc"><b style="position:absolute;left:30px;top:6px;font-size:11px">日曆 ID</b>${tpi("xxxx@group.calendar…")}</div>`;
const calIdAddScene = `<div class="sc">
  <span class="tip-pill sp-btn" style="position:absolute;left:50%;margin-left:-62px;top:2px;font-size:12px;padding:6px 14px;background:#0284c7;border-color:#0284c7;color:#fff">＋ 新增日曆 ID</span>
  <div class="gtl" style="top:44px"><div class="gt gl" style="animation-delay:.3s"><span class="scc-ic" style="width:16px;height:16px"></span><i class="sb" style="flex:1;margin:0"></i></div></div>
  ${finger("left:calc(50% - 6px);top:12px")}
</div>`;

// ---------- 家庭公告：發送到 LINE ----------
const lchip = (name, tick) => `<span class="lc"><span class="lc-b${tick === 1 ? " lc-on" : tick === 2 ? " lc-late" : ""}">✓</span>${name}</span>`;
const lineDlg = (inner, st = "") => `<div class="so-big" style="left:calc(50% - 80px);width:160px;top:2px;height:86px;background:#fff;border-color:#111827;color:#1e293b;border-top-width:2px;border-radius:14px;padding:8px;${st}">${inner}</div>`;
const noteSendScene = `<div class="sc">
  <span class="scm-btn" style="right:26px;top:4px;width:32px;height:32px;font-size:14px"><i class="fa-solid fa-paper-plane"></i></span>
  ${lineDlg('<b style="font-size:11px">✈ 發送到 LINE</b><i class="sb"></i><i class="sb" style="width:60%"></i>')}
  ${finger("right:22px;top:14px")}
</div>`;
const noteCloseScene = `<div class="sc">
  <div style="position:absolute;left:calc(50% - 70px);top:6px;width:140px;height:76px;border-radius:0 0 10px 10px;border-top:6px solid #fcd34d;background:#fef3c7;box-shadow:0 4px 8px rgba(0,0,0,.2);padding:8px;animation:dlgGone 3.6s ease-in-out infinite"><b style="font-size:11px;color:#78350f">苗栗冰箱</b><i class="sb"></i><i class="sb" style="width:70%"></i><span class="scm-btn" style="right:4px;top:4px;width:22px;height:22px;font-size:11px;animation:none">✕</span></div>
  ${finger("left:calc(50% + 50px);top:6px")}
</div>`;
const linePickScene = `<div class="sc"><div style="position:absolute;left:24px;right:24px;top:10px;display:flex;flex-wrap:wrap;gap:6px">${lchip("爸爸", 0)}${lchip("媽媽", 2)}${lchip("牛牛", 1)}${lchip("小妹", 0)}</div>${finger("left:calc(50% - 56px);top:44px")}</div>`;
const lineAllScene = `<div class="sc"><b style="position:absolute;right:26px;top:4px;font-size:11px;color:#0369a1">全選 / 取消</b><div style="position:absolute;left:24px;right:24px;top:28px;display:flex;flex-wrap:wrap;gap:6px">${["爸爸", "媽媽", "牛牛", "小妹"].map((n) => lchip(n, 2)).join("")}</div>${finger("right:34px;top:2px")}</div>`;
const lineSendScene = `<div class="sc">
  <span class="tip-pill sp-btn" style="position:absolute;left:50%;margin-left:-40px;top:6px;font-size:13px;padding:7px 22px;background:#0284c7;border-color:#0284c7;color:#fff">✈ 發送</span>
  ${lineDlg('<div style="text-align:center;font-size:20px">❓</div><b style="display:block;text-align:center;font-size:11px">確定要發送嗎？</b>', "top:34px;height:54px")}
  ${finger("left:calc(50% - 6px);top:16px")}
</div>`;
const lineGoScene = `<div class="sc">
  <span class="tip-pill sp-btn" style="position:absolute;left:50%;margin-left:-48px;top:40px;font-size:12px;padding:6px 14px;background:#0284c7;border-color:#0284c7;color:#fff">✈ 確定發送</span>
  <span class="fly">✈️</span><span class="rc-toast" style="top:8px">已發送到 LINE</span>
  ${finger("left:calc(50% - 6px);top:50px")}
</div>`;
const lineBackScene = `<div class="sc">
  <span class="tip-pill sp-btn" style="position:absolute;left:50%;margin-left:-44px;top:8px;font-size:12px;padding:6px 14px;background:#f1f5f9;border-color:#cbd5e1;color:#334155">返回修改</span>
  <div style="position:absolute;left:24px;right:24px;top:48px;display:flex;gap:6px;justify-content:center;animation:fmtB 3.6s ease-in-out infinite">${lchip("爸爸", 0)}${lchip("牛牛", 1)}</div>
  ${finger("left:calc(50% - 6px);top:20px")}
</div>`;
const lineCloseScene = `<div class="sc">
  <div style="position:absolute;left:calc(50% - 70px);top:6px;width:140px;height:76px;border-radius:14px;background:#fff;border:2px solid #111827;padding:8px;animation:dlgGone 3.6s ease-in-out infinite"><b style="font-size:11px">✈ 發送到 LINE</b><i class="sb"></i><i class="sb" style="width:60%"></i><span class="scm-btn" style="right:4px;top:4px;width:22px;height:22px;font-size:11px;animation:none;color:#64748b">✕</span></div>
  ${finger("left:calc(50% + 50px);top:6px")}
</div>`;

// ---------- 家庭公告：管理 / 新增 / 編輯便利貼 ----------
const nFormDlg = (title) => `<div class="so-big" style="top:30px;height:58px;background:#fff;border-color:#cbd5e1;color:#1e293b;border-top-width:6px;border-top-color:#f59e0b;border-radius:12px;padding:6px 8px"><b style="font-size:10px">${title}</b><i class="sb"></i><i class="sb" style="width:60%"></i></div>`;
const noteNewScene = `<div class="sc">
  <span class="tip-pill sp-btn" style="position:absolute;left:30px;right:30px;top:2px;text-align:center;font-size:12px;padding:6px 0;border:2px dashed #f59e0b;background:#fef3c7;color:#92400e">＋ 新增便利貼</span>
  ${nFormDlg("新增便利貼")}
  ${finger("left:calc(50% - 6px);top:12px")}
</div>`;
const noteEditScene = `<div class="sc">
  ${rowsScene([{ dy: 0, html: rwBody("", "苗栗冰箱", '<span class="rw-a" style="background:#dbeafe">✎</span>') }]).replace('<div class="sc">', '').replace(/<\/div>$/, '')}
  ${nFormDlg("編輯便利貼").replace("top:30px", "top:30px;left:calc(50% - 40px);width:150px")}
  ${finger("left:calc(100% - 66px);top:6px")}
</div>`;
const noteTagScene = `<div class="sc"><div style="position:absolute;left:14px;right:14px;top:10px;display:flex;flex-wrap:wrap;gap:6px;justify-content:center">${lchip("緊急", 0)}${lchip("重要", 2)}${lchip("一般", 0)}${lchip("其他", 0)}</div><div style="position:absolute;left:30px;right:30px;top:60px;height:20px;border-radius:6px;border-bottom:4px solid #f59e0b;background:#fef3c7;animation:fmtB 3.6s ease-in-out infinite"></div>${finger("left:calc(50% - 20px);top:20px")}</div>`;
const noteAuthorScene = `<div class="sc"><div style="position:absolute;left:30px;right:30px;top:8px;display:flex;flex-direction:column;gap:6px">${lchip("Google 帳號名稱", 0)}${lchip("暱稱", 2)}</div>${finger("left:calc(50% - 20px);top:36px")}</div>`;
const notePinScene = `<div class="sc"><b style="position:absolute;left:30px;top:20px;font-size:13px">📌 置頂</b><span class="sw"><i></i></span><span class="sm" style="top:6px;right:22px;animation:fmtB 3.6s ease-in-out infinite;font-size:16px">📌</span>${finger("right:26px;top:26px")}</div>`;
const noteStatusScene = `<div class="sc"><div style="position:absolute;left:24px;right:24px;top:10px;display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border-radius:10px;background:#f1f5f9;font-size:12px;font-weight:900;text-align:center"><span class="num-a" style="padding:6px 0;border-radius:8px;background:#fff;color:#b45309;box-shadow:0 1px 3px rgba(0,0,0,.18)">⏳ 綁定期限</span><span class="num-b" style="padding:6px 0;border-radius:8px;background:#fff;color:#b45309;box-shadow:0 1px 3px rgba(0,0,0,.18);grid-column:2;grid-row:1;opacity:0">♾ 永久顯示</span></div><div class="gt gl" style="position:absolute;left:30px;right:30px;top:54px;animation:fmtA 3.6s ease-in-out infinite;opacity:1"><b style="font-size:10px">截止日期 10/20　截止時間 18:00</b></div>${finger("left:calc(50% + 40px);top:20px")}</div>`;
const noteQuickScene = `<div class="sc"><div style="position:absolute;left:20px;right:20px;top:6px;text-align:center;font-size:12px;font-weight:900;position:absolute">截止日期：<span style="position:relative;display:inline-block;width:60px"><span class="num-a" style="position:absolute;left:0">10/11</span><span class="num-b" style="position:absolute;left:0">10/18</span></span></div><div style="position:absolute;left:10px;right:10px;top:36px;display:flex;gap:5px;justify-content:center"><span class="lc">隔天</span><span class="lc">3 天後</span><span class="lc sp-btn" style="background:#fef3c7;border-color:#f59e0b">1 週後</span><span class="lc">1 個月後</span></div>${finger("left:calc(50% + 4px);top:48px")}</div>`;
const noteFieldScene = (label, txt) => `<div class="sc"><b style="position:absolute;left:30px;top:6px;font-size:11px">${label}</b>${tpi(txt)}</div>`;

// ---------- 我的筆記（個人記事本）----------
const memoSheet = (t) => `<div class="rsh rsh-up" style="height:80px"><div class="rsh-top"><b style="font-size:11px">${t}</b><span class="rsh-x">✕</span></div><i class="sb"></i><i class="sb" style="width:60%"></i><i class="sb"></i></div>`;
const memoAddScene = `<div class="sc">
  <span class="scm-btn" style="right:26px;top:2px;width:32px;height:32px;font-size:14px;border-radius:50%;background:#0284c7;border-color:#0284c7;color:#fff"><i class="fa-solid fa-pen"></i></span>
  ${memoSheet("新增記事")}
  ${finger("right:22px;top:12px")}
</div>`;
const memoMiniCard = (top, label, st = "") => `<div class="rc" style="top:${top}px;border-radius:10px;${st}"><b style="font-size:10px">${label}</b><i class="sb" style="width:60%"></i></div>`;
const memoTabScene = `<div class="sc"><div style="position:absolute;left:14px;right:14px;top:4px;display:flex;gap:6px;justify-content:center"><span class="lc" style="background:#0284c7;border-color:#0284c7;color:#fff;animation:fmtA 3.6s ease-in-out infinite">全部</span><span class="lc lc-sel">家事</span><span class="lc">工作</span></div>
  <div class="fmt fmt-a" style="top:34px;display:block;width:130px;margin-left:-65px">${memoMiniCard(0, "買菜清單").replace("top:0px", "position:relative;top:0;left:0;margin:0 0 4px")}${memoMiniCard(0, "開會重點").replace("top:0px", "position:relative;top:0;left:0;margin:0")}</div>
  <div class="fmt fmt-b" style="top:34px;display:block;width:130px;margin-left:-65px">${memoMiniCard(0, "買菜清單").replace("top:0px", "position:relative;top:0;left:0;margin:0")}</div>
  ${finger("left:calc(50% - 20px);top:14px")}
</div>`;
const memoCardScene = `<div class="sc">
  <div class="rc scc-fade" style="top:22px;border-radius:12px"><b style="font-size:11px">買菜清單</b><i class="sb" style="width:70%"></i></div>
  <div class="so-big" style="left:calc(50% - 76px);width:152px;top:2px;height:86px;background:#fffbeb;border-color:#f59e0b;color:#451a03;border-top-width:6px;border-radius:12px;padding:8px"><b style="font-size:11px">編輯記事</b><i class="sb"></i><i class="sb" style="width:70%"></i><i class="sb" style="width:50%"></i></div>
  ${finger("left:calc(50% - 6px);top:40px")}
</div>`;
const memoCloseScene = `<div class="sc">
  <div style="position:absolute;left:calc(50% - 70px);top:6px;width:140px;height:76px;border-radius:12px;border-top:6px solid #f59e0b;background:#fffbeb;box-shadow:0 4px 8px rgba(0,0,0,.2);padding:8px;animation:dlgGone 3.6s ease-in-out infinite"><b style="font-size:11px;color:#451a03">編輯記事</b><i class="sb"></i><i class="sb" style="width:70%"></i><span class="scm-btn" style="right:4px;top:4px;width:22px;height:22px;font-size:11px;animation:none">✕</span></div>
  ${finger("left:calc(50% + 50px);top:6px")}
</div>`;
const memoPickScene = `<div class="sc"><div style="position:absolute;left:14px;right:14px;top:12px;display:flex;flex-wrap:wrap;gap:6px;justify-content:center">${lchip("未分類", 0)}${lchip("家事", 2)}${lchip("工作", 0)}${lchip("旅遊", 0)}</div>${finger("left:calc(50% - 20px);top:22px")}</div>`;
const memoAddCatScene = `<div class="sc">${tpi("旅遊")}<span class="tip-pill sp-btn" style="position:absolute;right:30px;top:2px;font-size:11px;padding:3px 10px;background:#0284c7;border-color:#0284c7;color:#fff">加入</span><div style="position:absolute;left:30px;top:68px"><span class="lc" style="animation:gtPop 3.6s ease-in-out infinite">✓ 旅遊</span></div>${finger("right:34px;top:8px")}</div>`;
const memoSaveScene = `<div class="sc">
  <span class="tip-pill sp-btn" style="position:absolute;left:30px;right:30px;top:6px;text-align:center;font-size:13px;padding:7px 0;background:#0284c7;border-color:#0284c7;color:#fff">儲存</span>
  ${memoMiniCard(40, "買菜清單", "animation:gtPop 3.6s ease-in-out infinite")}
  ${finger("left:calc(50% - 6px);top:18px")}
</div>`;
const memoNoteOkScene = `<div class="sc">
  <div style="position:absolute;left:20px;right:20px;top:8px;padding:8px 10px;border-radius:8px;background:#fef9c3;border:1.5px solid #facc15;font-size:10px;font-weight:900;color:#854d0e;animation:dlgGone 3.6s ease-in-out infinite">⚠ 提示訊息 <span class="lc" style="padding:1px 8px">了解</span></div>
  ${finger("right:46px;top:18px")}
</div>`;

// ---------- 所有應用 / 所有應用設定 ----------
const appTile = (cls = "", st = "") => `<div class="scc ${cls}" style="${st}"><span class="scc-ic"><i class="fa-solid fa-calendar-days" style="font-size:12px;color:#0369a1"></i></span><i class="sb" style="width:34px"></i></div>`;
const appOpenScene = `<div class="sc">
  ${appTile()}
  <div class="so-big" style="background:#fff;border-color:#cbd5e1;color:#1e293b;border-top-width:2px;border-radius:12px;left:calc(50% - 76px);width:152px;height:84px;top:4px;padding:8px"><b style="font-size:11px">📅 家庭日曆</b><i class="sb"></i><i class="sb" style="width:70%"></i></div>
  ${finger("left:calc(50% - 6px);top:36px")}
</div>`;
const appPluginScene = `<div class="sc">
  ${appTile("", "left:calc(50% - 90px)")}
  <span class="so-big" style="left:calc(50% - 10px);width:100px;height:62px;top:10px;background:#fff;border-color:#94a3b8;color:#1e293b;border-top-width:8px;border-radius:8px;padding:6px"><b style="font-size:10px">↗ 新分頁</b><i class="sb"></i><i class="sb" style="width:60%"></i></span>
  ${finger("left:calc(50% - 76px);top:36px")}
</div>`;
const appToggleScene = `<div class="sc"><div class="rw" style="top:20px;animation:none"><span class="scc-ic" style="width:16px;height:16px"></span><b style="flex:1;font-size:11px;font-weight:900">家人相簿</b><span class="swm"><i></i></span></div><b style="position:absolute;left:0;right:0;top:56px;text-align:center;font-size:10px;color:#64748b"><span class="num-a">啟用：顯示在所有應用</span><span class="num-b" style="position:absolute;left:0;right:0">停用：從所有應用隱藏</span></b>${finger("right:28px;top:28px")}</div>`;
const appAllOnScene = `<div class="sc"><div style="position:absolute;left:24px;right:24px;top:4px;display:flex;flex-direction:column;gap:4px">${[0, 1, 2].map(() => '<div class="rw" style="position:relative;left:0;right:0;height:18px;animation:none"><i class="sb" style="flex:1;margin:0"></i><span class="swm"><i></i></span></div>').join("")}</div>${finger("left:calc(50% - 6px);top:40px")}</div>`;
const accScene = `<div class="sc"><div class="rw" style="top:4px;animation:none"><span class="scc-ic" style="width:16px;height:16px"></span><b style="flex:1;font-size:11px;font-weight:900">管理應用</b><span class="acc-ar">⌄</span></div>${[0, 1, 2].map((i) => `<div class="gt gl" style="position:absolute;left:24px;right:24px;top:${34 + i * 18}px;height:14px;animation-delay:${(0.3 + i * 0.2).toFixed(1)}s"><i class="sb" style="flex:1;margin:0"></i></div>`).join("")}${finger("right:30px;top:12px")}</div>`;
const appIconFieldScene = noteFieldScene;
const appPlugAddScene = `<div class="sc">
  <span class="tip-pill sp-btn" style="position:absolute;left:50%;margin-left:-50px;top:2px;font-size:12px;padding:6px 14px;background:#0284c7;border-color:#0284c7;color:#fff">＋ 新增插件</span>
  <div class="gtl" style="top:44px"><div class="gt gl" style="animation-delay:.3s"><span class="scc-ic" style="width:16px;height:16px"></span><i class="sb" style="flex:1;margin:0"></i></div></div>
  ${finger("left:calc(50% - 6px);top:12px")}
</div>`;

// ---------- 底部快捷列 ----------
const dockBar = (hl) => `<div class="dkb">${[0, 1, 2, 3, 4].map((i) => `<span class="dki${i === hl ? " dki-on" : ""}"><b></b></span>`).join("")}</div>`;
const dockGoScene = `<div class="sc">
  <div class="fmt fmt-a" style="top:4px;display:block;width:120px;margin-left:-60px">${memoMiniCard(0, "目前的畫面").replace("top:0px", "position:relative;top:0;left:0;margin:0")}</div>
  <div class="fmt fmt-b" style="top:4px;display:block;width:120px;margin-left:-60px">${memoMiniCard(0, "切換後的畫面", "background:#e0f2fe").replace("top:0px", "position:relative;top:0;left:0;margin:0")}</div>
  ${dockBar(3)}${finger("left:calc(50% + 22px);top:56px")}
</div>`;
const dockHomeScene = `<div class="sc">
  <div class="fmt fmt-a" style="top:4px;display:block;width:120px;margin-left:-60px">${memoMiniCard(0, "某個應用").replace("top:0px", "position:relative;top:0;left:0;margin:0")}</div>
  <div class="fmt fmt-b" style="top:4px;display:block;width:120px;margin-left:-60px">${memoMiniCard(0, "🏠 大廳", "background:#e0f2fe").replace("top:0px", "position:relative;top:0;left:0;margin:0")}</div>
  <span class="tip-pill sp-btn" style="position:absolute;left:50%;margin-left:-40px;top:52px;font-size:12px;padding:4px 14px;border-color:#0284c7;color:#0369a1">🏠 回大廳</span>${finger("left:calc(50% - 6px);top:60px")}
</div>`;
const dockStatusScene = panelScene(true).replace("⚙", "▾").replace("系統設定", "網頁狀態");

const TIPS = {
  "cards-gear": { scene: panelScene(true), text: "按這裡打開系統設定。" },
  "cards-close": { scene: panelScene(false), text: "按這裡關閉設定視窗。" },
  "cards-mode-card": { scene: modeScene(false), text: "圖卡：一張張方塊排開，一眼看到圖示。" },
  "cards-mode-list": { scene: modeScene(true), text: "清單：一條一條由上往下排，名稱更清楚。" },
  "cards-size-l": { scene: sizeScene("l"), text: "大：圖卡放大，長輩看更清楚。" },
  "cards-size-m": { scene: sizeScene("m"), text: "中：預設大小。" },
  "cards-size-s": { scene: sizeScene("s"), text: "小：圖卡縮小，一個畫面放更多張。" },
  "cards-cols-2": { scene: colsScene(2), text: "每行 2 個：每張比較大。" },
  "cards-cols-3": { scene: colsScene(3), text: "每行 3 個：每張比較小，一次看更多。" },
  "cards-sort-default": { scene: sortDefaultScene, text: "預設：依建立先後排列，先建立的在前面。" },
  "cards-sort-name": { scene: sortNameScene, text: "名稱：依名稱筆畫自動排列。" },
  "cards-sort-custom": { scene: cardsSortScene, text: "自訂：自己訂編號，決定每張圖卡的位置。" },
  "cards-order-num": { scene: orderNumScene, text: "點編號選新位置，其他圖卡會自動順延。" },
  "cards-order-up": { scene: orderUpScene, text: "▲ 往前移一格。" },
  "cards-order-down": { scene: orderDownScene, text: "▼ 往後移一格。" },
  "cards-order-reset": { scene: orderResetScene, text: "恢復成預設的排列順序。" },
  "cards-edit": { scene: editScene, text: "按鉛筆，修改這張圖卡的內容。" },
  "cards-del": { scene: delScene, text: "按垃圾桶，再按一次「確定刪除」才會真的刪除。" },
  "cards-login": { scene: loginScene(false), text: "登入後，設定會自動存到你的 Google 雲端硬碟，換手機也帶著走。" },
  "cards-logout": { scene: loginScene(true), text: "登出帳號。在公共場所用完，記得登出。" },
  "rem-card": { scene: remCardScene, text: "點一下提醒，打開完整內容；看過後紅點會自動消失。" },
  "rem-filter": { scene: remFilterScene, text: "切換看「未讀」或「已讀」的提醒。" },
  "rem-unread": { scene: remUnreadScene, text: "看過的提醒，按這顆可以恢復成未讀，紅點會再出現。" },
  "rem-close": { scene: remCloseScene, text: "按這裡關閉提醒視窗。" },
  "rem-bell": { scene: remBellScene, text: "有新提醒時鈴鐺會出現紅點，點一下打開最新提醒。" },
  "rem-badge": { scene: remBadgeScene, text: "這裡顯示還有幾則提醒沒有看。" },
  "rem-dlg-unread": { scene: remDlgUnreadScene, text: "按這裡，這則提醒會恢復成未讀。" },
  "rem-dlg-close": { scene: remDlgCloseScene, text: "看完了，按「知道了」關閉。" },
  "cards-kind-bar": { scene: kindScene("fa-barcode", `<div style="${BAR};width:96px;height:36px"></div><b style="font-size:10px;letter-spacing:2px">/ABC1234</b>`), text: "會員、載具、條碼類，會畫成條碼，點開就能直接掃描。" },
  "cards-kind-phone": { scene: kindScene("fa-phone", '<b style="font-size:22px;letter-spacing:1px">02-1234-5678</b>'), text: "電話號碼用大字顯示，方便念給對方聽。" },
  "cards-kind-mail": { scene: kindScene("fa-envelope", '<b style="font-size:15px">name@example.com</b>'), text: "電子郵件用大字顯示，清楚好唸。" },
  "cards-kind-plate": { scene: kindScene("fa-car", '<b style="font-size:24px;letter-spacing:2px;border:3px solid #1e293b;border-radius:8px;padding:2px 12px">ABC-1234</b>'), text: "車牌號碼用大字顯示，停車登記一目了然。" },
  "cards-kind-other": { scene: kindScene("fa-tag", '<b style="font-size:14px">想放的文字內容</b>'), text: "其他類型，內容以文字顯示。" },
  "cards-format": { scene: cardsFormatScene, text: "切換圖卡或清單，也能調整大小與每行數量。" },
  "cards-sort": { scene: cardsSortScene, text: "排序可選預設、名稱，或自訂編號，編號小的排前面。" },
  "cards-manage": { scene: cardsAddScene, text: "按這裡新增圖卡，也能編輯或刪除。" },
  "cards-open": { scene: cardOpenScene, text: "點一下圖卡，顯示條碼。" },
  "cards-zoom": { scene: cardZoomScene, text: "點一下條碼會放大，再點一下轉成橫向，方便掃描。" },
  "cards-menu": { scene: cardMenuScene, text: "按這裡新增圖卡，或調整排序與大小。" },
  "cal-day": { scene: calDayScene, text: "點日期，看當天的行程，也能在這裡新增。" },
  "cal-bar": { scene: calBarScene, text: "點彩色長條，打開那一天的行程清單。" },
  "cal-prev": { scene: calMonthScene(false), text: "看上一個月。" },
  "cal-next": { scene: calMonthScene(true), text: "看下一個月。" },
  "cal-today": { scene: calTodayScene, text: "一鍵回到今天所在的月份。" },
  "cal-src": { scene: calSrcScene, text: "切換要看哪一本日曆：家庭日曆、Google 日曆，或全部合併。" },
  "cal-add": { scene: calAddScene, text: "按這裡，新增一筆行程。" },
  "cal-view": { scene: calViewScene, text: "點一下行程，看完整內容。" },
  "cal-edit": { scene: calEditScene, text: "按這裡，修改這筆行程。" },
  "cal-del": { scene: calDelScene, text: "按一下，再按一次「再按一次刪除」才會真的刪除。" },
  "cal-close": { scene: calCloseScene, text: "按這裡，關閉視窗。" },
  "cal-step-next": { scene: calPageScene(false), text: "填完這一頁，按這裡到下一頁；最後一頁按「儲存」。" },
  "cal-step-prev": { scene: calPageScene(true), text: "回到上一頁修改；第一頁按「取消」會直接關閉。" },
  "cal-set": { scene: calSetScene, text: "按這裡，打開日曆設定。" },
  "cal-id-name": { scene: calIdNameScene, text: "幫這本日曆取個好認的名字，不填也可以。" },
  "cal-id-value": { scene: calIdValueScene, text: "貼上 Google 日曆 ID。到 Google 日曆 → 該日曆的設定 → 整合日曆，就能找到。" },
  "cal-id-add": { scene: calIdAddScene, text: "按這裡新增，清單會多一筆，數量不限。" },
  "cal-id-del": { scene: calDelScene, text: "按垃圾桶，再按一次「再按一次刪除」才會真的移除。" },
  "notes-send": { scene: noteSendScene, text: "按紙飛機，把這則公告發送到 LINE。" },
  "notes-close": { scene: noteCloseScene, text: "按 ✕，關閉這則公告。" },
  "line-pick": { scene: linePickScene, text: "點名字打勾，可以選好幾個人。" },
  "line-all": { scene: lineAllScene, text: "一次全部打勾；再按一次全部取消。" },
  "line-send": { scene: lineSendScene, text: "選好人後按發送，還會再問你一次，不會直接送出。" },
  "line-go": { scene: lineGoScene, text: "確定要送，就按這裡，訊息會立刻發到 LINE。" },
  "line-back": { scene: lineBackScene, text: "還沒送出，回到上一步重新選人。" },
  "line-close": { scene: lineCloseScene, text: "按 ✕，取消發送並關閉視窗。" },
  "notes-new": { scene: noteNewScene, text: "按這裡，新增一張便利貼。" },
  "notes-edit": { scene: noteEditScene, text: "按鉛筆，修改這張便利貼。" },
  "notes-del": { scene: calDelScene, text: "按垃圾桶，3 秒內再按一次「再按一次刪除」才會真的刪除。" },
  "notes-tag": { scene: noteTagScene, text: "選標籤，便利貼的顏色會跟著變：重要黃色、一般綠色…" },
  "notes-author": { scene: noteAuthorScene, text: "選要顯示的發布人名稱。" },
  "notes-pin": { scene: notePinScene, text: "打開置頂，這張會固定排在最前面。只有「重要／緊急」可以用。" },
  "notes-status": { scene: noteStatusScene, text: "綁定期限：到期自動下架。永久顯示：一直留著。" },
  "notes-quick": { scene: noteQuickScene, text: "一鍵設定截止日，不用自己選日期。" },
  "notes-fld-title": { scene: noteFieldScene("標題", "週六回阿嬤家"), text: "寫一個簡短的標題，最多 30 字。" },
  "notes-fld-content": { scene: noteFieldScene("內容", "想跟家人說的話…"), text: "寫想告訴家人的內容，最多 300 字。" },
  "notes-fld-link": { scene: noteFieldScene("附加連結", "https://…"), text: "有網址要分享就貼這裡，沒有可以空白。" },
  "notes-fld-time": { scene: noteFieldScene("發布日期", "2026-10-11"), text: "設定什麼時候開始顯示這張便利貼。" },
  "notes-step-next": { scene: calPageScene(false), text: "填完這一頁，按「下一頁」；最後一頁按「發布」或「儲存變更」。" },
  "notes-step-back": { scene: calPageScene(true), text: "回到上一頁修改；第一頁按「取消」會關閉視窗。" },
  "memo-add": { scene: memoAddScene, text: "按鉛筆，新增一則記事。" },
  "memo-tab": { scene: memoTabScene, text: "按分類，只看那一類的記事；按「全部」看全部。" },
  "memo-card": { scene: memoCardScene, text: "點一下記事，打開來看、修改或刪除。" },
  "memo-close": { scene: memoCloseScene, text: "按 ✕，關閉視窗（沒按儲存的內容不會留下）。" },
  "memo-pick": { scene: memoPickScene, text: "點一個分類，這則記事就歸到那一類。" },
  "memo-addcat": { scene: memoAddCatScene, text: "輸入新分類名稱，按「加入」，就會多一個分類可選。" },
  "memo-pin": { scene: notePinScene, text: "打勾置頂，這則記事會固定排在最前面。" },
  "memo-del": { scene: calDelScene, text: "按一下，再按一次「再按一次刪除」才會真的刪除。" },
  "memo-save": { scene: memoSaveScene, text: "寫好了按儲存，記事會出現在清單裡。標題一定要填。" },
  "memo-note-ok": { scene: memoNoteOkScene, text: "按「了解」，這則提示就不再顯示。" },
  "apps-more": { scene: panelScene(true).replace("⚙", "︙").replace("系統設定", "所有應用設定"), text: "按 ︙，打開所有應用設定：調整顯示方式、排序、管理應用與擴充插件。" },
  "apps-open": { scene: appOpenScene, text: "點一下，打開這個應用。標示「需登入」的要先登入 Google。" },
  "apps-plugin": { scene: appPluginScene, text: "這是外部插件，會在新的分頁打開網站。" },
  "apps-gear": { scene: panelScene(true), text: "按這裡打開系統設定。" },
  "apps-close": { scene: panelScene(false).replace("生活圖卡設定", "所有應用設定"), text: "按這裡關閉所有應用設定。" },
  "apps-format": { scene: cardsFormatScene, text: "展開：切換圖卡或清單，也能調整大小與每行數量。" },
  "apps-manage": { scene: accScene, text: "展開：開關每個應用，不想用的可以先停用。" },
  "apps-sort": { scene: cardsSortScene, text: "展開：選預設、名稱，或自己訂編號排序。" },
  "apps-plugins": { scene: accScene.replace("管理應用", "擴充插件"), text: "展開：貼上網址，把其他網站加進所有應用。" },
  "apps-mode-card": { scene: modeScene(false), text: "圖卡：一格一格排開，一眼看到圖示。" },
  "apps-mode-list": { scene: modeScene(true), text: "清單：一條一條由上往下排，名稱更清楚。" },
  "apps-size-l": { scene: sizeScene("l"), text: "大：放大，長輩看更清楚。" },
  "apps-size-m": { scene: sizeScene("m"), text: "中：預設大小。" },
  "apps-size-s": { scene: sizeScene("s"), text: "小：縮小，一個畫面放更多個應用。" },
  "apps-cols-2": { scene: colsScene(2), text: "每行 2 個：每個比較大。" },
  "apps-cols-3": { scene: colsScene(3), text: "每行 3 個：每個比較小，一次看更多。" },
  "apps-toggle": { scene: appToggleScene, text: "按一下開關：停用後，這個應用不會顯示在所有應用。" },
  "apps-enable-all": { scene: appAllOnScene, text: "把停用的應用一次全部啟用。" },
  "apps-sort-default": { scene: sortDefaultScene, text: "預設：照內建順序排列。" },
  "apps-sort-name": { scene: sortNameScene, text: "名稱：依名稱筆畫自動排列。" },
  "apps-sort-custom": { scene: cardsSortScene, text: "自訂：自己訂編號，決定每個應用的位置。" },
  "apps-order-num": { scene: orderNumScene, text: "點編號選新位置，其他應用會自動順延。" },
  "apps-order-up": { scene: orderUpScene, text: "▲ 往前移一格。" },
  "apps-order-down": { scene: orderDownScene, text: "▼ 往後移一格。" },
  "apps-order-reset": { scene: orderResetScene, text: "恢復成預設的排列順序。" },
  "apps-plug-title": { scene: noteFieldScene("標題", "家人相簿"), text: "取個名字，會顯示在所有應用，最多 20 字。" },
  "apps-plug-url": { scene: noteFieldScene("網址", "https://example.com"), text: "貼上要連結的網址，要以 https:// 開頭。" },
  "apps-plug-icon": { scene: noteFieldScene("圖示連結", "https://…/icon.png"), text: "選填：貼上圖片網址當圖示，不填就用預設圖示。" },
  "apps-plug-add": { scene: appPlugAddScene, text: "按這裡新增，插件會出現在所有應用。" },
  "apps-plug-cancel": { scene: calPageScene(true), text: "取消編輯，回到新增模式。" },
  "apps-plug-edit": { scene: editScene, text: "按鉛筆，修改這個插件的標題、網址或圖示。" },
  "apps-plug-del": { scene: calDelScene, text: "按垃圾桶，再按一次「再按一次刪除」才會真的刪除。" },
  "apps-login": { scene: loginScene(false), text: "登入後，設定會自動存到你的 Google 雲端硬碟，換手機也帶著走。" },
  "apps-logout": { scene: loginScene(true), text: "登出帳號。在公共場所用完，記得登出。" },
  "dock-go": { scene: dockGoScene, text: "點一下，切換到「{name}」。目前所在的畫面會亮起來。" },
  "dock-home": { scene: dockHomeScene, text: "快捷列關閉時，點這裡回到大廳。" },
  "dock-settings": { scene: panelScene(true), text: "點一下，打開系統設定。" },
  "dock-notification": { scene: remBellScene, text: "點一下，打開最新提醒；有新提醒時會有紅點。" },
  "dock-status": { scene: dockStatusScene, text: "點一下，查看網頁與雲端連線狀態。" },
  "dock-logout": { scene: loginScene(true), text: "點一下，登出帳號。在公共場所用完，記得登出。" },
  "notes-sort-pinned": { scene: reorder('<i class="fa-solid fa-thumbtack"></i>'), text: "這是釘選，會自動往前排放。" },
  "notes-sort-date": { scene: reorder('<span class="sm-txt">最新</span>'), text: "最新發布的公告，會排在最前面。" },
  "notes-sort-expire": { scene: reorder('<span class="sm-txt">剩1天</span>'), text: "快到期的公告，會自動往前排放。" },
  "notes-open": { scene: openScene, text: "點一下便利貼，打開完整內容。" },
  "notes-manage": { scene: manageScene, text: "登入後，按這裡新增或編輯公告。" },
};

const HOLD_MS = 500;
const STAY_MS = 8000;
let shown = new Set();        // 這次使用中已提醒過「長按可看說明」的畫面
let pop = null, popTimer = null, hintEl = null, hintTimer = null;
let swallow = false;          // 長按剛跳出說明：吃掉隨後的那一次點擊

const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const snapshotTips = () => state.tips !== false;

export function setTips(v) {
  state.tips = !!v;
  if (!state.tips) closeTips(); else shown.clear();
  emit("tips:change", state.tips);
}

export function applyTips(v) {
  state.tips = v !== false;
  emit("tips:change", state.tips);
}

// ---------- 樣式 ----------
function injectStyle() {
  if (document.getElementById("tipsStyle")) return;
  const st = document.createElement("style");
  st.id = "tipsStyle";
  st.textContent = `
body.tips-on [data-tip] { -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; }
.tip-pop { animation: tipIn .2s ease-out; }
@keyframes tipIn { from { opacity: 0; transform: translateY(6px) scale(.96); } to { opacity: 1; transform: none; } }
.sc { position: relative; height: 92px; margin: 2px 0 6px; }
.sn { position: absolute; top: 18px; width: 52px; height: 62px; border-top: 5px solid; border-radius: 0 0 7px 7px; padding: 6px 5px; box-shadow: 0 3px 6px rgba(0,0,0,.18); }
.sn-tape { position: absolute; top: -10px; left: 50%; width: 22px; height: 8px; margin-left: -11px; background: rgba(255,255,255,.75); border: 1px dashed rgba(0,0,0,.2); }
.sl { display: block; font-size: 9px; font-weight: 900; line-height: 1; border: 1.5px solid currentColor; border-radius: 4px; padding: 2px 3px; width: max-content; margin-bottom: 5px; }
.sb { display: block; height: 5px; border-radius: 3px; background: currentColor; opacity: .45; margin-top: 4px; }
.sn-a { left: 24px; animation: sA 4s ease-in-out infinite; }
.sn-b { left: 90px; animation: sB 4s ease-in-out infinite; }
.sn-c { left: 156px; animation: sC 4s ease-in-out infinite; }
@keyframes sA { 0%,22% { transform: translateX(0); } 42%,90% { transform: translateX(66px); } 100% { transform: translateX(0); } }
@keyframes sB { 0%,22% { transform: translateX(0); } 42%,90% { transform: translateX(66px); } 100% { transform: translateX(0); } }
@keyframes sC { 0%,22% { transform: translateX(0); } 42%,90% { transform: translateX(-132px); } 100% { transform: translateX(0); } }
.sm { position: absolute; top: -12px; right: -9px; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; font-size: 13px; color: #dc2626; }
.sm-txt { font-size: 9px; font-weight: 900; white-space: nowrap; color: #b91c1c; }
.sm-ring { position: absolute; inset: -4px; border: 2.5px solid #ef4444; border-radius: 50%; animation: smRing 1.4s ease-in-out infinite; }
@keyframes smRing { 0%,100% { transform: scale(.9); opacity: .6; } 50% { transform: scale(1.12); opacity: 1; } }
.so-small { left: calc(50% - 26px); animation: soSmall 3.6s ease-in-out infinite; }
.so-big { position: absolute; left: calc(50% - 62px); top: 6px; width: 124px; height: 80px; border: 2px solid; border-top-width: 6px; border-radius: 0 0 8px 8px; padding: 8px; box-shadow: 0 5px 10px rgba(0,0,0,.2); opacity: 0; animation: soBig 3.6s ease-in-out infinite; }
@keyframes soSmall { 0%,38% { opacity: 1; } 46%,92% { opacity: 0; } 100% { opacity: 1; } }
@keyframes soBig { 0%,40% { opacity: 0; transform: scale(.5); } 52%,90% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(.5); } }
.sp-btn { animation: tipPress 3.6s ease-in-out infinite; }
.sp-new { position: absolute; right: 30px; top: 20px; width: 52px; height: 58px; border: 2px solid; border-top-width: 5px; border-radius: 0 0 7px 7px; padding: 6px 5px; text-align: center; box-shadow: 0 3px 6px rgba(0,0,0,.18); opacity: 0; animation: spNew 3.6s ease-in-out infinite; }
@keyframes spNew { 0%,40% { opacity: 0; transform: scale(.4) rotate(-8deg); } 55%,90% { opacity: 1; transform: scale(1) rotate(2deg); } 100% { opacity: 0; transform: scale(.4); } }
.scc { position: absolute; top: 16px; left: calc(50% - 35px); width: 70px; height: 62px; border-radius: 14px; background: #fff; border: 2px solid #e2e8f0; box-shadow: 0 3px 6px rgba(0,0,0,.15); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; animation: soSmall 3.6s ease-in-out infinite; }
.scc-ic { width: 24px; height: 24px; border-radius: 8px; background: #bae6fd; display: flex; align-items: center; justify-content: center; }
.scm-btn { position: absolute; right: 26px; top: 10px; width: 36px; height: 36px; border-radius: 12px; background: #fff; border: 2px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,.12); display: flex; align-items: center; justify-content: center; color: #0284c7; font-size: 16px; animation: tipPress 3.6s ease-in-out infinite; }
.scm-menu { position: absolute; right: 26px; top: 50px; width: 118px; border-radius: 12px; background: #fff; border: 2px solid #e2e8f0; box-shadow: 0 5px 10px rgba(0,0,0,.18); padding: 4px 8px; font-size: 12px; font-weight: 900; color: #1e293b; opacity: 0; transform-origin: 100% 0; animation: spNew 3.6s ease-in-out infinite; }
.scm-menu span { display: block; padding: 4px 0; }
.fmt { position: absolute; left: 50%; top: 8px; width: 150px; margin-left: -75px; }
.fmt-a { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; animation: fmtA 4s ease-in-out infinite; }
.fmt-b { display: flex; flex-direction: column; gap: 5px; top: 10px; opacity: 0; animation: fmtB 4s ease-in-out infinite; }
.fmt-t { height: 34px; border-radius: 10px; background: #fff; border: 2px solid #e2e8f0; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,.1); }
.fmt-r { height: 22px; border-radius: 8px; background: #fff; border: 2px solid #e2e8f0; display: flex; align-items: center; gap: 6px; padding: 0 6px; box-shadow: 0 2px 4px rgba(0,0,0,.1); }
@keyframes fmtA { 0%,40% { opacity: 1; } 50%,90% { opacity: 0; } 100% { opacity: 1; } }
@keyframes fmtB { 0%,40% { opacity: 0; } 50%,90% { opacity: 1; } 100% { opacity: 0; } }
.gtg { position: absolute; left: 50%; top: 6px; transform: translateX(-50%); display: grid; gap: 6px; }
.gtl { position: absolute; left: 50%; top: 6px; width: 150px; margin-left: -75px; display: flex; flex-direction: column; gap: 5px; }
.gt { border-radius: 10px; background: #fff; border: 2px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,.12); display: flex; align-items: center; justify-content: center; opacity: 0; animation: gtPop 3.6s ease-in-out infinite; }
.gt.gl { height: 22px; border-radius: 8px; padding: 0 6px; gap: 6px; justify-content: flex-start; }
@keyframes gtPop { 0%,6% { opacity: 0; transform: scale(.4); } 18%,88% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(.4); } }
.gt-s { border-radius: 10px; background: #fff; border: 2px solid #e2e8f0; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,.12); margin: 0 auto 2px; }
.gt-on { border-color: #0284c7; animation: gtOn 1.4s ease-in-out infinite; }
@keyframes gtOn { 0%,100% { box-shadow: 0 0 0 0 rgba(2,132,199,.5); } 50% { box-shadow: 0 0 0 5px rgba(2,132,199,0); } }
.rw { position: absolute; left: 18px; right: 18px; height: 24px; display: flex; align-items: center; gap: 6px; padding: 0 6px; border-radius: 8px; background: #fff; border: 2px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,.1); animation: rwMove 3.6s ease-in-out infinite; }
@keyframes rwMove { 0%,25% { transform: translateY(0); } 45%,90% { transform: translateY(var(--dy, 0px)); } 100% { transform: translateY(0); } }
.rw-n { width: 18px; height: 18px; border-radius: 5px; background: #e0f2fe; color: #0369a1; font-size: 11px; display: flex; align-items: center; justify-content: center; }
.rw-n span { position: absolute; }
.num-a { animation: fmtA 3.6s ease-in-out infinite; } .num-b { animation: fmtB 3.6s ease-in-out infinite; }
.rw-a { width: 18px; height: 18px; border-radius: 5px; background: #f1f5f9; font-size: 9px; display: flex; align-items: center; justify-content: center; }
.rw-reset { position: absolute; right: 22px; top: 36px; width: 26px; height: 26px; border-radius: 50%; background: #fff; border: 2px solid #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 900; color: #0369a1; }
.pnl { position: absolute; left: 30px; right: 30px; top: 22px; height: 64px; padding: 8px 10px; border-radius: 10px; background: #fff; border: 2px solid #e2e8f0; box-shadow: 0 4px 8px rgba(0,0,0,.15); }
.pnl-in { animation: pnlIn 3.6s ease-in-out infinite; } .pnl-out { animation: pnlOut 3.6s ease-in-out infinite; }
@keyframes pnlIn { 0%,36% { opacity: 0; transform: translateX(40px); } 52%,90% { opacity: 1; transform: none; } 100% { opacity: 0; transform: translateX(40px); } }
@keyframes pnlOut { 0%,36% { opacity: 1; transform: none; } 52%,90% { opacity: 0; transform: translateX(40px); } 100% { opacity: 1; transform: none; } }
@keyframes rwGone { 0%,55% { opacity: 1; transform: none; } 75%,92% { opacity: 0; transform: translateX(30px); } 100% { opacity: 1; transform: none; } }
.del-a { background: #fee2e2; animation: fmtA 3.6s ease-in-out infinite; } .del-b { position: absolute; right: 6px; width: auto; padding: 0 6px; background: #e11d48; color: #fff; font-size: 9px; font-weight: 900; opacity: 0; animation: fmtB 3.6s ease-in-out infinite; }
.arr { position: relative; margin: 8px 30px 3px; height: 4px; border-radius: 2px; background: #e2e8f0; overflow: hidden; } .arr i { position: absolute; left: 0; top: 0; bottom: 0; background: #0284c7; animation: arrGrow 3.6s ease-in-out infinite; }
@keyframes arrGrow { 0% { width: 0; } 60%,90% { width: 100%; } 100% { width: 0; } }
.acct { display: flex; align-items: center; gap: 8px; margin: 18px 30px 0; padding: 8px 10px; border-radius: 12px; background: #ecfdf5; border: 2px solid #a7f3d0; }
.acct-av { width: 22px; height: 22px; border-radius: 50%; background: #10b981; flex-shrink: 0; }
.rc { position: absolute; left: 50%; margin-left: -75px; width: 150px; padding: 6px 8px; border-radius: 12px 12px 12px 4px; background: #fff; border: 2px solid #e2e8f0; box-shadow: 0 2px 5px rgba(0,0,0,.12); }
.rc-top { display: flex; align-items: center; gap: 5px; margin-bottom: 2px; }
.rc-pill { font-size: 9px; font-weight: 900; padding: 1px 7px; border-radius: 999px; background: #e0f2fe; color: #0369a1; }
.rc-dot { width: 8px; height: 8px; border-radius: 50%; background: #ef4444; display: inline-block; animation: fmtA 3.6s ease-in-out infinite; }
.rc-dot.num-b { animation: fmtB 3.6s ease-in-out infinite; }
.rc-btn { display: inline-block; margin-top: 4px; font-size: 9px; font-weight: 900; padding: 2px 7px; border-radius: 999px; background: #f1f5f9; color: #475569; }
.rc-ok { display: block; margin-top: 8px; text-align: center; font-size: 11px; font-weight: 900; color: #fff; background: #0284c7; border-radius: 8px; padding: 4px 0; }
.scc-fade { animation: soSmall 3.6s ease-in-out infinite; }
.rc-sel { position: absolute; left: 14px; top: 6px; width: 56px; height: 22px; border-radius: 999px; background: #fff; border: 2px solid #e2e8f0; font-size: 11px; font-weight: 900; text-align: center; line-height: 18px; color: #0369a1; }
.rc-sel span { position: absolute; inset: 0; }
.rc-badge { position: absolute; left: 50%; top: 4px; margin-left: -34px; width: 68px; text-align: center; font-size: 10px; font-weight: 900; color: #fff; background: #0284c7; border-radius: 999px; padding: 2px 0; height: 18px; line-height: 14px; }
.rc-badge span { position: absolute; inset: 0; }
.rc-toast { position: absolute; left: 50%; margin-left: -50px; width: 100px; top: 60px; text-align: center; font-size: 11px; font-weight: 900; color: #fff; background: #334155; border-radius: 999px; padding: 4px 0; opacity: 0; animation: spNew 3.6s ease-in-out infinite; }
.rsh { position: absolute; left: 30px; right: 30px; bottom: -6px; height: 78px; padding: 6px 8px; border-radius: 16px 16px 0 0; background: #fcfbf9; border: 2px solid #e2e8f0; box-shadow: 0 -3px 8px rgba(0,0,0,.12); }
.rsh-low { height: 56px; bottom: -6px; }
.rsh-top { display: flex; justify-content: space-between; align-items: center; }
.rsh-x { width: 18px; height: 18px; border-radius: 50%; background: #e2e8f0; font-size: 9px; display: flex; align-items: center; justify-content: center; }
.rsh-down { animation: rshDown 3.6s ease-in-out infinite; } .rsh-up { animation: rshUp 3.6s ease-in-out infinite; }
@keyframes rshDown { 0%,36% { transform: none; opacity: 1; } 55%,90% { transform: translateY(60px); opacity: 0; } 100% { transform: none; opacity: 1; } }
@keyframes rshUp { 0%,36% { transform: translateY(60px); opacity: 0; } 55%,90% { transform: none; opacity: 1; } 100% { transform: translateY(60px); opacity: 0; } }
@keyframes dlgGone { 0%,36% { opacity: 1; transform: none; } 55%,90% { opacity: 0; transform: scale(.7); } 100% { opacity: 1; transform: none; } }
.tip-pill { display: inline-block; padding: 8px 16px; border-radius: 999px; background: #fff; border: 2px solid #f59e0b; font-weight: 900; font-size: 14px; }
.tip-finger { position: absolute; font-size: 30px; line-height: 1; animation: tipFinger 3.6s ease-in-out infinite; pointer-events: none; }
@keyframes tipFinger { 0%,25%,100% { transform: translate(8px, 22px); opacity: 0; } 8% { opacity: 1; } 15%,30% { transform: translate(8px, 2px); opacity: 1; } 38% { transform: translate(8px, 22px); opacity: 0; } }
.cg { position: absolute; left: 50%; top: 14px; width: 154px; margin-left: -77px; display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
.cgc { height: 16px; border-radius: 4px; background: #fff; border: 1.5px solid #e2e8f0; }
.cgc-on { background: #bae6fd; border-color: #0284c7; animation: gtOn 1.4s ease-in-out infinite; }
.cgb { position: absolute; left: 22px; width: 66px; top: 22px; height: 7px; border-radius: 4px; background: #0284c7; }
.cgt { position: absolute; left: 50%; top: 14px; width: 154px; margin-left: -77px; display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; pointer-events: none; animation: fmtB 3.6s ease-in-out infinite; } .cgt .cgc { grid-column: 4; grid-row: 1; margin-left: 0; }
.cmo { position: absolute; left: 50%; top: 4px; width: 170px; margin-left: -85px; display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; border-radius: 14px; background: #0284c7; color: #fff; box-shadow: 0 3px 6px rgba(0,0,0,.18); }
.cmo-b { width: 26px; height: 26px; border-radius: 50%; background: rgba(255,255,255,.25); display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 900; }
.cmo-t { position: relative; width: 56px; height: 24px; text-align: center; font-size: 18px; line-height: 24px; } .cmo-t span { position: absolute; inset: 0; }
.tpi { position: absolute; left: 30px; right: 30px; top: 30px; height: 34px; border-radius: 10px; background: #fff; border: 2px solid #94a3b8; display: flex; align-items: center; padding: 0 10px; font-size: 13px; font-weight: 900; color: #1e293b; box-shadow: 0 2px 4px rgba(0,0,0,.1); }
.tpi-t { display: inline-block; overflow: hidden; white-space: nowrap; width: 0; animation: tpiType 3.6s steps(14, end) infinite; }
.tpi-c { width: 2px; height: 16px; background: #0284c7; margin-left: 1px; animation: tpiBlink .7s steps(2) infinite; }
@keyframes tpiType { 0% { width: 0; } 65%,92% { width: 100%; } 100% { width: 0; } }
@keyframes tpiBlink { 50% { opacity: 0; } }
.lc { display: inline-flex; align-items: center; gap: 5px; padding: 4px 8px; border-radius: 10px; background: #f8fafc; border: 2px solid #e2e8f0; font-size: 11px; font-weight: 900; color: #1e293b; }
.lc-b { width: 14px; height: 14px; border-radius: 4px; border: 2px solid #94a3b8; background: #fff; color: transparent; font-size: 10px; line-height: 10px; text-align: center; }
.lc-on { background: #10b981; border-color: #10b981; color: #fff; }
.lc-late { animation: lcTick 3.6s ease-in-out infinite; }
@keyframes lcTick { 0%,30% { background: #fff; border-color: #94a3b8; color: transparent; } 40%,90% { background: #10b981; border-color: #10b981; color: #fff; } 100% { background: #fff; border-color: #94a3b8; color: transparent; } }
.fly { position: absolute; left: 20px; top: 8px; font-size: 22px; animation: flyAway 3.6s ease-in-out infinite; }
@keyframes flyAway { 0%,30% { opacity: 0; transform: translate(0, 10px); } 40% { opacity: 1; } 80%,100% { opacity: 0; transform: translate(190px, -14px) rotate(-10deg); } }
.sw { position: absolute; right: 26px; top: 20px; width: 46px; height: 26px; border-radius: 13px; background: #cbd5e1; animation: swBg 3.6s ease-in-out infinite; } .sw i { position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.3); animation: swKnob 3.6s ease-in-out infinite; }
@keyframes swBg { 0%,30% { background: #cbd5e1; } 40%,90% { background: #f59e0b; } 100% { background: #cbd5e1; } }
@keyframes swKnob { 0%,30% { transform: none; } 40%,90% { transform: translateX(20px); } 100% { transform: none; } }
.lc-sel { animation: lcSel 3.6s ease-in-out infinite; }
@keyframes lcSel { 0%,30% { background: #f8fafc; border-color: #e2e8f0; color: #1e293b; } 40%,90% { background: #0284c7; border-color: #0284c7; color: #fff; } 100% { background: #f8fafc; border-color: #e2e8f0; color: #1e293b; } }
.swm { position: relative; width: 30px; height: 16px; border-radius: 8px; background: #cbd5e1; flex-shrink: 0; animation: swBg 3.6s ease-in-out infinite; } .swm i { position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.3); animation: swKnobS 3.6s ease-in-out infinite; }
@keyframes swKnobS { 0%,30% { transform: none; } 40%,90% { transform: translateX(14px); } 100% { transform: none; } }
.acc-ar { font-size: 14px; font-weight: 900; color: #64748b; animation: accRot 3.6s ease-in-out infinite; }
@keyframes accRot { 0%,25% { transform: none; } 40%,90% { transform: rotate(180deg); } 100% { transform: none; } }
.dkb { position: absolute; left: 50%; bottom: 4px; width: 170px; margin-left: -85px; height: 28px; border-radius: 14px; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.18); display: flex; justify-content: space-around; align-items: center; }
.dki { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; } .dki b { width: 10px; height: 10px; border-radius: 3px; background: #94a3b8; }
.dki-on { animation: dkOn 3.6s ease-in-out infinite; }
@keyframes dkOn { 0%,30% { background: transparent; } 40%,90% { background: #bae6fd; } 100% { background: transparent; } }
@keyframes tipPress { 0%,12%,24%,100% { transform: scale(1); } 18% { transform: scale(.92); } }
`;
  document.head.appendChild(st);
}

// ---------- 說明小視窗 ----------
export function closeTips() {
  clearTimeout(popTimer); clearTimeout(hintTimer);
  pop?.remove(); pop = null;
  const h = hintEl; hintEl = null;
  if (h) { h.style.opacity = "0"; setTimeout(() => h.remove(), 250); }
}

function openPop(target) {
  const t = TIPS[target.dataset.tip];
  if (!t) return false;
  injectStyle();
  closePop();
  const wrap = document.createElement("div");
  wrap.className = "fixed inset-0";
  wrap.style.zIndex = "2147483000"; // 蓋過所有設定視窗
  wrap.innerHTML = `<div class="tip-pop absolute w-[260px] rounded-2xl border-2 border-amber-400 bg-amber-50 text-amber-950 shadow-2xl px-4 pt-3 pb-3">
    <div aria-hidden="true">${t.scene}</div>
    <p class="text-base font-black leading-snug text-center">${esc(t.text.replace("{name}", target.dataset.tipName || "這個功能"))}</p>
    <p class="text-[11px] font-bold text-amber-700/70 mt-2 text-center">點空白處關閉</p>
  </div>`;
  document.body.appendChild(wrap);
  const box = wrap.firstElementChild, r = target.getBoundingClientRect();
  const w = 260, h = box.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
  const left = Math.max(8, Math.min(vw - w - 8, r.left + r.width / 2 - w / 2));
  const below = r.bottom + 10 + h <= vh - 8;
  const top = below ? r.bottom + 10 : Math.max(8, r.top - h - 10);
  box.style.left = left + "px"; box.style.top = top + "px";
  wrap.addEventListener("click", closePop);
  pop = wrap;
  popTimer = setTimeout(closePop, STAY_MS);
  return true;
}
function closePop() { clearTimeout(popTimer); pop?.remove(); pop = null; }

// ---------- 長按偵測（全站只裝一次）----------
let wired = false;
function wire() {
  if (wired) return; wired = true;
  let timer = null, sx = 0, sy = 0, tgt = null;
  const cancel = () => { clearTimeout(timer); timer = null; };
  document.addEventListener("pointerdown", (e) => {
    if (state.tips === false) return;
    const el = e.target.closest?.("[data-tip]");
    if (!el || !TIPS[el.dataset.tip]) return;
    swallow = false; tgt = el; sx = e.clientX; sy = e.clientY;
    cancel();
    timer = setTimeout(() => { timer = null; if (tgt && openPop(tgt)) { swallow = true; navigator.vibrate?.(15); } }, HOLD_MS);
  }, true);
  document.addEventListener("pointermove", (e) => { if (timer && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) cancel(); }, true);
  ["pointerup", "pointercancel", "scroll"].forEach((ev) => document.addEventListener(ev, () => { cancel(); }, true));
  document.addEventListener("click", (e) => { // 長按後放開會產生一次點擊，吃掉它，免得觸發原本動作
    if (!swallow) return;
    swallow = false; e.stopPropagation(); e.preventDefault();
  }, true);
  document.addEventListener("contextmenu", (e) => { if (state.tips !== false && e.target.closest?.("[data-tip]")) e.preventDefault(); });
}
wire();

function syncBody() { document.body?.classList.toggle("tips-on", state.tips !== false); }
on("tips:change", syncBody);
syncBody();

// ---------- 進入畫面時的淡淡提醒 ----------
export function showTipHint(id) {
  if (state.tips === false || shown.has(id)) return;
  shown.add(id);
  injectStyle(); syncBody();
  const el = document.createElement("div");
  el.setAttribute("role", "note");
  el.className = "fixed left-1/2 z-[60] -translate-x-1/2 rounded-full bg-amber-500 text-white shadow-lg px-4 py-2 text-sm font-black whitespace-nowrap transition-opacity duration-300 pointer-events-none";
  el.style.bottom = "calc(env(safe-area-inset-bottom, 0px) + 96px)";
  el.innerHTML = '<i class="fa-regular fa-lightbulb mr-1.5"></i>長按按鈕或卡片，可看操作說明';
  hintEl?.remove(); document.body.appendChild(el); hintEl = el;
  clearTimeout(hintTimer); hintTimer = setTimeout(() => { el.style.opacity = "0"; setTimeout(() => el.remove(), 300); if (hintEl === el) hintEl = null; }, 3500);
}

on("auth:change", () => { shown.clear(); });
