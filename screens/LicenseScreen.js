import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../firebaseConfig";
import { signOut } from "firebase/auth";
import { WorkaholicTheme } from "../theme";
import { CompanyContext } from "../context/CompanyContext";
import { claimLicense } from "../services/licenseService";
import Button from "../components/Button";

export default function LicenseScreen({ onBack }) {
  const insets = useSafeAreaInsets();
  const { refetch } = useContext(CompanyContext);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError("Ange din licenskod.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await claimLicense(trimmed);
      await refetch();
      setCode("");
    } catch (err) {
      const msg = err?.message || String(err);
      if (msg.includes("full") || msg === "LICENSE_FULL") {
        setError("Licensen är full. Be din administratör utöka antalet platser.");
      } else if (msg.includes("Ogiltig") || msg === "INVALID_CODE") {
        setError("Ogiltig licenskod. Kontrollera koden och försök igen.");
      } else if (msg === "ALREADY_CLAIMED") {
        setError("Du är redan kopplad till ett företag. Starta om appen.");
      } else if (msg.includes("inactive") || msg === "LICENSE_INACTIVE") {
        setError("Licensen är inaktiv. Kontakta din administratör.");
      } else {
        setError(msg || "Något gick fel. Försök igen.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    signOut(auth);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.inner, { paddingTop: insets.top + 20 }]}>
          <Image
            source={require("../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          {onBack && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={onBack}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={22} color={WorkaholicTheme.colors.textSecondary} />
              <Text style={styles.backBtnText}>Tillbaka</Text>
            </TouchableOpacity>
          )}
          <View style={styles.header}>
            <Text style={styles.title}>Aktivera licens</Text>
            <Text style={styles.subtitle}>
              Ange den licenskod din arbetsgivare har gett dig. Koden kopplar dig till företagets projekt och planering.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.inputWrapper}>
              <Ionicons name="key-outline" size={20} color="#AAA" style={styles.inputIcon} />
              <TextInput
                placeholder="Licenskod (t.ex. ABC12XYZ)"
                value={code}
                onChangeText={(t) => { setCode(t); setError(""); }}
                autoCapitalize="characters"
                autoCorrect={false}
                style={styles.input}
                placeholderTextColor="#BBB"
                editable={!loading}
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Button
              title={loading ? "Aktiverar..." : "Aktivera licens"}
              onPress={handleSubmit}
              disabled={loading}
              style={styles.btn}
            />
            {loading && <ActivityIndicator color={WorkaholicTheme.colors.primary} style={styles.spinner} />}
          </View>

          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={18} color={WorkaholicTheme.colors.error} />
            <Text style={styles.signOutText}>Logga ut och använd annat konto</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  scrollContent: { flexGrow: 1 },
  inner: { paddingHorizontal: 24 },
  logo: { width: 120, height: 120, alignSelf: "center", marginBottom: 24 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginBottom: 16,
  },
  backBtnText: {
    fontSize: 15,
    color: WorkaholicTheme.colors.textSecondary,
    fontWeight: "600",
  },
  header: { marginBottom: 24 },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1C1C1E",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F7",
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: "#1C1C1E",
  },
  errorText: {
    fontSize: 13,
    color: WorkaholicTheme.colors.error,
    marginBottom: 12,
  },
  btn: { marginTop: 8 },
  spinner: { marginTop: 12 },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  signOutText: {
    fontSize: 14,
    color: WorkaholicTheme.colors.error,
    fontWeight: "600",
  },
});
