import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WORKAHOLIC_API_BASE } from "../constants/workaholicApi";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { useTheme } from "../context/ThemeContext";
import { WorkaholicTheme } from "../theme";
import { useCompanyLicense } from "../hooks/useCompanyLicense";

const WEB_URL = WORKAHOLIC_API_BASE;

export default function LicenseExpiredScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { licenseState } = useCompanyLicense();
  const isTrialExpired = licenseState === "trial_expired";

  const handleLogout = () => {
    signOut(auth);
  };

  const openWebPricing = () => {
    Linking.openURL(`${WEB_URL}/foretag/licenser`);
  };

  const openLicenserPortal = () => {
    Linking.openURL(`${WEB_URL}/foretag/licenser`);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={styles.iconCircle}>
        <Ionicons name="alert-circle" size={42} color={theme.colors.error} />
      </View>
      <Text style={styles.title}>
        {isTrialExpired ? "Provperioden har gått ut" : "Licensen har löpt ut"}
      </Text>
      <Text style={styles.subtitle}>
        {isTrialExpired
          ? "Din 30-dagars provperiod är slut. Köp licenser på webben för att fortsätta använda Workaholic."
          : "Ditt företags licens är inte längre aktiv. För att fortsätta behöver en administratör förlänga eller uppdatera licensen via hemsidan."}
      </Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Så gör du</Text>
        <Text style={styles.cardText}>
          1. Öppna Workaholic på webben (länk nedan).{"\n"}
          2. {isTrialExpired ? "Köp licenser eller starta provperiod med annat företag." : "Logga in i Företagsportalen och gå till Licenser för att förlänga eller uppdatera betalningen."}{"\n"}
          3. Starta om appen när licensen är aktiv igen.
        </Text>
        <TouchableOpacity style={styles.webLinkBtn} onPress={openWebPricing}>
          <Ionicons name="open-outline" size={16} color={theme.colors.primary} />
          <Text style={styles.webLinkText}>Lås upp Workaholic</Text>
        </TouchableOpacity>
        {!isTrialExpired && (
          <TouchableOpacity style={[styles.webLinkBtn, { marginTop: 8 }]} onPress={openLicenserPortal}>
            <Text style={styles.webLinkText}>Licenser (avsluta / hantera prenumeration)</Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color={theme.colors.error} />
        <Text style={styles.logoutText}>Logga ut och byt konto</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FB",
    paddingHorizontal: 24,
    alignItems: "center",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFECEC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1C1C1E",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  card: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1C1C1E",
    marginBottom: 8,
  },
  cardText: {
    fontSize: 13,
    color: "#555",
    lineHeight: 18,
  },
  webLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 8,
  },
  webLinkText: {
    marginLeft: 6,
    fontSize: 14,
    color: WorkaholicTheme.colors.primary,
    fontWeight: "700",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  logoutText: {
    marginLeft: 6,
    fontSize: 14,
    color: WorkaholicTheme.colors.error,
    fontWeight: "700",
  },
});

