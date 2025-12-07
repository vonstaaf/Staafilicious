import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from "react-native";
import { WorkaholicTheme } from "../theme";
import Button from "../components/Button";
import { auth } from "../firebaseConfig";
import { updatePassword, updateProfile, signOut } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";

export default function ProfileScreen() {
  const user = auth.currentUser;
  const [email] = useState(user?.email || "");
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

  const handlePasswordChange = async () => {
    if (!newPassword.trim()) {
      Alert.alert("Fel", "Ange ett nytt lösenord.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Fel", "Lösenordet måste vara minst 6 tecken.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Fel", "Lösenorden matchar inte.");
      return;
    }
    try {
      await updatePassword(user, newPassword);
      Alert.alert("Lösenord ändrat", "Ditt lösenord har uppdaterats.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      Alert.alert("Fel vid lösenordsändring", error.message || "Något gick fel.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      Alert.alert("Utloggad", "Du är nu utloggad.");
    } catch (error) {
      Alert.alert("Fel vid utloggning", error.message || "Något gick fel.");
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

      {/* Nytt lösenord */}
      <View style={styles.passwordWrapper}>
        <TextInput
          placeholder="Nytt lösenord"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={!showPassword}
          style={styles.input}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeIcon}
        >
          <Ionicons
            name={showPassword ? "eye-off-outline" : "eye-outline"}
            size={22}
            color={WorkaholicTheme.colors.secondary}
          />
        </TouchableOpacity>
      </View>

      {/* Bekräfta lösenord */}
      <View style={styles.passwordWrapper}>
        <TextInput
          placeholder="Bekräfta lösenord"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showPassword}
          style={styles.input}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeIcon}
        >
          <Ionicons
            name={showPassword ? "eye-off-outline" : "eye-outline"}
            size={22}
            color={WorkaholicTheme.colors.secondary}
          />
        </TouchableOpacity>
      </View>

      <Button title="Ändra lösenord" type="secondary" onPress={handlePasswordChange} />
      <Button title="Logga ut" type="secondary" onPress={handleLogout} />
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderRadius: WorkaholicTheme.borderRadius.medium || 8,
    backgroundColor: WorkaholicTheme.colors.surface,
    color: WorkaholicTheme.colors.textPrimary,
  },
  passwordWrapper: {
    position: "relative",
    marginBottom: 12,
  },
  eyeIcon: {
    position: "absolute",
    right: 12,
    top: 10,
  },
});