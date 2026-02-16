import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { auth, db, storage } from '../firebaseConfig'; 
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

const LOGO_KEY = '@company_logo'; 

/**
 * 1. LOGOTYP-HANTERING
 */
export const uploadLogoToCloud = async (uri) => {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    // Sökväg: users/UID/logo.png
    const storageRef = ref(storage, `users/${user.uid}/logo.png`);
    
    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);
    
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      logoUrl: downloadURL,
      updatedAt: new Date().toISOString()
    });

    // Spara även lokalt för snabb åtkomst
    await AsyncStorage.setItem(LOGO_KEY, downloadURL);

    return downloadURL;
  } catch (e) {
    console.error("Kunde inte ladda upp logotyp till molnet:", e);
    throw e;
  }
};

export const getSavedLogo = async () => {
  try {
    const localUri = await AsyncStorage.getItem(LOGO_KEY);
    if (localUri) {
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (fileInfo.exists) return localUri;
    }

    const user = auth.currentUser;
    if (user) {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists() && userDoc.data().logoUrl) {
        const cloudUrl = userDoc.data().logoUrl;
        await AsyncStorage.setItem(LOGO_KEY, cloudUrl);
        return cloudUrl;
      }
    }
    return null;
  } catch (e) {
    console.error("Fel vid hämtning av logotyp:", e);
    return null;
  }
};

export const removeSavedLogo = async () => {
  try {
    await AsyncStorage.removeItem(LOGO_KEY);
    const user = auth.currentUser;
    if (user) {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { logoUrl: null });
    }
  } catch (e) {
    console.error("Kunde inte rensa logotypen", e);
  }
};

/**
 * 2. PROJEKTBILD-HANTERING
 */
export const uploadProjectImage = async (projectId, uri) => {
  const user = auth.currentUser;
  if (!user || !uri) return null;

  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = `img_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const storageRef = ref(storage, `projects/${projectId}/inspections/${filename}`);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  } catch (e) {
    console.error("Fel vid uppladdning av projektbild:", e);
    return null;
  }
};