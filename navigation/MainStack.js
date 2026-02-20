import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Skärmar (Huvudnavigering)
import MainTabs from "./MainTabs";
import ProjectHubScreen from "../screens/ProjectHubScreen";
import FinanceMaterialHub from "../screens/FinanceMaterialHub";

// Skärmar (Ekonomi & Material)
import ProductsScreen from "../screens/ProductsScreen";
import KostnaderScreen from "../screens/KostnaderScreen";
import SettlementScreen from "../screens/SettlementScreen";

// Skärmar (Dokumentation & Underlag)
import ProjectDetailsScreen from "../screens/ProjectDetailsScreen"; 
import ProtocolsHubScreen from "../screens/ProtocolsHubScreen";
import InspectionScreen from "../screens/InspectionScreen";
import InspectionHistoryScreen from "../screens/InspectionHistoryScreen"; 
import GroupScheduleScreen from "../screens/GroupScheduleScreen";
import CableScreen from "../screens/CableScreen";

// Skärmar (System & Profil)
import SettingsScreen from "../screens/SettingsScreen";
import ArchivedProjectsScreen from "../screens/ArchivedProjectsScreen"; 
import ProfileScreen from "../screens/ProfileScreen";

const Stack = createNativeStackNavigator();

export default function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, 
        animation: "slide_from_right", 
      }}
    >
      {/* 1. HUVUDFLÖDET (Här landar användaren efter inlogg) */}
      <Stack.Screen name="MainTabs" component={MainTabs} />
      
      {/* 2. PROJEKT-NAVET (Centrala hubben för ett valt projekt) */}
      <Stack.Screen name="ProjectHub" component={ProjectHubScreen} />
      
      {/* 3. EKONOMI & MATERIAL HUB */}
      <Stack.Screen name="FinanceMaterialHub" component={FinanceMaterialHub} />

      {/* 4. EKONOMI-FUNKTIONER */}
      <Stack.Screen name="ProductList" component={ProductsScreen} />
      <Stack.Screen name="CostTracking" component={KostnaderScreen} />
      <Stack.Screen name="Settlement" component={SettlementScreen} />
      
      {/* 5. DOKUMENTATION & UNDERLAG */}
      <Stack.Screen name="ProjectDetails" component={ProjectDetailsScreen} />
      <Stack.Screen name="ProtocolsHub" component={ProtocolsHubScreen} />
      <Stack.Screen name="InspectionScreen" component={InspectionScreen} />
      <Stack.Screen name="InspectionHistory" component={InspectionHistoryScreen} />
      <Stack.Screen name="GroupSchedule" component={GroupScheduleScreen} />
      <Stack.Screen name="CableGuide" component={CableScreen} />
      
      {/* 6. SYSTEM & PROFIL */}
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ presentation: "card" }} 
      />
      <Stack.Screen name="Archive" component={ArchivedProjectsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />

    </Stack.Navigator>
  );
}