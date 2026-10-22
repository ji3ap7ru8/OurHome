// 麥克風 / 語音辨識共用工具（大廳翻譯機、翻譯機頁面都用這裡）。
//   micSupported()      瀏覽器有沒有語音辨識
//   ensureMic()         開始辨識「之前」先確認權限；回傳 null = 可以開始，字串 = 要顯示給使用者的原因
//   micErrMsg(err)      語音辨識 / getUserMedia 的錯誤碼 → 白話說明；回傳 null = 可忽略（沒聲音、被中斷）
// 為什麼要先 ensureMic：電腦版瀏覽器（Chrome / Edge / Safari）若直接 start() 辨識，
// 權限被封鎖時常常只是「沒反應」；先主動要權限才看得到詢問視窗，也才抓得到明確的失敗原因。
export const SR_CLASS = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
export const micSupported = () => !!SR_CLASS;

const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
const isIOS = /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1);
const isAndroid = /Android/.test(ua);

const blockedMsg = () =>
  isIOS ? "麥克風被封鎖：請到「設定 > Safari > 麥克風」改為允許；並確認「設定 > 一般 > 鍵盤」已開啟「啟用聽寫」，再重新整理網頁"
  : isAndroid ? "麥克風被封鎖：請點網址列的鎖頭／設定圖示，把「麥克風」改為允許後重新整理"
  : "麥克風被封鎖：請點網址列左邊的鎖頭／設定圖示 → 網站設定 → 把「麥克風」改為允許，再重新整理網頁";

export function micErrMsg(err) {
  if (err === "not-allowed" || err === "service-not-allowed" || err === "NotAllowedError" || err === "SecurityError") return blockedMsg();
  if (err === "audio-capture" || err === "NotFoundError" || err === "OverconstrainedError") return "找不到麥克風：請確認裝置已接上，並在系統設定選為預設輸入裝置";
  if (err === "NotReadableError" || err === "AbortError") return "麥克風被其他程式佔用，請關閉後再試";
  if (err === "network") return "此瀏覽器的語音辨識服務無法連線（Brave、Firefox 等不支援），請改用 Chrome、Edge 或 Safari";
  if (err === "language-not-supported") return "此瀏覽器不支援這個語言的語音辨識";
  return null; // no-speech、aborted 等：不用打擾使用者
}

export async function ensureMic() {
  if (!SR_CLASS) return "此瀏覽器不支援語音辨識，請直接打字";
  if (typeof window !== "undefined" && window.isSecureContext === false) return "語音功能需要使用 https:// 開頭的網址才能使用麥克風";
  // iPhone / iPad：getUserMedia 與語音辨識是兩次獨立詢問，先問會讓使用者連按兩次，直接開始辨識即可
  if (isIOS) return null;
  // 已經被明確封鎖：getUserMedia 不會再跳視窗，直接告訴使用者怎麼解除
  try {
    const p = await navigator.permissions?.query({ name: "microphone" });
    if (p?.state === "denied") return blockedMsg();
  } catch { /* 不支援 Permissions API（Safari、舊瀏覽器）就往下走 */ }
  if (!navigator.mediaDevices?.getUserMedia) return null;
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    s.getTracks().forEach((t) => t.stop());
    return null;
  } catch (e) {
    if (e?.name === "NotAllowedError" || e?.name === "SecurityError") return "需要允許麥克風才能語音輸入：請在瀏覽器跳出的詢問視窗按「允許」；若沒看到視窗，" + blockedMsg().replace(/^麥克風被封鎖：/, "");
    return micErrMsg(e?.name) || "無法開啟麥克風，請確認已允許權限";
  }
}
