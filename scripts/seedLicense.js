/**
 * Seedar Firestore med testföretag, testlicens och första admin.
 *
 * Kräver: Node 18+, firebase-admin. Kör från projektets rot.
 *
 * Användning:
 *   node scripts/seedLicense.js --uid <din-firebase-auth-uid> [--email din@epost.se]
 *
 * Hämta din uid: logga in i appen med Firebase Auth och kolla i Firebase Console → Authentication,
 * eller lägg till en tillfällig console.log(auth.currentUser.uid) i appen efter inloggning.
 *
 * Alternativt (utan admin-användare – första som anger koden blir anställd):
 *   node scripts/seedLicense.js
 *
 * Miljö: Sätt GOOGLE_APPLICATION_CREDENTIALS till sökväg till service account JSON,
 * eller använd "firebase login" och ADC.
 */

const admin = require("firebase-admin");
const path = require("path");

const LICENSE_CODE = "TEST-1234";
const MAX_SEATS = 5;
const COMPANY_NAME = "Testföretag AB";
const PROJECT_NAME = "Elinstallation Solna";

function parseArgs() {
  const args = process.argv.slice(2);
  let uid = null;
  let email = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--uid" && args[i + 1]) uid = args[++i];
    if (args[i] === "--email" && args[i + 1]) email = args[++i];
  }
  return { uid, email };
}

function generateProjectCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function main() {
  const { uid: adminUid, email: adminEmail } = parseArgs();

  if (!admin.apps.length) {
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, "..", "serviceAccountKey.json");
    try {
      const fs = require("fs");
      if (fs.existsSync(keyPath)) {
        admin.initializeApp({ credential: admin.credential.cert(require(keyPath)) });
      } else {
        admin.initializeApp({ credential: admin.credential.applicationDefault() });
      }
    } catch (e) {
      console.error("Kunde inte ladda credentials. Använd ett av:");
      console.error("  1) Sätt GOOGLE_APPLICATION_CREDENTIALS till sökväg till service account JSON");
      console.error("  2) Lägg serviceAccountKey.json i projektroten");
      console.error("  3) Kör: gcloud auth application-default login");
      console.error(e.message);
      process.exit(1);
    }
  }

  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();
  const normalizedCode = LICENSE_CODE.trim().toUpperCase();

  const companyRef = db.collection("companies").doc();
  const companyId = companyRef.id;

  const licenseRef = db.collection("licenses").doc();
  const licenseId = licenseRef.id;

  const usedSeats = adminUid ? 1 : 0;

  console.log("Skapar testföretag, licens och (om --uid angiven) första admin...\n");

  await companyRef.set({
    licenseId,
    name: COMPANY_NAME,
    createdAt: now,
    updatedAt: now,
  });
  console.log("  companies/" + companyId);

  await licenseRef.set({
    code: LICENSE_CODE,
    companyId,
    maxSeats: MAX_SEATS,
    usedSeats,
    status: "active",
    purchasedByUid: adminUid || null,
    createdAt: now,
    updatedAt: now,
  });
  console.log("  licenses/" + licenseId);

  await db.collection("licenseCodes").doc(normalizedCode).set({
    licenseId,
  });
  console.log("  licenseCodes/" + normalizedCode);

  if (adminUid) {
    await db.collection("companies").doc(companyId).collection("members").doc(adminUid).set({
      role: "admin",
      email: adminEmail || null,
      joinedAt: now,
    });
    console.log("  companies/" + companyId + "/members/" + adminUid + " (admin)");

    const userRef = db.doc("users/" + adminUid);
    await userRef.set(
      { companyId, role: "admin" },
      { merge: true }
    );
    console.log("  users/" + adminUid + " (companyId, role)");
  } else {
    console.log("  (Ingen admin tillagd – ange --uid för att sätta första admin.)");
  }

  const projectCode = generateProjectCode();
  const groupRef = db.collection("groups").doc();
  const groupData = {
    companyId,
    name: PROJECT_NAME,
    code: projectCode,
    owner: adminUid || null,
    members: adminUid ? [adminUid] : [],
    status: "active",
    kostnader: [],
    products: [],
    inspectionItems: [],
    createdAt: new Date().toISOString(),
  };
  await groupRef.set(groupData);
  console.log("  groups/" + groupRef.id + " (projekt: " + PROJECT_NAME + ", kod: " + projectCode + ")");

  console.log("\nKlart.\n");
  console.log("Licenskod: " + LICENSE_CODE);
  console.log("Max platser: " + MAX_SEATS);
  if (adminUid) {
    console.log("Första admin: " + adminUid + (adminEmail ? " (" + adminEmail + ")" : ""));
    console.log("Denna användare kommer direkt in i appen utan att ange licenskod.");
  } else {
    console.log("Första person som anger " + LICENSE_CODE + " i appen kopplas som anställd.");
  }
  console.log("Projekt i listan: " + PROJECT_NAME + " (kod " + projectCode + ")");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
