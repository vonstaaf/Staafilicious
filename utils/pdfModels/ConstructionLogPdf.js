import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getBase64Image } from "../imageHelpers";
import { logError } from "../logger";
import { buildConstructionLogFileName, prepareCustomNamedPdfUri } from "../pdfFileNaming";

const APP_LOGO_URL = "https://raw.githubusercontent.com/vonstaaf/Workaholic-assets/main/logo.png";

function formatDate(input) {
  const d = new Date(input || Date.now());
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("sv-SE");
}

export const handleConstructionLogPdf = async (project, logs, companyData, options = {}) => {
  try {
    const company = companyData || {};
    const appLogo = await getBase64Image(APP_LOGO_URL);

    let logoToUse = company.companyLogoUrl || company.logoUrl;
    if (!logoToUse) logoToUse = await AsyncStorage.getItem("@company_logo");
    const companyLogo = logoToUse ? await getBase64Image(logoToUse) : null;

    const cName = company.companyName || company.name || "";
    const mode = options.mode === "single" ? "single" : "all";
    const rows = Array.isArray(logs) ? logs : [];

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
            .entry { border: 1px solid #EEE; border-radius: 8px; margin-bottom: 12px; overflow: hidden; page-break-inside: avoid; }
            .entry-head { background: #1C1C1E; color: #FFF; padding: 8px 10px; font-size: 10px; font-weight: bold; }
            .entry-body { padding: 10px; }
            .label { font-size: 9px; color: #888; font-weight: bold; text-transform: uppercase; margin-top: 8px; }
            .value { font-size: 10px; color: #1C1C1E; white-space: pre-wrap; margin-top: 2px; }
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

          <h1>BYGGDAGBOK</h1>
          <div class="summary">
            <strong>PROJEKT:</strong> ${(project?.name || "").toUpperCase()} &nbsp; | &nbsp;
            <strong>RAPPORT:</strong> ${mode === "single" ? "Utdrag" : "Komplett dagbok"} &nbsp; | &nbsp;
            <strong>ANTAL POSTER:</strong> ${rows.length}
          </div>

          ${rows
            .map(
              (entry) => `
              <div class="entry">
                <div class="entry-head">${formatDate(entry.date)}</div>
                <div class="entry-body">
                  <div class="label">Utfört arbete</div>
                  <div class="value">${entry.workDone || "-"}</div>

                  <div class="label">Närvarande personal</div>
                  <div class="value">${entry.staff || "-"}</div>

                  <div class="label">Väder, hinder eller avvikelser</div>
                  <div class="value">${entry.notes || "-"}</div>
                </div>
              </div>
            `
            )
            .join("")}
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    const finalName = buildConstructionLogFileName(project?.name, mode);
    const { uri: newUri, finalFileName } = await prepareCustomNamedPdfUri(uri, finalName);
    await Sharing.shareAsync(newUri, {
      UTI: ".pdf",
      mimeType: "application/pdf",
      dialogTitle: finalFileName,
    });
  } catch (e) {
    await logError(e, { source: "mobile", feature: "pdf", model: "ConstructionLogPdf" });
    throw e;
  }
};
