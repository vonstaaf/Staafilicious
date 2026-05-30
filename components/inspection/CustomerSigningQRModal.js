import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { doc, onSnapshot } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../../firebaseConfig";
import { WORKAHOLIC_API_BASE } from "../../constants/workaholicApi";
import { WorkaholicTheme } from "../../theme";

export default function CustomerSigningQRModal({
  visible,
  token,
  projectName,
  craftsmanName,
  onCustomerSigned,
  onSkip,
}) {
  const [signingStatus, setSigningStatus] = useState("pending");
  const unsubRef = useRef(null);

  useEffect(() => {
    if (!visible || !token) return;
    setSigningStatus("pending");

    const requestRef = doc(db, "signingRequests", token);
    unsubRef.current = onSnapshot(requestRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.status === "completed" && data.customer) {
        setSigningStatus("completed");
        onCustomerSigned?.(data.customer);
      }
    });

    return () => {
      unsubRef.current?.();
    };
  }, [visible, token, onCustomerSigned]);

  const signingUrl = `${WORKAHOLIC_API_BASE}/sign/${token}`;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Ionicons name="shield-checkmark" size={32} color={WorkaholicTheme.colors.primary} />
          <Text style={styles.title}>Kundensignering</Text>
          <Text style={styles.subtitle}>{projectName}</Text>
        </View>

        {signingStatus === "pending" ? (
          <>
            <View style={styles.card}>
              <Text style={styles.instruction}>
                Räck över telefonen till kunden, eller be dem skanna QR-koden med sin mobilkamera:
              </Text>
              <View style={styles.qrWrap}>
                {token ? <QRCode value={signingUrl} size={200} /> : null}
              </View>
              <Text style={styles.urlHint} numberOfLines={2} ellipsizeMode="middle">
                {signingUrl}
              </Text>
            </View>

            <View style={styles.waitingRow}>
              <ActivityIndicator color={WorkaholicTheme.colors.primary} size="small" />
              <Text style={styles.waitingText}>Väntar på kundens signatur…</Text>
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
              <Text style={styles.infoText}>
                Länken är giltig i 7 dagar. Hantverkare:{" "}
                <Text style={{ fontWeight: "700" }}>{craftsmanName}</Text>
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={60} color="#34C759" />
            <Text style={styles.successTitle}>Kunden har signerat!</Text>
            <Text style={styles.successText}>
              Båda signaturerna finns nu sparade. Generera PDF för att se det färdiga protokollet.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.skipBtn, signingStatus === "completed" && styles.closeBtnPrimary]}
          onPress={onSkip}
        >
          <Text style={[styles.skipText, signingStatus === "completed" && styles.closeBtnText]}>
            {signingStatus === "completed" ? "Stäng" : "Hoppa över kundensignering"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#F8F9FB",
    padding: 24,
    paddingTop: 60,
    alignItems: "center",
  },
  header: { alignItems: "center", marginBottom: 28 },
  title: { fontSize: 22, fontWeight: "900", color: "#1C1C1E", marginTop: 10 },
  subtitle: { fontSize: 14, color: "#6B7280", marginTop: 4, textAlign: "center" },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    alignItems: "center",
    elevation: 3,
    marginBottom: 20,
  },
  instruction: {
    fontSize: 14,
    color: "#374151",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
    fontWeight: "600",
  },
  qrWrap: {
    padding: 16,
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  },
  urlHint: {
    fontSize: 9,
    color: "#9CA3AF",
    textAlign: "center",
    fontFamily: "monospace",
  },
  waitingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  waitingText: { fontSize: 14, color: "#6B7280", fontWeight: "600" },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#F0F7FF",
    borderRadius: 14,
    padding: 14,
    width: "100%",
    marginBottom: 24,
  },
  infoText: { fontSize: 12, color: "#6B7280", flex: 1, lineHeight: 18 },
  successCard: {
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 32,
    width: "100%",
    elevation: 3,
    marginBottom: 28,
  },
  successTitle: { fontSize: 22, fontWeight: "900", color: "#1C1C1E", marginTop: 16, marginBottom: 8 },
  successText: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 20 },
  skipBtn: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    width: "100%",
    alignItems: "center",
  },
  skipText: { fontSize: 14, color: "#6B7280", fontWeight: "700" },
  closeBtnPrimary: {
    backgroundColor: WorkaholicTheme.colors.primary,
    borderColor: WorkaholicTheme.colors.primary,
  },
  closeBtnText: { color: "#FFF" },
});
