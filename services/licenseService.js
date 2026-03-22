import { httpsCallable } from "firebase/functions";
import { functions } from "../firebaseConfig";

/**
 * Anropar Cloud Function claimLicense med den angivna licenskoden.
 * Kräver att användaren är inloggad (Function använder auth.uid).
 *
 * @param {string} code - Licenskod från användaren (normaliseras till versaler/trim).
 * @returns {Promise<{ companyId: string, role: string }>}
 * @throws {Error} med message t.ex. "INVALID_CODE" | "LICENSE_FULL" | "ALREADY_CLAIMED" | "LICENSE_INACTIVE"
 */
export async function claimLicense(code) {
  const normalizedCode = String(code || "").trim().toUpperCase();
  if (!normalizedCode) {
    throw new Error("Ange en licenskod.");
  }

  const claimLicenseFn = httpsCallable(functions, "claimLicense");
  let result;
  try {
    result = await claimLicenseFn({ code: normalizedCode });
  } catch (err) {
    const msg = err?.message || err?.code || String(err);
    throw new Error(msg);
  }

  const data = result.data;
  if (!data || !data.companyId) {
    throw new Error("Ogiltigt svar från servern.");
  }

  return {
    companyId: data.companyId,
    role: data.role || "employee",
  };
}
