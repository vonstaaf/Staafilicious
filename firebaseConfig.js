import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, logEvent, isSupported } from "firebase/analytics";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyDvomXmrLbI6s5uGsrWAeQU-idJYfCRrq8",
  authDomain: "staafilicious.firebaseapp.com",
  projectId: "staafilicious",
  storageBucket: "staafilicious.appspot.com",
  messagingSenderId: "763451849508",
  appId: "1:763451849508:web:46f73405e868a62c1d91b1",
  measurementId: "G-D67MDTNMDB"
};

// 1. Initiera Firebase App (Singleton-mönster)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 2. Initiera Auth korrekt beroende på plattform
let auth;

if (Platform.OS === "web") {
  // På webben sköter Firebase persistence automatiskt via IndexDB/LocalStorage
  auth = getAuth(app);
} else {
  // För iOS/Android använder vi AsyncStorage för att komma ihåg inloggningen
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    // Om initializeAuth redan har körts (t.ex. vid hot reload), hämta den befintliga instansen
    auth = getAuth(app);
  }
}

// 3. Exportera tjänster
export const db = getFirestore(app);

// Analytics hantering (fungerar främst på webb/mobil med extra konfiguration)
let analytics;
isSupported().then((supported) => {
  if (supported) analytics = getAnalytics(app);
}).catch(() => {});

export const logAnalyticsEvent = (eventName, params = {}) => {
  if (analytics) logEvent(analytics, eventName, params);
};

export { auth, app };