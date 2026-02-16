import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [companyInfo, setCompanyInfo] = useState({
    name: "",
    orgNr: "",
    address: "",
    zipCity: "",
    email: "",
    logo: null 
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem("workaholic_settings");
      if (saved) setCompanyInfo(JSON.parse(saved));
    } catch (e) { console.error("Kunde inte ladda inställningar", e); }
  };

  const saveSettings = async (info) => {
    try {
      setCompanyInfo(info);
      await AsyncStorage.setItem("workaholic_settings", JSON.stringify(info));
    } catch (e) { console.error("Kunde inte spara inställningar", e); }
  };

  return (
    <SettingsContext.Provider value={{ companyInfo, saveSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};