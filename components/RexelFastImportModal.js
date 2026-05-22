import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { postRexelManualImport } from "../utils/rexelManualImport";

const MONO_FONT = Platform.select({
  ios: "Courier",
  android: "monospace",
  default: "monospace",
});

const PLACEHOLDER =
  "1437812, 5\n1437813, 10\n(E-nummer, antal)";

/**
 * Rexel snabbregistrering — POST /api/manual-import
 * @param {{ visible: boolean; onClose: () => void; projectId: string | null | undefined; onSuccess?: () => void }} props
 */
export default function RexelFastImportModal({
  visible,
  onClose,
  projectId,
  onSuccess,
}) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [text, setText] = useState("");
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(false);
  const inFlightRef = useRef(false);

  const resetForm = useCallback(() => {
    setText("");
    setWarnings([]);
  }, []);

  const handleClose = useCallback(() => {
    if (loading) return;
    resetForm();
    onClose();
  }, [loading, onClose, resetForm]);

  const handleImport = useCallback(async () => {
    if (inFlightRef.current || loading) return;
    if (!projectId) {
      Alert.alert("Inget projekt", "Välj ett projekt innan du importerar material.");
      return;
    }

    inFlightRef.current = true;
    setLoading(true);
    setWarnings([]);

    try {
      const { warnings: serverWarnings, importedCount } = await postRexelManualImport({
        projectId,
        text,
      });

      if (serverWarnings.length > 0) {
        setWarnings(serverWarnings);
      }

      const importedLabel =
        importedCount != null && importedCount > 0
          ? `${importedCount} rad${importedCount === 1 ? "" : "er"} importerades. `
          : "";

      if (serverWarnings.length > 0) {
        Alert.alert(
          "Importerat med varningar",
          `${importedLabel}${serverWarnings.length} rad${serverWarnings.length === 1 ? "" : "er"} kunde inte matchas:\n\n${serverWarnings.slice(0, 8).join("\n")}${serverWarnings.length > 8 ? `\n…och ${serverWarnings.length - 8} till.` : ""}`,
          [
            {
              text: "OK",
              onPress: () => {
                resetForm();
                onClose();
                onSuccess?.();
              },
            },
          ]
        );
      } else {
        resetForm();
        onClose();
        onSuccess?.();
        Alert.alert("Klart!", "Materialet har lagts till i projektet!");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setWarnings([msg]);
      Alert.alert("Import misslyckades", msg);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [projectId, text, loading, onClose, onSuccess, resetForm]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
          disabled={loading}
        />
        <SafeAreaView style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.grabberRow}>
            <View style={styles.grabber} />
          </View>

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: `${theme.colors.primary}18` },
                ]}
              >
                <Ionicons name="flash-outline" size={22} color={theme.colors.primary} />
              </View>
              <View style={styles.headerTextWrap}>
                <Text style={styles.title}>Rexel snabbregistrering</Text>
                <Text style={styles.subtitle}>E-nummer och antal, rad för rad</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeBtn}
              disabled={loading}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={26} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
          >
            <Text style={styles.hint}>
              Klistra in din lista från följesedel eller Rexel. Separera E-nummer och antal med
              komma, semikolon eller tab.
            </Text>

            <TextInput
              style={styles.listInput}
              multiline
              value={text}
              onChangeText={(v) => {
                setText(v);
                if (warnings.length) setWarnings([]);
              }}
              placeholder={PLACEHOLDER}
              placeholderTextColor="#AAA"
              textAlignVertical="top"
              editable={!loading}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
            />

            {warnings.length > 0 ? (
              <View style={styles.warningBox}>
                <Ionicons name="warning-outline" size={18} color="#C2410C" />
                <View style={styles.warningTextWrap}>
                  {warnings.map((line, i) => (
                    <Text key={`${i}-${line.slice(0, 24)}`} style={styles.warningLine}>
                      {line}
                    </Text>
                  ))}
                </View>
              </View>
            ) : null}

            <TouchableOpacity
              style={[
                styles.importBtn,
                { backgroundColor: theme.colors.primary },
                (loading || !text.trim()) && styles.importBtnDisabled,
              ]}
              onPress={handleImport}
              disabled={loading || !text.trim()}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={20} color="#FFF" />
                  <Text style={styles.importBtnText}>Importera material</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: "92%",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  grabberRow: { alignItems: "center", paddingBottom: 8 },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E5E5EA",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  headerTextWrap: { flex: 1, minWidth: 0 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "900",
    color: "#1C1C1E",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8E8E93",
    marginTop: 2,
  },
  closeBtn: { padding: 4 },
  scrollBody: { paddingBottom: 16 },
  hint: {
    fontSize: 13,
    color: "#8E8E93",
    lineHeight: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  listInput: {
    minHeight: 160,
    maxHeight: 280,
    backgroundColor: "#F5F5F7",
    borderRadius: 16,
    padding: 14,
    fontSize: 14,
    fontWeight: "600",
    color: "#1C1C1E",
    fontFamily: MONO_FONT,
    borderWidth: 1,
    borderColor: "#EEE",
    marginBottom: 14,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  warningTextWrap: { flex: 1, minWidth: 0 },
  warningLine: {
    fontSize: 12,
    fontWeight: "700",
    color: "#C2410C",
    lineHeight: 18,
    marginBottom: 4,
  },
  importBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 4,
  },
  importBtnDisabled: { opacity: 0.5 },
  importBtnText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
