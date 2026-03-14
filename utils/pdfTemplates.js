import { WorkaholicTheme } from "../theme";
import { formatProjectName } from "./stringHelpers";

/**
 * GEMENSAM STANDARD HEADER (PUNKT 2, 3, 7)
 * Vänster: App-logga | Mitten: Företagslogga | Höger: Företagsinfo
 */
const getStandardHeader = (d, appLogoHeight = 65) => {
  const c = d?.companyData || d?.c || {};
  const companyName = c.companyName || c.name || "";
  const logoToShow = d?.companyLogo || null;
  const appLogo = d?.appLogo || null;

  return `
    <table style="width:100%; border-bottom:1.5px solid #000; padding-bottom:8px; border-collapse:collapse; table-layout:fixed; border:none !important;">
      <tr style="border:none !important;">
        <td style="width:30%; vertical-align:middle; text-align:left; border:none !important; padding:0;">
          ${appLogo ? `<img src="${appLogo}" style="height:${appLogoHeight}px; max-width:100%; object-fit:contain; border:none;" />` : ""}
        </td>
        
        <td style="width:40%; text-align:center; vertical-align:middle; border:none !important; padding:0;">
          ${logoToShow 
            ? `<img src="${logoToShow}" style="height:55px; max-width:100%; object-fit:contain; display:inline-block; border:none;" />` 
            : `<strong style="font-size:12px;">${companyName}</strong>`
          }
        </td>
        
        <td style="width:30%; text-align:right; font-size:7px; line-height:1.2; border:none !important; vertical-align:middle; padding:0;">
          <p style="margin:0; font-weight:bold; font-size:9px;">${companyName}</p>
          ${c.orgNr ? `<p style="margin:0;">Org: ${c.orgNr}</p>` : ""}
          <p style="margin:0;">${c.address || ""}</p>
          <p style="margin:0;">${c.zipCity || (c.zipCode ? `${c.zipCode} ${c.city || ""}` : "")}</p>
          <p style="margin:0;">${c.phone || ""}</p>
          ${c.website ? `<p style="margin:0;">${c.website}</p>` : ""}
        </td>
      </tr>
    </table>
  `;
};

/**
 * EGENKONTROLL HTML (PUNKT 5)
 */
