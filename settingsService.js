import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const LOGO_KEY = '@project_logo_uri';

/**
 * Sparar logotypen permanent.
 * Används i din Settings-vy när användaren valt en bild.
 */
export const saveLogoLocally = async (uri) => {
  try {
    await AsyncStorage.setItem(LOGO_KEY, uri);
    console.log("✅ Logotyp sparad för framtida Projekt");
  } catch (e) {
    console.error("Kunde inte spara logotypen lokalt", e);
  }
};

/**
 * Hämtar den sparade logotypen.
 * Kontrollerar även att filen fortfarande existerar på telefonen.
 */
export const getSavedLogo = async () => {
  try {
    const uri = await AsyncStorage.getItem(LOGO_KEY);
    
    if (!uri) return null;

    // Viktigt: Kontrollera att filen inte raderats från telefonens cache
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      console.warn("Logotyp-filen hittades inte längre på enheten.");
      return null;
    }

    return uri;
  } catch (e) {
    console.error("Fel vid hämtning av sparad logotyp", e);
    return null;
  }
};

/**
 * Rensar logotypen om användaren vill ta bort den.
 */
export const removeSavedLogo = async () => {
  try {
    await AsyncStorage.removeItem(LOGO_KEY);
  } catch (e) {
    console.error("Kunde inte rensa logotypen", e);
  }
};