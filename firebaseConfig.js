// firebaseConfig.js
import { initializeApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, logEvent, isSupported } from "firebase/analytics";
import { Platform } from "react-native";

// 🔑 Byt ut dessa placeholders mot riktiga värden från Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyDvomXmrLbI6s5uGsrWAeQU-idJYfCRrq8",
  authDomain: "staafilicious.firebaseapp.com",
  projectId: "staafilicious",
  storageBucket: "staafilicious.appspot.app",
  messagingSenderId: "763451849508",
  appId: "1:763451849508:web:46f73405e868a62c1d91b1",
  measurementId: "G-D67MDTNMDB"
};

// 🚀 Initiera Firebase
const app = initializeApp(firebaseConfig);

// ✅ Auth med persistence (olika för web och mobil)
let auth;
if (Platform.OS === "web") {
  auth = getAuth(app);
  setPersistence(auth, browserLocalPersistence).catch((error) =>
    console.log("Auth persistence error:", error.message)
  );
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}
export { auth };

// 📦 Firestore (molndatabas för grupper, produkter, Kostnader)
export const db = getFirestore(app);

// 📊 Analytics (kontrollerar stöd innan initiering)
let analytics;
isSupported()
  .then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  })
  .catch((error) => {
    console.log("Analytics not supported:", error.message);
  });
export { analytics };

// 🔄 Hjälpfunktion för att logga events
export const logAnalyticsEvent = (eventName, params = {}) => {
  try {
    if (analytics) {
      logEvent(analytics, eventName, params);
    }
  } catch (error) {
    console.log("Analytics error:", error.message);
  }
};