import React, { useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../firebaseConfig";
import { signOut } from "firebase/auth";
import { CompanyContext } from "../context/CompanyContext";
import { useTheme } from "../context/ThemeContext";
import { acceptInvitation } from "../services/invitationService";
import { usePendingInvitation } from "../hooks/usePendingInvitation";
import Button from "../components/Button";

export default function NoCompanyScreen({ onShowLicenseCode }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { user, refetch } = useContext(CompanyContext);
  const [refreshing, setRefreshing] = useState(false);

  const email = (user?.email || "").toString().trim().toLowerCase();
  const { invitation } = usePendingInvitation(email);

  const handleAcceptInvitation = async () => {
    setRefreshing(true);
    try {
      const accepted = await acceptInvitation();
      if (accepted?.companyId) {
        await refetch();
      }
    } catch (e) {
      console.error("[NoCompanyScreen] acceptInvitation:", e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSignOut = () => {
    signOut(auth);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <View style={[styles.iconCircle, { backgroundColor: theme.colors.primaryGlow || "#E8EEFE" }]}>
        <Ionicons name="business-outline" size={48} color={theme.colors.primary} />
      </View>

      <Text style={styles.title}>Välkommen till Workaholic!</Text>
      <Text style={styles.subtitle}>
        Det ser ut som att du inte är kopplad till ett företag ännu. Be din chef
        bjuda in dig via din e-postadress:
      </Text>
      <View style={styles.emailBox}>
        <Text style={styles.emailText} selectable>
          {email}
        </Text>
      </View>
      <Text style={styles.hint}>
        {invitation
          ? `${invitation.companyName} har bjudit in dig. Tryck nedan för att gå med.`
          : "När inbjudan är skickad dyker knappen upp automatiskt här."}
      </Text>

      <View style={styles.actions}>
        {invitation ? (
          <Button
            title={refreshing ? "Kopplar…" : `Acceptera inbjudan till ${invitation.companyName}`}
            onPress={handleAcceptInvitation}
            disabled={refreshing}
            style={[styles.btn, styles.acceptBtn]}
          />
        ) : (
          <Button
            title={refreshing ? "Kontrollerar…" : "Ladda om"}
            onPress={handleAcceptInvitation}
            disabled={refreshing}
            style={styles.btn}
          />
        )}
        {refreshing && <ActivityIndicator color={theme.colors.primary} style={styles.spinner} />}

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} disabled={refreshing}>
          <Ionicons name="log-out-outline" size={18} color={theme.colors.error} />
          <Text style={[styles.signOutText, { color: theme.colors.error }]}>Logga ut</Text>
        </TouchableOpacity>

        {onShowLicenseCode && (
          <TouchableOpacity
            style={styles.codeLink}
            onPress={onShowLicenseCode}
            disabled={refreshing}
          >
            <Ionicons name="key-outline" size={18} color={theme.colors.primary} />
            <Text style={[styles.codeLinkText, { color: theme.colors.primary }]}>
              Jag har en licenskod
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#1C1C1E",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: "#636366",
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 16,
  },
  emailBox: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    alignSelf: "stretch",
    marginBottom: 12,
  },
  emailText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
    textAlign: "center",
  },
  hint: {
    fontSize: 13,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 18,
  },
  actions: {
    alignSelf: "stretch",
    alignItems: "center",
    gap: 16,
  },
  btn: {
    alignSelf: "stretch",
  },
  acceptBtn: {
    backgroundColor: "#22c55e",
  },
  spinner: {
    marginTop: -8,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: "600",
  },
  codeLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  codeLinkText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
