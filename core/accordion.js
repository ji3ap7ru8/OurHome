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

function setOpen(trigger, open) {
  const key = trigger.dataset.accordionTrigger;
  const body = document.querySelector(`[data-accordion-body="${key}"]`);
  if (!body) return;
  trigger.setAttribute("aria-expanded", open ? "true" : "false");
  body.classList.toggle("is-open", open);
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

let started = false;
export function initAccordion() {
  if (started) return;
  started = true;
  injectStyle();
  document.addEventListener("click", onClick);
  document.addEventListener("click", onFoldClick);
}
