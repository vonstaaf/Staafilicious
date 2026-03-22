import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebaseConfig";
import { WorkaholicTheme, getThemeForProfession } from "../theme";
import { getProfessionKeys } from "../constants/wholesalers";

const ThemeContext = createContext(WorkaholicTheme);
const ProfessionContext = createContext("");

export function mergeTheme(base, overrides) {
  if (!overrides || Object.keys(overrides).length === 0) return base;
  return {
    ...base,
    colors: { ...base.colors, ...(overrides.colors || {}) },
    shadows: overrides.shadows ? { ...base.shadows, ...overrides.shadows } : base.shadows,
  };
}

export function ThemeProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profession, setProfession] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u ?? null));
    return unsub;
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setProfession("");
      return;
    }
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      setProfession(snap.exists() ? snap.data().profession || "" : "");
    });
    return unsub;
  }, [user?.uid]);

  const theme = useMemo(() => {
    const keys = getProfessionKeys(profession);
    const overrides = getThemeForProfession(keys);
    return mergeTheme(WorkaholicTheme, overrides);
  }, [profession]);

  return (
    <ThemeContext.Provider value={theme}>
      <ProfessionContext.Provider value={profession}>
        {children}
      </ProfessionContext.Provider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  return context || WorkaholicTheme;
}

/** Yrkessträng från users/{uid} (samma källa som temat). */
export function useProfession() {
  return useContext(ProfessionContext);
}