export const getInspectionHtml = (d) => {
  const dateStr = d.date ? new Date(d.date).toLocaleDateString('sv-SE') : new Date().toLocaleDateString('sv-SE');
  const sections = [...new Set((d.items || []).map(i => i.section))];
  const projectName = formatProjectName(d.projectName, "Projekt");

  return `
  <html>
    <head>
      <style>
        @page { margin: 15px; }
        body { font-family: 'Helvetica', sans-serif; font-size: 9px; color: #333; margin: 0; line-height: 1.2; }
        h1 { font-size: 16px; margin: 10px 0; color: ${WorkaholicTheme.colors.primary}; text-align: center; }
        h2 { font-size: 10px; background: #f2f2f2; padding: 4px; border-left: 3px solid ${WorkaholicTheme.colors.primary}; margin: 10px 0 5px 0; }
        .data-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 10px; }
        .data-table th { background: #eee; text-align: left; padding: 4px; border: 0.5px solid #ddd; }
        .data-table td { padding: 4px; border: 0.5px solid #ddd; }
        .inspected-img { width: 48%; height: 230px; object-fit: cover; margin: 1%; border-radius: 4px; border: 0.5px solid #ddd; }
      </style>
    </head>
    <body>
      ${getStandardHeader(d, 60)}
      <h1>EGENKONTROLL</h1>
      <p style="text-align:center;"><strong>PROJEKT:</strong> ${projectName} | <strong>Beskrivning:</strong> ${d.description || "-"} | <strong>Datum:</strong> ${dateStr}</p>
      ${sections.map(sec => `
        <div style="page-break-inside: avoid;">
          <h2>${sec}</h2>
          <table class="data-table">
            <thead><tr><th style="width:40%">Punkt</th><th style="width:12%; text-align:center;">Status</th><th>Notering</th></tr></thead>
            <tbody>
              ${d.items.filter(i => i.section === sec).map(i => `
                <tr>
                  <td>${i.label}</td>
                  <td style="text-align:center;"><strong>${d.checks?.[i.id] === 'checked' ? 'OK' : (d.checks?.[i.id] === 'na' ? 'N/A' : '-')}</strong></td>
                  <td>${d.rowComments?.[i.id] || ""}</td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>`).join("")}
        <div style="margin-top:20px; page-break-inside: avoid; border: 1px solid #eee; padding: 10px; border-radius: 8px;">
          <p><strong>Anteckningar:</strong> ${d.notes || "-"}</p>
          <p style="margin-top:10px;"><strong>Signerat av:</strong> ${d.signedBy}</p>
          ${d.signature ? `<img src="${d.signature}" style="height:80px; margin-top:5px;"/>` : ""}
        </div>
        ${d.images && d.images.length > 0 ? `
          <div style="page-break-before: always;">
            ${getStandardHeader(d, 50)}
            <h2 style="margin-top:20px;">BILDDOKUMENTATION</h2>
            <div style="display: flex; flex-wrap: wrap;">
              ${d.images.map(img => `<img src="${img}" class="inspected-img" />`).join("")}
            </div>
          </div>` : ""}
    </body>
  </html>`;
};

/**
 * KUNDUNDERLAG - Summerar nu både Produktsidan och Kostnadssidan (PUNKT 1 & 2)
 */
export const getSettlementHtml = (project, companyData, companyLogo, options) => {
  const { showVat, appLogo } = options;
  
  // Summering från Produktsidan (Material)
  const products = project.products || [];
  const materialTotal = products.reduce((acc, it) => acc + (Number(it.unitPriceOutExclVat || it.price || 0) * Number(it.quantity || 0)), 0);
  
  // Summering från Kostnadssidan (Arbete/Logg)
  const kostnader = project.kostnader || [];
  const workTotal = kostnader.reduce((acc, it) => acc + Number(it.total || 0), 0);
  
  const totalExclVat = materialTotal + workTotal;
  const moms = totalExclVat * 0.25;
  const projectName = formatProjectName(project.name, "Projekt");

  return `
  <html>
    <head>
      <style>
        @page { margin: 15px; }
        body { font-family: 'Helvetica', sans-serif; font-size: 10px; color: #333; margin: 0; }
        h1 { font-size: 18px; color: ${WorkaholicTheme.colors.primary}; text-align: center; margin-bottom: 20px; }
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .data-table th { background: ${WorkaholicTheme.colors.primary}; color: #FFF; padding: 10px; text-align: left; }
        .data-table td { padding: 10px; border-bottom: 1px solid #EEE; }
        .section-header { font-weight: bold; background: #f9f9f9; padding: 8px; border-bottom: 2px solid ${WorkaholicTheme.colors.primary}; }
        .total-box { margin-top: 30px; width: 40%; margin-left: auto; background: #F8F9FB; padding: 15px; border-radius: 10px; border: 1px solid #EEE; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
        .grand-total { border-top: 2px solid ${WorkaholicTheme.colors.primary}; padding-top: 10px; margin-top: 10px; font-size: 13px; font-weight: bold; color: ${WorkaholicTheme.colors.primary}; }
      </style>
    </head>
    <body>
      ${getStandardHeader({ companyData, companyLogo, appLogo }, 60)}
      <h1>KUNDUNDERLAG / SPECIFIKATION</h1>
      <p><strong>PROJEKT:</strong> ${projectName.toUpperCase()}</p>
      
      <div class="section-header">MATERIAL & ARTIKLAR</div>
      <table class="data-table">
        <thead>
          <tr><th>Beskrivning</th><th style="width:50px; text-align:center;">Mängd</th><th style="width:80px; text-align:right;">Pris st</th><th style="width:80px; text-align:right;">Summa</th></tr>
        </thead>
        <tbody>
          ${products.length > 0 ? products.map(p => `
            <tr>
              <td>${p.name || p.label}</td>
              <td style="text-align:center;">${p.quantity} st</td>
              <td style="text-align:right;">${Number(p.unitPriceOutExclVat || p.price || 0).toFixed(2)} kr</td>
              <td style="text-align:right;">${(Number(p.unitPriceOutExclVat || p.price || 0) * Number(p.quantity || 0)).toFixed(2)} kr</td>
            </tr>`).join('') : '<tr><td colspan="4">Inga artiklar registrerade</td></tr>'}
        </tbody>
      </table>

      <div class="section-header">ARBETE & ÖVRIGA KOSTNADER</div>
      <table class="data-table">
        <thead>
          <tr><th>Beskrivning</th><th style="width:50px; text-align:center;">Datum</th><th style="width:80px; text-align:right;">Info</th><th style="width:80px; text-align:right;">Summa</th></tr>
        </thead>
        <tbody>
          ${kostnader.length > 0 ? kostnader.map(k => `
            <tr>
              <td>${k.description}</td>
              <td style="text-align:center;">${k.date}</td>
              <td style="text-align:right;">${k.hours || 0} h</td>
              <td style="text-align:right;">${Number(k.total || 0).toFixed(2)} kr</td>
            </tr>`).join('') : '<tr><td colspan="4">Inget arbete registrerat</td></tr>'}
        </tbody>
      </table>

      <div class="total-box">
        <div class="total-row"><span>Summa Netto:</span> <span>${totalExclVat.toFixed(2)} kr</span></div>
        ${showVat ? `<div class="total-row"><span>Moms (25%):</span> <span>${moms.toFixed(2)} kr</span></div>` : ""}
        <div class="total-row grand-total"><span>ATT BETALA:</span> <span>${(showVat ? totalExclVat + moms : totalExclVat).toFixed(2)} kr</span></div>
      </div>
    </body>
  </html>`;
};

/**
 * MATERIALSPECIFIKATION - Visar nu även priser om de finns (PUNKT 3)
 */
export const getMaterialHtml = (data) => {
  const { projectName, items, companyData, companyLogo, appLogo } = data;
  const formattedProjectName = formatProjectName(projectName, "Projekt");

  return `
  <html>
    <head>
      <style>
        @page { margin: 15px; }
        body { font-family: 'Helvetica', sans-serif; font-size: 9px; color: #333; margin: 0; }
        h1 { font-size: 16px; color: #444; text-align: center; margin: 15px 0; border-bottom: 1px solid #DDD; padding-bottom: 10px; }
        .material-table { width: 100%; border-collapse: collapse; }
        .material-table th { background: #F2F2F2; padding: 8px; text-align: left; border: 1px solid #DDD; }
        .material-table td { padding: 8px; border: 1px solid #DDD; }
      </style>
    </head>
    <body>
      ${getStandardHeader({ companyData, companyLogo, appLogo }, 60)}
      <h1>MATERIALSPECIFIKATION</h1>
      <p><strong>PROJEKT:</strong> ${formattedProjectName.toUpperCase()}</p>
      <table class="material-table">
        <thead>
          <tr>
            <th style="width:50px; text-align:center;">Antal</th>
            <th>Beskrivning / Artikel</th>
            <th style="width:80px; text-align:right;">Pris st</th>
            <th style="width:80px; text-align:right;">Summa</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(p => `
            <tr>
              <td style="text-align:center; font-weight:bold;">${p.quantity} st</td>
              <td>${p.label || p.name}</td>
              <td style="text-align:right;">${Number(p.purchasePrice || 0).toFixed(2)} kr</td>
              <td style="text-align:right;">${(Number(p.purchasePrice || 0) * Number(p.quantity || 0)).toFixed(2)} kr</td>
            </tr>`).join('')}
        </tbody>
      </table>
      <div style="margin-top:20px; text-align:right; font-weight:bold;">Totalt netto (inköp): ${items.reduce((acc, i) => acc + (Number(i.purchasePrice || 0) * Number(i.quantity || 0)), 0).toFixed(2)} kr</div>
    </body>
  </html>`;
};

/**
 * GRUPPSCHEMA / GRUPPFÖRTECKNING (PUNKT 7)
 */
export const getGroupScheduleHtml = (projectContext, scheduleData) => {
  const companyData = projectContext?.companyData || projectContext?.c || {};
  const data = scheduleData || {};
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const header = data.headerInfo || {};
  const projectName = (projectContext?.name || "Projekt").toUpperCase();
  const pageSize = data.pageSize || "A4";
  const isA5 = pageSize === "A5";

  const rowsPerCol = isA5 ? 24 : 48; 
  const rowHeight = isA5 ? 25 : 18; 

  const pages = [];
  for (let i = 0; i < Math.max(rows.length, 1); i += (rowsPerCol * 2)) {
    pages.push(rows.slice(i, i + (rowsPerCol * 2)));
  }

  const htmlPages = pages.map((pageRows, index) => {
    const left = pageRows.slice(0, rowsPerCol);
    const right = pageRows.slice(rowsPerCol);
    while (left.length < rowsPerCol) left.push({ id: "", label: "", current: "", area: "" });
    while (right.length < rowsPerCol) right.push({ id: "", label: "", current: "", area: "" });

    const renderRows = (list) => list.map(r => `
      <tr style="height:${rowHeight}px;"> 
        <td style="border:1px solid #000; text-align:center; font-weight:bold; font-size:${isA5 ? '8px' : '10px'}; width:30px;">${r.id || ""}</td>
        <td style="border:1px solid #000; padding-left:6px; font-size:${isA5 ? '8px' : '10px'}; overflow:hidden; white-space:nowrap;">${r.label || ""}</td>
        <td style="border:1px solid #000; text-align:center; font-size:${isA5 ? '8px' : '10px'}; width:35px;">${r.current ? r.current + 'A' : ""}</td>
        <td style="border:1px solid #000; text-align:center; font-size:${isA5 ? '8px' : '10px'}; width:40px;">${r.area ? r.area + 'mm²' : ""}</td>
      </tr>`).join("");

    return `
      <div class="page-container">
        ${getStandardHeader({ companyData, companyLogo: projectContext.companyLogo, appLogo: projectContext.appLogo }, isA5 ? 50 : 75)}
        <h2 style="font-size:14px; margin: 10px 0 5px 0;">GRUPPFÖRTECKNING - ${projectName}</h2>
        <table style="width:100%; border:1px solid #000; border-collapse:collapse; margin-bottom:10px; font-size:9px;">
          <tr>
            <td style="padding:5px; border:1px solid #000;"><strong>Anläggning:</strong> ${header.anlaggning || projectName}</td>
            <td style="padding:5px; border:1px solid #000;"><strong>Central:</strong> ${header.central || "-"}</td>
          </tr>
          <tr>
            <td style="padding:5px; border:1px solid #000;"><strong>Huvudsäkring:</strong> ${header.skring || "-"}</td>
            <td style="padding:5px; border:1px solid #000;"><strong>Matning:</strong> ${header.kabel || "-"}</td>
          </tr>
        </table>
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="width:49%; vertical-align:top; border:none !important; padding:0;">
              <table style="width:100%; border-collapse:collapse;">
                <tr style="background:#eee; height:20px;">
                  <th style="border:1px solid #000; font-size:8px;">Nr</th>
                  <th style="border:1px solid #000; font-size:8px; text-align:left;">Omfattning</th>
                  <th style="border:1px solid #000; font-size:8px;">A</th>
                  <th style="border:1px solid #000; font-size:8px;">mm&sup2;</th>
                </tr>
                ${renderRows(left)}
              </table>
            </td>
            <td style="width:2%; border:none !important;"></td>
            <td style="width:49%; vertical-align:top; border:none !important; padding:0;">
              <table style="width:100%; border-collapse:collapse;">
                <tr style="background:#eee; height:20px;">
                  <th style="border:1px solid #000; font-size:8px;">Nr</th>
                  <th style="border:1px solid #000; font-size:8px; text-align:left;">Omfattning</th>
                  <th style="border:1px solid #000; font-size:8px;">A</th>
                  <th style="border:1px solid #000; font-size:8px;">mm&sup2;</th>
                </tr>
                ${renderRows(right)}
              </table>
            </td>
          </tr>
        </table>
        <div style="margin-top:auto; border-top:1px solid #000; padding-top:4px; display:flex; justify-content:space-between; font-size:8px;">
            <span>Vid fel ring: ${companyData.companyName || companyData.name || ""} | ${companyData.phone || ""}</span>
            <span>Sida ${index + 1} av ${pages.length}</span>
        </div>
      </div>
    `;
  }).join("");

  return `<html><head><style>@page { size: ${pageSize} portrait; margin: 0; } html, body { margin: 0; padding: 0; background: #fff; width: 100%; height: 100%; } .page-container { width: 100%; height: 100vh; padding: 20px 25px; page-break-after: always; display: flex; flex-direction: column; box-sizing: border-box; } * { -webkit-print-color-adjust: exact; box-sizing: border-box; }</style></head><body>${htmlPages}</body></html>`;
};