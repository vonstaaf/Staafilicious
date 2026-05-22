import { auth } from "../firebaseConfig";
import { workaholicApiUrl } from "../constants/workaholicApi";

const MANUAL_IMPORT_PATH = "/api/manual-import";

async function readResponseJson(res) {
  const text = await res.text();
  if (!text || !text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Kunde inte tolka serverns svar (ogiltig JSON).");
  }
}

/**
 * @param {unknown} data
 * @returns {string[]}
 */
export function extractManualImportWarnings(data) {
  if (!data || typeof data !== "object") return [];
  const candidates = [
    data.warnings,
    data.warning,
    data.notFound,
    data.skipped,
    data.errors,
  ];
  for (const raw of candidates) {
    if (!Array.isArray(raw)) continue;
    return raw
      .map((w) => {
        if (typeof w === "string" && w.trim()) return w.trim();
        if (w && typeof w === "object") {
          const msg = w.message || w.error || w.reason;
          if (typeof msg === "string" && msg.trim()) return msg.trim();
          const enr =
            w.eNumber ??
            w.enumber ??
            w.articleNumber ??
            w.artNr ??
            w.artikelnummer;
          if (enr != null && String(enr).trim()) {
            return `E-nummer ${String(enr).trim()} hittades inte i Rexel-katalogen.`;
          }
        }
        return w != null ? String(w) : "";
      })
      .filter(Boolean);
  }
  return [];
}

/**
 * POST rå Rexel-lista till workaholic-web.
 * @param {{ projectId: string; text: string }} params
 */
export async function postRexelManualImport({ projectId, text }) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Du måste vara inloggad för att importera material.");
  }
  if (!projectId || !String(projectId).trim()) {
    throw new Error("Inget aktivt projekt valt.");
  }
  const trimmedText = (text ?? "").trim();
  if (!trimmedText) {
    throw new Error("Klistra in minst en rad med E-nummer och antal.");
  }

  const idToken = await user.getIdToken(true);
  const res = await fetch(workaholicApiUrl(MANUAL_IMPORT_PATH), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      projectId: String(projectId).trim(),
      text: trimmedText,
    }),
  });

  const data = await readResponseJson(res);

  if (!res.ok) {
    const msg =
      res.status === 401
        ? "Sessionen har gått ut. Logga ut och in igen."
        : data.error || data.details || data.message || `Servern svarade med HTTP ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : "Importen misslyckades.");
  }

  if (data.ok === false) {
    throw new Error(
      typeof data.error === "string" && data.error.trim()
        ? data.error
        : "Importen misslyckades."
    );
  }

  return {
    data,
    warnings: extractManualImportWarnings(data),
    importedCount:
      typeof data.imported === "number"
        ? data.imported
        : typeof data.importedCount === "number"
          ? data.importedCount
          : null,
  };
}
