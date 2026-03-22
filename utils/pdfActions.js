import { Alert } from "react-native";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { handleGroupSchedulePdf } from "./pdfModels/GroupSchedulePdf";
import { handleCustomerPdf } from "./pdfModels/CustomerPdf";
import { handleMaterialPdf } from "./pdfModels/MaterialPdf";
import { handleInspectionPdf } from "./pdfModels/InspectionPdf";
import { handleSakerVattenIntygPdf } from "./pdfModels/SakerVattenIntygPdf";

/**
 * Denna fil fungerar som en central växel för alla PDF-funktioner.
 * Varje PDF-typ har nu sin egen logik i mappen /pdfModels.
 */

export {
  handleGroupSchedulePdf,
  handleCustomerPdf,
  handleMaterialPdf,
  handleInspectionPdf,
  handleSakerVattenIntygPdf,
};

/**
 * Hämtar senaste Smart egenkontroll och tryckprov för ett projekt, genererar Säker Vatten-intyg som PDF och delar.
 * Kräver att minst en smart_inspection finns. Tryckprov är valfritt.
 */
export async function generateAndShareSakerVattenIntyg(companyId, groupId, project, companyData) {
  const docRef = collection(db, "companies", companyId, "groups", groupId, "documents");

  const [smartSnap, pressureSnap] = await Promise.all([
    getDocs(
      query(
        docRef,
        where("type", "==", "smart_inspection"),
        orderBy("createdAt", "desc"),
        limit(1)
      )
    ),
    getDocs(
      query(
        docRef,
        where("type", "==", "pressure_test"),
        orderBy("createdAt", "desc"),
        limit(1)
      )
    ),
  ]);

  const smartDoc = smartSnap.docs[0];
  const pressureDoc = pressureSnap.docs[0];
  const smartData = smartDoc?.data() ?? null;
  const pressureData = pressureDoc?.data() ?? null;

  if (!smartData) {
    throw new Error("Ingen Smart egenkontroll hittades för detta projekt. Gör en Smart egenkontroll först.");
  }

  await handleSakerVattenIntygPdf(project, smartData, pressureData, companyData);
}