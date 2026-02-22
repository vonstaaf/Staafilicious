import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage'; // 🔑 NYTT: Hämtar lokala minnet
import { getBase64Image } from '../imageHelpers';

const APP_LOGO_URL = "https://raw.githubusercontent.com/vonstaaf/Workaholic-assets/main/logo.png";

export const handleInspectionPdf = async (project, inspection, companyData) => {
  try {
    const company = companyData || {};
    
    // 1. App-loggan (Base64)
    const appLogo = await getBase64Image(APP_LOGO_URL);
    
    // 2. 🔑 NYTT: Skottsäker hämtning av Företagsloggan
    let logoToUse = company.logoUrl;
    if (!logoToUse) {
      logoToUse = await AsyncStorage.getItem('@company_logo'); // Leta lokalt om molnet är tomt
    }
    const companyLogo = logoToUse ? await getBase64Image(logoToUse) : null;
    
    const cName = company.companyName || company.name || "";
    
    // 3. Bearbeta inspektionsbilder (Base64) - Säkerställer att de visas
    const processedImages = await Promise.all(
      (inspection.images || []).map(async (img) => {
        const b64 = await getBase64Image(img);
        return b64;
      })
    );
    
    const allItems = inspection.items || [];
    const sections = [...new Set(allItems.map(i => i.section))];
    
    // Formatera datumet snyggt
    const dateStr = inspection.date 
      ? new Date(inspection.date).toLocaleDateString('sv-SE') 
      : new Date().toLocaleDateString('sv-SE');

    const html = `
      <html>
        <head>
          <style>
            @page { margin: 15px; }
            body { font-family: Helvetica, Arial, sans-serif; color: #333; font-size: 10px; }
            .header-table { width: 100%; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; border-collapse: collapse; }
            .header-table td { border: none !important; vertical-align: middle; }
            
            .logo-img { 
              height: 60px; 
              width: auto; 
              display: block; 
              max-width: 200px;
              object-fit: contain;
            }

            h1 { color: #6200EE; text-align: center; font-size: 18px; margin: 10px 0; }
            .section-title { background: #f2f2f2; padding: 5px; border-left: 4px solid #6200EE; font-weight: bold; margin-top: 15px; }
            table.data { width: 100%; border-collapse: collapse; margin-top: 5px; }
            table.data td, table.data th { border: 1px solid #ddd; padding: 6px; text-align: left; }
            table.data th { background-color: #f9f9f9; }
            
            .photo-grid { display: flex; flex-wrap: wrap; margin-top: 20px; }
            .photo-grid img { width: 48%; height: 220px; object-fit: cover; margin: 1%; border-radius: 5px; border: 1px solid #ddd; }
            
            .signature-img { height: 60px; width: auto; margin-top: 10px; }
          </style>
        </head>
        <body>
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

          <h1>EGENKONTROLL / PRODUKTKONTROLL</h1>
          <p style="text-align:center;">
            <strong>PROJEKT:</strong> ${(project.name || "").toUpperCase()} | 
            <strong>UTFÖRD:</strong> ${inspection.description || 'Slutkontroll'} |
            <strong>DATUM:</strong> ${dateStr}
          </p>
          
          ${sections.map(sec => {
              const sectionItems = allItems.filter(i => i.section === sec);
              return `
               <div class="section-title">${sec.toUpperCase()}</div>
               <table class="data">
                 <thead><tr><th>Kontrollpunkt</th><th style="width:50px; text-align:center;">Status</th><th>Notering</th></tr></thead>
                 <tbody>
                   ${sectionItems.map(i => {
                     const statusVal = inspection.checks?.[i.id];
                     let statusText = '-';
                     if (statusVal === 'checked') statusText = 'OK';
                     if (statusVal === 'na') statusText = 'E/A';
                     
                     const comment = inspection.rowComments?.[i.id] || "";
                     
                     return `
                       <tr>
                         <td>${i.label}</td>
                         <td style="text-align:center; font-weight:bold; color: ${statusText === 'OK' ? '#2e7d32' : '#333'};">${statusText}</td>
                         <td>${comment}</td>
                       </tr>`;
                   }).join('')}
                 </tbody>
               </table>
              `;
          }).join('')}

          ${processedImages.length > 0 ? `
            <div style="page-break-before: always;">
              <div class="section-title">BILDDOKUMENTATION</div>
              <div class="photo-grid">
                ${processedImages.map(img => img ? `<img src="${img}" />` : '').join('')}
              </div>
            </div>` : ''
          }

          <div style="margin-top: 30px; border-top: 1px solid #ccc; padding-top: 10px;">
            <p><strong>Signerat av:</strong> ${inspection.signedBy || inspection.signerName || '-'}</p>
            ${inspection.signature ? `<img src="${inspection.signature}" class="signature-img" />` : ''}
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