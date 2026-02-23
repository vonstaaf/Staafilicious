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
    
    // 1. App-loggan (Kraschsäker)
    let appLogo = null;
    try { appLogo = await getBase64Image(APP_LOGO_URL); } catch(e){}
    
    // 2. 🔑 KRACHSÄKER hämtning av Företagsloggan
    let logoToUse = company.logoUrl;
    if (!logoToUse) {
      logoToUse = await AsyncStorage.getItem('@company_logo'); 
    }
    let companyLogo = null;
    if (logoToUse) {
      try {
        companyLogo = await getBase64Image(logoToUse);
      } catch (e) {
        console.log("Trasig cache-logga upptäckt. Hoppar över bilden för att förhindra krasch.");
      }
    }
    
    // 3. Företagsnamn
    const cName = company.companyName || company.name || "";

    const rows = scheduleData.rows || [];
    const header = scheduleData.headerInfo || {};
    const showJfb = header.showJfbText || false;
    const pageSize = scheduleData.pageSize || "A4";
    const isA5 = pageSize === "A5";
    
    // 🔑 DYNAMISK KALKYLATOR: Rader och höjd
    const NORMAL_ROWS_PER_COL = isA5 ? 20 : 36; 
    const JFB_ROWS_PER_COL = isA5 ? 12 : 26; // Kortare tabell för att ge plats åt JFB i botten
    
    const NORMAL_MAX = NORMAL_ROWS_PER_COL * 2;
    const JFB_MAX = JFB_ROWS_PER_COL * 2;
    const rowHeight = isA5 ? 28 : 24; 

    const pages = [];
    let remainingRows = [...rows];
    if (remainingRows.length === 0) remainingRows.push({ id: "", label: "", current: "", area: "" });

    // Dela upp raderna smart
    while (remainingRows.length > 0) {
        if (remainingRows.length > NORMAL_MAX) {
            // Sidan är full, ta max rader och skicka resten till nästa loop
            pages.push({
                rows: remainingRows.splice(0, NORMAL_MAX),
                showJfbHere: false,
                rowsPerCol: NORMAL_ROWS_PER_COL
            });
        } else {
            // Detta är sista omgången rader! Får JFB plats?
            if (showJfb) {
                if (remainingRows.length <= JFB_MAX) {
                    // Ja! Raderna får plats ovanför JFB-rutan.
                    pages.push({
                        rows: remainingRows.splice(0, remainingRows.length),
                        showJfbHere: true,
                        rowsPerCol: JFB_ROWS_PER_COL
                    });
                } else {
                    // Nej. Raderna tar för mycket plats. Vi fyller denna sida och lägger JFB på en ny sida.
                    pages.push({
                        rows: remainingRows.splice(0, remainingRows.length),
                        showJfbHere: false,
                        rowsPerCol: NORMAL_ROWS_PER_COL
                    });
                    pages.push({
                        rows: [], // En helt tom tabell men med JFB
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
            @page { size: ${pageSize} portrait; margin: 8mm; }
            body { font-family: Helvetica, Arial, sans-serif; margin: 0; padding: 0; background: #fff; }
            
            .page { 
              width: 210mm; 
              height: 297mm; 
              padding: 5mm; 
              page-break-after: always; 
              display: flex; 
              flex-direction: column; 
              box-sizing: border-box;
              position: relative;
            }
            
            ${isA5 ? '.page { width: 148mm; height: 210mm; padding: 0mm; }' : ''}

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

            /* 🔑 NY STYLING FÖR FULLBREDDS-JFB */
            .jfb-container {
              margin-top: 15px;
              padding: 12px;
              border: 1px solid #000;
              background-color: #f9f9f9;
              font-size: 10px;
              line-height: 1.4;
              border-radius: 2px;
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
          ${pages.map((pageData, index) => {
            const left = pageData.rows.slice(0, pageData.rowsPerCol);
            let right = pageData.rows.slice(pageData.rowsPerCol, pageData.rowsPerCol * 2);
            
            // Fyll ut med tomma rader så tabellen alltid är exakt lika hög
            while (left.length < pageData.rowsPerCol) left.push({ id: "", label: "", current: "", area: "" });
            while (right.length < pageData.rowsPerCol) right.push({ id: "", label: "", current: "", area: "" });

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
                    <td style="width: 30%; text-align: right; font-size: 8px; line-height: 1.2;">
                      <strong>${cName}</strong><br/>
                      ${company.orgNr ? `Org.nr: ${company.orgNr}<br/>` : ""}
                      ${company.address || ""}<br/>
                      ${company.zipCity || ""}<br/>
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