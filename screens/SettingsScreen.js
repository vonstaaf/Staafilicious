import React, { useState, useEffect } from "react";
import { 
  View, Text, StyleSheet, Switch, TouchableOpacity, Alert, 
  Image,
  ScrollView
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WorkaholicTheme } from "../theme";
import { auth, db } from "../firebaseConfig"; 
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore"; 
import { Ionicons } from "@expo/vector-icons";
import Button from "../components/Button";
import { CompanyContext } from "../context/CompanyContext";
import { getProfessionKeys } from "../constants/wholesalers";
import { getCompanyInitials } from "../utils/stringHelpers";

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { company } = React.useContext(CompanyContext) || {};
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [profession, setProfession] = useState("");

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().profession != null) {
          setProfession(userDoc.data().profession);
        }
      }
    } catch (e) { 
      console.error("Laddningsfel:", e); 
    } finally { 
      setLoading(false); 
    }
  };

  const professionKeys = getProfessionKeys(profession);
  const isEl = professionKeys.includes("el");
  const isVvs = professionKeys.includes("vvs");
  const isBygg = professionKeys.includes("bygg");
  const hasEgenkontrollMall = isEl || isVvs || isBygg;

  const companyLogoUrl = company?.companyLogoUrl || company?.logoUrl || null;
  const companyName = company?.companyName || company?.name || "Företag";

  const SettingRow = ({ icon, label, children, onPress, subLabel, iconColor }) => (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={styles.leftContent}>
        <View style={[styles.iconContainer, iconColor && { backgroundColor: iconColor + '10' }]}>
          <Ionicons name={icon} size={20} color={iconColor || WorkaholicTheme.colors.primary} />
        </View>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.label}>{label}</Text>
          {subLabel && <Text style={styles.subLabel} numberOfLines={1}>{subLabel}</Text>}
        </View>
      </View>
      {children}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top - 15 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color={WorkaholicTheme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Inställningar</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.brandHeader}>
          <Image source={require("../assets/icon3.png")} style={styles.brandLogo} resizeMode="contain" />
          <Text style={styles.brandHeaderText}>Workaholic</Text>
        </View>
        <View style={styles.brandDivider} />

        <Text style={styles.sectionTitle}>FÖRETAG & LOGOTYP</Text>
        <View style={styles.logoSection}>
          {companyLogoUrl ? (
            <Image source={{ uri: companyLogoUrl }} style={styles.logoPreview} />
          ) : (
            <View style={[styles.logoPreview, styles.logoPlaceholder, styles.initialsCircle]}>
              <Text style={styles.initialsText}>{getCompanyInitials(companyName)}</Text>
            </View>
          )}
          <Text style={styles.logoCompanyName}>{companyName}</Text>
          <View style={styles.readOnlyNotice}>
            <Ionicons name="lock-closed-outline" size={14} color="#64748B" />
            <Text style={styles.readOnlyNoticeText}>Företagslogotyp hanteras i webbportalen</Text>
          </View>
          <View style={[styles.readOnlyNotice, { marginTop: 8 }]}>
            <Ionicons name="business-outline" size={14} color="#64748B" />
            <Text style={styles.readOnlyNoticeText}>
              Grossistkopplingar och inköpsinställningar hanteras av admin i webbportalen.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>PROJEKTINSTÄLLNINGAR</Text>
        {hasEgenkontrollMall && (
          <SettingRow 
            icon="checkbox-outline" 
            label="Egenkontroll-mall" 
            subLabel={isEl ? "Allmän & Golvvärme" : isVvs ? "VVS-mall" : "Bygg-mall"}
            onPress={() => navigation.navigate("InspectionTemplate")}
          >
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </SettingRow>
        )}

        <Text style={styles.sectionTitle}>PREFERENSER</Text>
        <SettingRow icon="notifications-outline" label="Notiser">
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ true: WorkaholicTheme.colors.primary + "80", false: "#ccc" }}
            thumbColor={notificationsEnabled ? WorkaholicTheme.colors.primary : "#f4f3f4"}
          />
        </SettingRow>

        <View style={styles.adminNoticeBox}>
          <Ionicons name="information-circle-outline" size={16} color="#64748B" />
          <Text style={styles.adminNoticeText}>
            Företagsuppgifter och faktureringsinställningar kan endast ändras av administratör via webbportalen.
          </Text>
        </View>

        <View style={styles.poweredBySection}>
          <Image source={require("../assets/icon3.png")} style={styles.poweredByLogo} resizeMode="contain" />
          <Text style={styles.poweredByText}>Workaholic v1.0.0</Text>
        </View>

        <View style={styles.logoutContainer}>
          <Button title="Logga ut" type="secondary" onPress={() => signOut(auth)} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  contentContainer: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "800", color: WorkaholicTheme.colors.primary },
  brandHeader: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
    paddingBottom: 10,
  },
  brandLogo: { width: 66, height: 66 },
  brandHeaderText: { marginTop: 4, fontSize: 15, fontWeight: "600", color: "#334155" },
  brandDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginBottom: 14,
    marginHorizontal: 6,
  },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: "#8E8E93", marginBottom: 10, marginTop: 15, letterSpacing: 1.2, textTransform: 'uppercase' },
  logoSection: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 12, elevation: 2 },
  logoPreview: { width: 100, height: 100, borderRadius: 12, resizeMode: 'contain', marginBottom: 15 },
  logoPlaceholder: { backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E5EA', borderStyle: 'dashed' },
  initialsCircle: { borderRadius: 50, backgroundColor: WorkaholicTheme.colors.primary },
  initialsText: { color: "#FFF", fontSize: 30, fontWeight: "900" },
  logoCompanyName: { fontSize: 14, color: "#1C1C1E", fontWeight: "700", marginBottom: 8 },
  readOnlyNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  readOnlyNoticeText: { marginLeft: 6, color: "#64748B", fontSize: 12, fontWeight: "600" },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", elevation: 2 },
  leftContent: { flexDirection: "row", alignItems: "center", flex: 1 },
  iconContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(0, 122, 255, 0.1)", justifyContent: "center", alignItems: "center", marginRight: 12 },
  label: { fontSize: 16, fontWeight: "600", color: "#1C1C1E" },
  subLabel: { fontSize: 12, color: "#8E8E93", marginTop: 2 },
  adminNoticeBox: {
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  adminNoticeText: { marginLeft: 8, color: "#475569", fontSize: 12, fontWeight: "600", flex: 1, lineHeight: 18 },
  poweredBySection: {
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  poweredByLogo: { width: 25, height: 25 },
  poweredByText: { marginLeft: 8, color: "#64748B", fontSize: 12, fontWeight: "600" },
  logoutContainer: { marginTop: 30 },
});