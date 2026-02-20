import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getBase64Image } from '../imageHelpers';

const APP_LOGO_URL = "https://raw.githubusercontent.com/vonstaaf/Workaholic-assets/main/logo.png";

const JFB_TEXT = `
  <strong>JORDFELSBRYTARE</strong><br/>
  Jordfelsbrytaren kompletterar skyddet mot elektriska personskador och bränder. Om jordfelsbrytaren slagit ifrån beror detta på fel i anläggningen eller en tillfällig nätstörning.<br/><br/>
  <strong>Om jordfelsbrytaren löst ut, gör så här:</strong><br/>
  1. Slå på jordfelsbrytaren. Om den löser ut igen är det något fel i anläggningen.<br/>
  2. Slå av alla säkringar och slå på jordfelsbrytaren igen.<br/>
  3. Slå nu till varje säkring, en åt gången, tills jordfelsbrytaren löser ut.<br/>
  4. Gör likadant med alla apparater som är anslutna på den säkringen tills den felaktiga apparaten lokaliserats.<br/>
  5. Löser jordfelsbrytaren ut trots att alla säkringar är avslagna, kontakta elektriker.<br/><br/>
  <em>Rekommendation är att jordfelsbrytaren skall motioneras var 6:e månad genom att trycka på testknappen. Jordfelsbrytaren skall då lösa ut omedelbart.</em>
`;

