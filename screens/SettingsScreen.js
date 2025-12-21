import React, { useState } from "react";
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, ScrollView } from "react-native";
import { WorkaholicTheme } from "../theme";
import { auth } from "../firebaseConfig";
import { signOut } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import Button from "../components/Button";

export default function SettingsScreen({ navigation }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const toggleNotifications = (value) => {
    setNotificationsEnabled(value);
    // Valfritt: Ta bort Alert om du vill ha ett tystare gränssnitt
  };

  const toggleDarkMode = (value) => {
    setDarkMode(value);
  };

  const handleLogout = () => {
    Alert.alert(
      "Logga ut",
      "Är du säker på att du vill logga ut?",
      [
        { text: "Avbryt", style: "cancel" },
        { 
          text: "Logga ut", 
          style: "destructive", 
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error) {
              Alert.alert("Fel", "Kunde inte logga ut just nu.");
            }
          } 
        }
      ]
    );
  };

  // Hjälpkomponent för rader i inställningarna
  const SettingRow = ({ icon, label, children, onPress }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress} 
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.leftContent}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={20} color={WorkaholicTheme.colors.primary} />
        </View>
        <Text style={styles.label}>{label}</Text>
      </View>
      {children}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Inställningar</Text>

      <Text style={styles.sectionTitle}>PREFERENSER</Text>
      
      <SettingRow icon="notifications-outline" label="Notiser">
        <Switch
          value={notificationsEnabled}
          onValueChange={toggleNotifications}
          thumbColor={notificationsEnabled ? WorkaholicTheme.colors.primary : "#f4f3f4"}
          trackColor={{ true: WorkaholicTheme.colors.secondary, false: "#ccc" }}
        />
      </SettingRow>

      <SettingRow icon="moon-outline" label="Mörkt läge">
        <Switch
          value={darkMode}
          onValueChange={toggleDarkMode}
          thumbColor={darkMode ? WorkaholicTheme.colors.primary : "#f4f3f4"}
          trackColor={{ true: WorkaholicTheme.colors.secondary, false: "#ccc" }}
        />
      </SettingRow>

      <Text style={styles.sectionTitle}>KONTO & SÄKERHET</Text>

      <SettingRow 
        icon="person-outline" 
        label="Profil" 
        onPress={() => navigation.navigate("Profile")}
      >
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </SettingRow>

      <Text style={styles.sectionTitle}>OM APPEN</Text>

      <SettingRow icon="information-circle-outline" label="Version">
        <Text style={styles.versionText}>1.0.1</Text>
      </SettingRow>

      <View style={styles.logoutContainer}>
        <Button 
          title="Logga ut" 
          type="secondary" 
          onPress={handleLogout} 
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WorkaholicTheme.colors.background || "#F8F9FA",
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: WorkaholicTheme.colors.primary,
    marginBottom: 25,
    textAlign: "left",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8E8E93",
    marginBottom: 10,
    marginTop: 10,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: WorkaholicTheme.colors.surface || "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    // Skugga för iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    // Skugga för Android
    elevation: 3,
  },
  leftContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(0, 122, 255, 0.1)", // Ljus variant av primärfärg
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: WorkaholicTheme.colors.textPrimary || "#1C1C1E",
  },
  versionText: {
    fontSize: 14,
    color: "#8E8E93",
    fontWeight: "500",
  },
  logoutContainer: {
    marginTop: 30,
  },
});