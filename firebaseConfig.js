import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import { 
  initializeFirestore, 
  memoryLocalCache, 
  getFirestore 
} from "firebase/firestore"; 
import { getDatabase } from "firebase/database"; // 🔑 Ny import för Realtime Database
import { getStorage } from "firebase/storage";
import { getAnalytics, logEvent, isSupported } from "firebase/analytics";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Din konfiguration med databaseURL för Europa (Belgien)
const firebaseConfig = {
  apiKey: "AIzaSyDvomXmrLbI6s5uGsrWAeQU-idJYfCRrq8",
  authDomain: "staafilicious.firebaseapp.com",
  databaseURL: "https://staafilicious-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "staafilicious",
  storageBucket: "staafilicious.appspot.com",
  messagingSenderId: "763451849508",
  appId: "1:763451849508:web:46f73405e868a62c1d91b1",
  measurementId: "G-D67MDTNMDB"
};

// 1. Initiera Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 2. Initiera Firestore - Med Memory Cache fix för mobil
let db;
if (Platform.OS === 'web') {
  db = getFirestore(app);
} else {
  db = initializeFirestore(app, {
    localCache: memoryLocalCache() 
  });
}

// 3. Initiera Realtime Database (rtdb) 🔑
// Genom att initiera den här med 'app' tvingas den använda databaseURL från configen ovan.
export const rtdb = getDatabase(app);

// 4. Initiera Storage
export const storage = getStorage(app);

// 5. Initiera Auth med AsyncStorage persistence
let auth;
if (Platform.OS === "web") {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    auth = getAuth(app);
  }
}

// Analytics
let analytics;
isSupported().then((supported) => {
  if (supported) analytics = getAnalytics(app);
}).catch(() => {});

export const logAnalyticsEvent = (eventName, params = {}) => {
  if (analytics) logEvent(analytics, eventName, params);
};

export { auth, app, db };