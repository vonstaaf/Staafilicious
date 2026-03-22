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
        console.error("[usePendingInvitation]", err);
        setInvitation(null);
      }
    );

    return () => unsubscribe();
  }, [userEmail]);

  return { invitation };
}
