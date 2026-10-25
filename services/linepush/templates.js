// LINE推播：圖卡模版資料（分類、預設圖片、26 款模版）。從 Apps Script 版「推播服務」搬過來，內容不變。
export const categories = [
  { id: "all", name: "全部" },
  { id: "general", name: "一般" },
  { id: "media", name: "圖文推播" },
  { id: "biz", name: "商務通知" },
  { id: "travel", name: "旅遊活動" },
  { id: "member", name: "會員服務" }
];

export const DEFAULT_IMG = "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=500";
export const BARCODE_IMG = "https://bwipjs-api.metafloor.com/?bcid=code128&text=8891-0023-4411&scale=3&rotate=N&inclusioncheck";
export const MAP_FIXED_IMG = "https://lh3.googleusercontent.com/pw/AP1GczM3xsink42ieZbLfMAnk1p6bthb5IRN6fKCHc7kzM8fbHqipbtNjpSPRNmWXSjlBUuc7x-2Z7B-buAacwAVO8z40xXY-CMBObNDW3MydWIMggIeN4Z71r305vOwW27uz7_P1mt1EDZ7K1dBIEW-lBiR=w911-h911-s-no-gm?authuser=0";

export const templates = [
  { id: "textOnly", cat: "general", name: "1. 純文字對話框", tag: "純文字", title: "", subtitle: "", content: "牛牛是牛魔王。", button: "", buttonUrl: "", image: "", cardBg: "#ffffff", textColor: "#111111" },
  { id: "purePhoto", cat: "general", name: "2. 純照片傳送", tag: "單圖訊息", title: "", subtitle: "", content: "", button: "", buttonUrl: "", image: "https://lh3.googleusercontent.com/pw/AP1GczMoiKEz0IryYSPiyiBcLKbHQBZUAaC45P8eqy9qVg4RxHFrs_fYJpbRBWSuNTv_DZS_soY_kOVu4xoOiFJs3azI83dMIQsDkTIseZSFi-wEZO_JGh5S8P_FRyraHvdSC6Ag7Co9pufzn5sYp7PwFZts=w212-h212-s-no-gm?authuser=0", cardBg: "#ffffff", textColor: "#111111" },
  { id: "sticker", cat: "general", name: "3. 純貼圖互動", tag: "官方貼圖", title: "", subtitle: "", content: "", button: "", buttonUrl: "", image: "", packageId: "11537", stickerId: "52002734", cardBg: "#ffffff", textColor: "#111111" },
  { id: "smallCard", cat: "media", name: "4. 經典小圖卡", tag: "經典圖文", title: "夏日限定冰滴咖啡", subtitle: "嚴選衣索比亞單品豆", content: "經過 12 小時低溫慢速萃取，帶有豐富柑橘花香與清涼回甘口感。", button: "立即線上預訂", buttonUrl: "https://example.com/order", image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500", cardBg: "#ffffff", textColor: "#111111" },
  { id: "coverCard", cat: "media", name: "5. 滿版全圖卡", tag: "滿版視覺", title: "2026 跨年特輯演唱會", subtitle: "台北小巨蛋 12/31 搶先開賣", content: "", button: "搶購門票", buttonUrl: "https://example.com/tickets", image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500", cardBg: "#ffffff", textColor: "#ffffff" },
  { id: "itinerary", cat: "travel", name: "6. 時間軸路線卡", tag: "行程交通", title: "秋葉原 ➔ 新宿", subtitle: "預估乘車總時間：1 小時", content: "20:30｜秋葉原站 (步行 4 分鐘)\n20:34｜御茶之水站 (地下鐵 1 小時)\n20:40｜新宿站", button: "查看詳細地圖", buttonUrl: "https://maps.app.goo.gl/12vgQdM1XKWUJERR6", image: "", cardBg: "#ffffff", textColor: "#111111" },
  { id: "receipt", cat: "biz", name: "7. 消費對齊帳單卡", tag: "交易明細", title: "信義風格選品店", subtitle: "訂單單號：#RECEIPT-8892", content: "美式黑咖啡 (大杯)|$120\n法式焦糖可頌|$85\n手工藍莓派|$140", button: "查看電子發票", buttonUrl: "https://example.com/receipt", image: "", cardBg: "#ffffff", textColor: "#111111" },
  { id: "notice", cat: "biz", name: "8. 官方通知型訊息", tag: "系統通知", title: "LINE 訂單出貨通知", subtitle: "您的商品已交由物流公司配送", content: "配送單號：#TW202608189\n物流公司：黑貓宅急便\n預計送達：2026/08/20", button: "追蹤包裹狀態", buttonUrl: "https://example.com/track", image: "", cardBg: "#ffffff", textColor: "#111111" },
  { id: "booking", cat: "biz", name: "9. 約診門市預約卡", tag: "行程預約", title: "醫美診所約診提醒", subtitle: "請於預約時間前 10 分鐘報到", content: "預約項目：深度保濕修護療程\n預約時間：2026/08/25 (二) 14:30\n服務醫師：張醫師", button: "修改或取消預約", buttonUrl: "https://example.com/booking", image: "", cardBg: "#ffffff", textColor: "#111111" },
  { id: "calendar", cat: "travel", name: "10. 方塊日曆活動卡", tag: "活動日程", title: "線上UI設計分享會", subtitle: "19:30 - 21:00", content: "地點：Google Meet 線上會議室\n主講人：資深產品設計師", button: "加到行事曆", buttonUrl: "https://calendar.google.com", image: "", cardBg: "#ffffff", textColor: "#111111" },
  { id: "changelog", cat: "biz", name: "11. 版本更新紀錄卡", tag: "系統更新", tagText: "NEW RELEASE", title: "App v2.5.0 版本更新", subtitle: "感謝使用！本次更新包含以下改進：", content: "• 新增深色模式自動切換\n• 優化 Flex 訊息載入速度\n• 修復已知卡片邊框問題", button: "立即更新版本", buttonUrl: "https://example.com/update", image: "", cardBg: "#ffffff", textColor: "#111111" },
  { id: "coupon", cat: "member", name: "12. 實線優惠折價券", tag: "票券優惠", title: "夏季限時專屬優惠券", subtitle: "滿 $1,000 即可全額折抵", content: "折扣金額：$200 OFF\n優惠碼：SUMMER2026\n有效期限：2026/08/31 止", button: "領取折扣碼", buttonUrl: "https://example.com/coupon", image: "", cardBg: "#f0f9ff", textColor: "#111111" },
  { id: "memberCard", cat: "member", name: "13. VIP 尊榮電子會員卡", tag: "會員等級", title: "VIP 金卡會員", subtitle: "會員編號：#8893-2026", content: "當前累積點數：1,850 pt\n距離下一等級：尚差 150 pt", button: "出示會員條碼", buttonUrl: "https://example.com/member", image: "", cardBg: "#1e293b", textColor: "#ffffff" },
  { id: "multiBtn", cat: "biz", name: "14. 多功能導引選單卡", tag: "多重按鈕", title: "歡迎使用智慧助理", subtitle: "請點擊下方按鈕選擇需要的服務：", content: "專員服務時間：週一至週五 09:00 - 18:00", button: "查詢常見問題|聯繫真人客服|預約門市諮詢", buttonUrl: "https://example.com/faq|https://example.com/contact|https://example.com/booking", image: "", cardBg: "#ffffff", textColor: "#111111" },
  { id: "compare", cat: "media", name: "15. 方案對比比較卡", tag: "左右雙欄", title: "訂閱方案比較", subtitle: "選擇最適合您的升級計畫", content: "標準版: $290/月 (1080p)\n專業版: $490/月 (4K 畫質)", button: "選擇專業版方案", buttonUrl: "https://example.com/pricing", image: "", cardBg: "#ffffff", textColor: "#111111" },
  { id: "rating", cat: "biz", name: "16. 五星滿意度反饋卡", tag: "滿意度評價", title: "感謝您購買我們的商品！", subtitle: "您的回饋是我們前進的最大動力", stars: "5", content: "訂單編號：#ORD-99812\n商品名稱：極簡真無線藍芽耳機", button: "填寫星級評價", buttonUrl: "https://example.com/review", image: "", cardBg: "#ffffff", textColor: "#111111" },
  { id: "barcode", cat: "member", name: "17. 條碼門票核銷卡", tag: "電子門票", title: "設計展電子入場門票", subtitle: "入場請出示此核銷畫面", content: "驗證碼：8891-0023-4411\n入場狀態：尚未核銷 (單次有效)", button: "刷新動態條碼", buttonUrl: BARCODE_IMG, image: "", cardBg: "#ffffff", textColor: "#111111" },
  { id: "faq", cat: "biz", name: "18. 常見問題 QA 答疑卡", tag: "問答指南", title: "退換貨常見問題 Q&A", subtitle: "快速解答您的售後疑問", content: "Q: 收到商品不符怎麼辦？|A: 請於 7 日鑑賞期內提出退貨申請。\nQ: 運費如何計算？|A: 全館滿 $799 即享免運優惠。", button: "查看更多 FAQ", buttonUrl: "https://example.com/faq", image: "", cardBg: "#ffffff", textColor: "#111111" },
  { id: "stats", cat: "member", name: "19. 個人數據報告卡", tag: "數據統計", title: "2026 8 月學習週報", subtitle: "持續保持！本週學習表現極佳", content: "總學習時長: 18.5 小時\n完成課程數: 12 堂\n測驗平均分: 94 分\n連續達標: 14 天", button: "查看詳細分析報告", buttonUrl: "https://example.com/stats", image: "", cardBg: "#ffffff", textColor: "#111111" },
  { id: "countdown", cat: "biz", name: "20. 限時倒數搶購卡", tag: "倒數計時", title: "夏季黑色星期五特賣", subtitle: "全館商品 5 折起，把握最後機會", content: "距離活動結束尚有：", hours: "12", mins: "45", secs: "30", button: "立即搶購", buttonUrl: "https://example.com/sale", image: "", cardBg: "#ffffff", textColor: "#111111" },
  { id: "weather", cat: "general", name: "21. 天氣預報通知卡", tag: "天氣預報", title: "桃園市 今日天氣", subtitle: "體感溫度 29°C ｜ 濕度 65%", weatherIcon: "⛅", content: "☀️ 早上｜晴朗 28°C\n⛅ 下午｜多雲 31°C\n🌧️ 傍晚｜有雷陣雨機率 70%", button: "查看七日預報", buttonUrl: "https://weather.com", image: "", cardBg: "#ffffff", textColor: "#111111" },
  { id: "progressTracker", cat: "biz", name: "22. 物流進度追蹤卡", tag: "進度條", title: "包裹配送進度", subtitle: "配送單號：#TW202608189", progressPct: 65, content: "已抵達區域轉運中心", button: "查看完整物流紀錄", buttonUrl: "https://example.com/express", image: "", cardBg: "#ffffff", textColor: "#111111" },
  { id: "videoCard", cat: "media", name: "23. 影片縮圖播放卡", tag: "影片訊息", title: "開箱｜三分鐘搞懂重點功能", subtitle: "03:24", content: "", button: "立即觀看影片", buttonUrl: "https://youtube.com", image: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=500", cardBg: "#ffffff", textColor: "#111111" },
  { id: "mapLocation", cat: "travel", name: "24. 地圖位置導覽卡", tag: "地圖定位", title: "台北101", subtitle: "110臺北市信義區西村里信義路五段No. 7號", content: "營業時間：11:00 - 21:00（週一公休）\n距離您目前位置約 51.8 公里", button: "使用 Google 地圖開啟", buttonUrl: "https://maps.google.com", image: MAP_FIXED_IMG, cardBg: "#ffffff", textColor: "#111111" },
  { id: "birthday", cat: "member", name: "25. 生日祝福優惠卡", tag: "生日好禮", title: "生日快樂 🎉", subtitle: "感謝一路以來的支持與陪伴", content: "專屬生日好禮：消費滿額享 8 折優惠\n優惠期限：即日起至本月月底", button: "領取生日禮", buttonUrl: "https://example.com/birthday", image: "", cardBg: "#ffffff", textColor: "#1e293b" },
  { id: "poll", cat: "biz", name: "26. 投票意見調查卡", tag: "投票調查", title: "誰是王位之選?", subtitle: "累積 15 人已投票，投票將於明日截止", content: "牛牛|12\n虎虎|3\n皮卡|3\n蜜蜂|12", button: "參與投票", buttonUrl: "https://example.com/poll", image: "", cardBg: "#ffffff", textColor: "#111111" }
];
