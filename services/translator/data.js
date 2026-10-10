// 翻譯機資料：語言清單、離線常用句、Google 翻譯存取層 translatorApi。
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

// 快捷輸入：來源為繁體中文時顯示；點一下即顯示內建譯文（不需網路）。
export const PHRASES = [
  { zh: "你好", en: "Hello", ja: "こんにちは", ko: "안녕하세요", vi: "Xin chào", th: "สวัสดี" },
  { zh: "謝謝", en: "Thank you", ja: "ありがとうございます", ko: "감사합니다", vi: "Cảm ơn", th: "ขอบคุณ" },
  { zh: "對不起", en: "Sorry", ja: "すみません", ko: "죄송합니다", vi: "Xin lỗi", th: "ขอโทษ" },
  { zh: "請問廁所在哪裡？", en: "Where is the restroom?", ja: "トイレはどこですか？", ko: "화장실이 어디예요?", vi: "Nhà vệ sinh ở đâu?", th: "ห้องน้ำอยู่ที่ไหน" },
  { zh: "這個多少錢？", en: "How much is this?", ja: "これはいくらですか？", ko: "이거 얼마예요?", vi: "Cái này giá bao nhiêu?", th: "อันนี้ราคาเท่าไหร่" },
  { zh: "可以刷卡嗎？", en: "Can I pay by card?", ja: "カードは使えますか？", ko: "카드 되나요?", vi: "Có thể thanh toán bằng thẻ không?", th: "จ่ายด้วยบัตรได้ไหม" },
  { zh: "我聽不懂", en: "I don't understand.", ja: "わかりません。", ko: "이해하지 못해요.", vi: "Tôi không hiểu.", th: "ฉันไม่เข้าใจ" },
  { zh: "可以說慢一點嗎？", en: "Could you speak more slowly?", ja: "もう少しゆっくり話してください。", ko: "천천히 말씀해 주세요.", vi: "Bạn có thể nói chậm hơn không?", th: "พูดช้า ๆ หน่อยได้ไหม" },
  { zh: "請幫幫我", en: "Please help me.", ja: "助けてください。", ko: "도와주세요.", vi: "Xin hãy giúp tôi.", th: "ช่วยฉันด้วย" },
  { zh: "我需要去醫院", en: "I need to go to the hospital.", ja: "病院に行きたいです。", ko: "병원에 가야 해요.", vi: "Tôi cần đến bệnh viện.", th: "ฉันต้องไปโรงพยาบาล" },
];

export const phraseFor = (p, toCode) => p[toCode] || null;

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
