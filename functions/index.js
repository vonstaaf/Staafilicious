/**
 * Cloud Functions för Workaholic B2B (licenser, claim).
 *
 * Kräver: npm install firebase-functions firebase-admin
 * Deploy: firebase deploy --only functions
 *
 * Region: europe-west1 (samma som i firebaseConfig.js: getFunctions(app, "europe-west1"))
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const callOpts = { region: "europe-west1" };

/**
 * Callable: claimLicense
 * Anropas från appen när användaren anger en licenskod.
 * Kräver att användaren är inloggad (context.auth.uid).
 *
 * Input: { code: string }
 * Output: { companyId: string, role: string }
 * Fel: kasta HttpsError med code och message (t.ex. "license-full", "Licensen är full.")
 */
exports.claimLicense = onCall(callOpts, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Du måste vara inloggad.");
  }

  const data = request.data || {};
  const code = (data.code || "").toString().trim().toUpperCase();
  if (!code) {
    throw new HttpsError("invalid-argument", "Ange en licenskod.");
  }

  const uid = request.auth.uid;
  const userEmail = request.auth.token?.email || null;

  // 1. Kolla om användaren redan har ett företag
  const userRef = db.doc(`users/${uid}`);
  const userSnap = await userRef.get();
  if (userSnap.exists && userSnap.data().companyId) {
    throw new HttpsError("failed-precondition", "ALREADY_CLAIMED");
  }

  // 2. Lookup licens via licenseCodes/{code}
  const codeRef = db.doc(`licenseCodes/${code}`);
  const codeSnap = await codeRef.get();
  if (!codeSnap.exists) {
    throw new HttpsError("invalid-argument", "INVALID_CODE");
  }

  const licenseId = codeSnap.data().licenseId;
  if (!licenseId) {
    throw new HttpsError("invalid-argument", "INVALID_CODE");
  }

  // 3. Hämta licens
  const licenseRef = db.doc(`licenses/${licenseId}`);
  const licenseSnap = await licenseRef.get();
  if (!licenseSnap.exists) {
    throw new HttpsError("invalid-argument", "INVALID_CODE");
  }

  const license = licenseSnap.data();
  const companyId = license.companyId;

  if (license.status !== "active") {
    throw new HttpsError("failed-precondition", "LICENSE_INACTIVE");
  }

  const maxSeats = license.maxSeats || 0;
  const usedSeats = license.usedSeats || 0;
  if (usedSeats >= maxSeats) {
    throw new HttpsError("resource-exhausted", "LICENSE_FULL");
  }

  // 4. Kolla att användaren inte redan är medlem i detta företag
  const memberRef = db.doc(`companies/${companyId}/members/${uid}`);
  const memberSnap = await memberRef.get();
  if (memberSnap.exists) {
    // Redan medlem – uppdatera bara user-doc om det saknas
    await userRef.set(
      { companyId, role: memberSnap.data().role || "employee" },
      { merge: true }
    );
    return { companyId, role: memberSnap.data().role || "employee" };
  }

  // 5. Transaktion: lägg till member, öka usedSeats, uppdatera user
  await db.runTransaction(async (tx) => {
    tx.set(memberRef, {
      role: "employee",
      email: userEmail || null,
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.update(licenseRef, {
      usedSeats: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.set(userRef, { companyId, role: "employee" }, { merge: true });
  });

  return { companyId, role: "employee" };
});

/**
 * Callable: acceptInvitation
 * Söker efter väntande inbjudan för användarens e-post och kopplar dem till företaget.
 * Anropas vid inloggning när användaren saknar companyId.
 *
 * Output: { companyId, companyName, role } eller null om ingen inbjudan hittas
 */
exports.acceptInvitation = onCall(callOpts, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Du måste vara inloggad.");
  }

  const uid = request.auth.uid;
  const userEmail = (request.auth.token?.email || "").toString().trim().toLowerCase();
  if (!userEmail) {
    throw new HttpsError(
      "failed-precondition",
      "Din e-post kunde inte läsas. Logga in med e-post och lösenord."
    );
  }

  const userRef = db.doc(`users/${uid}`);
  const userSnap = await userRef.get();
  if (userSnap.exists && userSnap.data().companyId) {
    return null;
  }

  const invitationsSnap = await db
    .collectionGroup("invitations")
    .where("email", "==", userEmail)
    .where("status", "==", "pending")
    .limit(1)
    .get();

  if (invitationsSnap.empty) {
    return null;
  }

  const inviteDoc = invitationsSnap.docs[0];
  const inviteData = inviteDoc.data();
  const pathParts = inviteDoc.ref.path.split("/");
  const companyId = pathParts[1];
  const inviteRef = inviteDoc.ref;

  const companyRef = db.doc(`companies/${companyId}`);
  const companySnap = await companyRef.get();
  if (!companySnap.exists) {
    throw new HttpsError("not-found", "Företaget hittades inte.");
  }
  const companyName = companySnap.data().companyName || "Företaget";

  const memberRef = db.doc(`companies/${companyId}/members/${uid}`);
  const role = inviteData.role || "employee";

  await db.runTransaction(async (tx) => {
    tx.set(memberRef, {
      role,
      email: userEmail,
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.set(userRef, { companyId, role }, { merge: true });
    tx.update(inviteRef, {
      status: "accepted",
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return { companyId, companyName, role };
});
