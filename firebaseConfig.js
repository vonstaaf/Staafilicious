// firebaseConfig.js
import { initializeApp, getApps } from "firebase/app";
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
// VIKTIGT: Vi behåller importen, men tar bort användningen för att felsöka kraschen
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// 🔑 Dina Firebase-nycklar (hardkodade, vilket är OK för tillfället)
const firebaseConfig = {
  apiKey: "AIzaSyDvomXmrLbI6s5uGsrWAeQU-idJYfCRrq8",
  authDomain: "staafilicious.firebaseapp.com",
  projectId: "staafilicious",
  storageBucket: "staafilicious.appspot.com",
  messagingSenderId: "763451849508",
  appId: "1:763451849508:web:46f73405e868a62c1d91b1",
  measurementId: "G-D67MDTNMDB"
};

// 🚀 Initiera Firebase (Säkerställer att appen inte initieras två gånger)
let app;
if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0];
}


// 🛡️ App Check (KRITISK FIX: Används endast på webb)
if (Platform.OS === "web") {
  // Web använder reCAPTCHA V3
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider("din-site-key-från-Firebase"),
    isTokenAutoRefreshEnabled: true,
  });
} else {
  // NATIVE FIX: Vi hoppar över App Check på Android/iOS helt och hållet
  // för att undvika den Native Crash som orsakas av felaktig provider-konfiguration
  // eller saknade Native-moduler i EAS Build.
  console.log("App Check initiering hoppades över på Native för att undvika krasch.");
}

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

// 📦 Firestore
export const db = getFirestore(app);

// 📊 Analytics
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