// navigation/MainStack.js
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabs from "./MainTabs";
import SettingsScreen from "../screens/SettingsScreen";
import SettlementScreen from "../screens/SettlementScreen";

const Stack = createNativeStackNavigator();

export default function MainStack() {
  return (
    <Stack.Navigator>
      {/* Bottenmenyn */}
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      {/* Extra skärmar ovanpå */}
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Inställningar" }} />
      <Stack.Screen name="Settlement" component={SettlementScreen} options={{ title: "Avstämning" }} />
    </Stack.Navigator>
  );
}