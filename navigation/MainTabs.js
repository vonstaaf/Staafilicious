import React from "react";
import { Image, StyleSheet, Platform, Alert } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Skärmar
import HomeScreen from "../screens/HomeScreen"; 
import ProjectListScreen from "../screens/ProjectListScreen"; 
import ProfileScreen from "../screens/ProfileScreen";

import { WorkaholicTheme } from "../theme";
import { useBadges } from "../context/BadgeContext"; 

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  const { notificationsCount, setNotificationsCount } = useBadges();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true, 
        headerTitleAlign: "center",
        headerTintColor: "#FFFFFF",
        headerStyle: {
          backgroundColor: WorkaholicTheme.colors.primary,
          elevation: 0,
          shadowOpacity: 0,
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
          if (route.name === "Start") iconName = focused ? "grid" : "grid-outline";
          else if (route.name === "Projects") iconName = focused ? "folder-open" : "folder-outline";
          else if (route.name === "Profile") iconName = focused ? "person" : "person-outline";
          
          return <Ionicons name={iconName} size={size - 2} color={color} />;
        },
        tabBarActiveTintColor: WorkaholicTheme.colors.primary,
        tabBarInactiveTintColor: "#999",
        tabBarStyle: {
          backgroundColor: "#FFF",
          borderTopColor: "#EEE",
          height: 65 + insets.bottom, 
          paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
          paddingTop: 8,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 10
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '800',
          marginTop: -4,
          paddingBottom: 2
        }
      })}
    >
      {/* 1. START (Skapa/Anslut) */}
      <Tab.Screen 
        name="Start" 
        component={HomeScreen} 
        options={{ title: "START" }} 
      />
      
      {/* 2. PROJEKT (Hantera alla jobb) */}
      <Tab.Screen 
        name="Projects" 
        component={ProjectListScreen} 
        options={{ title: "PROJEKT" }} 
      />

      {/* 3. PROFIL */}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "PROFIL",
          tabBarBadge: notificationsCount > 0 ? notificationsCount : null,
          tabBarBadgeStyle: { backgroundColor: WorkaholicTheme.colors.error, color: "white", fontSize: 10 },
        }}
        listeners={{ tabPress: () => setNotificationsCount(0) }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  headerLogo: {
    width: 140,
    height: 140,
    ...Platform.select({ android: { marginBottom: 5 } }),
  },
});