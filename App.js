import React, { useEffect, useState } from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { GroupsProvider } from "./context/GroupsContext";
import { BadgeProvider, useBadges } from "./context/BadgeContext";
import { WorkaholicTheme } from "./theme";

import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import HomeScreen from "./screens/HomeScreen";
import ProductsScreen from "./screens/ProductsScreen";
import KostnadsScreen from "./screens/KostnaderScreen";
import SettlementScreen from "./screens/SettlementScreen";
import LoadingScreen from "./screens/LoadingScreen";
import SettingsScreen from "./screens/SettingsScreen";
import ProfileScreen from "./screens/ProfileScreen";

import { auth } from "./firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";

import { Image, TouchableOpacity, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

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

// 🔑 AuthStack (Login/Register)
function AuthStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Logga in" }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ title: "Registrera" }} />
    </Stack.Navigator>
  );
}

// 🔑 Tabs för huvudflödet
function MainTabs() {
  const { KostnadsCount, productsCount, notificationsCount } = useBadges();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === "Home") iconName = "home-outline";
          else if (route.name === "Products") iconName = "cube-outline";
          else if (route.name === "Kostnads") iconName = "swap-horizontal-outline";
          else if (route.name === "Profile") iconName = "person-outline";
          else if (route.name === "Settlement") iconName = "cash-outline";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: WorkaholicTheme.colors.primary,
        tabBarInactiveTintColor: WorkaholicTheme.colors.secondary,
        headerTitle: () => (
          <Image
            source={require("./assets/logo.png")}
            style={{ width: 140, height: 50 }}
            resizeMode="contain"
          />
        ),
        headerTitleAlign: "center",
        headerStyle: { backgroundColor: WorkaholicTheme.colors.primary },
        headerTintColor: "#FFFFFF",
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Hem" }} />
      <Tab.Screen
        name="Products"
        component={ProductsScreen}
        options={{
          title: "Produkter",
          tabBarBadge: productsCount > 0 ? productsCount : null,
        }}
      />
      <Tab.Screen
        name="Kostnads"
        component={KostnadsScreen}
        options={{
          title: "Kostnader",
          tabBarBadge: KostnadsCount > 0 ? KostnadsCount : null,
        }}
      />
      <Tab.Screen
        name="Settlement"
        component={SettlementScreen}
        options={{ title: "Avstämning" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profil",
          tabBarBadge: notificationsCount > 0 ? notificationsCount : null,
        }}
      />
    </Tab.Navigator>
  );
}

// 🔑 MainStack (Tabs + extra skärmar ovanpå)
function MainStack({ user }) {
  const { notificationsCount } = useBadges();

  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerTitle: () => (
          <Image
            source={require("./assets/logo.png")}
            style={{ width: 140, height: 50 }}
            resizeMode="contain"
          />
        ),
        headerTitleAlign: "center",
        headerStyle: {
          backgroundColor: WorkaholicTheme.colors.primary,
        },
        headerTintColor: "#FFFFFF",

        headerLeft: () =>
          user ? (
            <TouchableOpacity
              onPress={() => navigation.navigate("Settings")}
              style={{ marginLeft: 15 }}
            >
              <Ionicons name="settings-outline" size={28} color="#FFFFFF" />
              {notificationsCount > 0 && (
                <View
                  style={{
                    position: "absolute",
                    right: -6,
                    top: -3,
                    backgroundColor: WorkaholicTheme.colors.error,
                    borderRadius: 8,
                    width: 16,
                    height: 16,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "white", fontSize: 10 }}>
                    {notificationsCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ) : null,

        headerRight: () =>
          user ? (
            <TouchableOpacity
              onPress={async () => {
                try {
                  await signOut(auth); // 🔑 loggar ut och visar AuthStack
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
  }, [initializing]);

  if (initializing) {
    return <LoadingScreen />;
  }

  return (
    <GroupsProvider>
      <BadgeProvider>
        <NavigationContainer theme={navigationTheme}>
          {user ? <MainStack user={user} /> : <AuthStack />}
        </NavigationContainer>
      </BadgeProvider>
    </GroupsProvider>
  );
}