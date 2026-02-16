import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getBase64Image } from '../imageHelpers';

const APP_LOGO_URL = "https://raw.githubusercontent.com/vonstaaf/Workaholic-assets/main/logo.png";

export const handleMaterialPdf = async (project, companyData) => {
  try {
    const company = companyData || {};
    
    // 1. App-loggan (Base64)
    const appLogo = await getBase64Image(APP_LOGO_URL);

    // 2. Företagsloggan (Base64)
    const companyLogo = company.logoUrl ? await getBase64Image(company.logoUrl) : null;

    const cName = company.companyName || company.name || "";

    const products = project.products || [];
    const totalPurchase = products.reduce((acc, it) => acc + (Number(it.purchasePrice || 0) * Number(it.quantity || 0)), 0);

    const html = `
      <html>
        <head>
          <style>
            @page { margin: 20px; }
            body { font-family: Helvetica; color: #333; padding: 10px; }
            .header-table { width: 100%; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 30px; border-collapse: collapse; }
            .header-table td { border: none !important; vertical-align: middle; }
            
            .logo-img { 
              height: 60px; 
              width: auto; 
              display: block; 
              max-width: 200px;
            }

            h1 { text-align: center; font-size: 20px; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; }
            th { border-bottom: 2px solid #333; padding: 10px; text-align: left; font-size: 12px; background: #eee; }
            td { padding: 10px; border-bottom: 1px solid #eee; font-size: 12px; }
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

          <h1>MATERIALSPECIFIKATION (INKÖP)</h1>
          <p><strong>PROJEKT:</strong> ${project.name.toUpperCase()}</p>

          <table>
            <thead>
              <tr><th>Antal</th><th>Art.nr</th><th>Beskrivning</th><th>À-pris (Inköp)</th><th>Summa</th></tr>
            </thead>
            <tbody>
              ${products.map(p => `
                <tr>
                  <td>${p.quantity} st</td>
                  <td>${p.articleNumber || "-"}</td>
                  <td>${p.name}</td>
                  <td>${Number(p.purchasePrice || 0).toFixed(2)} kr</td>
                  <td>${(Number(p.purchasePrice || 0) * Number(p.quantity || 0)).toFixed(2)} kr</td>
                </tr>`).join('')}
            </tbody>
          </table>
          <div style="margin-top: 20px; text-align: right; font-weight: bold; font-size: 14px;">
            Totalt netto inköp: ${totalPurchase.toFixed(2)} kr
          </div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  } catch (e) {
    console.error(e);
  }
};