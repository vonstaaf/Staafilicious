import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    
    let appLogo = null;
    try { appLogo = await getBase64Image(APP_LOGO_URL); } catch(e){}
    
    let logoToUse = company.logoUrl;
    if (!logoToUse) {
      logoToUse = await AsyncStorage.getItem('@company_logo'); 
    }
    let companyLogo = null;
    if (logoToUse) {
      try {
        companyLogo = await getBase64Image(logoToUse);
      } catch (e) {
        console.log("Logga kunde inte laddas.");
      }
    }
    
    const cName = company.companyName || company.name || "";
    const rows = scheduleData.rows || [];
    const header = scheduleData.headerInfo || {};
    const showJfb = header.showJfbText || false;
    const pageSize = scheduleData.pageSize || "A4";
    const isA5 = pageSize === "A5";
    
    const NORMAL_ROWS_PER_COL = isA5 ? 18 : 36; 
    const JFB_ROWS_PER_COL = isA5 ? 12 : 26; 
    
    const NORMAL_MAX = NORMAL_ROWS_PER_COL * 2;
    const JFB_MAX = JFB_ROWS_PER_COL * 2;
    const rowHeight = isA5 ? 24 : 19; 

    const pages = [];
    let remainingRows = [...rows];
    if (remainingRows.length === 0) remainingRows.push({ id: "", label: "", current: "", area: "" });

    while (remainingRows.length > 0) {
        if (remainingRows.length > NORMAL_MAX) {
            pages.push({
                rows: remainingRows.splice(0, NORMAL_MAX),
                showJfbHere: false,
                rowsPerCol: NORMAL_ROWS_PER_COL
            });
        } else {
            if (showJfb) {
                if (remainingRows.length <= JFB_MAX) {
                    pages.push({
                        rows: remainingRows.splice(0, remainingRows.length),
                        showJfbHere: true,
                        rowsPerCol: JFB_ROWS_PER_COL
                    });
                } else {
                    pages.push({
                        rows: remainingRows.splice(0, remainingRows.length),
                        showJfbHere: false,
                        rowsPerCol: NORMAL_ROWS_PER_COL
                    });
                    pages.push({
                        rows: [], 
                        showJfbHere: true,
                        rowsPerCol: JFB_ROWS_PER_COL
                    });
                }
            } else {
                pages.push({
                    rows: remainingRows.splice(0, remainingRows.length),
                    showJfbHere: false,
                    rowsPerCol: NORMAL_ROWS_PER_COL
                });
            }
        }
    }

    const htmlContent = `
      <html>
        <head>
          <style>
            @page { size: ${pageSize} portrait; margin: 0; }
            body { font-family: Helvetica, Arial, sans-serif; margin: 0; padding: 0; background: #fff; }
            
            .page { 
              width: ${isA5 ? '148mm' : '210mm'}; 
              height: ${isA5 ? '210mm' : '297mm'}; 
              padding: ${isA5 ? '10mm' : '12mm'}; 
              page-break-after: always; 
              display: flex; 
              flex-direction: column; 
              box-sizing: border-box;
              position: relative;
            }

            /* 🔑 KLIPPRAN RUNT A5/A4 */
            .cut-border {
              position: absolute;
              top: 4mm; left: 4mm; right: 4mm; bottom: 4mm;
              border: 1.5px dashed #000;
              pointer-events: none;
            }

            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            .header-table td { border: none !important; vertical-align: middle; }
            
            /* 🔑 MAFFIGARE LOGGA */
            .logo-img { 
              max-height: ${isA5 ? '75px' : '95px'}; 
              width: auto; 
              display: block; 
              max-width: 100%;
              object-fit: contain;
            }

            /* 🔑 STÖRRE FÖRETAGSINFO */
            .company-info {
              text-align: right;
              font-size: ${isA5 ? '10px' : '12px'};
              line-height: 1.3;
              color: #1C1C1E;
            }
            .company-title {
              font-size: ${isA5 ? '14px' : '17px'};
              font-weight: bold;
              margin-bottom: 2px;
            }

            .data-table th, .data-table td { 
              border: 1px solid #000; 
              font-size: ${isA5 ? '11px' : '11px'}; 
              padding: 4px; 
              overflow: hidden;
              white-space: nowrap;
              text-overflow: ellipsis;
            }
            .data-table th { background: #f2f2f2; font-weight: bold; text-align: center; font-size: 10px; }

            .jfb-container {
              margin-top: 15px;
              padding: 10px;
              border: 1px solid #000;
              background-color: #fcfcfc;
              font-size: ${isA5 ? '9px' : '11px'};
              line-height: 1.4;
            }

            .footer {
              margin-top: auto;
              font-size: 10px;
              border-top: 1.5px solid #000;
              padding-top: 5px;
              display: flex;
              justify-content: space-between;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          ${pages.map((pageData, index) => {
            const left = pageData.rows.slice(0, pageData.rowsPerCol);
            let right = pageData.rows.slice(pageData.rowsPerCol, pageData.rowsPerCol * 2);
            
            while (left.length < pageData.rowsPerCol) left.push({ id: "", label: "", current: "", area: "" });
            while (right.length < pageData.rowsPerCol) right.push({ id: "", label: "", current: "", area: "" });

            return `
              <div class="page">
                <div class="cut-border"></div>
                
                <table class="header-table" style="margin-bottom: 10px;">
                  <tr>
                    <td style="width: 30%;">
                      ${appLogo ? `<img src="${appLogo}" style="height: 90px; opacity: 1;" />` : ""}
                    </td>
                    <td style="width: 40%; text-align: center;">
                      ${companyLogo ? `<img src="${companyLogo}" class="logo-img" style="margin: 0 auto;"/>` : `<strong style="font-size: 18px;">${cName}</strong>`}
                    </td>
                    <td style="width: 30%;" class="company-info">
                      <div class="company-title">${cName}</div>
                      ${company.orgNr ? `Org.nr: ${company.orgNr}<br/>` : ""}
                      ${company.address || ""}<br/>
                      ${company.phone || ""}<br/>
                      ${company.website || ""}
                    </td>
                  </tr>
                </table>

                <h2 style="font-size: ${isA5 ? '16px' : '20px'}; margin: 5px 0 10px 0; text-align:center; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5px;">
                  Gruppförteckning - ${project.name}
                </h2>
                
                <table class="data-table" style="margin-bottom: 10px;">
                  <tr>
                    <td style="width:50%"><strong>Anläggning:</strong> ${header.anlaggning || project.name}</td>
                    <td style="width:50%"><strong>Central:</strong> ${header.central || "-"}</td>
                  </tr>
                  <tr>
                    <td><strong>Huvudsäkring:</strong> ${header.skring || "-"}</td>
                    <td><strong>Matning:</strong> ${header.kabel || "-"}</td>
                  </tr>
                  <tr>
                    <td><strong>Ik3:</strong> ${header.ik3 || "-"} kA</td>
                    <td><strong>Zför:</strong> ${header.zfor || "-"} Ω</td>
                  </tr>
                </table>

                <div style="display: flex; justify-content: space-between;">
                  <table class="data-table" style="width: 49.6%;">
                    <thead>
                      <tr>
                        <th style="width: 14%;">Nr</th>
                        <th style="width: 56%;">Omfattning / Grupp</th>
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
                  
                  <table class="data-table" style="width: 49.6%;">
                    <thead>
                      <tr>
                        <th style="width: 14%;">Nr</th>
                        <th style="width: 56%;">Omfattning / Grupp</th>
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
                    </tbody>
                  </table>
                </div>

                ${pageData.showJfbHere ? `
                  <div class="jfb-container">
                    ${JFB_TEXT}
                  </div>
                ` : ''}

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