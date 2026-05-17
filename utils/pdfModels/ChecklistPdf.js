import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getBase64Image } from "../imageHelpers";
import { logError } from "../logger";
import { buildChecklistFileName, prepareCustomNamedPdfUri } from "../pdfFileNaming";

const APP_LOGO_URL = "https://raw.githubusercontent.com/vonstaaf/Workaholic-assets/main/logo.png";

function formatDate(input) {
  const d = new Date(input || Date.now());
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("sv-SE");
}

export const handleChecklistPdf = async (project, checklist, companyData) => {
  try {
    const company = companyData || {};
    const appLogo = await getBase64Image(APP_LOGO_URL);

    let logoToUse = company.companyLogoUrl || company.logoUrl;
    if (!logoToUse) logoToUse = await AsyncStorage.getItem("@company_logo");
    const companyLogo = logoToUse ? await getBase64Image(logoToUse) : null;

    const cName = company.companyName || company.name || "";
    const checks = Array.isArray(checklist?.checks) ? checklist.checks : [];

    const html = `
      <html>
        <head>
          <style>
            @page { margin: 16px; }
            body { font-family: Helvetica, Arial, sans-serif; color: #333; font-size: 10px; line-height: 1.35; }
            .header-table { width: 100%; border-bottom: 3px solid #1C1C1E; padding-bottom: 12px; margin-bottom: 16px; border-collapse: collapse; }
            .header-table td { border: none !important; vertical-align: middle; }
            .logo-main { max-height: 90px; width: auto; display: block; margin: 0 auto; max-width: 100%; object-fit: contain; }
            .company-info { text-align: right; font-size: 10px; line-height: 1.25; color: #1C1C1E; }
            .company-title { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
            h1 { color: #6200EE; text-align: center; font-size: 18px; margin: 10px 0; letter-spacing: 0.5px; }
            .summary { background: #F8F9FB; padding: 12px; border-radius: 8px; border: 1px solid #EEE; margin-bottom: 12px; text-align: center; color: #1C1C1E; font-size: 9px; }
            .section-title { background: #1C1C1E; color: #FFF; padding: 6px 8px; border-radius: 3px; font-size: 9px; text-transform: uppercase; margin-top: 12px; font-weight: bold; }
            table.data { width: 100%; border-collapse: collapse; margin-top: 6px; }
            table.data td, table.data th { border: 1px solid #EEE; padding: 8px; text-align: left; }
            table.data th { background: #F2F2F7; font-size: 8px; text-transform: uppercase; color: #666; width: 14%; }
            table.data td { font-size: 10px; color: #1C1C1E; }
            .sign-box { margin-top: 24px; border-top: 2px solid #1C1C1E; padding-top: 14px; }
            .line { margin-top: 18px; border-top: 1px solid #444; padding-top: 4px; font-size: 9px; color: #666; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td style="width: 30%;">${appLogo ? `<img src="${appLogo}" style="height: 72px; opacity: 1;" />` : ""}</td>
              <td style="width: 40%; text-align: center;">
                ${companyLogo ? `<img src="${companyLogo}" class="logo-main" />` : `<div class="company-title">${cName}</div>`}
              </td>
              <td style="width: 30%;" class="company-info">
                <div class="company-title">${cName}</div>
                ${company.orgNr ? `Org.nr: ${company.orgNr}<br/>` : ""}
                ${company.phone || ""}
              </td>
            </tr>
          </table>

          <h1>EGENKONTROLL - BYGG</h1>

          <div class="summary">
            <strong>PROJEKT:</strong> ${(project?.name || "").toUpperCase()} &nbsp; | &nbsp;
            <strong>MALL:</strong> ${checklist?.templateName || "-"} &nbsp; | &nbsp;
            <strong>DATUM:</strong> ${formatDate(checklist?.date)}
          </div>

          <div class="section-title">Kontrollpunkter</div>
          <table class="data">
            <thead>
              <tr>
                <th>Nr</th>
                <th>Kontrollpunkt</th>
                <th style="width: 20%;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${checks
                .map(
                  (item, idx) => `
                    <tr>
                      <td>${idx + 1}</td>
                      <td>${item.label || "-"}</td>
                      <td>${item.checked ? "Godkänd" : "Ej markerad"}</td>
                    </tr>`
                )
                .join("")}
            </tbody>
          </table>

          <div class="sign-box">
            <strong>Signatur:</strong> ${checklist?.signature || "-"}
            <div class="line">Kundens godkännande (Namnteckning & Datum)</div>
          </div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    const finalName = buildChecklistFileName(project?.name, checklist?.templateName);
    const { uri: newUri, finalFileName } = await prepareCustomNamedPdfUri(uri, finalName);
    await Sharing.shareAsync(newUri, {
      UTI: ".pdf",
      mimeType: "application/pdf",
      dialogTitle: finalFileName,
    });
  } catch (e) {
    await logError(e, { source: "mobile", feature: "pdf", model: "ChecklistPdf" });
    throw e;
  }
};
