import * as FileSystem from "expo-file-system";
import { formatProjectName } from "./stringHelpers";

const SAFE_FALLBACK_NAME = "Ospecificerat Projekt";

export function buildPdfFileName(documentType, projectName) {
  const type = String(documentType || "Dokument").trim() || "Dokument";
  const prettyProject = formatProjectName(projectName, SAFE_FALLBACK_NAME);
  const safeProjectName = prettyProject.replace(/[/\\?%*:|"<>]/g, "-");
  return `${type} ${safeProjectName}.pdf`;
}

export async function prepareNamedPdfUri(tempUri, documentType, projectName) {
  const finalFileName = buildPdfFileName(documentType, projectName);
  const targetUri = `${FileSystem.cacheDirectory}${Date.now()}-${finalFileName}`;
  await FileSystem.copyAsync({ from: tempUri, to: targetUri });
  return { finalFileName, uri: targetUri };
}

