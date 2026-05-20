import { doc, getDoc, onSnapshot } from "firebase/firestore";

/**
 * companies/{id} med alias som PDF-mallar och äldre skärmar förväntar sig.
 */
export function mergeCompanyProfile(companyId, companyData, userData = {}) {
  const c = companyData && typeof companyData === "object" ? companyData : {};
  const org = c.orgNumber || c.orgNr || userData.orgNr || "";
  const logoUrl = c.companyLogoUrl || c.logoUrl || userData.logoUrl || "";
  return {
    ...userData,
    ...c,
    id: companyId,
    companyId,
    companyName: c.companyName || c.name || userData.companyName || "",
    orgNumber: org,
    orgNr: org,
    logoUrl,
    companyLogoUrl: logoUrl,
  };
}

export async function fetchCompanyProfileForUser(db, uid) {
  if (!uid) return null;
  const userSnap = await getDoc(doc(db, "users", uid));
  if (!userSnap.exists()) return null;
  const userData = userSnap.data();
  const companyId = userData.companyId;
  if (!companyId) return userData;
  const companySnap = await getDoc(doc(db, "companies", companyId));
  if (!companySnap.exists()) {
    return mergeCompanyProfile(companyId, {}, userData);
  }
  return mergeCompanyProfile(companyId, companySnap.data(), userData);
}

/**
 * Realtid: users/{uid} → companies/{companyId}
 * @returns {() => void} unsubscribe
 */
export function subscribeCompanyProfileForUser(db, uid, onData) {
  if (!uid) return () => {};
  let unsubCompany = null;

  const unsubUser = onSnapshot(
    doc(db, "users", uid),
    (userSnap) => {
      unsubCompany?.();
      unsubCompany = null;
      if (!userSnap.exists()) {
        onData(null);
        return;
      }
      const userData = userSnap.data();
      const companyId = userData.companyId;
      if (!companyId) {
        onData(userData);
        return;
      }
      unsubCompany = onSnapshot(
        doc(db, "companies", companyId),
        (companySnap) => {
          if (!companySnap.exists()) {
            onData(mergeCompanyProfile(companyId, {}, userData));
            return;
          }
          onData(mergeCompanyProfile(companyId, companySnap.data(), userData));
        },
        () => onData(mergeCompanyProfile(companyId, {}, userData))
      );
    },
    () => onData(null)
  );

  return () => {
    unsubUser();
    unsubCompany?.();
  };
}
