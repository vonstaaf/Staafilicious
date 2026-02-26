import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { getBase64Image } from '../imageHelpers';

const APP_LOGO_URL = "https://raw.githubusercontent.com/vonstaaf/Workaholic-assets/main/logo.png";

/**
 * Hjälpfunktion för att formatera valuta snyggt (t.ex. 1 234,56 kr)
 */
const formatCurrency = (num) => {
  return Number(num).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

export const handleMaterialPdf = async (project, companyData) => {
  try {
    const company = companyData || {};
    
    // 1. App-loggan (Base64)
    const appLogo = await getBase64Image(APP_LOGO_URL);

    // 2. Skottsäker hämtning av Företagsloggan (Moln -> Lokal fallback)
    let logoToUse = company.logoUrl;
    if (!logoToUse) {
      logoToUse = await AsyncStorage.getItem('@company_logo'); 
    }
    const companyLogo = logoToUse ? await getBase64Image(logoToUse) : null;

    const cName = company.companyName || company.name || "";

    const products = project.products || [];
    const totalPurchase = products.reduce((acc, it) => acc + (Number(it.purchasePrice || 0) * Number(it.quantity || 0)), 0);

    const html = `
      <html>
        <head>
          <style>
            @page { margin: 20px; }
            body { font-family: Helvetica, Arial, sans-serif; color: #333; padding: 10px; }
            .header-table { width: 100%; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 30px; border-collapse: collapse; }
            .header-table td { border: none !important; vertical-align: middle; }
            
            .logo-img { 
              height: 60px; 
              width: auto; 
              display: block; 
              max-width: 200px;
              object-fit: contain;
            }

            h1 { text-align: center; font-size: 20px; margin-bottom: 5px; color: #1C1C1E; }
            .doc-type { text-align: center; font-size: 10px; font-weight: bold; color: #666; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px; }
            
            table.items { width: 100%; border-collapse: collapse; }
            table.items th { border-bottom: 2px solid #333; padding: 10px; text-align: left; font-size: 11px; background: #f9f9f9; text-transform: uppercase; }
            table.items td { padding: 10px; border-bottom: 1px solid #eee; font-size: 11px; }
            
            .total-section { margin-top: 30px; border-top: 2px solid #000; padding-top: 15px; text-align: right; }
            .total-label { font-size: 12px; font-weight: bold; color: #666; }
            .total-amount { font-size: 18px; font-weight: 900; color: #000; }
            
            .project-info { margin-bottom: 20px; background: #F8F9FB; padding: 15px; border-radius: 8px; }
            .project-info p { margin: 5px 0; font-size: 12px; }
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

          <h1>MATERIALSPECIFIKATION</h1>
          <div class="doc-type">Internt inköpsunderlag</div>

          <div class="project-info">
            <p><strong>PROJEKT:</strong> ${project.name.toUpperCase()}</p>
            <p><strong>DATUM:</strong> ${new Date().toLocaleDateString('sv-SE')}</p>
          </div>

          <table class="items">
            <thead>
              <tr>
                <th style="width: 60px;">Antal</th>
                <th style="width: 100px;">Art.nr</th>
                <th>Beskrivning</th>
                <th style="width: 100px; text-align: right;">À-pris (Netto)</th>
                <th style="width: 100px; text-align: right;">Summa</th>
              </tr>
            </thead>
            <tbody>
              ${products.map(p => `
                <tr>
                  <td>${p.quantity} st</td>
                  <td>${p.articleNumber || "-"}</td>
                  <td>${p.name}</td>
                  <td style="text-align: right;">${formatCurrency(p.purchasePrice || 0)}</td>
                  <td style="text-align: right;">${formatCurrency(Number(p.purchasePrice || 0) * Number(p.quantity || 0))}</td>
                </tr>`).join('')}
            </tbody>
          </table>

          <div class="total-section">
            <span class="total-label">TOTALT NETTO INKÖP (EXKL. MOMS):</span><br/>
            <span class="total-amount">${formatCurrency(totalPurchase)} kr</span>
          </div>

          <div style="margin-top: 50px; font-size: 8px; color: #AAA; text-align: center;">
            Dokumentet är skapat via Workaholic - Digitalt verktyg för installatörer.
          </div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  } catch (e) {
    console.error("Material PDF Error:", e);
    Alert.alert("Fel", "Kunde inte skapa material-PDF.");
  }
};