// App.js
import React, { useEffect, useState } from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GroupsProvider } from "./context/GroupsContext";
import { WorkaholicTheme } from "./theme";

import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import HomeScreen from "./screens/HomeScreen";
import ProductsScreen from "./screens/ProductsScreen";
import TransactionsScreen from "./screens/TransactionsScreen";
import SettlementScreen from "./screens/SettlementScreen";
import LoadingScreen from "./screens/LoadingScreen";
import SettingsScreen from "./screens/SettingsScreen"; // 🔑 inställningar
import ProfileScreen from "./screens/ProfileScreen";   // 🔑 profil

import { auth } from "./firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";

import { Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons"; // 🔑 vector‑ikoner

const Stack = createNativeStackNavigator();

// 🔑 Anpassa NavigationContainer med WorkaholicTheme
const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: WorkaholicTheme.colors.primary,
    background: WorkaholicTheme.colors.background,
    card: WorkaholicTheme.colors.surface,
    text: WorkaholicTheme.colors.textPrimary,
    border: WorkaholicTheme.colors.secondary,
    notification: WorkaholicTheme.colors.error,
  },
};

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  // 🔑 Lyssna på auth‑state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, [initializing]);

  if (initializing) {
    return <LoadingScreen />;
  }

  return (
    <GroupsProvider>
      <NavigationContainer theme={navigationTheme}>
        <Stack.Navigator
          screenOptions={({ navigation }) => ({
            headerTitle: () => (
              <Image
                source={require("./assets/logo.png")} // 🔑 global logo
                style={{ width: 140, height: 50 }}
                resizeMode="contain"
              />
            ),
            headerTitleAlign: "center",
            headerStyle: {
              backgroundColor: WorkaholicTheme.colors.primary, // Workaholic primärfärg
            },
            headerTintColor: "#FFFFFF", // text/ikoner i vitt

            // 🔑 Settings‑ikon till vänster
            headerLeft: () =>
              user ? (
                <TouchableOpacity
                  onPress={() => navigation.navigate("Settings")}
                  style={{ marginLeft: 15 }}
                >
                  <Ionicons name="settings-outline" size={28} color="#FFFFFF" />
                </TouchableOpacity>
              ) : null,

            // 🔑 Logout‑ikon till höger
            headerRight: () =>
              user ? (
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      await signOut(auth);
                    } catch (error) {
                      console.log("Logout error:", error.message);
                    }
                  }}
                  style={{ marginRight: 15 }}
                >
                  <Ionicons name="log-out-outline" size={28} color="#FFFFFF" />
                </TouchableOpacity>
              ) : null,
          })}
        >
          {user ? (
            <>
              <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{ title: "Hem" }}
              />
              <Stack.Screen
                name="Products"
                component={ProductsScreen}
                options={{ title: "Produkter" }}
              />
              <Stack.Screen
                name="Transactions"
                component={TransactionsScreen}
                options={{ title: "Transaktioner" }}
              />
              <Stack.Screen
                name="Settlement"
                component={SettlementScreen}
                options={{ title: "Avstämning" }}
              />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ title: "Inställningar" }}
              />
              <Stack.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ title: "Profil" }}
              />
            </>
          ) : (
            <>
              <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{ title: "Logga in" }}
              />
              <Stack.Screen
                name="Register"
                component={RegisterScreen}
                options={{ title: "Registrera" }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </GroupsProvider>
  );
}