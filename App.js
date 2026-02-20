import React, { useEffect, useState } from "react";
import { StatusBar } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

// 🔑 IMPORTERA SENTRY
import * as Sentry from "@sentry/react-native";

// Kontexter
import { ProjectsProvider } from "./context/ProjectsContext"; 
import { BadgeProvider } from "./context/BadgeContext";
import { SettingsProvider } from "./context/SettingsContext"; 
import { WorkaholicTheme } from "./theme";

// Navigation Stacks
import AuthStack from "./navigation/AuthStack"; 
import MainStack from "./navigation/MainStack"; 

// Skärmar
import LoadingScreen from "./screens/LoadingScreen";

// Firebase & Notiser
import { auth } from "./firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { registerForPushNotificationsAsync } from "./utils/notificationHelper"; 

// 🔑 INITIERA SENTRY MED DIN LÄNK
Sentry.init({
  dsn: "https://a472c03a7d671ce02382603f08ed58f0@o4510920097988608.ingest.de.sentry.io/4510920106049616",
  debug: __DEV__, // Visar loggar i terminalen när du kodar
  enableInExpoDevelopment: true,
});

// Anpassat tema för Navigation
const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: WorkaholicTheme.colors.primary,
    background: WorkaholicTheme.colors.background,
    card: WorkaholicTheme.colors.primary,
    text: "#FFFFFF",
  },
};

function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      
      if (usr) {
        registerForPushNotificationsAsync(usr.uid);
        
        // 🔑 Berätta för Sentry vem som är inloggad (hjälper vid felsökning)
        Sentry.setUser({ id: usr.uid, email: usr.email });
      } else {
        // Nollställ om användaren loggar ut
        Sentry.setUser(null);
      }

      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, []);

  if (initializing) return <LoadingScreen />;

  return (
    <SafeAreaProvider>
      <SettingsProvider> 
        <ProjectsProvider>
          <BadgeProvider>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            
            <NavigationContainer theme={navigationTheme}>
              {user ? (
                <MainStack />
              ) : (
                <AuthStack />
              )}
            </NavigationContainer>
          </BadgeProvider>
        </ProjectsProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

// 🔑 WRAPPA APPEN MED SENTRY FÖR ATT FÅNGA ALLA KRASCHAR
export default Sentry.wrap(App);