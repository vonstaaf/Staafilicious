import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

/**
 * Hämtar företagets medlemmar (companies/{companyId}/members) med visningsnamn från users/{uid}.
 * @param {string|null} companyId
 * @returns {{ members: Array<{ uid: string, email?: string, role: string, displayName: string }>, loading: boolean }}
 */
export function useCompanyMembers(companyId) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const membersSnap = await getDocs(
          collection(db, "companies", companyId, "members")
        );
        if (cancelled) return;

        const list = [];
        for (const m of membersSnap.docs) {
          const uid = m.id;
          const data = m.data();
          let displayName = data.email || uid.slice(0, 8) + "…";
          try {
            const userSnap = await getDoc(doc(db, "users", uid));
            if (userSnap.exists()) {
              const u = userSnap.data();
              displayName = u.companyName || u.displayName || u.email || displayName;
            }
          } catch (_) {}
          list.push({
            uid,
            email: data.email || null,
            role: data.role || "employee",
            displayName,
          });
        }
        if (!cancelled) setMembers(list);
      } catch (err) {
        if (!cancelled) setMembers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [companyId]);

  return { members, loading };
}
