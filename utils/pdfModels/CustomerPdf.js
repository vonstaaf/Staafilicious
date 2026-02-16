import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { getBase64Image } from '../imageHelpers';

const APP_LOGO_URL = "https://raw.githubusercontent.com/vonstaaf/Workaholic-assets/main/logo.png";

export const handleCustomerPdf = async (project, companyData, options = { showVat: true }) => {
  try {
    const company = companyData || {};
    
    // 1. App-loggan (Base64) - Denna fungerar redan
    const appLogo = await getBase64Image(APP_LOGO_URL);
    
    // 2. Företagsloggan (Base64) - Samma metod här för att fixa Android Production
    const companyLogo = company.logoUrl ? await getBase64Image(company.logoUrl) : null;
    
    const cName = company.companyName || company.name || "";

    const products = project.products || [];
    const materialTotal = products.reduce((acc, it) => acc + (Number(it.unitPriceOutExclVat || 0) * Number(it.quantity || 0)), 0);
    
    const kostnader = project.kostnader || [];
    const workTotal = kostnader.reduce((acc, it) => acc + (Number(it.total || 0)), 0);

    const totalExclVat = materialTotal + workTotal;
    const vat = totalExclVat * 0.25;

    const html = `
      <html>
        <head>
          <style>
            @page { margin: 20px; }
            body { font-family: Helvetica; color: #333; padding: 10px; }
            .header-table { width: 100%; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; border-collapse: collapse; }
            .header-table td { border: none !important; vertical-align: middle; }
            
            .logo-img { 
              height: 60px; 
              width: auto; 
              display: block; 
              max-width: 200px;
            }

            h1 { color: #6200EE; text-align: center; font-size: 20px; margin: 10px 0; }
            .section-title { font-weight: bold; background: #f2f2f2; padding: 8px; border-bottom: 2px solid #6200EE; margin-top: 20px; }
            table.data { width: 100%; border-collapse: collapse; margin-top: 5px; }
            table.data th { text-align: left; padding: 8px; border-bottom: 1px solid #333; font-size: 11px; }
            table.data td { padding: 8px; border-bottom: 1px solid #eee; font-size: 11px; }
            .total-box { margin-top: 30px; width: 45%; margin-left: auto; background: #f9f9f9; padding: 15px; border-radius: 10px; border: 1px solid #eee; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px; }
            .grand-total { border-top: 2px solid #6200EE; padding-top: 10px; font-weight: bold; color: #6200EE; font-size: 14px; }
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

          <h1>KUNDUNDERLAG / SPECIFIKATION</h1>
          <p style="font-size: 12px;"><strong>PROJEKT:</strong> ${project.name.toUpperCase()}</p>

          <div class="section-title">MATERIAL & ARTIKLAR</div>
          <table class="data">
            <thead><tr><th>Beskrivning</th><th>Antal</th><th>Pris st</th><th>Summa</th></tr></thead>
            <tbody>
              ${products.length > 0 ? products.map(p => `
                <tr>
                  <td>${p.name}</td>
                  <td>${p.quantity} st</td>
                  <td>${formatNumber(p.unitPriceOutExclVat)} kr</td>
                  <td>${formatNumber(p.unitPriceOutExclVat * p.quantity)} kr</td>
                </tr>`).join('') : '<tr><td colspan="4">Inga artiklar registrerade</td></tr>'}
            </tbody>
          </table>

          <div class="section-title">ARBETE & ÖVRIGT</div>
          <table class="data">
            <thead><tr><th>Beskrivning</th><th>Datum</th><th>Mängd/Info</th><th>Summa</th></tr></thead>
            <tbody>
              ${kostnader.length > 0 ? kostnader.map(k => `
                <tr>
                  <td>${k.description}</td>
                  <td>${k.date}</td>
                  <td>${k.hours || 0} h</td>
                  <td>${formatNumber(k.total)} kr</td>
                </tr>`).join('') : '<tr><td colspan="4">Inget arbete registrerat</td></tr>'}
            </tbody>
          </table>

          <div class="total-box">
            <div class="total-row"><span>Summa Netto:</span> <span>${formatNumber(totalExclVat)} kr</span></div>
            ${options.showVat ? `<div class="total-row"><span>Moms (25%):</span> <span>${formatNumber(vat)} kr</span></div>` : ''}
            <div class="total-row grand-total"><span>ATT BETALA:</span> <span>${formatNumber(options.showVat ? totalExclVat + vat : totalExclVat)} kr</span></div>
          </div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  } catch (e) {
    Alert.alert("Fel", "Kunde inte skapa kundunderlag.");
  }
};

const formatNumber = (n) => Number(n).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ");