import React, { useContext, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  StatusBar,
  ScrollView,
  Alert,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProjectsContext } from "../context/ProjectsContext";
import { WORKAHOLIC_API_BASE } from "../constants/workaholicApi";
import { formatProjectName } from "../utils/stringHelpers";
import { auth } from "../firebaseConfig";
import { signOut } from "firebase/auth";
import { useTheme } from "../context/ThemeContext";
import AppHeader from "../components/AppHeader";
import { CompanyContext } from "../context/CompanyContext";
import { getTotalSeatCount, getTrialDaysLeft, getTrialProgressPercent } from "../utils/subscriptionAccess";

/** Samma bas som API (env / app.json extra / production). */
const WEB_URL = WORKAHOLIC_API_BASE;

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { createProject, importProject, selectedProject } = useContext(ProjectsContext);
  const { company } = useContext(CompanyContext) || {};
  
  const [projectName, setProjectName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const status = String(company?.subscriptionStatus || "").toLowerCase();
  const trialDaysLeft = getTrialDaysLeft(company);
  const trialProgress = getTrialProgressPercent(company);
  const totalSeats = getTotalSeatCount(company);
  const usedSeats = Number(company?.licenseUsed || 0);
  const seatUsagePct = totalSeats > 0 ? Math.min(100, Math.round((usedSeats / totalSeats) * 100)) : 0;
  const isTrialing = status === "trialing";
  const isActive = status === "active";
  const showTrialBanner = isTrialing && trialDaysLeft > 0;
  const trialPackages = [
    { key: "small", name: "Small", licenses: 5, monthlyPrice: 350 },
    { key: "medium", name: "Medium", licenses: 10, monthlyPrice: 700 },
    { key: "large", name: "Large", licenses: 25, monthlyPrice: 1750 },
  ];

  const handleCreate = async () => {
    const cleanedName = formatProjectName(projectName);
    if (cleanedName.length < 2) {
      return Alert.alert("Information", "Namnge projektet (minst 2 tecken).");
    }
    try {
      // Skapar en unik kod för projektet
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      await createProject(cleanedName, code);
      setProjectName("");
      Keyboard.dismiss();
      Alert.alert("Succé!", `Projektet "${cleanedName}" är nu skapat.`);
    } catch (error) { 
      Alert.alert("Fel", "Kunde inte skapa projektet just nu."); 
    }
  };

  const handleJoinByCode = async () => {
    const cleanedCode = projectCode.trim().toUpperCase();
    if (!cleanedCode) return Alert.alert("Fel", "Ange en projektkod.");
    try {
      await importProject(cleanedCode);
      setProjectCode("");
      Keyboard.dismiss();
    } catch (error) { 
      Alert.alert("Fel", "Koden är ogiltig eller har gått ut."); 
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <AppHeader showBackButton={false} hideTitle={true} useBrandLogo />
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.brandText}>
            WORKAHOLIC <Text style={{ color: theme.colors.primary }}>PRO</Text>
          </Text>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => signOut(auth)}>
          <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {showTrialBanner && (
          <View style={styles.trialBanner}>
            <Text style={styles.trialBannerText}>
              Du har {trialDaysLeft} dagar kvar av din provperiod.
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL(`${WEB_URL}/kassa`)}>
              <Text style={styles.trialBannerLink}>Uppgradera nu</Text>
            </TouchableOpacity>
          </View>
        )}

        {(isTrialing || isActive) && (
          <View style={styles.licenseStatusCard}>
            {isTrialing ? (
              <>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>PROVPERIOD</Text>
                  <Text style={styles.statusValue}>{trialDaysLeft} dagar kvar</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFillTrial, { width: `${trialProgress}%` }]} />
                </View>
              </>
            ) : (
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>STATUS</Text>
                <Text style={styles.statusValueActive}>Fullversion aktiv</Text>
              </View>
            )}

            <View style={styles.licenseMeterWrap}>
              <View style={styles.statusRow}>
                <Text style={styles.licenseTitle}>Använda licenser</Text>
                <Text style={styles.licenseCount}>{seatUsagePct}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFillPrimary, { width: `${seatUsagePct}%` }]} />
              </View>
              <Text style={styles.licenseText}>
                Du har {usedSeats} av {totalSeats || 0} licenser i bruk.
              </Text>
            </View>
          </View>
        )}

        {isTrialing && (
          <View style={styles.packagesCard}>
            <Text style={styles.packagesTitle}>Välj paket</Text>
            <Text style={styles.packagesSub}>Påminn chefen att uppgradera innan provperioden tar slut.</Text>
            {trialPackages.map((pkg) => (
              <View key={pkg.key} style={styles.packageRow}>
                <View>
                  <Text style={styles.packageName}>{pkg.name}</Text>
                  <Text style={styles.packageInfo}>{pkg.licenses} licenser · {pkg.monthlyPrice} kr/mån</Text>
                </View>
                <TouchableOpacity
                  style={styles.packageBtn}
                  onPress={() => Linking.openURL(`${WEB_URL}/kassa?antal=${pkg.licenses}`)}
                >
                  <Text style={styles.packageBtnText}>Välj</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* AKTIVT PROJEKT GENVÄG */}
        {selectedProject ? (
          <View style={styles.activeProjectCard}>
            <View style={styles.activeHeader}>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>AKTIVT JUST NU</Text>
              </View>
              
              {/* 🔑 Knapp för att byta projekt genom att navigera till listan */}
              <TouchableOpacity onPress={() => navigation.navigate("Projects")}>
              <Text style={styles.changeText}>BYT PROJEKT</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.projectName}>{selectedProject.name.toUpperCase()}</Text>
            
            <View style={styles.shortcutRow}>
              {/* Genväg till Egenkontroll - Mallväljaren triggas inuti InspectionScreen */}
              <TouchableOpacity 
                style={styles.shortcutBtn} 
                onPress={() => navigation.navigate("InspectionScreen", { project: selectedProject })}
              >
                <Ionicons name="shield-checkmark" size={20} color={theme.colors.primary} />
                <Text style={styles.shortcutText}>Egenkontroll</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.shortcutBtn} 
                onPress={() => navigation.navigate("GroupSchedule", { project: selectedProject })}
              >
                <Ionicons name="list" size={20} color={theme.colors.primary} />
                <Text style={styles.shortcutText}>Projektschema</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.welcomeArea}>
            <View style={styles.iconCircle}>
              <Ionicons name="flash" size={40} color={theme.colors.primary} />
            </View>
            <Text style={styles.welcomeTitle}>Välkommen</Text>
            <Text style={styles.welcomeSub}>Välj ett projekt i listan eller skapa ett nytt nedan för att komma igång.</Text>
          </View>
        )}

        {/* INPUTS FÖR NYA PROJEKT */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>NYTT PROJEKT</Text>
          <View style={styles.inputRow}>
            <TextInput 
              placeholder="NAMN PÅ PROJEKTET..." 
              value={projectName} 
              onChangeText={setProjectName} 
              style={styles.input} 
              placeholderTextColor="#BBB"
            />
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.colors.primary }]} onPress={handleCreate}>
              <Ionicons name="add" size={30} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>ANSLUT MED KOD</Text>
          <View style={styles.inputRow}>
            <TextInput 
              placeholder="ANGE 8-TECKEN KOD..." 
              value={projectCode} 
              onChangeText={setProjectCode} 
              style={styles.input} 
              autoCapitalize="characters"
              placeholderTextColor="#BBB"
            />
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#1C1C1E' }]} onPress={handleJoinByCode}>
              <Ionicons name="key-outline" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.infoFooter}>Workaholic Pro v2.4.0 — 2026 Edition</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  pageHeader: {
    paddingHorizontal: 25,
    paddingVertical: 16,
    backgroundColor: "#FFF",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  brandText: { fontSize: 20, fontWeight: "900", color: "#1C1C1E", letterSpacing: -0.5 },
  dateText: { fontSize: 9, fontWeight: "800", color: "#BBB", marginTop: 2, letterSpacing: 0.5 },
  logoutBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF5F5', justifyContent: 'center', alignItems: 'center' },

  scrollContent: { padding: 20 },
  
  // Aktivt projekt-kort
  activeProjectCard: { backgroundColor: '#FFF', borderRadius: 25, padding: 20, marginBottom: 25, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1, borderColor: '#F0F0F0' },
  activeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34C759', marginRight: 6 },
  statusText: { fontSize: 9, fontWeight: '900', color: '#34C759' },
  changeText: { fontSize: 10, fontWeight: '800', color: '#BBB' },
  projectName: { fontSize: 24, fontWeight: '900', color: '#1C1C1E', marginBottom: 20 },
  shortcutRow: { flexDirection: 'row', gap: 10 },
  shortcutBtn: { flex: 1, backgroundColor: '#F8F9FB', padding: 15, borderRadius: 15, alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'center' },
  shortcutText: { fontSize: 12, fontWeight: '800', color: '#555' },

  welcomeArea: { alignItems: 'center', marginVertical: 30, paddingHorizontal: 30 },
  iconCircle: { width: 80, height: 80, borderRadius: 30, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, marginBottom: 15 },
  welcomeTitle: { fontSize: 22, fontWeight: '900', color: '#1C1C1E' },
  welcomeSub: { fontSize: 13, color: '#AAA', textAlign: 'center', marginTop: 10, lineHeight: 18, fontWeight: '600' },

  card: { backgroundColor: '#FFF', padding: 25, borderRadius: 25, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1, borderColor: '#F0F0F0' },
  sectionLabel: { fontSize: 10, fontWeight: "900", color: "#CCC", letterSpacing: 1.2, marginBottom: 15 },
  inputRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, backgroundColor: "#F5F5F7", padding: 16, borderRadius: 15, fontSize: 14, fontWeight: '700', color: '#1C1C1E' },
  addBtn: { width: 55, borderRadius: 15, justifyContent: "center", alignItems: "center", elevation: 2 },
  divider: { height: 1, backgroundColor: '#F8F9FB', marginVertical: 25 },
  infoFooter: { textAlign: 'center', fontSize: 10, color: '#DDD', fontWeight: '800', marginTop: 30, letterSpacing: 1 },
  trialBanner: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  trialBannerText: {
    flex: 1,
    color: "#92400E",
    fontSize: 13,
    fontWeight: "700",
  },
  trialBannerLink: {
    color: "#7C3AED",
    fontSize: 13,
    fontWeight: "800",
  },
  licenseStatusCard: {
    backgroundColor: "#1F2937",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#374151",
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  statusLabel: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  statusValue: {
    color: "#FBBF24",
    fontSize: 13,
    fontWeight: "800",
  },
  statusValueActive: {
    color: "#34D399",
    fontSize: 13,
    fontWeight: "800",
  },
  progressTrack: {
    width: "100%",
    height: 8,
    borderRadius: 6,
    backgroundColor: "#374151",
    overflow: "hidden",
  },
  progressFillTrial: {
    height: "100%",
    borderRadius: 6,
    backgroundColor: "#F59E0B",
  },
  progressFillPrimary: {
    height: "100%",
    borderRadius: 6,
    backgroundColor: "#8B5CF6",
  },
  licenseMeterWrap: {
    marginTop: 6,
    gap: 8,
  },
  licenseTitle: {
    color: "#D1D5DB",
    fontSize: 13,
    fontWeight: "700",
  },
  licenseCount: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  licenseText: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "600",
  },
  packagesCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  packagesTitle: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "900",
  },
  packagesSub: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
  },
  packageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  packageName: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "800",
  },
  packageInfo: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  packageBtn: {
    backgroundColor: "#8B5CF6",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  packageBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
});