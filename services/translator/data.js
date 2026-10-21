// 翻譯機資料：語言清單、Google 翻譯存取層 translatorApi。
// Stage 5（或之後）若改用官方 Cloud Translation API，只需替換 translatorApi.translate()，UI 不用改。

export const LANGS = [
  { code: "zh-TW", name: "繁體中文", speech: "zh-TW" },
  { code: "en", name: "英文", speech: "en-US" },
  { code: "ja", name: "日文", speech: "ja-JP" },
  { code: "ko", name: "韓文", speech: "ko-KR" },
  { code: "vi", name: "越南文", speech: "vi-VN" },
  { code: "th", name: "泰文", speech: "th-TH" },
  { code: "id", name: "印尼文", speech: "id-ID" },
  { code: "zh-CN", name: "簡體中文", speech: "zh-CN" },
];
export const AUTO = { code: "auto", name: "自動偵測", speech: "" };

export const langOf = (code) => (code === "auto" ? AUTO : LANGS.find((l) => l.code === code) || LANGS[0]);

export const googleUrl = (from, to, text) =>
  `https://translate.google.com/?sl=${encodeURIComponent(from)}&tl=${encodeURIComponent(to)}&text=${encodeURIComponent(text)}&op=translate`;

export const MAX_CHARS = 500;

export const translatorApi = {
  // 使用 Google 翻譯的公開網頁端點（無需金鑰，非官方保證）。失敗時由 UI 引導改開 Google 翻譯頁面。
  async translate(text, from, to, { signal } = {}) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=${encodeURIComponent(from)}&tl=${encodeURIComponent(to)}&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const out = (data?.[0] || []).map((seg) => seg?.[0] || "").join("");
    if (!out) throw new Error("empty");
    return { text: out, detected: data?.[2] || null };
  },
};
