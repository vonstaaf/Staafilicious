import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import HomeScreen from "../screens/HomeScreen";
import ProductsScreen from "../screens/ProductsScreen";
import KostnaderScreen from "../screens/KostnaderScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { WorkaholicTheme } from "../theme";
import { useBadges } from "../context/BadgeContext"; 

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  // Hämtar både värden och funktioner för att kunna nollställa vid klick
  const { 
    KostnaderCount, 
    productsCount, 
    notificationsCount,
    setKostnaderCount,
    setProductsCount,
    setNotificationsCount 
  } = useBadges();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === "Home") iconName = "home-outline";
          else if (route.name === "Products") iconName = "cube-outline";
          else if (route.name === "Kostnader") iconName = "swap-horizontal-outline";
          else if (route.name === "Profile") iconName = "person-outline";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: WorkaholicTheme.colors.primary,
        tabBarInactiveTintColor: WorkaholicTheme.colors.secondary,
        tabBarStyle: {
          backgroundColor: WorkaholicTheme.colors.surface,
          borderTopColor: WorkaholicTheme.colors.secondary,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: "Hem",
        }}
      />
      <Tab.Screen
        name="Products"
        component={ProductsScreen}
        options={{
          title: "Produkter",
          tabBarBadge: productsCount > 0 ? productsCount : null,
          tabBarBadgeStyle: {
            backgroundColor: WorkaholicTheme.colors.primary,
            color: "white",
          },
        }}
        // 🔑 Nollställ badge när användaren trycker på fliken
        listeners={{
          tabPress: () => setProductsCount(0),
        }}
      />
      <Tab.Screen
        name="Kostnader"
        component={KostnaderScreen}
        options={{
          title: "Kostnader",
          tabBarBadge: KostnaderCount > 0 ? KostnaderCount : null,
          tabBarBadgeStyle: {
            backgroundColor: WorkaholicTheme.colors.error,
            color: "white",
          },
        }}
        // 🔑 Nollställ badge när användaren trycker på fliken
        listeners={{
          tabPress: () => setKostnaderCount(0),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profil",
          tabBarBadge: notificationsCount > 0 ? notificationsCount : null,
          tabBarBadgeStyle: {
            backgroundColor: WorkaholicTheme.colors.secondary,
            color: "white",
          },
        }}
        // 🔑 Nollställ även för profilen om det finns notiser
        listeners={{
          tabPress: () => setNotificationsCount(0),
        }}
      />
    </Tab.Navigator>
  );
}