import React, { useState, useContext, useEffect } from "react";
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
import * as ImagePicker from "expo-image-picker";
import Constants from 'expo-constants'; // 👈 Tillagd för automatisk version
import { WorkaholicTheme } from "../theme";
import Button from "../components/Button";
import { auth, db } from "../firebaseConfig";
import { updatePassword, updateProfile, signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { ProjectsContext } from "../context/ProjectsContext";
import { useBadges } from "../context/BadgeContext";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { projects } = useContext(ProjectsContext);
  const { currentLogo, setCurrentLogo } = useBadges();
  const user = auth.currentUser;

  const [email] = useState(user?.email || "");
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [profession, setProfession] = useState("Elektriker"); 
  const [companyName, setCompanyName] = useState("");
  const [orgNr, setOrgNr] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [zipCity, setZipCity] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);

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
        let fetchedProf = d.profession || "Elektriker";
        let pLower = fetchedProf.toLowerCase();
        if (pLower.includes("el")) setProfession("Elektriker");
        else if (pLower.includes("snickare") || pLower.includes("bygg")) setProfession("Snickare");
        else if (pLower.includes("rör") || pLower.includes("vvs")) setProfession("Rörmokare");
        else setProfession(fetchedProf);
        setCompanyName(d.companyName || "");
        setOrgNr(d.orgNr || "");
        setPhone(d.phone || "");
        setAddress(d.address || "");
        setZipCity(d.zipCity || "");
        setWebsite(d.website || "");
        if (d.logoUrl) {
          setCurrentLogo(d.logoUrl);
          await AsyncStorage.setItem('@company_logo', d.logoUrl);
        }
      }
    } catch (e) { console.log("Kunde inte hämta data", e); }
  };

  const pickLogo = async () => {
    try {
      let r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
      });
      if (!r.canceled) {
        const uri = r.assets[0].uri;
        setCurrentLogo(uri);
        await AsyncStorage.setItem('@company_logo', uri);
        await updateDoc(doc(db, "users", user.uid), { logoUrl: uri });
      }
    } catch (e) { Alert.alert("Fel", "Kunde inte välja bild."); }
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
        profession: profession, 
        companyName, orgNr, phone, address, zipCity, website
      });
      Alert.alert("Sparat", "Din profil och yrkesroll har uppdaterats.");
    } catch (e) { Alert.alert("Fel", "Kunde inte spara profil."); }
    finally { setLoading(false); }
  };

  const handleLogout = () => {
    Alert.alert("Logga ut", "Är du säker?", [
      { text: "Avbryt", style: "cancel" },
      { text: "Logga ut", style: "destructive", onPress: () => signOut(auth) }
    ]);
  };

  const ROLES = ['Elektriker', 'Snickare', 'Rörmokare'];

  return (
    <View style={{ flex: 1, backgroundColor: "#F8F9FB" }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView 
          // 🔑 FIX: Stavfel "dingTop" rättat till "paddingTop" och ökad bottenmarginal
          contentContainerStyle={{ 
            padding: 20, 
            paddingTop: insets.top + 10, 
            paddingBottom: insets.bottom + 130 
          }}
          showsVerticalScrollIndicator={false}
        >
          
          <View style={styles.topHeader}>
            <View style={{ width: 24 }} /> 
            <TouchableOpacity onPress={() => navigation.navigate("Settings")} style={styles.settingsHeaderBtn}>
               <Ionicons name="settings-outline" size={24} color={WorkaholicTheme.colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.header}>
            <TouchableOpacity onPress={pickLogo} style={styles.logoWrapper}>
              {currentLogo ? (
                <Image source={{ uri: currentLogo }} style={styles.logo} />
              ) : (
                <View style={styles.placeholderLogo}><Ionicons name="camera" size={30} color="#BBB" /></View>
              )}
              <View style={styles.editBadge}><Ionicons name="pencil" size={12} color="#FFF" /></View>
            </TouchableOpacity>
            <Text style={styles.userName}>{displayName || "Användare"}</Text>
            <Text style={styles.userEmail}>{email}</Text>
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
                <Ionicons name="options-outline" size={22} color={WorkaholicTheme.colors.primary} />
              </View>
              <View style={{flex: 1, marginLeft: 12}}>
                <Text style={styles.settingsLabel}>Grossist-kopplingar & Logo</Text>
                <Text style={styles.settingsSub}>Hantera Rexel, Solar, Ahlsell m.m.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>YRKESROLL</Text>
            <View style={styles.professionRow}>
              {ROLES.map(role => {
                const isActive = profession === role;
                return (
                  <TouchableOpacity 
                    key={role} 
                    style={[styles.profBtn, isActive && styles.profBtnActive]}
                    onPress={() => setProfession(role)}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={role === 'Elektriker' ? 'flash' : role === 'Snickare' ? 'hammer' : 'water'} 
                      size={20} 
                      color={isActive ? '#FFF' : '#CCC'} 
                    />
                    <Text style={[styles.profText, isActive && { color: '#FFF' }]}>{role}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FÖRETAGSUPPGIFTER</Text>
            <View style={{ gap: 15 }}>
              <View style={styles.inputWrapper}>
                <Ionicons name="business" size={20} color="#CCC" />
                <TextInput style={styles.input} placeholder="Företagsnamn" value={companyName} onChangeText={setCompanyName} />
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons name="card" size={20} color="#CCC" />
                <TextInput style={styles.input} placeholder="Org.nr" value={orgNr} onChangeText={setOrgNr} keyboardType="numeric" />
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons name="call" size={20} color="#CCC" />
                <TextInput style={styles.input} placeholder="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons name="map" size={20} color="#CCC" />
                <TextInput style={styles.input} placeholder="Gatuadress" value={address} onChangeText={setAddress} />
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons name="location" size={20} color="#CCC" />
                <TextInput style={styles.input} placeholder="Postnr & Ort" value={zipCity} onChangeText={setZipCity} />
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons name="globe" size={20} color="#CCC" />
                <TextInput style={styles.input} placeholder="Hemsida" value={website} onChangeText={setWebsite} autoCapitalize="none" />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>KONTO</Text>
            <View style={{ gap: 15 }}>
              <View style={styles.inputWrapper}>
                <Ionicons name="person" size={20} color="#CCC" />
                <TextInput style={styles.input} placeholder="Visningsnamn" value={displayName} onChangeText={setDisplayName} />
              </View>
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
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  settingsHeaderBtn: { padding: 5 },
  header: { alignItems: "center", marginBottom: 20 },
  logoWrapper: { marginBottom: 15 },
  logo: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: "#FFF" },
  placeholderLogo: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#E1E1E1", justifyContent: 'center', alignItems: 'center' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: WorkaholicTheme.colors.primary, borderRadius: 15, width: 30, height: 30, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  userName: { fontSize: 22, fontWeight: "900", color: "#333" },
  userEmail: { fontSize: 14, color: "#888", fontWeight: "600" },
  statsRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 25, backgroundColor: "#FFF", padding: 20, borderRadius: 20, elevation: 2 },
  statItem: { alignItems: "center" },
  statNum: { fontSize: 20, fontWeight: "900", color: "#1C1C1E", marginTop: 5 },
  statLabel: { fontSize: 11, color: "#8E8E93", fontWeight: "700", textTransform: "uppercase" },
  section: { backgroundColor: "#FFF", borderRadius: 20, padding: 20, marginBottom: 20, elevation: 2, shadowColor: "#000", shadowOpacity: 0.04 },
  sectionTitle: { fontSize: 11, fontWeight: "800", color: "#BBB", marginBottom: 15, letterSpacing: 1 },
  professionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  profBtn: { flex: 1, backgroundColor: '#F5F5F5', marginHorizontal: 5, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#EEE' },
  profBtnActive: { backgroundColor: WorkaholicTheme.colors.primary, borderColor: WorkaholicTheme.colors.primary },
  profText: { marginTop: 5, fontWeight: '800', fontSize: 12, color: '#666' },
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