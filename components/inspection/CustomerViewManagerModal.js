import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ScrollView,
  Share,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { WorkaholicTheme } from "../../theme";
import {
  initCustomerView,
  updateCustomerViewPermissions,
  deactivateCustomerView,
  getCustomerView,
  buildCustomerViewUrl,
} from "../../utils/customerView";

// ─── Permission row ───────────────────────────────────────────────────────────

function PermissionRow({ label, description, value, onValueChange, disabled }) {
  return (
    <View style={styles.permRow}>
      <View style={styles.permText}>
        <Text style={styles.permLabel}>{label}</Text>
        {description ? <Text style={styles.permDesc}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: "#E5E7EB", true: WorkaholicTheme.colors.primary + "55" }}
        thumbColor={value ? WorkaholicTheme.colors.primary : "#9CA3AF"}
        ios_backgroundColor="#E5E7EB"
      />
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Hanterar kundvyn (Digitala Huspärmen) för ett projekt.
 *
 * Props:
 *   visible      – boolean
 *   project      – group-objektet ({ id, name, customerAddress, customerViewToken? })
 *   companyId    – string
 *   onClose      – () => void
 *   onActivated  – (token: string) => void  — anropas när kundvy aktiveras
 */
export default function CustomerViewManagerModal({
  visible,
  project,
  companyId,
  onClose,
  onActivated,
}) {
  const [phase, setPhase] = useState("idle"); // idle | loading | active | saving | error
  const [token, setToken] = useState(null);
  const [permissions, setPermissions] = useState({
    showMilestones: true,
    showDocuments: true,
    showGallery: true,
  });

  const projectUrl = token ? buildCustomerViewUrl(token) : null;

  // ── Ladda befintlig kundvy när modalen öppnas ────────────────────────────────
  useEffect(() => {
    if (!visible || !project) return;

    const existingToken = project.customerViewToken;
    if (!existingToken) {
      setPhase("idle");
      setToken(null);
      return;
    }

    setPhase("loading");
    getCustomerView(existingToken)
      .then((data) => {
        if (!data) {
          // Token finns på project men doc saknas — återställ
          setPhase("idle");
          setToken(null);
          return;
        }
        setToken(existingToken);
        setPermissions({
          showMilestones: data.permissions?.showMilestones ?? true,
          showDocuments:  data.permissions?.showDocuments  ?? true,
          showGallery:    data.permissions?.showGallery    ?? true,
        });
        setPhase("active");
      })
      .catch(() => setPhase("error"));
  }, [visible, project]);

  // ── Aktivera ny kundvy ───────────────────────────────────────────────────────
  const handleActivate = useCallback(async () => {
    if (!project?.id || !companyId) return;
    setPhase("loading");
    try {
      const { token: newToken } = await initCustomerView(
        project.id,
        project.customerAddress || "",
        companyId
      );
      setToken(newToken);
      setPermissions({ showMilestones: true, showDocuments: true, showGallery: true });
      setPhase("active");
      onActivated?.(newToken);
    } catch (e) {
      Alert.alert("Kunde inte aktivera", e?.message || "Försök igen.");
      setPhase("idle");
    }
  }, [project, companyId, onActivated]);

  // ── Spara permissions ────────────────────────────────────────────────────────
  const handlePermChange = useCallback(
    async (key, value) => {
      const next = { ...permissions, [key]: value };
      setPermissions(next);
      if (!token) return;
      try {
        await updateCustomerViewPermissions(token, next);
      } catch {
        // Optimistic update — återgå vid fel
        setPermissions(permissions);
        Alert.alert("Fel", "Kunde inte spara inställningen.");
      }
    },
    [token, permissions]
  );

  // ── Stäng kundvyn ────────────────────────────────────────────────────────────
  const handleDeactivate = useCallback(() => {
    Alert.alert(
      "Stäng kundvyn?",
      "Kunden förlorar åtkomst till projektvyn. Du kan aktivera den igen senare.",
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Stäng kundvyn",
          style: "destructive",
          onPress: async () => {
            setPhase("loading");
            try {
              await deactivateCustomerView(token, companyId, project.id);
              setToken(null);
              setPhase("idle");
            } catch (e) {
              Alert.alert("Fel", e?.message || "Försök igen.");
              setPhase("active");
            }
          },
        },
      ]
    );
  }, [token, companyId, project]);

  // ── Dela länk ────────────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    if (!projectUrl) return;
    try {
      await Share.share({
        message: `Se ditt projekts status och dokument här:\n${projectUrl}`,
        url: projectUrl,
        title: `Projektvy – ${project?.name || "Ditt projekt"}`,
      });
    } catch {
      // Användaren avbröt delningen
    }
  }, [projectUrl, project]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Digital Huspärm</Text>
            <Text style={styles.headerSub}>{project?.name || "Projekt"}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* ── IDLE — inte aktiverad ── */}
        {phase === "idle" && (
          <View style={styles.idleCard}>
            <Text style={styles.idleIcon}>🏠</Text>
            <Text style={styles.idleTitle}>Aktivera kundvy</Text>
            <Text style={styles.idleDesc}>
              Ge kunden en säker länk där de kan följa projektets status,
              se dokument och bilder — utan att se interna priser.
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleActivate}>
              <Ionicons name="qr-code-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Aktivera och generera QR-kod</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── LOADING ── */}
        {phase === "loading" && (
          <View style={styles.centerBlock}>
            <ActivityIndicator size="large" color={WorkaholicTheme.colors.primary} />
            <Text style={styles.loadingText}>Laddar…</Text>
          </View>
        )}

        {/* ── ERROR ── */}
        {phase === "error" && (
          <View style={styles.centerBlock}>
            <Text style={styles.errorText}>Kunde inte ladda kundvyn. Stäng och försök igen.</Text>
          </View>
        )}

        {/* ── ACTIVE ── */}
        {phase === "active" && token && (
          <>
            {/* QR-sektion */}
            <View style={styles.qrCard}>
              <Text style={styles.qrLabel}>Skanna eller dela med kunden</Text>
              <View style={styles.qrWrap}>
                <QRCode value={projectUrl} size={180} />
              </View>
              <Text style={styles.urlText} numberOfLines={1} ellipsizeMode="middle">
                {projectUrl}
              </Text>
              <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                <Ionicons name="share-outline" size={18} color={WorkaholicTheme.colors.primary} />
                <Text style={styles.shareBtnText}>Dela länk via SMS eller mail</Text>
              </TouchableOpacity>
            </View>

            {/* Permissions */}
            <View style={styles.permCard}>
              <Text style={styles.permCardTitle}>Vad kunden ser</Text>

              <PermissionRow
                label="Tidslinje / Projektfaser"
                description="Visar milstolpar och status för varje etapp."
                value={permissions.showMilestones}
                onValueChange={(v) => handlePermChange("showMilestones", v)}
              />
              <View style={styles.divider} />
              <PermissionRow
                label="Dokument & Protokoll"
                description="PDF-filer du laddat upp, t.ex. egenkontroller."
                value={permissions.showDocuments}
                onValueChange={(v) => handlePermChange("showDocuments", v)}
              />
              <View style={styles.divider} />
              <PermissionRow
                label="Bildgalleri"
                description="Före/efter-foton från projektet."
                value={permissions.showGallery}
                onValueChange={(v) => handlePermChange("showGallery", v)}
              />
              <View style={styles.divider} />

              {/* Materiallista — alltid låst */}
              <View style={[styles.permRow, styles.permRowLocked]}>
                <View style={styles.permText}>
                  <Text style={[styles.permLabel, styles.permLabelLocked]}>
                    <Ionicons name="lock-closed" size={12} color="#9CA3AF" /> Materiallista & priser
                  </Text>
                  <Text style={styles.permDesc}>Visas aldrig för kunden. Skyddar dina inköpspriser.</Text>
                </View>
                <Switch value={false} disabled trackColor={{ false: "#E5E7EB" }} thumbColor="#D1D5DB" />
              </View>
            </View>

            {/* Stäng kundvy */}
            <TouchableOpacity style={styles.deactivateBtn} onPress={handleDeactivate}>
              <Ionicons name="eye-off-outline" size={16} color="#EF4444" />
              <Text style={styles.deactivateBtnText}>Stäng kundvyn</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 20, paddingBottom: 48 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    paddingTop: 8,
  },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#111827" },
  headerSub: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  // Idle
  idleCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    elevation: 2,
  },
  idleIcon: { fontSize: 48, marginBottom: 14 },
  idleTitle: { fontSize: 18, fontWeight: "900", color: "#111827", marginBottom: 10 },
  idleDesc: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 20, marginBottom: 24 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: WorkaholicTheme.colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: "100%",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  // Loading / error
  centerBlock: { alignItems: "center", padding: 40 },
  loadingText: { marginTop: 12, color: "#6B7280", fontSize: 14 },
  errorText: { color: "#EF4444", textAlign: "center", fontSize: 14 },

  // QR
  qrCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    elevation: 2,
    marginBottom: 16,
  },
  qrLabel: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 18 },
  qrWrap: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
  },
  urlText: { fontSize: 10, color: "#9CA3AF", fontFamily: "monospace", marginBottom: 18, textAlign: "center", width: "100%" },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: WorkaholicTheme.colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 20,
    width: "100%",
    justifyContent: "center",
  },
  shareBtnText: { fontSize: 14, fontWeight: "800", color: WorkaholicTheme.colors.primary },

  // Permissions
  permCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    elevation: 2,
    marginBottom: 16,
  },
  permCardTitle: { fontSize: 14, fontWeight: "800", color: "#111827", marginBottom: 16 },
  permRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, gap: 12 },
  permRowLocked: { opacity: 0.55 },
  permText: { flex: 1 },
  permLabel: { fontSize: 14, fontWeight: "700", color: "#111827" },
  permLabelLocked: { color: "#9CA3AF" },
  permDesc: { fontSize: 12, color: "#9CA3AF", marginTop: 2, lineHeight: 16 },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 2 },

  // Deactivate
  deactivateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
    backgroundColor: "#FFF5F5",
  },
  deactivateBtnText: { fontSize: 14, fontWeight: "800", color: "#EF4444" },
});
