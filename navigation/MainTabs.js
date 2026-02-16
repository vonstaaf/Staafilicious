import React from "react";
import { Image, StyleSheet, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Skärmar
import ProjectListScreen from "../screens/ProjectListScreen"; 
import ProductsScreen from "../screens/ProductsScreen";
import KostnaderScreen from "../screens/KostnaderScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SettlementScreen from "../screens/SettlementScreen";
import ProtocolsHubScreen from "../screens/ProtocolsHubScreen";

import { WorkaholicTheme } from "../theme";
import { useBadges } from "../context/BadgeContext"; 

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  
  // Vi hämtar bara notificationsCount för Profilen (om du vill ha kvar den),
  // men vi struntar i productsCount och KostnaderCount nu.
  const { notificationsCount, setNotificationsCount } = useBadges();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true, 
        headerTitleAlign: "center",
        headerTintColor: "#FFFFFF",
        headerStyle: {
          backgroundColor: WorkaholicTheme.colors.primary,
        },
        headerTitle: () => (
          <Image 
            source={require("../assets/workaholic_logo_white.png")} 
            style={styles.headerLogo} 
            resizeMode="contain"
          />
        ),
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "Home") iconName = focused ? "home" : "home-outline";
          else if (route.name === "Products") iconName = focused ? "cube" : "cube-outline";
          else if (route.name === "Kostnader") iconName = focused ? "wallet" : "wallet-outline"; 
          else if (route.name === "ProtocolsHub") iconName = focused ? "clipboard" : "clipboard-outline";
          else if (route.name === "Settlement") iconName = focused ? "receipt" : "receipt-outline";
          else if (route.name === "Profile") iconName = focused ? "person" : "person-outline";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: WorkaholicTheme.colors.primary,
        tabBarInactiveTintColor: WorkaholicTheme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: WorkaholicTheme.colors.surface,
          borderTopColor: "#DDD",
          height: 60 + insets.bottom, 
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 10,
        },
      })}
    >
      <Tab.Screen name="Home" component={ProjectListScreen} options={{ title: "Projekt" }} />
      
      {/* 🔑 UPPDATERAD: Inga badges här längre */}
      <Tab.Screen
        name="Products"
        component={ProductsScreen}
        options={{
          title: "Produkter",
        }}
      />
      
      {/* 🔑 UPPDATERAD: Inga badges här längre */}
      <Tab.Screen
        name="Kostnader"
        component={KostnaderScreen}
        options={{
          title: "Kostnader",
        }}
      />

      <Tab.Screen
        name="ProtocolsHub"
        component={ProtocolsHubScreen}
        options={{ title: "Kontroller" }}
      />

      <Tab.Screen name="Settlement" component={SettlementScreen} options={{ title: "Underlag" }} />

      {/* Profilen har kvar sin notis (om du vill), annars ta bort tabBarBadge raden här med */}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profil",
          tabBarBadge: notificationsCount > 0 ? notificationsCount : null,
          tabBarBadgeStyle: { backgroundColor: WorkaholicTheme.colors.secondary, color: "white" },
        }}
        listeners={{ tabPress: () => setNotificationsCount(0) }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  headerLogo: {
    width: 150,
    height: 150,
    ...Platform.select({ android: { marginBottom: 5 } }),
  },
});