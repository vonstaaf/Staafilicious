import React, { useEffect, useState } from "react";
import { StatusBar, Image, TouchableOpacity, View, StyleSheet, Platform } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

// Kontexter
import { ProjectsProvider } from "./context/ProjectsContext"; 
import { BadgeProvider, useBadges } from "./context/BadgeContext";
import { WorkaholicTheme } from "./theme";

// Skärmar
import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import HomeScreen from "./screens/HomeScreen";
import ProductsScreen from "./screens/ProductsScreen";
import KostnaderScreen from "./screens/KostnaderScreen"; 
import SettlementScreen from "./screens/SettlementScreen";
import LoadingScreen from "./screens/LoadingScreen";
import SettingsScreen from "./screens/SettingsScreen";
import ProfileScreen from "./screens/ProfileScreen";
import InspectionScreen from "./screens/InspectionScreen"; // ⭐ NY SKÄRM

// Firebase
import { auth } from "./firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const FixedHeaderLogo = () => {
  return (
    <Image
      source={require("./assets/workaholic_logo_white.png")}
      style={{ width: 160, height: 140 }}
      resizeMode="contain"
    />
  );
};

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

// --- MAIN TABS ---
function MainTabs() {
  const insets = useSafeAreaInsets();
  const { 
    KostnaderCount, 
    productsCount, 
    notificationsCount,
    setProductsCount,  
    setKostnaderCount  
  } = useBadges();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === "Home") iconName = "briefcase";
          else if (route.name === "Products") iconName = "cube";
          else if (route.name === "Kostnader") iconName = "time";
          else if (route.name === "Inspection") iconName = "clipboard-outline"; // ⭐ IKON FÖR EGENKONTROLL
          else if (route.name === "Settlement") iconName = "receipt";
          else if (route.name === "Profile") iconName = "person";
          return <Ionicons name={iconName} size={size} color={color} />;
        },

        tabBarActiveTintColor: WorkaholicTheme.colors.primary,
        tabBarInactiveTintColor: "#8E8E93",

        tabBarStyle: { 
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E5E5EA",
          height: Platform.OS === 'ios' ? 65 + insets.bottom : 75 + insets.bottom, 
          paddingBottom: insets.bottom > 0 ? insets.bottom : 15,
          paddingTop: 10,
          elevation: 8,
        },

        tabBarLabelStyle: {
          fontSize: 10, // Något mindre för att få plats med fler ikoner
          fontWeight: "600",
          marginBottom: insets.bottom > 0 ? 0 : 5,
        },

        headerTitle: () => <FixedHeaderLogo />,
        headerTitleAlign: "center",
        headerStyle: { 
          backgroundColor: WorkaholicTheme.colors.primary,
          height: 100,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: "#FFFFFF",
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Projekt" }} />
      
      <Tab.Screen 
        name="Products" 
        component={ProductsScreen} 
        options={{ 
          title: "Artiklar",
          tabBarBadge: productsCount > 0 ? productsCount : null 
        }}
        listeners={{
          tabPress: () => { if (setProductsCount) setProductsCount(0); },
        }}
      />

      <Tab.Screen 
        name="Kostnader" 
        component={KostnaderScreen} 
        options={{ 
          title: "Arbetstid",
          tabBarBadge: KostnaderCount > 0 ? KostnaderCount : null 
        }}
        listeners={{
          tabPress: () => { if (setKostnaderCount) setKostnaderCount(0); },
        }}
      />

      {/* ⭐ NY FLIK: EGENKONTROLL ⭐ */}
      <Tab.Screen 
        name="Inspection" 
        component={InspectionScreen} 
        options={{ title: "Kontroll" }} 
      />

      <Tab.Screen 
        name="Settlement" 
        component={SettlementScreen} 
        options={{ title: "Underlag" }} 
      />

      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ 
          title: "Profil",
          tabBarBadge: notificationsCount > 0 ? notificationsCount : null 
        }} 
      />
    </Tab.Navigator>
  );
}

// --- AUTH & MAIN STACKS ---
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: WorkaholicTheme.colors.primary },
        headerTintColor: "#fff",
        headerTitleAlign: "center",
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Logga in" }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ title: "Skapa konto" }} />
    </Stack.Navigator>
  );
}

function MainStack() {
  const { notificationsCount } = useBadges();

  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: WorkaholicTheme.colors.primary },
        headerTintColor: "#FFFFFF",
        headerTitleAlign: "center",
        headerLeft: () => (
          <TouchableOpacity onPress={() => navigation.navigate("Settings")} style={{ marginLeft: 15 }}>
            <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
            {notificationsCount > 0 && <View style={styles.badgeDot} />}
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity 
            onPress={() => signOut(auth).catch(() => alert("Kunde inte logga ut"))} 
            style={{ marginRight: 15 }}
          >
            <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ),
      })}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Inställningar" }} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, []);

  if (initializing) return <LoadingScreen />;

  return (
    <SafeAreaProvider>
      <ProjectsProvider>
        <BadgeProvider>
          <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
          <NavigationContainer theme={navigationTheme}>
            {user ? <MainStack /> : <AuthStack />}
          </NavigationContainer>
        </BadgeProvider>
      </ProjectsProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  badgeDot: {
    position: "absolute",
    right: -2,
    top: -2,
    backgroundColor: WorkaholicTheme.colors.error || "#FF3B30",
    borderRadius: 6,
    width: 10,
    height: 10,
    borderWidth: 1.5,
    borderColor: WorkaholicTheme.colors.primary,
  }
});