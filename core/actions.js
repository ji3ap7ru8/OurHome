// 事件委派：HTML 以 data-action / data-input / data-change 宣告行為，
// 模組以 registerActions() 註冊處理函式，取代原本的全域 inline onclick。

const clickActions = {};
const inputActions = {};
const changeActions = {};

export const registerActions = (map) => Object.assign(clickActions, map);
export const registerInputActions = (map) => Object.assign(inputActions, map);
export const registerChangeActions = (map) => Object.assign(changeActions, map);

export function initActions(root = document) {
  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el || el.disabled) return;
    const fn = clickActions[el.dataset.action];
    if (fn) fn(el, e);
    else console.warn("[actions] 未註冊的 action:", el.dataset.action);
  });
  root.addEventListener("input", (e) => {
    const el = e.target.closest("[data-input]");
    if (el && inputActions[el.dataset.input]) inputActions[el.dataset.input](el, e);
  });
  root.addEventListener("change", (e) => {
    const el = e.target.closest("[data-change]");
    if (el && changeActions[el.dataset.change]) changeActions[el.dataset.change](el, e);
  });
}
