import { auth, storage } from "../firebaseConfig";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Laddar upp en signatur-PNG (base64 data URI) till Firebase Storage.
 * Sökväg: signatures/{companyId}/{groupId}/{entryId}_{role}_{timestamp}.png
 * @param {string} dataUri - "data:image/png;base64,..."
 * @param {string} companyId
 * @param {string} groupId
 * @param {string|number} entryId - unik identifierare för kontrollposten
 * @param {'craftsman'|'customer'} role
 * @returns {Promise<string>} Firebase Storage download URL
 */
export async function uploadSignaturePng(dataUri, companyId, groupId, entryId, role = "craftsman") {
  if (!auth.currentUser || !companyId || !groupId) {
    throw new Error("Inloggning och projekt krävs för att ladda upp signatur.");
  }
  const response = await fetch(dataUri);
  const blob = await response.blob();
  const filename = `${entryId}_${role}_${Date.now()}.png`;
  const storageRef = ref(storage, `signatures/${companyId}/${groupId}/${filename}`);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}