export const handleGroupSchedulePdf = async (project, scheduleData, companyData) => {
  try {
    const company = companyData || {};
    const appLogo = await getBase64Image(APP_LOGO_URL);
    const companyLogo = company.logoUrl ? await getBase64Image(company.logoUrl) : null;
    const cName = company.companyName || company.name || "";

    const rows = scheduleData.rows || [];
    const header = scheduleData.headerInfo || {};
    const showJfb = header.showJfbText || false;
    const pageSize = scheduleData.pageSize || "A4";
    const isA5 = pageSize === "A5";
    
    // Inställningar för rader
    const rowsPerCol = isA5 ? 20 : 42; 
    const rowHeight = isA5 ? 28 : 22; 
    const rowsPerPage = rowsPerCol * 2;

    const pages = [];
    for (let i = 0; i < Math.max(rows.length, 1); i += rowsPerPage) {
      pages.push(rows.slice(i, i + rowsPerPage));
    }

    const htmlContent = `
      <html>
        <head>
          <style>
            @page { size: ${pageSize} portrait; margin: 0; }
            body { font-family: Helvetica, Arial, sans-serif; margin: 0; padding: 0; background: #fff; }
            
            .page { 
              width: 210mm; /* Fast bredd för A4 */
              height: 297mm; /* Fast höjd för A4 */
              padding: 15mm; 
              page-break-after: always; 
              display: flex; 
              flex-direction: column; 
              box-sizing: border-box;
              position: relative;
            }
            
            ${isA5 ? '.page { width: 148mm; height: 210mm; padding: 10mm; }' : ''}

            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            
            .header-table td { border: none !important; vertical-align: middle; }
            
            .logo-img { 
              max-height: 60px; 
              width: auto; 
              display: block; 
              max-width: 100%;
              object-fit: contain;
            }

            .data-table th, .data-table td { 
              border: 1px solid #000; 
              font-size: ${isA5 ? '10px' : '12px'}; 
              padding: 3px; 
              overflow: hidden;
              white-space: nowrap;
              text-overflow: ellipsis;
            }
            
            .data-table th { background: #eee; font-weight: bold; text-align: center; }

            .jfb-box {
              font-size: 9px;
              line-height: 1.2;
              padding: 8px;
              background-color: #f9f9f9;
              white-space: normal; /* Tillåt radbrytning i JFB-texten */
              vertical-align: top;
            }

            .footer {
              margin-top: auto;
              font-size: 10px;
              border-top: 2px solid #000;
              padding-top: 5px;
              display: flex;
              justify-content: space-between;
            }
          </style>
        </head>
        <body>
          ${pages.map((pageRows, index) => {
            const left = pageRows.slice(0, rowsPerCol);
            let right = pageRows.slice(rowsPerCol);
            
            // Fyll ut kolumnerna så de alltid är lika långa
            while (left.length < rowsPerCol) left.push({ id: "", label: "", current: "", area: "" });
            while (right.length < rowsPerCol) right.push({ id: "", label: "", current: "", area: "" });

            let jfbHtml = "";
            const isLastPage = index === pages.length - 1;

            if (showJfb && isLastPage) {
                // Räkna tomma rader i slutet av högerkolumnen
                let emptyCount = 0;
                for (let i = right.length - 1; i >= 0; i--) {
                    if (!right[i].label && !right[i].current) emptyCount++;
                    else break;
                }

                // Om vi har minst 10 tomma rader, ersätt dem med JFB
                if (emptyCount >= 10) {
                    const keepCount = rowsPerCol - emptyCount;
                    right = right.slice(0, keepCount);
                    jfbHtml = `
                      <tr>
                        <td colspan="4" class="jfb-box" style="height: auto; border: 1px solid #000;">
                          ${JFB_TEXT}
                        </td>
                      </tr>`;
                }
            }

            return `
              <div class="page">
                <table class="header-table" style="margin-bottom: 10px;">
                  <tr>
                    <td style="width: 30%;">
                      ${appLogo ? `<img src="${appLogo}" class="logo-img" />` : ""}
                    </td>
                    <td style="width: 40%; text-align: center;">
                      ${companyLogo ? `<img src="${companyLogo}" class="logo-img" style="margin: 0 auto;"/>` : `<strong>${cName}</strong>`}
                    </td>
                    <td style="width: 30%; text-align: right; font-size: 10px;">
                      <strong>${cName}</strong><br/>
                      ${company.orgNr ? `Org.nr: ${company.orgNr}<br/>` : ""}
                      ${company.phone || ""}
                    </td>
                  </tr>
                </table>

                <h2 style="font-size: 16px; margin: 5px 0; text-align:center; text-transform: uppercase;">
                  Gruppförteckning - ${project.name}
                </h2>
                
                <table class="data-table" style="margin-bottom: 15px;">
                  <tr>
                    <td style="width:50%"><strong>Anläggning:</strong> ${header.anlaggning || project.name}</td>
                    <td style="width:50%"><strong>Central:</strong> ${header.central || "-"}</td>
                  </tr>
                  <tr>
                    <td><strong>Säkring:</strong> ${header.skring || "-"}</td>
                    <td><strong>Matning:</strong> ${header.kabel || "-"}</td>
                  </tr>
                  <tr>
                    <td><strong>Ik3 (kA):</strong> ${header.ik3 || "-"}</td>
                    <td><strong>Zför (Ω):</strong> ${header.zfor || "-"}</td>
                  </tr>
                </table>

                <div style="display: flex; justify-content: space-between;">
                  <table class="data-table" style="width: 49.5%;">
                    <thead>
                      <tr>
                        <th style="width: 12%;">Nr</th>
                        <th style="width: 58%;">Omfattning</th>
                        <th style="width: 15%;">A</th>
                        <th style="width: 15%;">mm²</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${left.map(r => `
                        <tr style="height: ${rowHeight}px;">
                          <td style="text-align:center; font-weight:bold;">${r.id}</td>
                          <td style="font-weight:bold;">${r.label}</td>
                          <td style="text-align:center;">${r.current}</td>
                          <td style="text-align:center;">${r.area}</td>
                        </tr>`).join('')}
                    </tbody>
                  </table>
                  
                  <table class="data-table" style="width: 49.5%;">
                    <thead>
                      <tr>
                        <th style="width: 12%;">Nr</th>
                        <th style="width: 58%;">Omfattning</th>
                        <th style="width: 15%;">A</th>
                        <th style="width: 15%;">mm²</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${right.map(r => `
                        <tr style="height: ${rowHeight}px;">
                          <td style="text-align:center; font-weight:bold;">${r.id}</td>
                          <td style="font-weight:bold;">${r.label}</td>
                          <td style="text-align:center;">${r.current}</td>
                          <td style="text-align:center;">${r.area}</td>
                        </tr>`).join('')}
                      ${jfbHtml}
                    </tbody>
                  </table>
                </div>

                <div class="footer">
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
    console.error("PDF Error:", e);
  }
};