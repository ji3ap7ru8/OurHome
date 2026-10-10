// 解析使用者貼上的 firebaseConfig（支援 JSON，或 Firebase 主控台那種 JS 物件寫法，連 const firebaseConfig = {...}; 一起貼也行）。
const KEYS = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId", "measurementId"];
const REQUIRED = ["apiKey", "projectId", "appId"];

export function parseFirebaseConfig(text) {
  const raw = String(text || "").trim();
  if (!raw) return { empty: true };
  const a = raw.indexOf("{"), b = raw.lastIndexOf("}");
  if (a < 0 || b <= a) return { error: "找不到 { } 包住的設定內容，請整段貼上 firebaseConfig" };
  const body = raw.slice(a, b + 1);
  let obj;
  try {
    obj = JSON.parse(body);
  } catch {
    try {
      const fixed = body
        .replace(/\/\/[^\n]*/g, "")
        .replace(/'/g, '"')
        .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
        .replace(/,\s*}/g, "}");
      obj = JSON.parse(fixed);
    } catch {
      return { error: "格式無法解析，請直接複製 Firebase 主控台的 firebaseConfig" };
    }
  }
  const config = {};
  for (const k of KEYS) if (typeof obj[k] === "string" && obj[k].trim()) config[k] = obj[k].trim();
  const missing = REQUIRED.filter((k) => !config[k]);
  if (missing.length) return { error: `缺少必要欄位：${missing.join("、")}` };
  return { config };
}

export const configToText = (c) => (c ? JSON.stringify(c) : "");
