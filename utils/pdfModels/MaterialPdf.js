import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { getBase64Image } from '../imageHelpers';
import { Alert } from 'react-native';

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
    const totalPurchase = products.reduce((acc, it) => {
      const price = Number(it.purchasePrice || 0);
      const qty = Number(it.quantity || 0);
      return acc + (price * qty);
    }, 0);

    const html = `
      <html>
        <head>
          <style>
            @page { margin: 20px; }
            body { font-family: Helvetica, Arial, sans-serif; color: #333; line-height: 1.5; }
            
            /* 🔑 DIN NYA STANDARD-HEADER (30/40/30) */
            .header-table { 
              width: 100%; 
              border-bottom: 3px solid #1C1C1E; 
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

            h1 { text-align: center; font-size: 24px; margin: 15px 0 5px 0; color: #1C1C1E; letter-spacing: 1px; }
            .doc-type { text-align: center; font-size: 11px; font-weight: bold; color: #666; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 2px; }
            
            .project-box { 
              margin-bottom: 25px; 
              background: #F8F9FB; 
              padding: 20px; 
              border-radius: 12px; 
              border: 1px solid #EEE;
            }
            .project-box p { margin: 5px 0; font-size: 14px; color: #1C1C1E; }

            table.items { width: 100%; border-collapse: collapse; margin-top: 10px; }
            table.items th { 
              border-bottom: 2px solid #1C1C1E; 
              padding: 12px 10px; 
              text-align: left; 
              font-size: 10px; 
              background: #F2F2F7; 
              text-transform: uppercase; 
              color: #666;
            }
            table.items td { padding: 12px 10px; border-bottom: 1px solid #EEE; font-size: 12px; }
            
            .price-col { text-align: right; white-space: nowrap; }
            .qty-col { font-weight: bold; }

            .total-section { 
              margin-top: 40px; 
              border-top: 3px solid #1C1C1E; 
              padding-top: 20px; 
              text-align: right; 
            }
            .total-label { font-size: 13px; font-weight: bold; color: #666; text-transform: uppercase; }
            .total-amount { font-size: 24px; font-weight: 900; color: #1C1C1E; margin-top: 5px; display: block; }
            
            .footer-note { margin-top: 60px; font-size: 10px; color: #AAA; text-align: center; border-top: 1px solid #EEE; padding-top: 20px; }
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

          <h1>MATERIALSPECIFIKATION</h1>
          <div class="doc-type">Internt inköps- & kostnadsunderlag</div>

          <div class="project-box">
            <p><strong>PROJEKT:</strong> ${project.name.toUpperCase()}</p>
            <p><strong>DATUM:</strong> ${new Date().toLocaleDateString('sv-SE')}</p>
          </div>

          <table class="items">
            <thead>
              <tr>
                <th style="width: 70px;">Antal</th>
                <th style="width: 100px;">Art.nr</th>
                <th>Beskrivning</th>
                <th style="width: 110px; text-align: right;">À-pris (Netto)</th>
                <th style="width: 110px; text-align: right;">Summa</th>
              </tr>
            </thead>
            <tbody>
              ${products.map(p => {
                const itemPrice = Number(p.purchasePrice || 0);
                const itemQty = Number(p.quantity || 0);
                const itemTotal = itemPrice * itemQty;
                
                return `
                <tr>
                  <td class="qty-col">${itemQty} st</td>
                  <td style="color: #666;">${p.articleNumber || "-"}</td>
                  <td><strong>${p.name}</strong></td>
                  <td class="price-col">${formatCurrency(itemPrice)} kr</td>
                  <td class="price-col"><strong>${formatCurrency(itemTotal)} kr</strong></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>

          <div class="total-section">
            <span class="total-label">Totalt netto inköp (exkl. moms):</span>
            <span class="total-amount">${formatCurrency(totalPurchase)} kr</span>
          </div>

          <div class="footer-note">
            Dokumentet är skapat via Workaholic Pro - Digitalt verktyg för installatörer.
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