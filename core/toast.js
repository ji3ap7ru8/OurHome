// 全域小提示：統一走「系統提示框」模板（core/notice.js），各服務不要再自己做黑色提示框。
// showToast(msg, ms, { error, pos, title, icon })
import { showNotice } from "./notice.js";

export function showToast(msg, ms = 3200, opts = {}) {
  return showNotice({ msg, ms, ...opts });
}
