// 碼表的共用狀態：碼表頁和大廳的碼表小卡用同一個計時器（services/stopwatch/index.js、components/lobby.js 都從這裡拿）。
// 計時狀態放在模組層級：切換到其他服務時碼表仍會繼續跑，Dock 上方會出現小膠囊（人在大廳且大廳有顯示碼表時，小膠囊會自動隱藏，避免重複）。
import { createStopwatch, fmtStopwatch } from "./engine.js";
import { setChip } from "../../core/chips.js";
import { holdAwake, releaseAwake } from "../../core/wakelock.js";
import { navigate } from "../../core/router.js";
import { state } from "../../core/store.js";
import { isShown } from "../../core/lobby-model.js";
import { isEnabled } from "../../core/apps-model.js";

export const ID = "碼表";
export const sw = createStopwatch();

let chipId = null;

// 大廳有顯示碼表小卡時，在大廳不需要再顯示背景小膠囊
const hideOnLobby = () => state.route === "大廳" && isEnabled(ID) && isShown(ID);

export function refreshChip() {
  if (sw.status === "idle") return setChip(ID, null);
  setChip(ID, {
    icon: "fa-solid fa-stopwatch",
    text: `${sw.status === "paused" ? "暫停 " : ""}${fmtStopwatch(sw.elapsed()).replace(/\.\d+$/, "")}`,
    aria: `碼表${sw.status === "paused" ? "已暫停" : "計時中"}，點一下回到碼表`,
    route: ID,
    hideWhen: hideOnLobby,
    dim: sw.status === "paused",
    onClick: () => navigate(ID),
  });
}

export function syncBackground() {
  clearInterval(chipId);
  chipId = sw.status === "running" ? setInterval(refreshChip, 500) : null;
  if (sw.status === "running") holdAwake(ID);
  else releaseAwake(ID);
  refreshChip();
}
