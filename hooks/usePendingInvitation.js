import { useState, useEffect } from "react";
import { collectionGroup, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";

/**
 * Lyssnar i realtid på väntande inbjudningar för användarens e-post.
 * @param {string | undefined} userEmail - Användarens e-post (lowercase)
 * @returns {{ invitation: { companyId: string, companyName: string } | null }}
 */
export function usePendingInvitation(userEmail) {
  const [invitation, setInvitation] = useState(null);

  useEffect(() => {
    const email = (userEmail || "").toString().trim().toLowerCase();
    if (!email) {
      setInvitation(null);
      return undefined;
    }

    const q = query(
      collectionGroup(db, "invitations"),
      where("email", "==", email),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          setInvitation(null);
          return;
        }
        const doc = snap.docs[0];
        const data = doc.data();
        const pathParts = doc.ref.path.split("/");
        const companyId = pathParts[1];
        setInvitation({
          id: doc.id,
          companyId,
          companyName: data.companyName || "Företaget",
        });
      },
      (err) => {
        setInvitation(null);
        const code = err?.code;
        // permission-denied: Firestore-regler i Firebase-projektet matchar inte repots firestore.rules (deploy saknas).
        // failed-precondition: saknar ev. sammansatt index för collection group-query.
        if (code === "permission-denied" || code === "failed-precondition") {
          if (__DEV__) {
            console.warn(
              "[usePendingInvitation]",
              code,
              code === "permission-denied"
                ? "Deploya firestore.rules till Firebase (npm run deploy:rules:firebase i workaholic-web)."
                : "Kontrollera att sammansatt index finns för collection group invitations + email + status."
            );
          }
          return;
        }
        if (__DEV__) {
          console.warn("[usePendingInvitation]", err);
        }
      }
    );

    return () => unsubscribe();
  }, [userEmail]);

  return { invitation };
}
