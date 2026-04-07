import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { getBase64Image } from '../imageHelpers';
import { logError } from "../logger";

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

/** Bild-URI:er i samma ordning som checklistan (per punkt), med fallback till platt lista */
function collectInspectionImageUris(inspection) {
  const items = inspection.items || [];
  const byItem = inspection.imagesByItem;
  if (byItem && typeof byItem === "object" && !Array.isArray(byItem)) {
    const uris = [];
    for (const it of items) {
      const arr = byItem[it.id] || [];
      uris.push(...arr);
    }
    return uris;
  }
  return inspection.images || [];
}

export const handleInspectionPdf = async (project, inspection, companyData) => {
  try {
    const company = companyData || {};
    
    // 1. App-loggan (Base64) - Nu 90px i HTML
    const appLogo = await getBase64Image(APP_LOGO_URL);
    
    // 2. Skottsäker hämtning av Företagsloggan
    let logoToUse = company.companyLogoUrl || company.logoUrl;
    if (!logoToUse) {
      logoToUse = await AsyncStorage.getItem('@company_logo'); 
    }
    const companyLogo = logoToUse ? await getBase64Image(logoToUse) : null;
    
    const cName = company.companyName || company.name || "";
    
    const imageUris = collectInspectionImageUris(inspection);
    const processedImages = await Promise.all(
      imageUris.map(async (img) => {
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

    const validPhotos = processedImages.filter(img => img !== null);
    const photosPageHtml = validPhotos.length === 0 ? '' : `
      <div class="photo-page">
        <div class="section-title">FOTODOKUMENTATION</div>
        <p class="photo-page-hint">Alla bifogade bilder (i checklist-ordning).</p>
        <div class="photo-grid">
          ${validPhotos.map(img => `<img src="${img}" alt="" />`).join('')}
        </div>
      </div>`;

    const html = `
      <html>
        <head>
          <style>
            @page { margin: 16px; }
            body { font-family: Helvetica, Arial, sans-serif; color: #333; font-size: 10px; line-height: 1.35; }
            /* Håll ihop checklista + signatur i flödet; inget absolute på signatur */
            .inspection-flow { position: relative; }
            
            .header-table { 
              width: 100%; 
              border-bottom: 3px solid #1C1C1E; 
              padding-bottom: 12px; 
              margin-bottom: 16px; 
              border-collapse: collapse; 
            }
            .header-table td { border: none !important; vertical-align: middle; }

            .logo-main { 
              max-height: 90px; 
              width: auto; 
              display: block; 
              margin: 0 auto; 
              max-width: 100%;
              object-fit: contain;
            }

            .company-info {
              text-align: right;
              font-size: 10px;
              line-height: 1.25;
              color: #1C1C1E;
            }
            .company-title {
              font-size: 14px; 
              font-weight: bold;
              margin-bottom: 2px;
            }

            h1 { color: #6200EE; text-align: center; font-size: 18px; margin: 10px 0; letter-spacing: 0.5px; }
            
            .project-summary {
              background: #F8F9FB;
              padding: 10px 12px;
              border-radius: 8px;
              text-align: center;
              margin-bottom: 12px;
              border: 1px solid #EEE;
              color: #1C1C1E;
              font-size: 9px;
            }

            .section-title { 
              background: #1C1C1E; 
              color: #FFF;
              padding: 5px 8px; 
              font-weight: bold; 
              margin-top: 14px; 
              border-radius: 3px;
              font-size: 9px;
              text-transform: uppercase;
            }

            table.data { width: 100%; border-collapse: collapse; margin-top: 4px; page-break-inside: auto; }
            table.data thead { display: table-header-group; }
            table.data tbody tr { page-break-inside: avoid; break-inside: avoid-page; }
            table.data td, table.data th { border: 1px solid #EEE; padding: 4px 5px; text-align: left; }
            table.data th { background-color: #F2F2F7; font-size: 7px; text-transform: uppercase; color: #666; }
            table.data td { font-size: 7.5px; vertical-align: top; }
            table.data td strong { font-size: 7.5px; }
            
            .status-badge {
              font-weight: bold;
              padding: 2px 5px;
              border-radius: 3px;
              text-align: center;
              display: inline-block;
              min-width: 32px;
              font-size: 7px;
            }

            /* Alltid egen sida för bilder — aldrig sist på sida 1 (ligger efter signatur i DOM) */
            .photo-page {
              clear: both;
              page-break-before: always;
              break-before: page;
              padding-top: 12px;
            }
            .photo-page-hint { font-size: 8px; color: #888; margin: 0 0 10px 0; }
            .photo-grid { display: flex; flex-wrap: wrap; gap: 8px; page-break-inside: auto; }
            .photo-grid img { width: calc(50% - 4px); height: 200px; object-fit: cover; border-radius: 6px; border: 1px solid #EEE; box-sizing: border-box; page-break-inside: avoid; }
            
            .footer-sig {
              margin-top: 18px;
              border-top: 2px solid #EEE;
              padding-top: 10px;
              padding-bottom: 4px;
              page-break-inside: avoid;
              break-inside: avoid-page;
              /* Försök hålla signaturblocket tillsammans med tabellens avslutning, undvik “ensam” signatur högst upp */
              page-break-before: avoid;
              break-before: avoid-page;
              orphans: 2;
              widows: 2;
            }
            /*
              Roterad -90°: i praktiken byts visuellt “bredd” och “höjd” i flödet.
              Reservera en smal kolumn och tillräcklig höjd så inget överlappar texten ovan/under.
            */
            .signature-landscape-wrap {
              margin-top: 10px;
              margin-bottom: 6px;
              display: flex;
              align-items: center;
              justify-content: flex-start;
              width: 88px;
              min-height: 168px;
              max-width: 100%;
              overflow: visible;
              position: relative;
              flex-shrink: 0;
            }
            .signature-landscape {
              display: block;
              max-width: 200px;
              max-height: 72px;
              width: auto;
              height: auto;
              transform: rotate(-90deg);
              transform-origin: center center;
              border: 1px solid #E8E8E8;
              /* Efter rotation behövs utrymme motsvarande ~originalets bredd längs sidans lodräta axel */
            }
          </style>
        </head>
        <body>
          <div class="inspection-flow">
          <table class="header-table">
            <tr>
              <td style="width: 30%;">
                ${appLogo ? `<img src="${appLogo}" style="height: 72px; opacity: 1;" />` : ""}
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
                      <th style="width:56px; text-align:center;">Resultat</th>
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
                            ${i.desc ? `<br/><span style="font-size: 6.5px; color: #888;">${i.desc}</span>` : ""}
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

          <div class="footer-sig">
            <p style="font-size: 10px;"><strong>Protokollet upprättat och signerat av:</strong></p>
            <p style="font-size: 12px; margin-bottom: 4px;">${inspection.signedBy || inspection.signerName || '-'}</p>
            ${inspection.signature ? `
              <div class="signature-landscape-wrap" aria-hidden="true">
                <img src="${inspection.signature}" class="signature-landscape" alt="" />
              </div>` : ''}
            <p style="font-size: 8px; color: #AAA; margin-top: 8px;">Detta dokument är genererat via Workaholic Pro.</p>
          </div>
          </div>

          ${photosPageHtml}
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  } catch (e) {
    await logError(e, { source: "mobile", feature: "pdf", model: "InspectionPdf" });
  }
};
