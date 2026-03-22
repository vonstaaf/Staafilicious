import React, { useEffect, useState } from "react";
import { StatusBar } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import Ionicons from "@expo/vector-icons/Ionicons";

// Kontexter
import { CompanyProvider, CompanyContext } from "./context/CompanyContext";
import { ProjectsProvider } from "./context/ProjectsContext"; 
import { BadgeProvider } from "./context/BadgeContext";
import { SettingsProvider } from "./context/SettingsContext"; 
import { ThemeProvider, useTheme } from "./context/ThemeContext";

// Navigation Stacks
import AuthStack from "./navigation/AuthStack"; 
import MainStack from "./navigation/MainStack"; 

// Skärmar
import LoadingScreen from "./screens/LoadingScreen";
import NoCompanyScreen from "./screens/NoCompanyScreen";
import LicenseScreen from "./screens/LicenseScreen";
import LicenseExpiredScreen from "./screens/LicenseExpiredScreen";

// Firebase & Notiser
import { auth } from "./firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { registerForPushNotificationsAsync } from "./utils/notificationHelper"; 
import { useCompanyLicense } from "./hooks/useCompanyLicense";

function AppContent() {
  const { user, needsLicense, loading: companyLoading } = React.useContext(CompanyContext);
  const { licenseState } = useCompanyLicense();
  const theme = useTheme();
  const [showLicenseCode, setShowLicenseCode] = React.useState(false);

  const navigationTheme = React.useMemo(() => ({
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.primary,
      text: "#FFFFFF",
    },
  }), [theme.colors.primary, theme.colors.background]);

  useEffect(() => {
    if (user) registerForPushNotificationsAsync(user.uid);
  }, [user?.uid]);

  if (companyLoading) return <LoadingScreen />;

  return (
    <NavigationContainer theme={navigationTheme}>
      {!user ? (
        <AuthStack />
      ) : needsLicense ? (
        showLicenseCode ? (
          <LicenseScreen onBack={() => setShowLicenseCode(false)} />
        ) : (
          <NoCompanyScreen onShowLicenseCode={() => setShowLicenseCode(true)} />
        )
      ) : licenseState === "expired" || licenseState === "trial_expired" ? (
        <LicenseExpiredScreen />
      ) : (
        <MainStack />
      )}
    </NavigationContainer>
  );
}

function App() {
  const [initializing, setInitializing] = useState(true);

  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, []);

  if (!fontsLoaded && !fontError) return <LoadingScreen />;
  if (initializing) return <LoadingScreen />;

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <CompanyProvider>
          <ThemeProvider>
            <ProjectsProvider>
              <BadgeProvider>
                <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
                <AppContent />
              </BadgeProvider>
            </ProjectsProvider>
          </ThemeProvider>
        </CompanyProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

export default App;