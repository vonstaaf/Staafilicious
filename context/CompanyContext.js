import React, { createContext, useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebaseConfig";
import { acceptInvitation } from "../services/invitationService";
import { getLicenseState } from "../utils/subscriptionAccess";

export const CompanyContext = createContext();

function computeLicenseState(companyDoc) {
  return getLicenseState(companyDoc);
}

/**
 * Hanterar B2B-tenant: companyId och role för inloggad användare.
 * Om användaren inte har companyId visas licensprompten i appen.
 */
export function CompanyProvider({ children }) {
  const [user, setUser] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companyDoc, setCompanyDoc] = useState(null);
  const [licenseState, setLicenseState] = useState("unknown");

  const loadCompanyFromUser = useCallback(async (uid) => {
    if (!uid) {
      setCompanyId(null);
      setRole(null);
      return;
    }
    try {
      const userSnap = await getDoc(doc(db, "users", uid));
      if (userSnap.exists()) {
        const data = userSnap.data();
        setCompanyId(data.companyId ?? null);
        setRole(data.role ?? null);
      } else {
        setCompanyId(null);
        setRole(null);
      }
    } catch (err) {
      console.error("[CompanyContext] Kunde inte hämta user doc:", err);
      setCompanyId(null);
      setRole(null);
    }
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser ?? null);
      if (!authUser) {
        setCompanyId(null);
        setRole(null);
        setCompanyDoc(null);
        setLicenseState("unknown");
        setLoading(false);
        return;
      }

      const userSnap = await getDoc(doc(db, "users", authUser.uid));
      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.companyId) {
          setCompanyId(data.companyId);
          setRole(data.role ?? null);
          setLoading(false);
          return;
        }
      }

      try {
        const accepted = await acceptInvitation();
        if (accepted?.companyName) {
          Alert.alert(
            "Välkommen!",
            `Välkommen till ${accepted.companyName}! Du har nu lagts till i teamet.`
          );
        }
      } catch (e) {
        console.error("[CompanyContext] acceptInvitation:", e);
      }

      await loadCompanyFromUser(authUser.uid);
      setLoading(false);
    });
    return unsubscribeAuth;
  }, [loadCompanyFromUser]);

  // Realtime-lyssnare på users/{uid} så att companyId/role uppdateras efter claimLicense
  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCompanyId(data.companyId ?? null);
        setRole(data.role ?? null);
      }
    });
    return unsubscribe;
  }, [user?.uid]);

  // Lyssna på companies/{companyId} för licensstatus
  useEffect(() => {
    if (!companyId) {
      setCompanyDoc(null);
      setLicenseState("unknown");
      return;
    }
    const companyRef = doc(db, "companies", companyId);
    const unsubscribe = onSnapshot(companyRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCompanyDoc({ id: snap.id, ...data }); // Inkl. logoUrl för branding i appen
        setLicenseState(computeLicenseState(data));
      } else {
        setCompanyDoc(null);
        setLicenseState("unknown");
      }
    });
    return unsubscribe;
  }, [companyId]);

  const refetch = useCallback(() => {
    if (user?.uid) loadCompanyFromUser(user.uid);
  }, [user?.uid, loadCompanyFromUser]);

  const value = {
    user,
    companyId,
    role,
    loading,
    company: companyDoc,
    licenseState,
    /** true om användaren är inloggad men inte kopplad till något företag → visa licensskärm */
    needsLicense: Boolean(user && !companyId),
    refetch,
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
}
