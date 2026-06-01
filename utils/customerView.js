import { db, auth } from "../firebaseConfig";
import { doc, updateDoc, getDoc, serverTimestamp, runTransaction } from "firebase/firestore";
import { WORKAHOLIC_API_BASE } from "../constants/workaholicApi";

// ─── Token ────────────────────────────────────────────────────────────────────

function generateCustomerViewToken() {
  // ~22 tecken alfanumerisk — tillräcklig entropi för en URL-token
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 14);
}

// ─── URL ──────────────────────────────────────────────────────────────────────

export function buildCustomerViewUrl(token) {
  return `${WORKAHOLIC_API_BASE}/project/${token}`;
}

// ─── Standardvärden ───────────────────────────────────────────────────────────

const DEFAULT_PERMISSIONS = {
  showMilestones: true,
  showDocuments: true,
  showMaterialList: false, // ALDRIG true — hårdkodad server-side och här
  showGallery: true,
};

/**
 * Genererar tre generiska milstolpar.
 * Kan i framtiden anpassas per projekttyp via en `type`-parameter.
 */
function defaultMilestones() {
  return [
    { name: "Förberedelser & planering", status: "pending", date: null },
    { name: "Utförande av arbete",        status: "pending", date: null },
    { name: "Slutbesiktning & överlämning", status: "pending", date: null },
  ];
}

// ─── Firestore-sökvägar ───────────────────────────────────────────────────────

function groupRef(companyId, groupId) {
  return doc(db, "companies", companyId, "groups", groupId);
}

function customerViewRef(token) {
  return doc(db, "customerViews", token);
}

// ─── API ──────────────────────────────────────────────────────────────────────

/**
 * Initierar en ny kundvy för ett projekt.
 * Returnerar { token, url } om det lyckas.
 *
 * Om projektet redan har en kundvy (customerViewToken på group-dokumentet)
 * returneras befintlig token istället för att skapa en ny.
 *
 * @param {string} groupId
 * @param {string} address  - project.customerAddress
 * @param {string} companyId
 * @returns {Promise<{ token: string, url: string }>}
 */
export async function initCustomerView(groupId, address, companyId) {
  if (!groupId || !companyId) throw new Error("groupId och companyId krävs.");

  const gRef = groupRef(companyId, groupId);

  return runTransaction(db, async (transaction) => {
    // Läs group-dokumentet inuti transaktionen — förhindrar TOCTOU om två
    // enheter anropar initCustomerView samtidigt för samma projekt.
    const groupSnap = await transaction.get(gRef);

    if (!groupSnap.exists()) {
      throw new Error("Projektdokumentet hittades inte.");
    }

    // Idempotent: returnera befintlig token utan att skriva något.
    const existing = groupSnap.data()?.customerViewToken;
    if (existing) {
      return { token: existing, url: buildCustomerViewUrl(existing) };
    }

    const token = generateCustomerViewToken();
    const cvRef = customerViewRef(token);

    // Båda skrivningarna ingår i samma transaktion.
    // Firestore garanterar att antingen lyckas BÅDA eller INGEN — aldrig halva.
    transaction.set(cvRef, {
      groupId,
      companyId,
      address: String(address || "").trim(),
      status: "active",
      permissions: DEFAULT_PERMISSIONS,
      milestones: defaultMilestones(),
      documents: [],
      gallery: [],
      accessShareToken: token,
      createdBy: auth.currentUser?.uid || "",
      createdAt: serverTimestamp(),
    });

    transaction.update(gRef, { customerViewToken: token });

    return { token, url: buildCustomerViewUrl(token) };
  });
}

/**
 * Uppdaterar permissions för en befintlig kundvy.
 * showMaterialList låses alltid till false oavsett vad som skickas in.
 *
 * @param {string} token
 * @param {object} permissions - { showMilestones, showDocuments, showGallery }
 */
export async function updateCustomerViewPermissions(token, permissions) {
  if (!token) throw new Error("token krävs.");
  await updateDoc(customerViewRef(token), {
    permissions: {
      showMilestones: Boolean(permissions.showMilestones ?? true),
      showDocuments:  Boolean(permissions.showDocuments  ?? true),
      showMaterialList: false, // Låst
      showGallery:    Boolean(permissions.showGallery    ?? true),
    },
  });
}

/**
 * Stänger kundvyn (sätter status "completed") och tar bort token-referensen
 * från group-dokumentet så att hantverkaren kan aktivera en ny vy senare.
 *
 * @param {string} token
 * @param {string} companyId
 * @param {string} groupId
 */
export async function deactivateCustomerView(token, companyId, groupId) {
  if (!token || !companyId || !groupId) throw new Error("token, companyId och groupId krävs.");
  await updateDoc(customerViewRef(token), { status: "completed" });
  await updateDoc(groupRef(companyId, groupId), { customerViewToken: null });
}

/**
 * Hämtar befintlig kundvy-data (permissions) för en given token.
 * Returnerar null om dokumentet inte finns.
 *
 * @param {string} token
 * @returns {Promise<object|null>}
 */
export async function getCustomerView(token) {
  if (!token) return null;
  const snap = await getDoc(customerViewRef(token));
  return snap.exists() ? snap.data() : null;
}
