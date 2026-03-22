import { auth, storage } from "../firebaseConfig";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Laddar upp en egenkontrollbild till Firebase Storage under projektet.
 * Sökväg: companies/{companyId}/groups/{groupId}/inspection_media/{filename}
 * @param {string} companyId
 * @param {string} groupId
 * @param {string} localUri - URI från kamera/galeri
 * @param {string} [itemId] - id för checklist-punkt (t.ex. vvs_1)
 * @param {{ latitude?: number, longitude?: number }} [coords] - valfria geokoordinater
 * @returns {Promise<{ url: string, latitude?: number, longitude?: number, itemId?: string }>}
 */
export async function uploadInspectionPhoto(companyId, groupId, localUri, itemId = null, coords = null) {
  if (!auth.currentUser || !companyId || !groupId || !localUri) {
    throw new Error("companyId, groupId och bild-URI krävs.");
  }
  const response = await fetch(localUri);
  const blob = await response.blob();
  const filename = `img_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
  const storageRef = ref(storage, `companies/${companyId}/groups/${groupId}/inspection_media/${filename}`);
  await uploadBytes(storageRef, blob);
  const url = await getDownloadURL(storageRef);
  return {
    url,
    ...(coords?.latitude != null && { latitude: coords.latitude }),
    ...(coords?.longitude != null && { longitude: coords.longitude }),
    ...(itemId && { itemId }),
  };
}

/**
 * Laddar upp en planritning för relationsritning.
 * Sökväg: companies/{companyId}/groups/{groupId}/relationsritning/{filename}
 */
export async function uploadRelationsritningImage(companyId, groupId, localUri) {
  if (!auth.currentUser || !companyId || !groupId || !localUri) {
    throw new Error("companyId, groupId och bild-URI krävs.");
  }
  const response = await fetch(localUri);
  const blob = await response.blob();
  const filename = `plan_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
  const storageRef = ref(storage, `companies/${companyId}/groups/${groupId}/relationsritning/${filename}`);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}
