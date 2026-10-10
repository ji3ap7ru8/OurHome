// 我的筆記 / 記帳本頁面上方的提示文字：依「設定 → 資料管理 → 儲存位置」目前的選擇顯示。
export function storageNote(mode, guest, noun) {
  if (mode === "google") return `${noun}會自動儲存到你的 Google 雲端硬碟。`;
  if (mode === "private") return `${noun}會自動儲存到你的 Firebase 私人端。`;
  return `${guest ? "訪客體驗模式：" : "目前儲存位置為「不保存」："}${noun}只暫存在這個畫面，關閉或重新整理網頁就會清除。可到「設定 → 資料管理 → 儲存位置」改存 Google 雲端或 Firebase 私人端。`;
}
