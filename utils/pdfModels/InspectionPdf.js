import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { getBase64Image } from '../imageHelpers';

const APP_LOGO_URL = "https://raw.githubusercontent.com/vonstaaf/Workaholic-assets/main/logo.png";

// Hjälpfunktion för att mappa enhetsnamn till symboler i PDF:en
const getUnitSymbol = (unit) => {
  switch (unit) {
    case 'MegaOhm': return 'MΩ';
    case 'Ohm': return 'Ω';
    case 'Meter': return 'm';
    case 'mA': return 'mA';
    case 'kA': return 'kA';
    default: return unit || "";
  }
};

export const handleInspectionPdf = async (project, inspection, companyData) => {
  try {
    const company = companyData || {};
    
    // 1. App-loggan (Base64) - Nu 90px i HTML
    const appLogo = await getBase64Image(APP_LOGO_URL);
    
    // 2. Skottsäker hämtning av Företagsloggan
    let logoToUse = company.logoUrl;
    if (!logoToUse) {
      logoToUse = await AsyncStorage.getItem('@company_logo'); 
    }
    const companyLogo = logoToUse ? await getBase64Image(logoToUse) : null;
    
    const cName = company.companyName || company.name || "";
    
    // 3. Bearbeta inspektionsbilder (Base64)
    const processedImages = await Promise.all(
      (inspection.images || []).map(async (img) => {
        try {
          const b64 = await getBase64Image(img);
          return b64;
        } catch (e) {
          return null;
        }
      })
    );
    
    const allItems = inspection.items || [];
    const sections = [...new Set(allItems.map(i => i.section))];
    
    const dateStr = inspection.date 
      ? new Date(inspection.date).toLocaleDateString('sv-SE') 
      : new Date().toLocaleDateString('sv-SE');

    const html = `
      <html>
        <head>
          <style>
            @page { margin: 20px; }
            body { font-family: Helvetica, Arial, sans-serif; color: #333; font-size: 11px; line-height: 1.4; }
            
            /* 🔑 DIN NYA STANDARD-HEADER (30/40/30) */
            .header-table { 
              width: 100%; 
              border-bottom: 3px solid #1C1C1E; 
              padding-bottom: 15px; 
              margin-bottom: 25px; 
              border-collapse: collapse; 
            }
            .header-table td { border: none !important; vertical-align: middle; }

            .logo-main { 
              max-height: 100px; 
              width: auto; 
              display: block; 
              margin: 0 auto; 
              max-width: 100%;
              object-fit: contain;
            }

            .company-info {
              text-align: right;
              font-size: 11px;
              line-height: 1.3;
              color: #1C1C1E;
            }
            .company-title {
              font-size: 16px; 
              font-weight: bold;
              margin-bottom: 2px;
            }

            h1 { color: #6200EE; text-align: center; font-size: 22px; margin: 15px 0; letter-spacing: 1px; }
            
            .project-summary {
              background: #F8F9FB;
              padding: 15px;
              border-radius: 10px;
              text-align: center;
              margin-bottom: 20px;
              border: 1px solid #EEE;
              color: #1C1C1E;
            }

            .section-title { 
              background: #1C1C1E; 
              color: #FFF;
              padding: 8px 12px; 
              font-weight: bold; 
              margin-top: 25px; 
              border-radius: 4px;
              font-size: 12px;
              text-transform: uppercase;
            }

            table.data { width: 100%; border-collapse: collapse; margin-top: 8px; }
            table.data td, table.data th { border: 1px solid #EEE; padding: 10px; text-align: left; }
            table.data th { background-color: #F2F2F7; font-size: 10px; text-transform: uppercase; color: #666; }
            
            .status-badge {
              font-weight: bold;
              padding: 4px 8px;
              border-radius: 4px;
              text-align: center;
              display: inline-block;
              min-width: 40px;
            }

            .photo-page { page-break-before: always; }
            .photo-grid { display: flex; flex-wrap: wrap; margin-top: 20px; gap: 12px; }
            .photo-grid img { width: calc(50% - 6px); height: 280px; object-fit: cover; border-radius: 8px; border: 1px solid #EEE; box-sizing: border-box; }
            
            .footer-sig { margin-top: 40px; border-top: 2px solid #EEE; padding-top: 20px; }
            .signature-img { height: 80px; width: auto; margin-top: 10px; border: 1px solid #F5F5F5; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td style="width: 30%;">
                ${appLogo ? `<img src="${appLogo}" style="height: 90px; opacity: 1;" />` : ""}
              </td>
              <td style="width: 40%; text-align: center;">
                ${companyLogo ? `<img src="${companyLogo}" class="logo-main" />` : `<div class="company-title">${cName}</div>`}
              </td>
              <td style="width: 30%;" class="company-info">
                <div class="company-title">${cName}</div>
                ${company.orgNr ? `Org.nr: ${company.orgNr}<br/>` : ""}
                ${company.address || ""}<br/>
                ${company.zipCity || (company.zipCode ? `${company.zipCode} ${company.city || ''}` : "")}<br/>
                ${company.phone ? `Tel: ${company.phone}<br/>` : ""}
                ${company.website || ""}
              </td>
            </tr>
          </table>

          <h1>EGENKONTROLLPROTOKOLL</h1>
          
          <div class="project-summary">
            <strong>PROJEKT:</strong> ${(project.name || "").toUpperCase()} &nbsp; | &nbsp;
            <strong>TYP:</strong> ${inspection.description || 'Allmän kontroll'} &nbsp; | &nbsp;
            <strong>DATUM:</strong> ${dateStr}
          </div>
          
          ${sections.map(sec => {
              const sectionItems = allItems.filter(i => i.section === sec);
              return `
                <div class="section-title">${sec.toUpperCase()}</div>
                <table class="data">
                  <thead>
                    <tr>
                      <th>Kontrollpunkt / Instruktion</th>
                      <th style="width:70px; text-align:center;">Resultat</th>
                      <th>Notering / Mätvärde</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${sectionItems.map(i => {
                      const statusVal = inspection.checks?.[i.id];
                      let statusText = '-';
                      let statusColor = '#EEE';
                      let textColor = '#333';

                      if (statusVal === 'checked') { statusText = 'OK'; statusColor = '#E8F5E9'; textColor = '#2E7D32'; }
                      if (statusVal === 'na') { statusText = 'E/A'; statusColor = '#F2F2F7'; textColor = '#8E8E93'; }
                      if (statusVal === 'fail') { statusText = 'FEL'; statusColor = '#FFEBEE'; textColor = '#C62828'; }
                      
                      const rawComment = inspection.rowComments?.[i.id] || "";
                      const unitSymbol = getUnitSymbol(i.unit);
                      
                      const displayValue = (rawComment && unitSymbol) 
                        ? `<strong>${rawComment}</strong> ${unitSymbol}` 
                        : rawComment;
                      
                      return `
                        <tr>
                          <td>
                            <strong>${i.label}</strong>
                            ${i.desc ? `<br/><span style="font-size: 9px; color: #888;">${i.desc}</span>` : ""}
                          </td>
                          <td style="text-align:center;">
                            <span class="status-badge" style="background-color: ${statusColor}; color: ${textColor};">
                              ${statusText}
                            </span>
                          </td>
                          <td>${displayValue}</td>
                        </tr>`;
                    }).join('')}
                  </tbody>
                </table>
              `;
          }).join('')}

          ${(() => {
            const validImages = processedImages.filter(img => img !== null);
            if (validImages.length === 0) return '';
            const MAX_PER_PAGE = 4;
            const MIN_PER_PAGE = 2;
            const chunks = [];
            let i = 0;
            while (i < validImages.length) {
              let take = Math.min(MAX_PER_PAGE, validImages.length - i);
              if (take === 1 && chunks.length > 0) {
                const lastChunk = chunks.pop();
                const moved = lastChunk[lastChunk.length - 1];
                chunks.push(lastChunk.slice(0, -1));
                chunks.push([moved, validImages[i]]);
                i += 2;
                continue;
              }
              chunks.push(validImages.slice(i, i + take));
              i += take;
            }
            return chunks.map((pageImages, pageIndex) => `
              <div class="photo-page">
                <div class="section-title">FOTODOKUMENTATION${chunks.length > 1 ? ` (sida ${pageIndex + 1}/${chunks.length})` : ''}</div>
                <div class="photo-grid">
                  ${pageImages.map(img => `<img src="${img}" alt="" />`).join('')}
                </div>
              </div>`).join('');
          })()}

          <div class="footer-sig">
            <p style="font-size: 12px;"><strong>Protokollet upprättat och signerat av:</strong></p>
            <p style="font-size: 14px; margin-bottom: 5px;">${inspection.signedBy || inspection.signerName || '-'}</p>
            ${inspection.signature ? `<img src="${inspection.signature}" class="signature-img" />` : ''}
            <p style="font-size: 9px; color: #AAA; margin-top: 10px;">Detta dokument är genererat via Workaholic Pro.</p>
          </div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  } catch (e) {
    console.error("PDF Generation Error:", e);
  }
};