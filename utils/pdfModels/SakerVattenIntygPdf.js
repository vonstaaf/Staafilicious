import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getBase64Image } from "../imageHelpers";
import { logError } from "../logger";
import { prepareNamedPdfUri } from "../pdfFileNaming";

const APP_LOGO_URL = "https://raw.githubusercontent.com/vonstaaf/Workaholic-assets/main/logo.png";

/**
 * Genererar Säker Vatten-intyg som PDF från senaste Smart egenkontroll (och valfritt tryckprov).
 * Företagets logotyp hämtas från companyData.companyLogoUrl/logoUrl eller AsyncStorage (@company_logo).
 */
export const handleSakerVattenIntygPdf = async (
  project,
  smartInspection,
  pressureTest,
  companyData
) => {
  if (!smartInspection) {
    throw new Error("Ingen egenkontroll att basera intyget på. Gör en Smart egenkontroll först.");
  }

  try {
    const company = companyData || {};

    const appLogo = await getBase64Image(APP_LOGO_URL);

    let logoToUse = company.companyLogoUrl || company.logoUrl;
    if (!logoToUse) {
      logoToUse = await AsyncStorage.getItem("@company_logo");
    }
    const companyLogo = logoToUse ? await getBase64Image(logoToUse) : null;
    const cName = company.companyName || company.name || "";

    const items = smartInspection.items || [];
    const checks = smartInspection.checks || {};
    const rowComments = smartInspection.rowComments || {};
    const sections = [...new Set(items.map((i) => i.section))];

    const inspectionDate = smartInspection.createdAt?.toDate
      ? smartInspection.createdAt.toDate()
      : new Date();
    const dateStr = inspectionDate.toLocaleDateString("sv-SE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Valfria foton – max 4 små i intyget (för att hålla filen liten)
    const photos = smartInspection.photos || [];
    const photoUrls = photos.slice(0, 4).map((p) => p.url || p);
    const processedPhotos = await Promise.all(
      photoUrls.map((url) => getBase64Image(url).catch(() => null))
    ).then((arr) => arr.filter(Boolean));

    const projectName = (project?.name || smartInspection.projectName || "").trim();
    const cappedName = projectName ? projectName.charAt(0).toUpperCase() + projectName.slice(1) : "-";

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            @page { margin: 18px; }
            body { font-family: Helvetica, Arial, sans-serif; color: #1C1C1E; font-size: 11px; line-height: 1.35; }
            .header-table { width: 100%; border-bottom: 3px solid #1C1C1E; padding-bottom: 12px; margin-bottom: 20px; border-collapse: collapse; }
            .header-table td { border: none !important; vertical-align: middle; }
            .logo-main { max-height: 90px; width: auto; display: block; margin: 0 auto; max-width: 100%; object-fit: contain; }
            .company-info { text-align: right; font-size: 10px; line-height: 1.3; color: #1C1C1E; }
            .company-title { font-size: 15px; font-weight: bold; margin-bottom: 2px; }
            h1 { color: #0277BD; text-align: center; font-size: 20px; margin: 12px 0; letter-spacing: 0.5px; }
            .intro { background: #E3F2FD; padding: 12px 15px; border-radius: 8px; margin-bottom: 18px; font-size: 10px; color: #0D47A1; }
            .section-title { background: #0277BD; color: #FFF; padding: 6px 10px; font-weight: bold; margin-top: 14px; border-radius: 4px; font-size: 11px; text-transform: uppercase; }
            table.data { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10px; }
            table.data td, table.data th { border: 1px solid #E0E0E0; padding: 8px; text-align: left; }
            table.data th { background: #F5F5F5; color: #616161; font-weight: bold; }
            .status-badge { font-weight: bold; padding: 3px 6px; border-radius: 4px; display: inline-block; min-width: 32px; text-align: center; font-size: 10px; }
            .pressure-box { background: #F5F5F5; border: 1px solid #E0E0E0; border-radius: 8px; padding: 12px; margin: 16px 0; }
            .pressure-box h3 { margin: 0 0 8px 0; font-size: 12px; color: #0277BD; }
            .signature-block { margin-top: 24px; padding-top: 16px; border-top: 2px solid #E0E0E0; }
            .signature-img { height: 56px; width: auto; margin-top: 6px; border: 1px solid #EEE; }
            .photo-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
            .photo-grid img { width: calc(50% - 4px); height: 100px; object-fit: cover; border-radius: 6px; border: 1px solid #EEE; box-sizing: border-box; }
            .footer-note { font-size: 9px; color: #9E9E9E; margin-top: 16px; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td style="width: 28%;">${appLogo ? `<img src="${appLogo}" style="height: 80px; opacity: 1;" />` : ""}</td>
              <td style="width: 44%; text-align: center;">${companyLogo ? `<img src="${companyLogo}" class="logo-main" />` : `<div class="company-title">${cName}</div>`}</td>
              <td style="width: 28%;" class="company-info">
                <div class="company-title">${cName}</div>
                ${company.orgNr ? `Org.nr: ${company.orgNr}<br/>` : ""}
                ${company.address || ""}<br/>
                ${company.zipCity || (company.zipCode ? `${company.zipCode} ${company.city || ""}` : "")}<br/>
                ${company.phone ? `Tel: ${company.phone}<br/>` : ""}
              </td>
            </tr>
          </table>

          <h1>SÄKER VATTEN-INTYG</h1>

          <div class="intro">
            Detta intyg upprättas utifrån genomförd egenkontroll enligt branschregler (Säker Vatten).
            Projekt: <strong>${cappedName}</strong>. Kontrolldatum: <strong>${dateStr}</strong>.
          </div>

          ${sections
            .map(
              (sec) => `
            <div class="section-title">${sec}</div>
            <table class="data">
              <thead><tr><th>Kontrollpunkt</th><th style="width:60px;text-align:center;">Resultat</th><th>Notering</th></tr></thead>
              <tbody>
                ${items
                  .filter((i) => i.section === sec)
                  .map((i) => {
                    const statusVal = checks[i.id];
                    let statusText = "-";
                    let statusColor = "#EEE";
                    let textColor = "#333";
                    if (statusVal === "checked") {
                      statusText = "OK";
                      statusColor = "#E8F5E9";
                      textColor = "#2E7D32";
                    }
                    if (statusVal === "na") {
                      statusText = "E/A";
                      statusColor = "#F5F5F5";
                      textColor = "#757575";
                    }
                    if (statusVal === "fail") {
                      statusText = "FEL";
                      statusColor = "#FFEBEE";
                      textColor = "#C62828";
                    }
                    const comment = rowComments[i.id] || "";
                    return `
                      <tr>
                        <td><strong>${i.label}</strong></td>
                        <td style="text-align:center;"><span class="status-badge" style="background:${statusColor};color:${textColor};">${statusText}</span></td>
                        <td>${comment}</td>
                      </tr>`;
                  })
                  .join("")}
              </tbody>
            </table>`
            )
            .join("")}

          ${pressureTest
            ? `
          <div class="pressure-box">
            <h3>Tryckprovning</h3>
            <p style="margin: 0 0 4px 0;">Start: <strong>${pressureTest.startPressureBar ?? "-"} bar</strong> &nbsp;|&nbsp; Slut: <strong>${pressureTest.endPressureBar ?? "-"} bar</strong> &nbsp;|&nbsp; Tryckfall: <strong>${(pressureTest.pressureDropBar ?? 0).toFixed(2)} bar</strong></p>
            <p style="margin: 0; font-size: 10px;">Resultat: <strong>${pressureTest.status === "approved" ? "Godkänd" : "Underkänd"}</strong></p>
          </div>`
            : ""}

          ${processedPhotos.length > 0 ? `<div class="section-title">Fotodokumentation</div><div class="photo-grid">${processedPhotos.map((img) => `<img src="${img}" alt="" />`).join("")}</div>` : ""}

          <div class="signature-block">
            <p style="font-size: 11px;"><strong>Intyget upprättat och signerat av:</strong></p>
            <p style="font-size: 13px; margin-bottom: 4px;">${smartInspection.signedBy || "Installatör"}</p>
            ${smartInspection.signature ? `<img src="${smartInspection.signature}" class="signature-img" />` : ""}
          </div>

          <p class="footer-note">Detta dokument är genererat från Workaholic. Säker Vatten-intyg baserat på egenkontroll och eventuell tryckprovning.</p>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    const { uri: newUri, finalFileName } = await prepareNamedPdfUri(uri, "Säker Vatten-intyg", project?.name);
    await Sharing.shareAsync(newUri, {
      UTI: ".pdf",
      mimeType: "application/pdf",
      dialogTitle: finalFileName,
    });
  } catch (e) {
    await logError(e, { source: "mobile", feature: "pdf", model: "SakerVattenIntygPdf" });
    throw e;
  }
};
