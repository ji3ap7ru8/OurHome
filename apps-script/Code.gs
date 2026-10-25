/**
 * OurHome「LINE推播」中繼站（Google Apps Script 網頁應用程式）
 *
 * 網站（GitHub Pages）不能直接呼叫 LINE API（會被瀏覽器的跨網域限制擋下），
 * 所以由這支程式代送：網站把「Bot Token、接收對象、訊息」POST 過來，這裡再呼叫 LINE Push API。
 * Bot Token 由網站（系統設定 → LINE Notify → Bot Token）帶過來，不需要寫在這支程式裡。
 *
 * 部署：部署 → 新增部署作業 → 類型「網頁應用程式」→ 執行身分「我」→ 誰可以存取「任何人」→ 複製 /exec 網址，
 *       貼到網站「系統設定 → LINE Notify → Apps Script → 中繼站 URL」。
 * 之後每次修改這支程式，都要「管理部署作業 → 編輯 → 新版本」才會生效。
 *
 * 如果你的專案裡原本已經有 doPost，請把下面 doPost 的內容併進去，不要有兩個同名函式。
 */

var LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

function doPost(e) {
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (req.action !== "push") return json_({ success: false, message: "不支援的動作" });
    return json_(pushMessages_(req.token, req.to, req.messages));
  } catch (err) {
    return json_({ success: false, message: "中繼站錯誤：" + err });
  }
}

// 用瀏覽器直接開 /exec 網址時，確認中繼站有部署成功
function doGet() {
  return json_({ success: true, message: "OurHome LINE 中繼站運作中" });
}

function pushMessages_(token, to, messages) {
  token = String(token || "").trim();
  if (!token) return { success: false, message: "沒有收到 Bot Token" };
  if (!to || !to.length) return { success: false, message: "沒有接收對象" };
  if (!messages || !messages.length) return { success: false, message: "沒有訊息內容" };

  var ok = 0, fail = [];
  for (var i = 0; i < to.length; i++) {
    var res = UrlFetchApp.fetch(LINE_PUSH_URL, {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + token },
      payload: JSON.stringify({ to: to[i], messages: messages }),
      muteHttpExceptions: true
    });
    if (res.getResponseCode() === 200) ok++;
    else fail.push(to[i].slice(0, 6) + "…（" + res.getResponseCode() + "）：" + res.getContentText().slice(0, 120));
  }
  if (!fail.length) return { success: true, message: "已發送給 " + ok + " 位" };
  return { success: false, message: "成功 " + ok + " 位，失敗 " + fail.length + " 位：" + fail.join("；") };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
