import React, { useEffect, useState } from "react";
import { StatusBar } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

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

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      
      // 🔑 Registrera för notiser om användaren är inloggad
      if (usr) {
        registerForPushNotificationsAsync(usr.uid);
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