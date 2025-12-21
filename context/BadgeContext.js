import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ProjectsContext } from "./ProjectsContext"; 

const BadgeContext = createContext();

export function BadgeProvider({ children }) {
  const { selectedProject } = useContext(ProjectsContext);
  const [KostnaderCount, setKostnaderCount] = useState(0);
  const [productsCount, setProductsCount] = useState(0);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [currentLogo, setCurrentLogo] = useState(null);

  // 1. Laddar loggan initialt från lagringen vid app-start
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const savedLogo = await AsyncStorage.getItem("user_logo");
        if (savedLogo) {
          setCurrentLogo(savedLogo);
        }
      } catch (e) {
        console.error("BadgeContext: Fel vid laddning av logotyp", e);
      }
    };
    loadLogo();
  }, []);

  // 2. SPARAR loggan automatiskt när currentLogo ändras
  useEffect(() => {
    const saveLogo = async () => {
      try {
        if (currentLogo) {
          await AsyncStorage.setItem("user_logo", currentLogo);
        }
      } catch (e) {
        console.error("BadgeContext: Fel vid sparande av logotyp", e);
      }
    };
    saveLogo();
  }, [currentLogo]);

  // 3. Uppdaterar räknare automatiskt när ett projekt väljs eller ändras i Firebase
  useEffect(() => {
    if (selectedProject) {
      // Räkna rader i kostnader (arbetslogg)
      const kCount = selectedProject.kostnader?.length || 0;
      setKostnaderCount(kCount);

      // Räkna artiklar/produkter
      const pCount = selectedProject.products?.length || 0;
      setProductsCount(pCount);
    } else {
      // Om inget projekt är valt, nollställ räknarna
      setKostnaderCount(0);
      setProductsCount(0);
    }
  }, [selectedProject]);

  return (
    <BadgeContext.Provider 
      value={{ 
        // Räknare
        KostnaderCount, 
        productsCount, 
        notificationsCount,
        
        // Funktioner för att ändra/nollställa
        setKostnaderCount, 
        setProductsCount,  
        setNotificationsCount,

        // Global logotyp-hantering
        currentLogo,       
        setCurrentLogo     
      }}
    >
      {children}
    </BadgeContext.Provider>
  );
}

export const useBadges = () => useContext(BadgeContext);