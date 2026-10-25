// LINE推播：把表單內容轉成 LINE Flex Message（實際送出的訊息格式）。
import { DEFAULT_IMG, BARCODE_IMG, MAP_FIXED_IMG } from "./templates.js";
import { getStarString } from "./render.js";

export function generateFlexPayload(data, primary, btnTextClr, cardBgClr, textClr, author) {
  const isExcluded = ["textOnly", "purePhoto", "sticker"].includes(data.id);
  const authorText = (author && !isExcluded) ? `✍️ 製作：${author}` : '';

  let bubble = {
    type: "bubble",
    size: "mega",
    styles: { body: { backgroundColor: cardBgClr || "#ffffff" } }
  };

  if (data.id === "smallCard") {
    if (data.image) {
      bubble.hero = {
        type: "image",
        url: data.image,
        size: "full",
        aspectRatio: "20:13",
        aspectMode: "cover"
      };
    }
    let bodyContents = [];
    if (data.title) {
      bodyContents.push({ type: "text", text: data.title, weight: "bold", size: "xl", color: textClr, wrap: true });
    }
    if (data.subtitle) {
      bodyContents.push({ type: "text", text: data.subtitle, size: "lg", color: "#888888", wrap: true, margin: "xs" });
    }
    if (data.content) {
      bodyContents.push({ type: "text", text: data.content, size: "md", color: textClr, wrap: true, margin: "md" });
    }
    if (authorText) {
      bodyContents.push({ type: "text", text: authorText, size: "md", color: "#888888", align: "end", margin: "md" });
    }
    bubble.body = { type: "box", layout: "vertical", contents: bodyContents };

  } else if (data.id === "itinerary") {
    bubble.header = {
      type: "box",
      layout: "vertical",
      backgroundColor: primary,
      paddingAll: "16px",
      alignItems: "center",
      contents: [
        { type: "text", text: data.title || "路線行程", color: btnTextClr || "#ffffff", size: "xl", weight: "bold", align: "center", wrap: true }
      ]
    };

    let timelineContents = [];
    if (data.subtitle) {
      timelineContents.push({ type: "text", text: data.subtitle, color: "#888888", size: "lg", wrap: true });
    }

    const steps = (data.content || "").split("\n").filter(Boolean);
    steps.forEach((step, idx) => {
      const parts = step.split("｜");
      const time = (parts[0] || "").trim();
      const desc = (parts[1] || "").trim();

      let nodeBox = {
        type: "box",
        layout: "horizontal",
        spacing: "md",
        margin: idx === 0 && !data.subtitle ? "none" : "md",
        alignItems: "center",
        contents: [
          {
            type: "box",
            layout: "vertical",
            width: "12px",
            height: "12px",
            cornerRadius: "30px",
            borderColor: primary,
            borderWidth: "2px",
            flex: 0,
            contents: []
          },
          { type: "text", text: time, size: "md", weight: "bold", color: textClr, flex: 0 },
          { type: "text", text: desc, size: "md", color: textClr, wrap: true, flex: 1 }
        ]
      };
      timelineContents.push(nodeBox);
    });

    if (authorText) {
      timelineContents.push({ type: "text", text: authorText, size: "md", color: "#888888", align: "end", margin: "md" });
    }
    bubble.body = { type: "box", layout: "vertical", paddingAll: "20px", contents: timelineContents };

  } else if (data.id === "changelog") {
    let changeLogBody = [];
    if (data.tagText) {
      changeLogBody.push({
        type: "box",
        layout: "horizontal",
        contents: [
          {
            type: "box",
            layout: "vertical",
            backgroundColor: primary,
            cornerRadius: "8px",
            paddingTop: "2px",
            paddingBottom: "2px",
            paddingStart: "8px",
            paddingEnd: "8px",
            flex: 0,
            contents: [
              { type: "text", text: data.tagText, color: btnTextClr, size: "md", weight: "bold", align: "center" }
            ]
          }
        ]
      });
    }
    if (data.title) {
      changeLogBody.push({ type: "text", text: data.title, weight: "bold", size: "xl", color: textClr, margin: "md" });
    }
    if (data.subtitle) {
      changeLogBody.push({ type: "text", text: data.subtitle, size: "lg", color: "#888888", wrap: true, margin: "xs" });
    }
    if (data.content) {
      changeLogBody.push({ type: "text", text: data.content, size: "md", color: textClr, wrap: true, margin: "md" });
    }
    if (authorText) {
      changeLogBody.push({ type: "text", text: authorText, size: "md", color: "#888888", align: "end", margin: "md" });
    }
    bubble.body = { type: "box", layout: "vertical", contents: changeLogBody };

  } else if (data.id === "coupon") {
    bubble.styles = { body: { backgroundColor: cardBgClr || "#f0f9ff" } };
    let couponContents = [];
    if (data.title) couponContents.push({ type: "text", text: data.title, size: "xl", color: "#888888", align: "center", wrap: true });
    if (data.subtitle) couponContents.push({ type: "text", text: data.subtitle, size: "lg", weight: "bold", color: primary, align: "center", margin: "md", wrap: true });
    if (data.content) couponContents.push({ type: "text", text: data.content, size: "md", color: textClr, align: "center", margin: "md", wrap: true });
    if (authorText) couponContents.push({ type: "text", text: authorText, size: "md", color: "#888888", align: "end", margin: "md" });

    let innerBox = {
      type: "box",
      layout: "vertical",
      borderWidth: "medium",
      borderColor: primary,
      cornerRadius: "12px",
      paddingAll: "16px",
      contents: couponContents
    };
    bubble.body = { type: "box", layout: "vertical", paddingAll: "12px", contents: [innerBox] };

  } else if (data.id === "receipt") {
    let receiptBody = [
      { type: "text", text: "RECEIPT / 帳單", color: primary, size: "md", weight: "bold" },
      { type: "text", text: data.title || "", weight: "bold", size: "xl", color: textClr, margin: "md" },
      { type: "text", text: data.subtitle || "", size: "lg", color: "#888888" },
      { type: "separator", margin: "md" }
    ];

    const itemRows = (data.content || "").split("\n");
    itemRows.forEach(line => {
      const parts = line.split("|");
      if (parts.length >= 2) {
        receiptBody.push({
          type: "box",
          layout: "horizontal",
          margin: "md",
          contents: [
            { type: "text", text: parts[0], size: "md", color: textClr, flex: 4, wrap: true },
            { type: "text", text: parts[1], size: "md", color: textClr, align: "end", weight: "bold", flex: 2 }
          ]
        });
      }
    });

    if (authorText) receiptBody.push({ type: "text", text: authorText, size: "md", color: "#888888", align: "end", margin: "xl" });
    bubble.body = { type: "box", layout: "vertical", contents: receiptBody };

  } else if (data.id === "notice" || data.id === "booking") {
    bubble.header = {
      type: "box",
      layout: "vertical",
      backgroundColor: primary,
      paddingAll: "16px",
      contents: [{ type: "text", text: data.title || "通知", color: btnTextClr || "#ffffff", size: "xl", weight: "bold", align: "center" }]
    };
    
    let innerContents = [];
    if (data.subtitle) {
      innerContents.push({ type: "text", text: data.subtitle, size: "lg", color: "#666666", margin: "md", wrap: true });
    }
    
    let infoBox = {
      type: "box",
      layout: "vertical",
      backgroundColor: "#f4f4f4",
      paddingAll: "14px",
      cornerRadius: "8px",
      margin: "md",
      contents: (data.content || "").split("\n").map(l => ({
        type: "text", text: l, size: "md", color: textClr, wrap: true, margin: "xs"
      }))
    };
    innerContents.push(infoBox);
    
    if (authorText) innerContents.push({ type: "text", text: authorText, size: "md", color: "#888888", align: "end", margin: "lg" });
    bubble.body = { type: "box", layout: "vertical", paddingAll: "20px", contents: innerContents };

  } else if (data.id === "calendar") {
    let headerRow = {
      type: "box",
      layout: "horizontal",
      spacing: "lg",
      contents: [
        {
          type: "box",
          layout: "vertical",
          backgroundColor: primary,
          width: "60px",
          height: "60px",
          cornerRadius: "8px",
          justifyContent: "center",
          alignItems: "center",
          contents: [
            { type: "text", text: "AUG", color: "#ffffffcc", size: "md", weight: "bold" },
            { type: "text", text: "28", color: "#ffffff", size: "md", weight: "bold" }
          ]
        },
        {
          type: "box",
          layout: "vertical",
          flex: 1,
          contents: [
            { type: "text", text: data.title || "", weight: "bold", size: "xl", color: textClr, wrap: true },
            { type: "text", text: data.subtitle || "", size: "lg", color: "#888888", wrap: true }
          ]
        }
      ]
    };

    let calBody = [
      headerRow,
      { type: "text", text: data.content || "", size: "md", color: textClr, wrap: true, margin: "xl" }
    ];

    if (authorText) calBody.push({ type: "text", text: authorText, size: "md", color: "#888888", align: "end", margin: "md" });
    bubble.body = { type: "box", layout: "vertical", paddingAll: "20px", contents: calBody };

  } else if (data.id === "coverCard") {
    let coverOverlayContents = [
      { type: "text", text: data.title || "", weight: "bold", size: "xl", color: "#ffffff", wrap: true },
      { type: "text", text: data.subtitle || "", size: "lg", color: "#cccccc", wrap: true, margin: "xs" }
    ];
    if (data.button) {
      const coverBtns = data.button.split('|');
      const coverUrls = (data.buttonUrl || '').split('|');
      const coverUrl = coverUrls[0] || '#';
      coverOverlayContents.push({
        type: "button",
        style: "primary",
        color: primary,
        height: "sm",
        margin: "md",
        action: {
          type: "uri",
          label: coverBtns[0].substring(0, 20),
          uri: coverUrl.startsWith("http") ? coverUrl : "https://" + coverUrl
        }
      });
    }
    bubble.body = {
      type: "box",
      layout: "vertical",
      paddingAll: "0px",
      contents: [
        { type: "image", url: data.image || DEFAULT_IMG, size: "full", aspectMode: "cover", aspectRatio: "20:13", gravity: "center" },
        {
          type: "box",
          layout: "vertical",
          position: "absolute",
          offsetBottom: "0px", offsetStart: "0px", offsetEnd: "0px",
          backgroundColor: "#000000aa",
          paddingAll: "16px",
          contents: coverOverlayContents
        }
      ]
    };

  } else if (data.id === "compare") {
    let compareBody = [];
    if (data.title) compareBody.push({ type: "text", text: data.title, weight: "bold", size: "xl", color: textClr, align: "center", wrap: true });
    if (data.subtitle) compareBody.push({ type: "text", text: data.subtitle, size: "lg", color: "#888888", align: "center", wrap: true, margin: "xs" });

    const lines = (data.content || "").split("\n").filter(Boolean);
    let columns = [];
    if (lines.length > 0) {
      columns = lines.map(line => ({
        type: "box",
        layout: "vertical",
        backgroundColor: "#f8fafc",
        borderColor: primary,
        borderWidth: "1px",
        cornerRadius: "8px",
        paddingAll: "10px",
        flex: 1,
        contents: [
          { type: "text", text: line, size: "md", color: textClr, align: "center", weight: "bold", wrap: true }
        ]
      }));
    } else {
      columns = [
        {
          type: "box",
          layout: "vertical",
          backgroundColor: "#f4f4f4",
          cornerRadius: "8px",
          paddingAll: "10px",
          flex: 1,
          contents: [{ type: "text", text: "標準版", size: "md", color: textClr, align: "center", weight: "bold" }]
        },
        {
          type: "box",
          layout: "vertical",
          backgroundColor: "#f4f4f4",
          borderColor: primary,
          borderWidth: "1px",
          cornerRadius: "8px",
          paddingAll: "10px",
          flex: 1,
          contents: [{ type: "text", text: "專業版", size: "md", color: primary, align: "center", weight: "bold" }]
        }
      ];
    }

    compareBody.push({
      type: "box",
      layout: "horizontal",
      spacing: "md",
      margin: "md",
      contents: columns
    });

    if (authorText) compareBody.push({ type: "text", text: authorText, size: "md", color: "#888888", align: "end", margin: "md" });
    bubble.body = { type: "box", layout: "vertical", paddingAll: "20px", contents: compareBody };

  } else if (data.id === "rating") {
    let ratingBody = [];
    if (data.title) ratingBody.push({ type: "text", text: data.title, weight: "bold", size: "xl", color: textClr, align: "center", wrap: true });
    if (data.subtitle) ratingBody.push({ type: "text", text: data.subtitle, size: "lg", color: "#888888", align: "center", wrap: true, margin: "xs" });
    const starsStr = getStarString(data.stars || 5);
    ratingBody.push({ type: "text", text: starsStr, size: "3xl", color: "#f59e0b", align: "center", margin: "md" });
    if (data.content) ratingBody.push({
      type: "box",
      layout: "vertical",
      backgroundColor: "#00000010",
      cornerRadius: "6px",
      paddingAll: "10px",
      margin: "md",
      contents: [{ type: "text", text: data.content, size: "md", color: textClr, align: "center", wrap: true }]
    });
    if (authorText) ratingBody.push({ type: "text", text: authorText, size: "md", color: "#888888", align: "end", margin: "md" });
    bubble.body = { type: "box", layout: "vertical", paddingAll: "20px", contents: ratingBody };

  } else if (data.id === "memberCard") {
    bubble.styles = { body: { backgroundColor: cardBgClr || "#1e293b" } };
    let memberBody = [
      {
        type: "box",
        layout: "horizontal",
        contents: [
          { type: "text", text: data.title || "VIP 會員", weight: "bold", size: "xl", color: primary, flex: 1 },
          { type: "text", text: "MEMBER", size: "md", color: "#ffffff", align: "end" }
        ]
      },
      { type: "text", text: data.subtitle || "", size: "lg", color: "#aaaaaa", margin: "xs" },
      { type: "text", text: data.content || "", size: "md", weight: "bold", color: primary, margin: "lg", wrap: true }
    ];
    if (authorText) memberBody.push({ type: "text", text: authorText, size: "md", color: "#888888", align: "end", margin: "md" });
    bubble.body = { type: "box", layout: "vertical", paddingAll: "20px", contents: memberBody };

  } else if (data.id === "multiBtn") {
    let multiBody = [];
    if (data.title) multiBody.push({ type: "text", text: data.title, weight: "bold", size: "xl", color: textClr, wrap: true });
    if (data.subtitle) multiBody.push({ type: "text", text: data.subtitle, size: "lg", color: "#888888", wrap: true, margin: "xs" });
    if (data.content) multiBody.push({ type: "text", text: data.content, size: "md", color: textClr, wrap: true, margin: "md" });
    if (authorText) multiBody.push({ type: "text", text: authorText, size: "md", color: "#888888", align: "end", margin: "md" });
    bubble.body = { type: "box", layout: "vertical", paddingAll: "20px", contents: multiBody };

  } else if (data.id === "barcode") {
    const barcodeImgSrc = (data.buttonUrl && data.buttonUrl.trim() !== '') ? data.buttonUrl.trim() : BARCODE_IMG;
    let barcodeBody = [];
    if (data.title) barcodeBody.push({ type: "text", text: data.title, weight: "bold", size: "xl", color: textClr, align: "center", wrap: true });
    if (data.subtitle) barcodeBody.push({ type: "text", text: data.subtitle, size: "lg", color: "#888888", align: "center", wrap: true, margin: "xs" });
    barcodeBody.push({
      type: "box",
      layout: "vertical",
      margin: "md",
      paddingAll: "10px",
      backgroundColor: "#f8fafc",
      cornerRadius: "8px",
      alignItems: "center",
      contents: [
        { type: "image", url: barcodeImgSrc, size: "full", aspectRatio: "4:1", aspectMode: "fit" },
        { type: "text", text: data.content || "", size: "md", color: "#666666", align: "center", margin: "sm", wrap: true }
      ]
    });
    if (authorText) barcodeBody.push({ type: "text", text: authorText, size: "md", color: "#888888", align: "end", margin: "md" });
    bubble.body = { type: "box", layout: "vertical", paddingAll: "20px", contents: barcodeBody };

  } else if (data.id === "faq") {
    let faqBody = [];
    if (data.title) faqBody.push({ type: "text", text: data.title, weight: "bold", size: "xl", color: textClr, wrap: true });
    if (data.subtitle) faqBody.push({ type: "text", text: data.subtitle, size: "lg", color: "#888888", wrap: true, margin: "xs" });

    const qas = (data.content || "").split("\n");
    qas.forEach(pair => {
      const [q, a] = pair.split("|");
      faqBody.push({
        type: "box",
        layout: "vertical",
        margin: "md",
        paddingAll: "10px",
        backgroundColor: "#f8fafc",
        cornerRadius: "8px",
        contents: [
          { type: "text", text: q || "", weight: "bold", size: "md", color: primary, wrap: true },
          { type: "text", text: a || "", size: "md", color: textClr, wrap: true, margin: "xs" }
        ]
      });
    });
    if (authorText) faqBody.push({ type: "text", text: authorText, size: "md", color: "#888888", align: "end", margin: "md" });
    bubble.body = { type: "box", layout: "vertical", paddingAll: "20px", contents: faqBody };

  } else if (data.id === "stats") {
    let statsBody = [];
    if (data.title) statsBody.push({ type: "text", text: data.title, weight: "bold", size: "xl", color: textClr, wrap: true });
    if (data.subtitle) statsBody.push({ type: "text", text: data.subtitle, size: "lg", color: "#888888", wrap: true, margin: "xs" });

    const lines = (data.content || "").split("\n").filter(Boolean);
    let gridBoxes = [];
    lines.forEach(line => {
      let label = line;
      let val = '';
      if (line.includes(':')) {
        const parts = line.split(':');
        label = parts[0].trim();
        val = parts.slice(1).join(':').trim();
      } else if (line.includes('：')) {
        const parts = line.split('：');
        label = parts[0].trim();
        val = parts.slice(1).join('：').trim();
      } else if (line.includes('|')) {
        const parts = line.split('|');
        label = parts[0].trim();
        val = parts.slice(1).join('|').trim();
      }

      gridBoxes.push({
        type: "box",
        layout: "vertical",
        backgroundColor: "#f8fafc",
        cornerRadius: "8px",
        paddingAll: "10px",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        contents: [
          { type: "text", text: label, size: "md", color: "#666666", align: "center", wrap: true },
          { type: "text", text: val, size: "md", weight: "bold", color: primary, align: "center", wrap: true, margin: "xs" }
        ]
      });
    });

    let rows = [];
    for (let i = 0; i < gridBoxes.length; i += 2) {
      let rowContents = [gridBoxes[i]];
      if (i + 1 < gridBoxes.length) {
        rowContents.push(gridBoxes[i + 1]);
      } else {
        rowContents.push({ type: "box", layout: "vertical", flex: 1, contents: [] });
      }
      rows.push({
        type: "box",
        layout: "horizontal",
        spacing: "md",
        margin: i === 0 ? "md" : "sm",
        contents: rowContents
      });
    }

    statsBody.push(...rows);
    if (authorText) statsBody.push({ type: "text", text: authorText, size: "md", color: "#888888", align: "end", margin: "md" });
    bubble.body = { type: "box", layout: "vertical", paddingAll: "20px", contents: statsBody };

  } else if (data.id === "countdown") {
    bubble.header = {
      type: "box",
      layout: "vertical",
      backgroundColor: primary,
      paddingAll: "16px",
      contents: [{ type: "text", text: data.title || "限時倒數", color: btnTextClr || "#ffffff", size: "xl", weight: "bold", align: "center" }]
    };
    let cdBody = [];
    if (data.subtitle) cdBody.push({ type: "text", text: data.subtitle, size: "lg", color: "#888888", align: "center", wrap: true });
    if (data.content) cdBody.push({ type: "text", text: data.content, size: "md", color: textClr, align: "center", wrap: true, margin: "xs" });

    const hrs = data.hours || "12";
    const mins = data.mins || "45";
    const secs = data.secs || "30";

    cdBody.push({
      type: "box",
      layout: "horizontal",
      justifyContent: "center",
      alignItems: "center",
      margin: "md",
      spacing: "xs",
      contents: [
        { type: "box", layout: "vertical", flex: 0, backgroundColor: "#111827", cornerRadius: "6px", paddingAll: "6px", width: "52px", alignItems: "center", spacing: "2px", contents: [{ type: "text", text: hrs, color: "#ffffff", weight: "bold", size: "xl", align: "center" }, { type: "text", text: "時", color: "#ffffffaa", size: "xxs", align: "center" }] },
        { type: "text", text: ":", color: "#888888", weight: "bold", flex: 0 },
        { type: "box", layout: "vertical", flex: 0, backgroundColor: "#111827", cornerRadius: "6px", paddingAll: "6px", width: "52px", alignItems: "center", spacing: "2px", contents: [{ type: "text", text: mins, color: "#ffffff", weight: "bold", size: "xl", align: "center" }, { type: "text", text: "分", color: "#ffffffaa", size: "xxs", align: "center" }] },
        { type: "text", text: ":", color: "#888888", weight: "bold", flex: 0 },
        { type: "box", layout: "vertical", flex: 0, backgroundColor: primary, cornerRadius: "6px", paddingAll: "6px", width: "52px", alignItems: "center", spacing: "2px", contents: [{ type: "text", text: secs, color: btnTextClr, weight: "bold", size: "xl", align: "center" }, { type: "text", text: "秒", color: btnTextClr, size: "xxs", align: "center" }] }
      ]
    });
    if (authorText) cdBody.push({ type: "text", text: authorText, size: "md", color: "#888888", align: "end", margin: "md" });
    bubble.body = { type: "box", layout: "vertical", paddingAll: "20px", contents: cdBody };

  } else if (data.id === "weather") {
    let wBody = [];
    if (data.title) wBody.push({ type: "text", text: data.title, weight: "bold", size: "xl", color: textClr, wrap: true });
    if (data.subtitle) wBody.push({ type: "text", text: data.subtitle, size: "lg", color: "#888888", wrap: true, margin: "xs" });
    wBody.push({ type: "text", text: data.weatherIcon || "⛅", size: "5xl", align: "center", margin: "md" });

    const wLines = (data.content || "").split("\n");
    wLines.forEach(l => {
      wBody.push({
        type: "box",
        layout: "vertical",
        backgroundColor: "#f8fafc",
        cornerRadius: "6px",
        paddingAll: "8px",
        margin: "xs",
        contents: [{ type: "text", text: l, size: "md", color: textClr, wrap: true }]
      });
    });
    if (authorText) wBody.push({ type: "text", text: authorText, size: "md", color: "#888888", align: "end", margin: "md" });
    bubble.body = { type: "box", layout: "vertical", paddingAll: "20px", contents: wBody };

  } else if (data.id === "progressTracker") {
    const pct = Math.max(0, Math.min(100, parseInt(data.progressPct, 10) || 0));
    let pBody = [];
    if (data.title) pBody.push({ type: "text", text: data.title, weight: "bold", size: "xl", color: textClr, wrap: true });
    if (data.subtitle) pBody.push({ type: "text", text: data.subtitle, size: "lg", color: "#888888", wrap: true, margin: "xs" });
    pBody.push({
      type: "box",
      layout: "vertical",
      backgroundColor: "#e2e8f0",
      cornerRadius: "10px",
      height: "8px",
      margin: "md",
      contents: [
        { type: "box", layout: "vertical", backgroundColor: primary, cornerRadius: "10px", width: `${pct}%`, height: "8px", contents: [] }
      ]
    });
    pBody.push({ type: "text", text: `${pct}% ${data.content || ''}`, size: "md", weight: "bold", color: primary, align: "end", margin: "xs" });
    if (authorText) pBody.push({ type: "text", text: authorText, size: "md", color: "#888888", align: "end", margin: "md" });
    bubble.body = { type: "box", layout: "vertical", paddingAll: "20px", contents: pBody };

  } else if (data.id === "videoCard") {
    bubble.hero = {
      type: "image",
      url: data.image || DEFAULT_IMG,
      size: "full",
      aspectRatio: "20:13",
      aspectMode: "cover"
    };
    let vBody = [];
    if (data.title) vBody.push({ type: "text", text: data.title, weight: "bold", size: "xl", color: textClr, wrap: true });
    if (authorText) vBody.push({ type: "text", text: authorText, size: "md", color: "#888888", align: "end", margin: "md" });
    bubble.body = { type: "box", layout: "vertical", paddingAll: "16px", contents: vBody };

  } else if (data.id === "mapLocation") {
    const mapImg = MAP_FIXED_IMG;
    bubble.hero = {
      type: "image",
      url: mapImg,
      size: "full",
      aspectRatio: "20:10",
      aspectMode: "fit",
      backgroundColor: "#f1f5f9"
    };
    let mapBody = [];
    if (data.title) mapBody.push({ type: "text", text: data.title, weight: "bold", size: "xl", color: textClr, wrap: true });
    if (data.subtitle) mapBody.push({ type: "text", text: data.subtitle, size: "lg", color: "#888888", wrap: true, margin: "xs" });
    if (data.content) mapBody.push({ type: "text", text: data.content, size: "md", color: textClr, wrap: true, margin: "md" });
    if (authorText) mapBody.push({ type: "text", text: authorText, size: "md", color: "#888888", align: "end", margin: "md" });
    bubble.body = { type: "box", layout: "vertical", paddingAll: "20px", contents: mapBody };

  } else if (data.id === "birthday") {
    let bBody = [
      { type: "text", text: "🎂", size: "5xl", align: "center" },
      { type: "text", text: data.title || "生日快樂", weight: "bold", size: "xl", color: textClr, align: "center", margin: "md" },
      { type: "text", text: data.subtitle || "", size: "lg", color: "#666666", align: "center", wrap: true, margin: "xs" },
      { type: "text", text: data.content || "", size: "md", color: textClr, align: "center", wrap: true, margin: "md" }
    ];
    if (authorText) bBody.push({ type: "text", text: authorText, size: "md", color: "#888888", align: "end", margin: "md" });
    bubble.body = { type: "box", layout: "vertical", paddingAll: "20px", contents: bBody };

  } else if (data.id === "poll") {
    let pollBody = [];
    if (data.title) pollBody.push({ type: "text", text: data.title, weight: "bold", size: "xl", color: textClr, wrap: true });
    if (data.subtitle) pollBody.push({ type: "text", text: data.subtitle, size: "lg", color: "#888888", wrap: true, margin: "xs" });

    const lines = (data.content || "").split("\n").filter(Boolean);
    lines.forEach(line => {
      const [label, valRaw] = line.split("|");
      const val = Math.max(0, Math.min(100, parseInt(valRaw, 10) || 0));
      pollBody.push({
        type: "box",
        layout: "vertical",
        margin: "md",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: label || "", size: "md", color: textClr, flex: 1, wrap: true },
              { type: "text", text: `${val}%`, size: "md", weight: "bold", color: primary, align: "end" }
            ]
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#e2e8f0",
            cornerRadius: "6px",
            height: "6px",
            margin: "xs",
            contents: [
              { type: "box", layout: "vertical", backgroundColor: primary, cornerRadius: "6px", width: `${val}%`, height: "6px", contents: [] }
            ]
          }
        ]
      });
    });
    if (authorText) pollBody.push({ type: "text", text: authorText, size: "md", color: "#888888", align: "end", margin: "md" });
    bubble.body = { type: "box", layout: "vertical", paddingAll: "20px", contents: pollBody };
  }

  if (data.button && data.id !== "coverCard") {
    const btns = data.button.split('|');
    const urls = (data.buttonUrl || '').split('|');
    let footerContents = [];

    btns.forEach((btnTxt, idx) => {
      const targetUrl = urls[idx] || urls[0] || '#';
      const btnStyle = (idx === 0) ? "primary" : "secondary";
      const btnBg = (idx === 0) ? primary : "#f1f5f9";

      footerContents.push({
        type: "button",
        style: btnStyle,
        color: btnBg,
        height: "sm",
        margin: idx === 0 ? "none" : "xs",
        action: {
          type: "uri",
          label: btnTxt.substring(0, 20),
          uri: targetUrl.startsWith("http") ? targetUrl : "https://" + targetUrl
        }
      });
    });

    bubble.footer = {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: footerContents
    };
  }

  return { type: "flex", altText: data.title || "訊息通知", contents: bubble };
}
