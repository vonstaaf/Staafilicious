import * as FileSystem from "expo-file-system";
import { formatProjectName } from "./stringHelpers";

const SAFE_FALLBACK_NAME = "Ospecificerat Projekt";

function transliterateSwedish(input) {
  return String(input || "")
    .replace(/[åÅ]/g, "a")
    .replace(/[äÄ]/g, "a")
    .replace(/[öÖ]/g, "o");
}

function compactSafeToken(input, fallback) {
  const normalized = transliterateSwedish(input)
    .replace(/[^a-zA-Z0-9\s_-]/g, " ")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || fallback;
}

function getTodayIsoDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function generateSafeFileName(projectName, docType) {
  const prettyProject = formatProjectName(projectName, SAFE_FALLBACK_NAME);
  const safeProject = compactSafeToken(prettyProject, "Projekt");
  const safeDocType = compactSafeToken(docType || "Dokument", "Dokument");
  return `${safeProject}_${safeDocType}_${getTodayIsoDate()}.pdf`;
}

export function buildPdfFileName(documentType, projectName) {
  return generateSafeFileName(projectName, documentType);
}

export async function prepareNamedPdfUri(tempUri, documentType, projectName) {
  const finalFileName = generateSafeFileName(projectName, documentType);
  const targetUri = `${FileSystem.cacheDirectory}${Date.now()}-${finalFileName}`;
  await FileSystem.copyAsync({ from: tempUri, to: targetUri });
  return { finalFileName, uri: targetUri };
}

