// navigation/MainTabs.js
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import HomeScreen from "../screens/HomeScreen";
import ProductsScreen from "../screens/ProductsScreen";
import KostnadsScreen from "../screens/KostnadsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { WorkaholicTheme } from "../theme";
import { useBadges } from "../context/BadgeContext"; // 🔑 hämta badges från context

const Tab = createBottomTabNavigator();

export default function MainTabs() {
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
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: WorkaholicTheme.colors.primary,
        tabBarInactiveTintColor: WorkaholicTheme.colors.secondary,
        tabBarStyle: {
          backgroundColor: WorkaholicTheme.colors.surface, // snyggare bakgrund
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
            backgroundColor: WorkaholicTheme.colors.primary, // 🔧 badge i din primärfärg
            color: "white",
          },
        }}
      />
      <Tab.Screen
        name="Kostnads"
        component={KostnadsScreen}
        options={{
          title: "Kostnader",
          tabBarBadge: KostnadsCount > 0 ? KostnadsCount : null,
          tabBarBadgeStyle: {
            backgroundColor: WorkaholicTheme.colors.error, // 🔧 röd badge för pending
            color: "white",
          },
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profil",
          tabBarBadge: notificationsCount > 0 ? notificationsCount : null,
          tabBarBadgeStyle: {
            backgroundColor: WorkaholicTheme.colors.secondary, // 🔧 sekundärfärg för notiser
            color: "white",
          },
        }}
      />
    </Tab.Navigator>
  );
}