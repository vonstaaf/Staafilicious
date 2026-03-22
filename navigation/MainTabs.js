import React from "react";
import { Image, StyleSheet, Platform, Alert } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Skärmar
import HomeScreen from "../screens/HomeScreen"; 
import ProjectListScreen from "../screens/ProjectListScreen";
import PlaneringScreen from "../screens/PlaneringScreen";
import ProfileScreen from "../screens/ProfileScreen";

import { useTheme } from "../context/ThemeContext";
import { useBadges } from "../context/BadgeContext"; 

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { notificationsCount, setNotificationsCount } = useBadges();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true, 
        headerTitleAlign: "center",
        headerTintColor: "#FFFFFF",
        headerStyle: {
          backgroundColor: theme.colors.primary,
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
          else if (route.name === "Planering") iconName = focused ? "calendar" : "calendar-outline";
          else if (route.name === "Profile") iconName = focused ? "person" : "person-outline";
          
          return <Ionicons name={iconName} size={size - 2} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
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
      {/* 1. START (Skapa/Anslut) – använder egen AppHeader */}
      <Tab.Screen
        name="Start"
        component={HomeScreen}
        options={{ title: "START", headerShown: false }}
      />

      {/* 2. PROJEKT (Hantera alla jobb) – använder egen AppHeader */}
      <Tab.Screen
        name="Projects"
        component={ProjectListScreen}
        options={{ title: "PROJEKT", headerShown: false }}
      />

      {/* 3. PLANERING – använder egen AppHeader */}
      <Tab.Screen
        name="Planering"
        component={PlaneringScreen}
        options={{ title: "PLANERING", headerShown: false }}
      />

      {/* 4. PROFIL – samma rundade header som Start */}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "PROFIL",
          headerShown: false,
          tabBarBadge: notificationsCount > 0 ? notificationsCount : null,
          tabBarBadgeStyle: { backgroundColor: theme.colors.error, color: "white", fontSize: 10 },
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