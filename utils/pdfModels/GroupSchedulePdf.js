import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getBase64Image } from '../imageHelpers';

const APP_LOGO_URL = "https://raw.githubusercontent.com/vonstaaf/Workaholic-assets/main/logo.png";

export const handleGroupSchedulePdf = async (project, scheduleData, companyData) => {
  try {
    const company = companyData || {};
    
    // 1. App-loggan (Base64)
    const appLogo = await getBase64Image(APP_LOGO_URL);

    // 2. Företagsloggan (Base64)
    const companyLogo = company.logoUrl ? await getBase64Image(company.logoUrl) : null;

    const cName = company.companyName || company.name || "";

    const rows = scheduleData.rows || [];
    const header = scheduleData.headerInfo || {};
    const pageSize = scheduleData.pageSize || "A4";
    const isA5 = pageSize === "A5";
    const rowsPerCol = isA5 ? 24 : 48;
    const rowHeight = isA5 ? 25 : 18;

    const pages = [];
    for (let i = 0; i < Math.max(rows.length, 1); i += (rowsPerCol * 2)) {
      pages.push(rows.slice(i, i + (rowsPerCol * 2)));
    }

    const htmlContent = `
      <html>
        <head>
          <style>
            @page { size: ${pageSize} portrait; margin: 0; }
            body { font-family: Helvetica; margin: 0; padding: 0; }
            .page { width: 100%; height: 100vh; padding: 20px; page-break-after: always; display: flex; flex-direction: column; box-sizing: border-box; }
            table { width: 100%; border-collapse: collapse; }
            .header-table td { border: none !important; vertical-align: middle; }
            
            .logo-img { 
              height: 60px; 
              width: auto; 
              display: block; 
              max-width: 200px;
            }

            .data-table th, .data-table td { border: 1px solid #000; font-size: ${isA5 ? '8px' : '10px'}; padding: 3px; }
          </style>
        </head>
        <body>
          ${pages.map((pageRows, index) => {
            const left = pageRows.slice(0, rowsPerCol);
            const right = pageRows.slice(rowsPerCol);
            while (left.length < rowsPerCol) left.push({ id: "", label: "", current: "", area: "" });
            while (right.length < rowsPerCol) right.push({ id: "", label: "", current: "", area: "" });

            return `
              <div class="page">
                <table class="header-table">
                  <tr>
                    <td style="width: 30%;">
                      ${appLogo ? `<img src="${appLogo}" class="logo-img" />` : ""}
                    </td>
                    <td style="width: 40%; text-align: center;">
                      ${companyLogo ? `<img src="${companyLogo}" class="logo-img" style="margin: 0 auto;"/>` : `<strong>${cName}</strong>`}
                    </td>
                    <td style="width: 30%; text-align: right; font-size: 8px; line-height: 1.2;">
                      <strong>${cName}</strong><br/>
                      ${company.orgNr ? `Org.nr: ${company.orgNr}<br/>` : ""}
                      ${company.address || ""}<br/>
                      ${company.zipCity || ""}<br/>
                      ${company.phone || ""}
                    </td>
                  </tr>
                </table>

                <h2 style="font-size: 14px; margin: 5px 0;">GRUPPFÖRTECKNING - ${project.name.toUpperCase()}</h2>
                
                <table class="data-table" style="margin-bottom: 10px;">
                  <tr><td><strong>Anläggning:</strong> ${header.anlaggning || project.name}</td><td><strong>Central:</strong> ${header.central || "-"}</td></tr>
                  <tr><td><strong>Säkring:</strong> ${header.skring || "-"}</td><td><strong>Matning:</strong> ${header.kabel || "-"}</td></tr>
                </table>

                <div style="display: flex; justify-content: space-between;">
                  <table class="data-table" style="width: 49.5%;">
                    <tr style="background: #eee;"><th>Nr</th><th>Omfattning</th><th>A</th><th>mm²</th></tr>
                    ${left.map(r => `<tr style="height: ${rowHeight}px; font-weight: bold;"><td style="text-align:center;">${r.id}</td><td>${r.label}</td><td style="text-align:center;">${r.current}</td><td style="text-align:center;">${r.area}</td></tr>`).join('')}
                  </table>
                  <table class="data-table" style="width: 49.5%;">
                    <tr style="background: #eee;"><th>Nr</th><th>Omfattning</th><th>A</th><th>mm²</th></tr>
                    ${right.map(r => `<tr style="height: ${rowHeight}px; font-weight: bold;"><td style="text-align:center;">${r.id}</td><td>${r.label}</td><td style="text-align:center;">${r.current}</td><td style="text-align:center;">${r.area}</td></tr>`).join('')}
                  </table>
                </div>

                <div style="margin-top: auto; font-size: 8px; border-top: 1px solid #000; padding-top: 5px; display: flex; justify-content: space-between;">
                  <span>Vid fel ring: ${cName} | ${company.phone || ""}</span>
                  <span>Sida ${index + 1} av ${pages.length}</span>
                </div>
              </div>`;
          }).join('')}
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    await Sharing.shareAsync(uri);
  } catch (e) {
    console.error(e);
  }
};