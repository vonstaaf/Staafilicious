import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { WorkaholicTheme } from "../theme";
import Button from "../components/Button";
import { auth } from "../firebaseConfig";
import { updatePassword, updateProfile, signOut } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import { ProjectsContext } from "../context/ProjectsContext";
import { useBadges } from "../context/BadgeContext";

export default function ProfileScreen() {
  const { projects } = useContext(ProjectsContext);
  const { currentLogo } = useBadges();
  const user = auth.currentUser;

  // Profil-stats
  const [email] = useState(user?.email || "");
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Statistik-beräkning
  const totalProjects = projects.length;
  const activeTasks = projects.reduce((acc, p) => acc + (p.kostnader?.length || 0), 0);

  const handleSaveName = async () => {
    try {
      if (displayName.trim() && displayName !== user?.displayName) {
        await updateProfile(user, { displayName: displayName.trim() });
        Alert.alert("Klart", "Ditt profilnamn har uppdaterats.");
      } else {
        Alert.alert("Info", "Ingen ändring i namnet upptäcktes.");
      }
    } catch (error) {
      Alert.alert("Fel", "Kunde inte spara namnet.");
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword.trim() || newPassword.length < 6) {
      Alert.alert("Fel", "Lösenordet måste vara minst 6 tecken.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Fel", "Lösenorden matchar inte.");
      return;
    }
    try {
      await updatePassword(user, newPassword);
      Alert.alert("Success", "Ditt lösenord har ändrats.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      Alert.alert("Säkerhetsmeddelande", "För att byta lösenord krävs en nyligen genomförd inloggning. Logga ut och in igen och försök på nytt.");
    }
  };

  const handleLogout = () => {
    Alert.alert("Logga ut", "Vill du logga ut från Workaholic?", [
      { text: "Avbryt", style: "cancel" },
      { text: "Logga ut", style: "destructive", onPress: () => signOut(auth) }
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: WorkaholicTheme.colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* HEADER MED AVATAR/LOGGA */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {currentLogo ? (
              <Image source={{ uri: currentLogo }} style={styles.avatar} />
            ) : (
              <View style={styles.placeholderAvatar}>
                <Text style={styles.avatarText}>
                  {displayName ? displayName.charAt(0).toUpperCase() : email.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.userName}>{displayName || "Användare"}</Text>
          <Text style={styles.userEmail}>{email}</Text>
        </View>

        {/* SNABBSTATISTIK */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="briefcase" size={20} color={WorkaholicTheme.colors.primary} />
            <Text style={styles.statNumber}>{totalProjects}</Text>
            <Text style={styles.statLabel}>Projekt</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time" size={20} color={WorkaholicTheme.colors.primary} />
            <Text style={styles.statNumber}>{activeTasks}</Text>
            <Text style={styles.statLabel}>Tidsposter</Text>
          </View>
        </View>

        {/* PROFILUPPGIFTER */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PROFILUPPGIFTER</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={18} color="#999" style={styles.inputIcon} />
            <TextInput
              placeholder="Fullständigt namn"
              value={displayName}
              onChangeText={setDisplayName}
              style={styles.textInput}
            />
          </View>
          <Button title="SPARA ÄNDRINGAR" type="primary" onPress={handleSaveName} />
        </View>

        {/* SÄKERHET */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BYT LÖSENORD</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color="#999" style={styles.inputIcon} />
            <TextInput
              placeholder="Nytt lösenord"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showPassword}
              style={styles.textInput}
            />
          </View>
          <View style={styles.inputWrapper}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#999" style={styles.inputIcon} />
            <TextInput
              placeholder="Bekräfta nytt lösenord"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              style={styles.textInput}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#666" />
            </TouchableOpacity>
          </View>
          <Button title="UPPDATERA LÖSENORD" type="secondary" onPress={handlePasswordChange} />
        </View>

        {/* LOGGA UT */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={WorkaholicTheme.colors.error} />
          <Text style={styles.logoutText}>Logga ut från kontot</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { padding: 20, paddingBottom: 50 },
  header: { alignItems: "center", marginBottom: 25, marginTop: 10 },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#fff",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#fff"
  },
  avatar: { width: "100%", height: "100%", resizeMode: "cover" },
  placeholderAvatar: { 
    width: "100%", 
    height: "100%", 
    backgroundColor: WorkaholicTheme.colors.primary, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  avatarText: { color: "#FFF", fontSize: 40, fontWeight: "800" },
  userName: { fontSize: 22, fontWeight: "800", color: "#1C1C1E", marginTop: 15 },
  userEmail: { fontSize: 14, color: "#8E8E93", marginTop: 4, fontWeight: "500" },
  
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 25 },
  statCard: { 
    backgroundColor: "#fff", 
    width: "48%", 
    padding: 15, 
    borderRadius: 18, 
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5
  },
  statNumber: { fontSize: 20, fontWeight: "900", color: "#1C1C1E", marginTop: 5 },
  statLabel: { fontSize: 11, color: "#8E8E93", fontWeight: "700", textTransform: "uppercase" },

  section: { 
    backgroundColor: "#FFF", 
    borderRadius: 20, 
    padding: 20, 
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04
  },
  sectionTitle: { fontSize: 11, fontWeight: "800", color: "#BBB", marginBottom: 15, letterSpacing: 1 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    marginBottom: 12,
  },
  inputIcon: { marginRight: 10 },
  textInput: { flex: 1, fontSize: 15, fontWeight: "600", color: "#1C1C1E" },

  logoutBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    marginTop: 10, 
    padding: 15 
  },
  logoutText: { color: WorkaholicTheme.colors.error, fontWeight: "700", fontSize: 15, marginLeft: 8 }
});