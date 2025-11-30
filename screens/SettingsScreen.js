// screens/SettingsScreen.js
import React, { useState } from "react";
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert } from "react-native";
import { WorkaholicTheme } from "../theme";

export default function SettingsScreen({ navigation }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const toggleNotifications = (value) => {
    setNotificationsEnabled(value);
    Alert.alert("Inställning ändrad", value ? "Notiser aktiverade" : "Notiser avstängda");
  };

  const toggleDarkMode = (value) => {
    setDarkMode(value);
    Alert.alert("Inställning ändrad", value ? "Mörkt läge aktiverat" : "Mörkt läge avstängt");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inställningar</Text>

      {/* Notiser */}
      <View style={styles.card}>
        <Text style={styles.label}>Notiser</Text>
        <Switch
          value={notificationsEnabled}
          onValueChange={toggleNotifications}
          thumbColor={notificationsEnabled ? WorkaholicTheme.colors.primary : "#ccc"}
          trackColor={{ true: WorkaholicTheme.colors.secondary, false: "#ccc" }}
        />
      </View>

      {/* Mörkt läge */}
      <View style={styles.card}>
        <Text style={styles.label}>Mörkt läge</Text>
        <Switch
          value={darkMode}
          onValueChange={toggleDarkMode}
          thumbColor={darkMode ? WorkaholicTheme.colors.primary : "#ccc"}
          trackColor={{ true: WorkaholicTheme.colors.secondary, false: "#ccc" }}
        />
      </View>

      {/* Profil */}
      <View style={styles.card}>
        <Text style={styles.label}>Profil</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
          <Text style={styles.link}>Redigera</Text>
        </TouchableOpacity>
      </View>

      {/* Appinformation */}
      <View style={styles.card}>
        <Text style={styles.label}>Appinformation</Text>
        <Text style={styles.text}>Version 1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: WorkaholicTheme.colors.background,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: WorkaholicTheme.colors.primary,
    marginBottom: 20,
    textAlign: "center",
  },
  card: {
    backgroundColor: WorkaholicTheme.colors.surface,
    borderRadius: WorkaholicTheme.borderRadius.medium || 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: WorkaholicTheme.colors.textPrimary,
  },
  link: {
    fontSize: 16,
    color: WorkaholicTheme.colors.secondary,
    fontWeight: "600",
  },
  text: {
    fontSize: 14,
    color: WorkaholicTheme.colors.textSecondary,
  },
});