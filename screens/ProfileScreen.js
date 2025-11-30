// screens/ProfileScreen.js
import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity } from "react-native";
import { WorkaholicTheme } from "../theme";
import Button from "../components/Button";
import { auth } from "../firebaseConfig";
import { updatePassword, updateProfile } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons"; // 🔑 ikonbibliotek

export default function ProfileScreen() {
  const user = auth.currentUser;
  const [email] = useState(user?.email || "");
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // 🔑 Spara ändringar i profil
  const handleSave = async () => {
    try {
      if (displayName.trim() && displayName !== user?.displayName) {
        await updateProfile(user, { displayName });
      }
      Alert.alert("Profil uppdaterad", "Dina ändringar har sparats.");
    } catch (error) {
      Alert.alert("Fel vid uppdatering", error.message || "Något gick fel.");
    }
  };

  // 🔑 Ändra lösenord
  const handlePasswordChange = async () => {
    if (!newPassword.trim()) {
      Alert.alert("Fel", "Ange ett nytt lösenord.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Fel", "Lösenordet måste vara minst 6 tecken.");
      return;
    }
    try {
      await updatePassword(user, newPassword);
      Alert.alert("Lösenord ändrat", "Ditt lösenord har uppdaterats.");
      setNewPassword("");
    } catch (error) {
      Alert.alert("Fel vid lösenordsändring", error.message || "Något gick fel.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Min profil</Text>

      {/* Namn */}
      <TextInput
        placeholder="Namn"
        value={displayName}
        onChangeText={setDisplayName}
        style={styles.input}
      />

      {/* Email (ej redigerbar) */}
      <TextInput
        placeholder="Email"
        value={email}
        editable={false}
        style={styles.input}
      />

      <Button title="Spara ändringar" type="primary" onPress={handleSave} />

      {/* Byt lösenord */}
      <Text style={styles.subtitle}>Byt lösenord</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          placeholder="Nytt lösenord"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={!showPassword}
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Ionicons
            name={showPassword ? "eye-off-outline" : "eye-outline"}
            size={24}
            color={WorkaholicTheme.colors.secondary}
          />
        </TouchableOpacity>
      </View>

      <Button title="Ändra lösenord" type="secondary" onPress={handlePasswordChange} />
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
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    color: WorkaholicTheme.colors.textPrimary,
    marginTop: 20,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: WorkaholicTheme.colors.secondary,
    padding: 10,
    marginBottom: 12,
    borderRadius: WorkaholicTheme.borderRadius.medium || 8,
    backgroundColor: WorkaholicTheme.colors.surface,
    color: WorkaholicTheme.colors.textPrimary,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: WorkaholicTheme.colors.secondary,
    borderRadius: WorkaholicTheme.borderRadius.medium || 8,
    backgroundColor: WorkaholicTheme.colors.surface,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
});