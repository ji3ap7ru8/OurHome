// LINE推播：圖卡預覽（把模版資料畫成 HTML，樣式在 assets/css/linepush.css）。
import { DEFAULT_IMG, BARCODE_IMG, MAP_FIXED_IMG } from "./templates.js";

export function getStarString(count) {
  const num = parseInt(count, 10) || 5;
  return "★".repeat(num) + "☆".repeat(5 - num);
}

export function renderTemplateHTML(data, primary, btnTextClr, cardBgClr, textClr) {
  const cardStyle = `background-color: ${cardBgClr || '#ffffff'}; color: ${textClr || '#111111'};`;
  const urls = (data.buttonUrl || '').split('|');
  const defaultUrl = urls[0] || '#';

  const authorEl = document.getElementById("authorSelect");
  const author = authorEl ? authorEl.value : "";
  const isExcluded = ["textOnly", "purePhoto", "sticker"].includes(data.id);
  const authorBadge = (author && !isExcluded) 
    ? `<div style="font-size: 11px; opacity: 0.75; text-align: right; margin-top: 8px; font-weight: bold;">✍️ 製作：${author}</div>` 
    : '';

  switch(data.id) {
    case "textOnly":
      return `<div class="line-chat-bubble" style="${cardStyle}">${data.content || '請輸入純文字內容...'}</div>`;

    case "purePhoto":
      const imgSrc = data.image || DEFAULT_IMG;
      return `<div class="line-pure-photo"><img src="${imgSrc}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${DEFAULT_IMG}';" alt="Photo"></div>`;

    case "sticker":
      const stkId = data.stickerId || '';
      return `<div class="line-sticker-box">${stkId ? `<img src="https://stickershop.line-scdn.net/stickershop/v1/sticker/${stkId}/android/sticker.png" alt="Sticker">` : '<div style="color:#666; font-size:12px;">無貼圖資料</div>'}</div>`;

    case "smallCard":
      return `
        <div class="line-card" style="${cardStyle}">
          ${data.image ? `<img src="${data.image}" referrerpolicy="no-referrer" class="card-img" style="border-radius:0;">` : ''}
          <div class="card-body">
            <div class="card-title">${data.title}</div>
            <div class="card-subtitle">${data.subtitle}</div>
            <div style="font-size:13px; opacity:0.85; white-space:pre-wrap; word-break:break-word;">${data.content}</div>
            ${authorBadge}
            ${data.button ? `<a href="${defaultUrl}" target="_blank" class="card-btn" style="background:${primary}; color:${btnTextClr}">${data.button}</a>` : ''}
          </div>
        </div>`;

    case "coverCard":
      return `
        <div class="cover-card" style="background-image: url('${data.image || DEFAULT_IMG}'); color: ${textClr || '#ffffff'};">
          <div class="cover-overlay">
            <div style="font-size:16px; font-weight:bold; word-break:break-word;">${data.title}</div>
            <div style="font-size:13px; opacity:0.9; margin-bottom:6px; word-break:break-word;">${data.subtitle}</div>
            ${authorBadge}
            ${data.button ? `<a href="${defaultUrl}" target="_blank" class="card-btn" style="background:${primary}; color:${btnTextClr}">${data.button}</a>` : ''}
          </div>
        </div>`;

    case "itinerary":
      const nodes = (data.content || '').split('\n').map(l => {
        const [t, d] = l.split('｜');
        return `
        <div style="display:flex; align-items:center; margin-bottom:10px; gap:8px;">
          <div style="width:10px; height:10px; border-radius:50%; border:2px solid ${primary}; background:#fff; flex-shrink:0;"></div>
          <div style="font-size:13px; color:${textClr}; font-weight:bold; flex-shrink:0;">${t || ''}</div>
          <div style="font-size:13px; color:${textClr}; flex:1; word-break:break-word;">${d || ''}</div>
        </div>`;
      }).join('');
      return `
        <div class="line-card" style="${cardStyle}">
          <div class="card-banner" style="background:${primary}; color:${btnTextClr};">${data.title}</div>
          <div class="card-body">
            <div class="card-subtitle">${data.subtitle}</div>
            <div style="margin-top:10px;">${nodes}</div>
            ${authorBadge}
            ${data.button ? `<a href="${defaultUrl}" target="_blank" class="card-btn" style="background:${primary}; color:${btnTextClr}">${data.button}</a>` : ''}
          </div>
        </div>`;

    case "receipt":
      const rows = (data.content || '').split('\n').map(r => r.split('|')).filter(r => r.length >= 2);
      const rowsHTML = rows.map(r => `<div class="kv-row"><span style="word-break:break-word;">${r[0]}</span><span style="font-weight:bold;">${r[1]}</span></div>`).join('');
      return `
        <div class="line-card" style="${cardStyle}">
          <div class="card-body">
            <div style="color:${primary}; font-size:12px; font-weight:bold;">RECEIPT / 帳單</div>
            <div class="card-title">${data.title}</div>
            <div class="card-subtitle">${data.subtitle}</div>
            <div class="divider"></div>
            ${rowsHTML}
            ${authorBadge}
            ${data.button ? `<a href="${defaultUrl}" target="_blank" class="card-btn" style="background:${primary}; color:${btnTextClr}">${data.button}</a>` : ''}
          </div>
        </div>`;

    case "notice":
    case "booking":
      const kvList = (data.content || '').split('\n').map(l => `<div style="font-size:13px; opacity:0.9; margin-bottom:4px; word-break:break-word;">${l}</div>`).join('');
      return `
        <div class="line-card" style="${cardStyle}">
          <div class="card-banner" style="background:${primary}; color:${btnTextClr};">${data.title}</div>
          <div class="card-body">
            <div class="card-subtitle" style="font-size:14px; opacity:0.85;">${data.subtitle}</div>
            <div style="background:rgba(0,0,0,0.04); padding:10px 12px; border-radius:6px; margin:8px 0;">${kvList}</div>
            ${authorBadge}
            ${data.button ? `<a href="${defaultUrl}" target="_blank" class="card-btn" style="background:${primary}; color:${btnTextClr}">${data.button}</a>` : ''}
          </div>
        </div>`;

    case "calendar":
      return `
        <div class="line-card" style="${cardStyle}">
          <div class="card-body">
            <div class="calendar-box">
              <div class="calendar-badge" style="background:${primary}; color:${btnTextClr};">
                <div class="month">AUG</div>
                <div class="day">28</div>
              </div>
              <div>
                <div style="font-weight:bold; font-size:14px; word-break:break-word;">${data.title}</div>
                <div style="font-size:12px; opacity:0.8; word-break:break-word;">${data.subtitle}</div>
              </div>
            </div>
            <div style="font-size:13px; opacity:0.85; white-space:pre-wrap; word-break:break-word;">${data.content}</div>
            ${authorBadge}
            ${data.button ? `<a href="${defaultUrl}" target="_blank" class="card-btn" style="background:${primary}; color:${btnTextClr}">${data.button}</a>` : ''}
          </div>
        </div>`;

    case "changelog":
      const logs = (data.content || '').split('\n').map(l => `<div style="font-size:13px; opacity:0.85; margin-bottom:3px; word-break:break-word;">${l}</div>`).join('');
      const tagText = data.tagText !== undefined ? data.tagText : 'NEW RELEASE';
      const tagHtml = tagText ? `<span style="background:${primary}; color:${btnTextClr}; font-size:11px; padding:2px 8px; border-radius:8px; font-weight:bold; display:inline-block; margin-bottom:4px;">${tagText}</span>` : '';
      return `
        <div class="line-card" style="${cardStyle}">
          <div class="card-body">
            ${tagHtml}
            <div class="card-title" style="margin-top:2px;">${data.title}</div>
            <div class="card-subtitle">${data.subtitle}</div>
            <div style="margin:8px 0;">${logs}</div>
            ${authorBadge}
            ${data.button ? `<a href="${defaultUrl}" target="_blank" class="card-btn" style="background:${primary}; color:${btnTextClr}">${data.button}</a>` : ''}
          </div>
        </div>`;

    case "coupon":
      return `
        <div class="line-card" style="${cardStyle}">
          <div class="card-body" style="padding:10px;">
            <div class="coupon-wrapper" style="border-color:${primary};">
              <div style="font-size:12px; opacity:0.8; word-break:break-word;">${data.title}</div>
              <div class="coupon-amount" style="color:${primary}; font-size:24px; font-weight:bold; margin:8px 0;">${data.subtitle}</div>
              <div style="font-size:12px; opacity:0.8; margin-top:2px; white-space:pre-wrap; word-break:break-word;">${data.content}</div>
              ${authorBadge ? `<div style="text-align:right;">${authorBadge}</div>` : ''}
              ${data.button ? `<a href="${defaultUrl}" target="_blank" class="card-btn" style="background:${primary}; color:${btnTextClr}; margin-top:12px;">${data.button}</a>` : ''}
            </div>
          </div>
        </div>`;

    case "memberCard":
      return `
        <div class="member-card" style="background:${cardBgClr || '#1e293b'}; color:${textClr || '#ffffff'}; border:1px solid ${primary};">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:15px; font-weight:bold; color:${primary}">${data.title}</div>
            <div style="font-size:10px; background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:3px;">MEMBER</div>
          </div>
          <div style="font-size:12px; opacity:0.8; margin-bottom:8px;">${data.subtitle}</div>
          <div class="member-points" style="color:${primary}">${data.content}</div>
          ${authorBadge}
          ${data.button ? `<a href="${defaultUrl}" target="_blank" class="card-btn" style="background:${primary}; color:${btnTextClr}">${data.button}</a>` : ''}
        </div>`;

    case "multiBtn":
      const btns = (data.button || '').split('|');
      const btnsHTML = btns.map((b, idx) => {
        const targetUrl = urls[idx] || urls[0] || '#';
        return idx === 0 
          ? `<a href="${targetUrl}" target="_blank" class="card-btn" style="background:${primary}; color:${btnTextClr}">${b}</a>`
          : `<a href="${targetUrl}" target="_blank" class="card-btn-outline" style="color:${textClr || '#111111'};">${b}</a>`;
      }).join('');
      return `
        <div class="line-card" style="${cardStyle}">
          <div class="card-body">
            <div class="card-title">${data.title}</div>
            <div class="card-subtitle">${data.subtitle}</div>
            <div style="font-size:13px; opacity:0.85; margin-bottom:8px; white-space:pre-wrap; word-break:break-word;">${data.content}</div>
            ${authorBadge}
            ${btnsHTML}
          </div>
        </div>`;

    case "compare":
      const lines = (data.content || '').split('\n').filter(Boolean);
      let compareHTML = '';
      if (lines.length > 0) {
        const cols = lines.map(line => `<div style="background:rgba(0,0,0,0.04); padding:8px; border-radius:8px; text-align:center; font-size:12px; word-break:break-word; border:1px solid ${primary};">${line}</div>`).join('');
        compareHTML = `<div style="display:grid; grid-template-columns: repeat(${lines.length}, 1fr); gap:8px; margin:10px 0;">${cols}</div>`;
      } else {
        compareHTML = `<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:10px 0;">
          <div style="background:rgba(0,0,0,0.04); padding:8px; border-radius:8px; text-align:center; font-size:12px; word-break:break-word;">標準版</div>
          <div style="background:rgba(0,0,0,0.02); border:1px solid ${primary}; padding:8px; border-radius:8px; text-align:center; font-size:12px; color:${primary}; word-break:break-word;">專業版</div>
        </div>`;
      }
      return `
        <div class="line-card" style="${cardStyle}">
          <div class="card-body">
            <div class="card-title" style="text-align:center;">${data.title}</div>
            <div class="card-subtitle" style="text-align:center;">${data.subtitle}</div>
            ${compareHTML}
            ${authorBadge}
            ${data.button ? `<a href="${defaultUrl}" target="_blank" class="card-btn" style="background:${primary}; color:${btnTextClr}">${data.button}</a>` : ''}
          </div>
        </div>`;

    case "rating":
      const starsStr = getStarString(data.stars || 5);
      return `
        <div class="line-card" style="${cardStyle}">
          <div class="card-body" style="text-align:center;">
            <div class="card-title" style="text-align:center;">${data.title}</div>
            <div class="card-subtitle" style="text-align:center;">${data.subtitle}</div>
            <div class="rating-stars" style="text-align:center;">${starsStr}</div>
            <div style="font-size:13px; opacity:0.85; background:rgba(0,0,0,0.04); padding:8px; border-radius:6px; margin:6px 0; white-space:pre-wrap; word-break:break-word; text-align:center;">${data.content}</div>
            ${authorBadge ? `<div style="text-align:right;">${authorBadge}</div>` : ''}
            ${data.button ? `<a href="${defaultUrl}" target="_blank" class="card-btn" style="background:${primary}; color:${btnTextClr}">${data.button}</a>` : ''}
          </div>
        </div>`;

    case "barcode":
      const barcodeImgSrc = (data.buttonUrl && data.buttonUrl.trim() !== '') ? data.buttonUrl.trim() : BARCODE_IMG;
      return `
        <div class="line-card" style="${cardStyle}">
          <div class="card-body" style="text-align:center;">
            <div class="card-title">${data.title}</div>
            <div class="card-subtitle">${data.subtitle}</div>
            <div style="background:rgba(0,0,0,0.02); padding:12px; border-radius:8px; margin:8px 0; display:flex; flex-direction:column; align-items:center;">
              <img src="${barcodeImgSrc}" alt="Barcode" style="max-width:100%; height:42px; margin-bottom:6px; display:block; object-fit:contain;">
              <div style="font-size:12px; opacity:0.8; word-break:break-word;">${data.content}</div>
            </div>
            ${authorBadge}
            ${data.button ? `<a href="${defaultUrl}" target="_blank" class="card-btn" style="background:${primary}; color:${btnTextClr}">${data.button}</a>` : ''}
          </div>
        </div>`;

    case "faq":
      const qas = (data.content || '').split('\n').map(pair => {
        const [q, a] = pair.split('|');
        return `<div class="qa-box"><div class="qa-q">${q || ''}</div><div style="opacity:0.85;">${a || ''}</div></div>`;
      }).join('');
      return `
        <div class="line-card" style="${cardStyle}">
          <div class="card-body">
            <div class="card-title" style="font-size:20px; font-weight:800;">${data.title}</div>
            <div class="card-subtitle">${data.subtitle}</div>
            <div style="margin:8px 0;">${qas}</div>
            ${authorBadge}
            ${data.button ? `<a href="${defaultUrl}" target="_blank" class="card-btn" style="background:${primary}; color:${btnTextClr}">${data.button}</a>` : ''}
          </div>
        </div>`;

    case "stats":
      const statLines = (data.content || '').split('\n').filter(Boolean);
      let statGridHTML = '';
      if (statLines.length > 0) {
        const boxes = statLines.map(line => {
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
          return `
            <div style="background:rgba(125,125,125,0.08); border-radius:10px; padding:10px 8px; text-align:center;">
              <div style="font-size:11px; opacity:0.75; margin-bottom:4px; word-break:break-word;">${label}</div>
              <div style="font-size:18px; font-weight:800; color:${primary}; word-break:break-word;">${val}</div>
            </div>`;
        }).join('');
        statGridHTML = `<div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:10px; margin:12px 0;">${boxes}</div>`;
      } else {
        statGridHTML = `<div style="font-size:13px; opacity:0.8; text-align:center; margin:12px 0;">${data.content}</div>`;
      }
      return `
        <div class="line-card" style="${cardStyle}">
          <div class="card-body">
            <div class="card-title" style="font-size:20px; font-weight:800;">${data.title}</div>
            <div class="card-subtitle">${data.subtitle}</div>
            ${statGridHTML}
            ${authorBadge}
            ${data.button ? `<a href="${defaultUrl}" target="_blank" class="card-btn" style="background:${primary}; color:${btnTextClr}">${data.button}</a>` : ''}
          </div>
        </div>`;

    case "countdown":
      const hrsDisplay = data.hours !== undefined && data.hours !== "" ? data.hours : "12";
      const minsDisplay = data.mins !== undefined && data.mins !== "" ? data.mins : "45";
      const secsDisplay = data.secs !== undefined && data.secs !== "" ? data.secs : "30";
      return `
        <div class="line-card" style="${cardStyle}">
          <div class="card-banner" style="background:${primary}; color:${btnTextClr}; text-align:center;">${data.title}</div>
          <div class="card-body" style="text-align:center;">
            <div class="card-subtitle" style="text-align:center;">${data.subtitle}</div>
            <div style="font-size:12px; opacity:0.85; margin-top:4px; text-align:center;">${data.content}</div>
            <div class="countdown-row">
              <div class="countdown-box"><div class="countdown-num">${hrsDisplay}</div><div class="countdown-label">時</div></div>
              <div class="countdown-colon">:</div>
              <div class="countdown-box"><div class="countdown-num">${minsDisplay}</div><div class="countdown-label">分</div></div>
              <div class="countdown-colon">:</div>
              <div class="countdown-box" style="background:${primary}; color:${btnTextClr};"><div class="countdown-num">${secsDisplay}</div><div class="countdown-label">秒</div></div>
            </div>
            ${authorBadge}
            ${data.button ? `<a href="${defaultUrl}" target="_blank" class="card-btn" style="background:${primary}; color:${btnTextClr}">${data.button}</a>` : ''}
          </div>
        </div>`;

    case "weather":
      const wRows = (data.content || '').split('\n').map(l => `<div class="weather-list-row">${l}</div>`).join('');
      return `
        <div class="line-card" style="${cardStyle}">
          <div class="card-body">
            <div class="weather-card-title">${data.title}</div>
            <div class="card-subtitle">${data.subtitle}</div>
            <div class="weather-icon-big">${data.weatherIcon || '⛅'}</div>
            <div style="margin-top:8px;">${wRows}</div>
            ${authorBadge}
            ${data.button ? `<a href="${defaultUrl}" target="_blank" class="card-btn" style="background:${primary}; color:${btnTextClr}">${data.button}</a>` : ''}
          </div>
        </div>`;

    case "progressTracker": {
      const pct = Math.max(0, Math.min(100, parseInt(data.progressPct, 10) || 0));
      return `
        <div class="line-card" style="${cardStyle}">
          <div class="card-body">
            <div class="card-title">${data.title}</div>
            <div class="card-subtitle">${data.subtitle}</div>
            <div class="progress-track"><div class="progress-fill" style="width:${pct}%; background:${primary};"></div></div>
            <div class="progress-status" style="color:${primary};">${pct}% ${data.content || ''}</div>
            ${authorBadge}
            ${data.button ? `<a href="${defaultUrl}" target="_blank" class="card-btn" style="background:${primary}; color:${btnTextClr}">${data.button}</a>` : ''}
          </div>
        </div>`;
    }

    case "videoCard":
      return `
        <div class="line-card" style="${cardStyle}">
          <div class="video-thumb">
            <img src="${data.image || DEFAULT_IMG}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${DEFAULT_IMG}';" alt="Video">
            <div class="video-play-btn">▶</div>
            ${data.subtitle ? `<div class="video-duration">${data.subtitle}</div>` : ''}
          </div>
          <div class="card-body">
            <div class="card-title" style="margin-bottom:0;">${data.title}</div>
            ${authorBadge}
            ${data.button ? `<a href="${defaultUrl}" target="_blank" class="card-btn" style="background:${primary}; color:${btnTextClr}">${data.button}</a>` : ''}
          </div>
        </div>`;

    case "mapLocation":
      const mapImg = MAP_FIXED_IMG;
      return `
        <div class="line-card" style="${cardStyle}">
          <div style="position:relative; height:130px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; padding:16px;">
            <img src="${mapImg}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${DEFAULT_IMG}';" alt="Map Thumbnail" style="max-height:100%; max-width:100%; object-fit:contain;">
          </div>
          <div class="card-body">
            <div class="card-title" style="font-size:20px; font-weight:800;">${data.title}</div>
            <div class="card-subtitle">${data.subtitle}</div>
            <div style="font-size:13px; opacity:0.85; white-space:pre-wrap; word-break:break-word;">${data.content}</div>
            ${authorBadge}
            ${data.button ? `<a href="${defaultUrl}" target="_blank" class="card-btn" style="background:${primary}; color:${btnTextClr}">${data.button}</a>` : ''}
          </div>
        </div>`;

    case "birthday":
      return `
        <div class="birthday-card" style="${cardStyle} background-image: none;">
          <div class="birthday-icon">🎂</div>
          <div class="card-title" style="text-align:center;">${data.title}</div>
          <div class="card-subtitle" style="text-align:center;">${data.subtitle}</div>
          <div style="font-size:13px; opacity:0.85; white-space:pre-wrap; word-break:break-word; margin:8px 0;">${data.content}</div>
          ${authorBadge}
          ${data.button ? `<a href="${defaultUrl}" target="_blank" class="card-btn" style="background:${primary}; color:${btnTextClr}">${data.button}</a>` : ''}
        </div>`;

    case "poll": {
      const pollRows = (data.content || '').split('\n').map(line => {
        const [label, valRaw] = line.split('|');
        const val = Math.max(0, Math.min(100, parseInt(valRaw, 10) || 0));
        return `
          <div class="poll-row">
            <div class="poll-label-row"><span>${label || ''}</span><span style="font-weight:bold; color:${primary};">${val}%</span></div>
            <div class="poll-track"><div class="poll-fill" style="width:${val}%; background:${primary};"></div></div>
          </div>`;
      }).join('');
      return `
        <div class="line-card" style="${cardStyle}">
          <div class="card-body">
            <div class="card-title">${data.title}</div>
            <div class="card-subtitle">${data.subtitle}</div>
            ${pollRows}
            ${authorBadge}
            ${data.button ? `<a href="${defaultUrl}" target="_blank" class="card-btn" style="background:${primary}; color:${btnTextClr}">${data.button}</a>` : ''}
          </div>
        </div>`;
    }
  }
}

