import React, { useState, useContext, useEffect, useMemo } from "react";
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants'; // 👈 Tillagd för automatisk version
import { WorkaholicTheme, getThemeForProfession } from "../theme";
import { mergeTheme } from "../context/ThemeContext";
import Button from "../components/Button";
import { auth, db } from "../firebaseConfig";
import { updatePassword, updateProfile, signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { ProjectsContext } from "../context/ProjectsContext";
import { CompanyContext } from "../context/CompanyContext";
import AppHeader from "../components/AppHeader";
import { getCompanyInitials } from "../utils/stringHelpers";

// Backward compatibility guard for older cached bundles referencing ROLES.
const ROLES = Object.freeze({});

function profileRoleToProfessionKeys(role) {
  if (role === "El") return ["el"];
  if (role === "Rör") return ["vvs"];
  if (role === "Bygg") return ["bygg"];
  return [];
}

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { projects } = useContext(ProjectsContext);
  const { company } = useContext(CompanyContext) || {};
  const user = auth.currentUser;

  const [email] = useState(user?.email || "");
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [profession, setProfession] = useState("El");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const profileAccentTheme = useMemo(
    () => mergeTheme(WorkaholicTheme, getThemeForProfession(profileRoleToProfessionKeys(profession))),
    [profession]
  );
  const companyLogoUrl = company?.companyLogoUrl || company?.logoUrl || null;
  const companyNameDisplay = company?.companyName || company?.name || "Företag";

  const roleAvatar = useMemo(() => {
    const p = String(profession || "").toLowerCase();
    if (p.includes("el")) {
      return { icon: "flash", label: "Elektriker", bg: "#2563EB" };
    }
    if (p.includes("projekt")) {
      return { icon: "construct", label: "Projektledare", bg: "#7C3AED" };
    }
    if (p.includes("bygg")) {
      return { icon: "hammer", label: "Bygg", bg: "#EA580C" };
    }
    if (p.includes("rör") || p.includes("vvs")) {
      return { icon: "water", label: "VVS", bg: "#0891B2" };
    }
    return { icon: "person", label: "Användare", bg: "#64748B" };
  }, [profession]);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    if (!user) return;
    try {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const d = docSnap.data();
        let fetchedProf = d.profession || "El";
        let pLower = fetchedProf.toLowerCase();
        if (pLower.includes("el")) setProfession("El");
        else if (pLower.includes("Bygg") || pLower.includes("bygg")) setProfession("Bygg");
        else if (pLower.includes("rör") || pLower.includes("vvs")) setProfession("Rör");
        else setProfession(fetchedProf);
        setPhone(d.phone || "");
      }
    } catch (e) { console.log("Kunde inte hämta data", e); }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (user && displayName !== user.displayName) await updateProfile(user, { displayName });
      if (newPassword && newPassword === confirmPassword) {
        await updatePassword(user, newPassword);
        Alert.alert("Lösenord uppdaterat!");
        setNewPassword(""); setConfirmPassword("");
      } else if (newPassword) {
        Alert.alert("Fel", "Lösenorden matchar inte.");
        setLoading(false); return;
      }
      await updateDoc(doc(db, "users", user.uid), {
        displayName: displayName.trim(),
        phone: phone.trim(),
      });
      Alert.alert("Sparat", "Din profil har uppdaterats.");
    } catch (e) { Alert.alert("Fel", "Kunde inte spara profil."); }
    finally { setLoading(false); }
  };

  const handleLogout = () => {
    Alert.alert("Logga ut", "Är du säker?", [
      { text: "Avbryt", style: "cancel" },
      { text: "Logga ut", style: "destructive", onPress: () => signOut(auth) }
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F8F9FB" }}>
      <AppHeader
        showBackButton={false}
        hideTitle={true}
        useBrandLogo
        navigation={navigation}
        rightIcon="settings-outline"
        onRightPress={() => navigation.navigate("Settings")}
      />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            padding: 20,
            paddingTop: 8,
            paddingBottom: insets.bottom + 130,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={[styles.roleAvatar, { backgroundColor: roleAvatar.bg }]}>
              <Ionicons name={roleAvatar.icon} size={34} color="#FFF" />
            </View>
            <View style={styles.companyBrandCard}>
              {companyLogoUrl ? (
                <View style={styles.companyLogoWrap}>
                  <Text style={styles.companyLogoHint}>Företagslogotyp</Text>
                  <View style={styles.companyLogoBox}>
                    <Image source={{ uri: companyLogoUrl }} style={styles.companyLogoImage} resizeMode="contain" />
                  </View>
                </View>
              ) : (
                <View style={styles.companyInitialsCircle}>
                  <Text style={styles.companyInitialsText}>
                    {getCompanyInitials(companyNameDisplay)}
                  </Text>
                </View>
              )}
              <View style={styles.companyMeta}>
                <Text style={styles.companyMetaTitle} numberOfLines={1}>{companyNameDisplay}</Text>
                <Text style={styles.companyMetaSub}>Företagslogotyp hanteras i webbportalen</Text>
              </View>
            </View>
            <Text style={styles.userName}>{displayName || "Användare"}</Text>
            <Text style={styles.userEmail}>{email}</Text>
            <Text style={styles.userRolePill}>{roleAvatar.label}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{projects.length}</Text>
              <Text style={styles.statLabel}>Projekt</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{projects.filter(p => p.status === 'archived').length}</Text>
              <Text style={styles.statLabel}>Arkiverade</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{projects.reduce((sum, p) => sum + (p.products?.length || 0), 0)}</Text>
              <Text style={styles.statLabel}>Artiklar</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>APP-KONFIGURATION</Text>
            <TouchableOpacity 
              style={styles.settingsRow} 
              onPress={() => navigation.navigate("Settings")}
            >
              <View style={styles.settingsIconBox}>
                <Ionicons name="options-outline" size={22} color={profileAccentTheme.colors.primary} />
              </View>
              <View style={{flex: 1, marginLeft: 12}}>
                <Text style={styles.settingsLabel}>Appinställningar</Text>
                <Text style={styles.settingsSub}>Notiser, mallar och profilinställningar</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PROFIL</Text>
            <View style={{ gap: 15 }}>
              <View style={styles.readOnlyField}>
                <Ionicons name="business" size={20} color="#94A3B8" />
                <Text style={styles.readOnlyText} numberOfLines={1}>{companyNameDisplay}</Text>
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons name="person" size={20} color="#CCC" />
                <TextInput style={styles.input} placeholder="Visningsnamn" value={displayName} onChangeText={setDisplayName} />
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons name="call" size={20} color="#CCC" />
                <TextInput
                  style={styles.input}
                  placeholder="Telefon"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>KONTO & SÄKERHET</Text>
            <View style={{ gap: 15 }}>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed" size={20} color="#CCC" />
                <TextInput style={styles.input} placeholder="Nytt lösenord" value={newPassword} onChangeText={setNewPassword} secureTextEntry={!showPassword} />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#CCC" />
                </TouchableOpacity>
              </View>
              {newPassword ? (
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed" size={20} color="#CCC" />
                  <TextInput style={styles.input} placeholder="Bekräfta lösenord" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} />
                </View>
              ) : null}
            </View>
          </View>

          <Button 
            title={loading ? "SPARAR..." : "SPARA ÄNDRINGAR"} 
            onPress={handleSave} 
            type="primary" 
            disabled={loading} 
          />
          
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>LOGGA UT</Text>
          </TouchableOpacity>

          {/* 🔑 Automatisk versionshämtning från app.json */}
          <Text style={styles.versionText}>
            Workaholic v{Constants.expoConfig?.version || "1.0.0"}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ... Styles är oförändrade ...
const styles = StyleSheet.create({
  header: { alignItems: "center", marginBottom: 20 },
  roleAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 3,
    borderColor: "#FFF",
  },
  companyBrandCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  companyLogoWrap: { alignItems: "center", marginRight: 10 },
  companyLogoHint: { fontSize: 9, color: "#6B7280", fontWeight: "700", marginBottom: 4, textTransform: "uppercase" },
  companyLogoBox: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  companyLogoImage: { width: 44, height: 44 },
  companyInitialsCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#0EA5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  companyInitialsText: { color: "#FFF", fontWeight: "800", fontSize: 16 },
  companyMeta: { flex: 1, minWidth: 0 },
  companyMetaTitle: { fontSize: 14, fontWeight: "800", color: "#0F172A" },
  companyMetaSub: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  userName: { fontSize: 22, fontWeight: "900", color: "#333" },
  userEmail: { fontSize: 14, color: "#888", fontWeight: "600" },
  userRolePill: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    textTransform: "uppercase",
  },
  statsRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 25, backgroundColor: "#FFF", padding: 20, borderRadius: 20, elevation: 2 },
  statItem: { alignItems: "center" },
  statNum: { fontSize: 20, fontWeight: "900", color: "#1C1C1E", marginTop: 5 },
  statLabel: { fontSize: 11, color: "#8E8E93", fontWeight: "700", textTransform: "uppercase" },
  section: { backgroundColor: "#FFF", borderRadius: 20, padding: 20, marginBottom: 20, elevation: 2, shadowColor: "#000", shadowOpacity: 0.04 },
  sectionTitle: { fontSize: 11, fontWeight: "800", color: "#BBB", marginBottom: 15, letterSpacing: 1 },
  readOnlyField: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  readOnlyText: { marginLeft: 10, color: "#334155", fontWeight: "700", flex: 1 },
  inputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "#F2F2F7", borderRadius: 12, paddingHorizontal: 12, marginBottom: 10 },
  input: { flex: 1, paddingVertical: 14, paddingHorizontal: 10, fontSize: 15, fontWeight: "600", color: "#333" },
  settingsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FB', padding: 15, borderRadius: 15 },
  settingsIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(0, 122, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
  settingsLabel: { fontSize: 15, fontWeight: '700', color: '#1C1C1E' },
  settingsSub: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  logoutBtn: { marginTop: 10, padding: 15, alignItems: 'center' },
  logoutText: { color: "#FF3B30", fontWeight: "900", fontSize: 14 },
  versionText: { textAlign: 'center', color: '#CCC', fontSize: 10, marginTop: 10 }
});