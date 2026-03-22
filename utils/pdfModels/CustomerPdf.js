import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { getBase64Image } from '../imageHelpers';

const APP_LOGO_URL = "https://raw.githubusercontent.com/vonstaaf/Workaholic-assets/main/logo.png";

const formatNumber = (n) => {
  return Number(n).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

export const handleCustomerPdf = async (project, companyData, options = { showVat: true }) => {
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

    const products = project.products || [];
    const materialTotal = products.reduce((acc, it) => {
      return acc + (Number(it.unitPriceOutExclVat || 0) * Number(it.quantity || 0));
    }, 0);
    
    const kostnader = project.kostnader || [];
    const workTotal = kostnader.reduce((acc, it) => acc + (Number(it.total || 0)), 0);

    const totalExclVat = materialTotal + workTotal;
    const vat = totalExclVat * 0.25;

    const html = `
      <html>
        <head>
          <style>
            @page { margin: 20px; }
            body { font-family: Helvetica, Arial, sans-serif; color: #333; line-height: 1.5; }
            
            /* 🔑 DIN NYA STANDARD-HEADER (30/40/30) */
            .header-table { 
              width: 100%; 
              border-bottom: 3px solid #6200EE; 
              padding-bottom: 15px; 
              margin-bottom: 30px; 
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

            h1 { color: #6200EE; text-align: center; font-size: 24px; margin: 15px 0; letter-spacing: 1px; }
            
            .project-box { 
              margin-bottom: 25px; 
              background: #F8F9FB; 
              padding: 20px; 
              border-radius: 12px; 
              border: 1px solid #EEE;
            }
            .project-box p { margin: 5px 0; font-size: 14px; color: #1C1C1E; }

            .section-title { 
              font-weight: bold; 
              background: #F2F2F7; 
              padding: 10px 15px; 
              border-left: 5px solid #6200EE; 
              margin-top: 30px; 
              font-size: 13px;
              color: #1C1C1E;
              text-transform: uppercase;
            }

            table.data { width: 100%; border-collapse: collapse; margin-top: 10px; }
            table.data th { 
              text-align: left; 
              padding: 12px 10px; 
              border-bottom: 2px solid #EEE; 
              font-size: 10px; 
              color: #666; 
              text-transform: uppercase; 
            }
            table.data td { padding: 12px 10px; border-bottom: 1px solid #EEE; font-size: 12px; }
            
            .total-box { 
              margin-top: 40px; 
              width: 50%; 
              margin-left: auto; 
              background: #FFF; 
              padding: 20px; 
              border-radius: 12px; 
              border: 2px solid #F2F2F7; 
            }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
            .grand-total { 
              border-top: 2px solid #6200EE; 
              padding-top: 15px; 
              margin-top: 10px;
              font-weight: 900; 
              color: #6200EE; 
              font-size: 20px; 
            }

            .footer-note { 
              margin-top: 60px; 
              font-size: 10px; 
              color: #AAA; 
              text-align: center; 
              border-top: 1px solid #EEE; 
              padding-top: 20px; 
            }
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

          <h1>KUNDUNDERLAG / SPECIFIKATION</h1>
          
          <div class="project-box">
            <p><strong>PROJEKT:</strong> ${project.name.toUpperCase()}</p>
            <p><strong>DATUM:</strong> ${new Date().toLocaleDateString('sv-SE')}</p>
          </div>

          <div class="section-title">Material & Artiklar</div>
          <table class="data">
            <thead>
              <tr>
                <th>Beskrivning</th>
                <th style="width: 80px;">Antal</th>
                <th style="width: 100px; text-align: right;">À-pris (ex.moms)</th>
                <th style="width: 110px; text-align: right;">Summa</th>
              </tr>
            </thead>
            <tbody>
              ${products.length > 0 ? products.map(p => {
                const price = Number(p.unitPriceOutExclVat || 0);
                const qty = Number(p.quantity || 0);
                return `
                <tr>
                  <td><strong>${p.name}</strong></td>
                  <td>${qty} st</td>
                  <td style="text-align: right;">${formatNumber(price)} kr</td>
                  <td style="text-align: right;"><strong>${formatNumber(price * qty)} kr</strong></td>
                </tr>`;
              }).join('') : '<tr><td colspan="4" style="color: #AAA; font-style: italic;">Inga artiklar registrerade</td></tr>'}
            </tbody>
          </table>

          <div class="section-title">Arbete & Övrigt</div>
          <table class="data">
            <thead>
              <tr>
                <th>Beskrivning</th>
                <th style="width: 100px;">Datum</th>
                <th style="width: 80px;">Mängd</th>
                <th style="width: 110px; text-align: right;">Summa</th>
              </tr>
            </thead>
            <tbody>
              ${kostnader.length > 0 ? kostnader.map(k => `
                <tr>
                  <td><strong>${k.description}</strong></td>
                  <td style="color: #666;">${k.date}</td>
                  <td>${k.hours || 0} h</td>
                  <td style="text-align: right;"><strong>${formatNumber(k.total)} kr</strong></td>
                </tr>`).join('') : '<tr><td colspan="4" style="color: #AAA; font-style: italic;">Inget arbete registrerat</td></tr>'}
            </tbody>
          </table>

          <div class="total-box">
            <div class="total-row">
              <span>Summa Netto:</span> 
              <span>${formatNumber(totalExclVat)} kr</span>
            </div>
            ${options.showVat ? `
              <div class="total-row">
                <span>Moms (25%):</span> 
                <span>${formatNumber(vat)} kr</span>
              </div>` : ''}
            <div class="total-row grand-total">
              <span>ATT BETALA:</span> 
              <span>${formatNumber(options.showVat ? totalExclVat + vat : totalExclVat)} kr</span>
            </div>
          </div>

          <div class="footer-note">
            Detta underlag är genererat via Workaholic Pro. Observera att detta ej är en giltig skattefaktura.
          </div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  } catch (e) {
    console.error("Customer PDF Error:", e);
    Alert.alert("Fel", "Kunde inte skapa kundunderlag.");
  }
};