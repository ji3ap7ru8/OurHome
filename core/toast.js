// 全域小提示（取代各服務各自的 toast，雲端連線訊息會用到）。
export function showToast(msg, ms = 3200) {
  const t = document.createElement("div");
  t.className = "fixed top-6 left-1/2 -translate-x-1/2 z-[70] max-w-[90%] bg-slate-900 text-white font-bold text-sm px-5 py-3 rounded-full shadow-xl text-center";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}
