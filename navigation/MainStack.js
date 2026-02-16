import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Skärmar
import MainTabs from "./MainTabs";
import SettingsScreen from "../screens/SettingsScreen";
import SettlementScreen from "../screens/SettlementScreen";
import ArchivedProjectsScreen from "../screens/ArchivedProjectsScreen"; 
import ProtocolsHubScreen from "../screens/ProtocolsHubScreen";
import InspectionScreen from "../screens/InspectionScreen";
import InspectionHistoryScreen from "../screens/InspectionHistoryScreen"; 
import GroupScheduleScreen from "../screens/GroupScheduleScreen";
import ProfileScreen from "../screens/ProfileScreen";
// Notera: Om du har en ProductsScreen som vi jobbade på tidigare, 
// bör den också ligga här om den ska täcka hela skärmen (utan tabs).
// import ProductsScreen from "../screens/ProductsScreen"; 

const Stack = createNativeStackNavigator();

export default function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Vi använder egna headers inuti skärmarna för mer kontroll
        animation: "slide_from_right", // Ger en snabb och modern känsla vid navigering
      }}
    >
      {/* 1. Huvudflödet (Tabs) */}
      <Stack.Screen name="MainTabs" component={MainTabs} />
      
      {/* 2. Inställningar - Namnet måste matcha navigation.navigate("Settings") */}
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ presentation: "card" }} 
      />
      
      {/* 3. Övriga funktionsskärmar */}
      <Stack.Screen name="Settlement" component={SettlementScreen} />
      <Stack.Screen name="Archive" component={ArchivedProjectsScreen} />
      <Stack.Screen name="ProtocolsHub" component={ProtocolsHubScreen} />
      <Stack.Screen name="GroupSchedule" component={GroupScheduleScreen} />
      <Stack.Screen name="InspectionScreen" component={InspectionScreen} />
      <Stack.Screen name="InspectionHistory" component={InspectionHistoryScreen} />
      
      {/* 4. Profilskärmen */}
      <Stack.Screen name="Profile" component={ProfileScreen} />

      {/* Om vi ska kunna navigera till Materialvyn från ett projekt:
      <Stack.Screen name="Products" component={ProductsScreen} /> */}
    </Stack.Navigator>
  );
}