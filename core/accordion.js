// 設定視窗手風琴：展開/收合動畫，一次只展開一張卡片。
// 以事件委派監聽 [data-accordion-trigger]，不依賴 actions.js；由 settings-panel.js 呼叫 initAccordion() 啟用。
// 展開狀態只存在 DOM（記憶體），不使用 localStorage / Cookie。

const STYLE_ID = "ourhome-accordion-style";

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    .acc-body { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .32s cubic-bezier(.4,0,.2,1); }
    .acc-body.is-open { grid-template-rows: 1fr; }
    .acc-inner { min-height: 0; overflow: hidden; opacity: 0; visibility: hidden;
      transition: opacity .22s ease, visibility 0s linear .32s; }
    .acc-body.is-open > .acc-inner { opacity: 1; visibility: visible;
      transition: opacity .28s ease .08s, visibility 0s linear 0s; }
    .acc-arrow { transition: transform .32s cubic-bezier(.4,0,.2,1); }
    [aria-expanded="true"] .acc-arrow { transform: rotate(180deg); }
    @media (prefers-reduced-motion: reduce) {
      .acc-body, .acc-inner, .acc-arrow { transition: none !important; }
    }`;
  document.head.appendChild(s);
}

// 三星等部分瀏覽器：展開動畫後，捲動區只重畫到舊高度，下半部一片空白。
// 動畫前後各強制重新繪製一次捲動區（先換成獨立圖層再還原），畫面就會補齊。
function repaint(from) {
  let el = from.parentElement;
  while (el && !(el.scrollHeight > el.clientHeight && /(auto|scroll)/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
  const targets = [el, document.getElementById("bottomSheet")].filter(Boolean);
  for (const t of targets) {
    t.style.transform = "translateZ(0)";
    void t.offsetHeight; // 強制 reflow
    requestAnimationFrame(() => { t.style.transform = ""; });
  }
}
function scheduleRepaint(body) {
  requestAnimationFrame(() => repaint(body));
  body.addEventListener("transitionend", () => repaint(body), { once: true });
  setTimeout(() => repaint(body), 400); // 保險：transitionend 沒觸發時也補一次
}

function setOpen(trigger, open) {
  const key = trigger.dataset.accordionTrigger;
  const body = document.querySelector(`[data-accordion-body="${key}"]`);
  if (!body) return;
  const was = body.classList.contains("is-open");
  trigger.setAttribute("aria-expanded", open ? "true" : "false");
  body.classList.toggle("is-open", open);
  if (was !== open) scheduleRepaint(body);
}

// 以程式開關某張卡片（key = "personal" | "data"）；開啟時其餘自動收合。
export function setAccordionOpen(key, open) {
  const trigger = document.querySelector(`[data-accordion-trigger="${key}"]`);
  if (!trigger) return;
  if (open) {
    document.querySelectorAll("[data-accordion-trigger]").forEach((t) => {
      if (t !== trigger) setOpen(t, false);
    });
  }
  setOpen(trigger, open);
}

// 卡片內的小型收合區塊（data-fold-trigger）：各自獨立開合，不影響外層手風琴。
function onFoldClick(e) {
  const t = e.target.closest("[data-fold-trigger]");
  if (!t) return;
  const body = document.querySelector(`[data-fold-body="${t.dataset.foldTrigger}"]`);
  if (!body) return;
  const open = t.getAttribute("aria-expanded") !== "true";
  t.setAttribute("aria-expanded", open ? "true" : "false");
  body.classList.toggle("is-open", open);
}

function onClick(e) {
  const trigger = e.target.closest("[data-accordion-trigger]");
  if (!trigger) return;
  const willOpen = trigger.getAttribute("aria-expanded") !== "true";
  // 一次只開一個：先收合其他全部
  document.querySelectorAll("[data-accordion-trigger]").forEach((t) => {
    if (t !== trigger) setOpen(t, false);
  });
  setOpen(trigger, willOpen);
}

export function collapseAllAccordions() {
  document.querySelectorAll("[data-accordion-trigger]").forEach((t) => setOpen(t, false));
}

// 點選畫面下方（尚未捲進可視範圍）的 radio 選項時，瀏覽器會為了「讓被聚焦的隱藏 radio 可見」
// 去捲動外層容器（連 overflow:hidden 的也會被捲），三星瀏覽器就會整個版面位移、下半部空白。
// 做法：按下前記住所有外層的捲動位置，聚焦後立刻還原。
let snap = null;
const collect = (el) => {
  const list = [];
  for (let n = el; n; n = n.parentElement) list.push([n, n.scrollTop, n.scrollLeft]);
  list.push([document.scrollingElement, document.scrollingElement?.scrollTop || 0, document.scrollingElement?.scrollLeft || 0]);
  return list;
};
const restore = () => { if (snap) for (const [n, t, l] of snap) { if (n && (n.scrollTop !== t || n.scrollLeft !== l)) { n.scrollTop = t; n.scrollLeft = l; } } };
function onPointerDown(e) {
  const lab = e.target.closest?.("label");
  snap = lab && lab.querySelector("input.sr-only") ? collect(lab) : null;
}
function onFocusIn(e) {
  if (!snap || !e.target.matches?.("input.sr-only")) return;
  restore();
  requestAnimationFrame(restore);
  setTimeout(restore, 60);
  setTimeout(() => { restore(); snap = null; }, 350);
}

let started = false;
export function initAccordion() {
  if (started) return;
  started = true;
  injectStyle();
  document.addEventListener("click", onClick);
  document.addEventListener("click", onFoldClick);
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("focusin", onFocusIn, true);
}
