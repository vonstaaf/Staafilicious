import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ScreenOrientation from "expo-screen-orientation";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../components/AppHeader";
import SignModal from "../components/inspection/SignModal";
import { useTheme } from "../context/ThemeContext";
import { WorkaholicTheme } from "../theme";
import { CompanyContext } from "../context/CompanyContext";
import { db, auth } from "../firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { capitalizeFirst } from "../utils/stringHelpers";
import { rotateSignatureForPortrait } from "../utils/signatureHelpers";

const DEFAULT_DURATION_MIN = 30;
const PRESSURE_DROP_LIMIT_BAR = 0.1;

export default function PressureTestScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { companyId } = React.useContext(CompanyContext);
  const { project } = route.params || {};
  const groupId = project?.id;

  const [startPressure, setStartPressure] = useState("");
  const [endPressure, setEndPressure] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(DEFAULT_DURATION_MIN * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [signatureData, setSignatureData] = useState(null);
  const [signatureModalVisible, setSignatureModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    if (!isTimerRunning) return;
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => {
        if (prev <= 0) {
          setIsTimerRunning(false);
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  const startTimer = () => {
    setElapsedSeconds(timerSeconds);
    setIsTimerRunning(true);
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const avslutaTest = () => {
    stopTimer();
    Alert.alert(
      "Test avslutat",
      "Du kan ange sluttryck och signera för att spara protokollet.",
      [{ text: "OK" }]
    );
  };

  const formatTime = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const startNum = parseFloat(startPressure.replace(",", "."));
  const endNum = parseFloat(endPressure.replace(",", "."));
  const validInput = !isNaN(startNum) && !isNaN(endNum) && startNum >= 0 && endNum >= 0;
  const pressureDrop = validInput ? startNum - endNum : null;
  const isApproved = pressureDrop !== null && pressureDrop <= PRESSURE_DROP_LIMIT_BAR && pressureDrop >= 0;
  const isRejected = pressureDrop !== null && (pressureDrop > PRESSURE_DROP_LIMIT_BAR || pressureDrop < 0);

  const handleSave = async () => {
    if (!companyId || !groupId || !project) {
      Alert.alert("Fel", "Projekt eller företag saknas.");
      return;
    }
    if (!validInput) {
      Alert.alert("Fel", "Ange giltigt start- och sluttryck (bar).");
      return;
    }
    if (!signatureData) {
      Alert.alert("Fel", "Signera protokollet innan du sparar.");
      return;
    }

    setSaving(true);
    try {
      // Vid PDF-export hämtas företagets logotyp från companies/{companyId} – montören behöver inte ladda upp igen.
      const docRef = collection(db, "companies", companyId, "groups", groupId, "documents");
      await addDoc(docRef, {
        type: "pressure_test",
        startPressureBar: startNum,
        endPressureBar: endNum,
        pressureDropBar: pressureDrop,
        status: isApproved ? "approved" : "rejected",
        durationSeconds: Math.max(0, timerSeconds - elapsedSeconds),
        timerDurationSeconds: timerSeconds,
        signatureBase64: signatureData,
        projectName: capitalizeFirst(project.name),
        createdBy: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
      });
      Alert.alert("Sparat", "Tryckprovningsprotokollet har sparats.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert("Kunde inte spara", err?.message || "Försök igen.");
    } finally {
      setSaving(false);
    }
  };

  const openSignatureModal = async () => {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
    setSignatureModalVisible(true);
  };

  const closeSignatureModal = async () => {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    setSignatureModalVisible(false);
  };

  const handleSignatureFromModal = async (sig) => {
    const fullSig = sig && (typeof sig === "string") ? (sig.startsWith("data:") ? sig : `data:image/png;base64,${sig}`) : null;
    if (!fullSig) {
      return;
    }
    setSignatureData(fullSig);
    setSignatureModalVisible(false);
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    try {
      const rotated = await rotateSignatureForPortrait(fullSig);
      setSignatureData(rotated);
    } catch {
      // behåll oförändrad signatur vid rotationsfel
    }
  };

  const handleSignatureEmpty = () => {
    Alert.alert("Tom signatur", "Rita en signatur innan du bekräftar.");
  };

  if (!project) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.placeholderText}>Inget projekt valt. Gå tillbaka och välj ett projekt.</Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.colors.primary }]} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>TILLBAKA</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const projectName = capitalizeFirst(project.name);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <AppHeader
        title="TRYCKPROVNING"
        subTitle={projectName}
        navigation={navigation}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionLabel}>TRYCK (bar)</Text>
          <View style={styles.row}>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Starttryck (bar)</Text>
              <TextInput
                style={styles.input}
                value={startPressure}
                onChangeText={setStartPressure}
                placeholder="t.ex. 4,0"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Sluttryck (bar)</Text>
              <TextInput
                style={styles.input}
                value={endPressure}
                onChangeText={setEndPressure}
                placeholder="t.ex. 3,95"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {pressureDrop !== null && (
            <View style={[styles.resultBox, isApproved && styles.resultApproved, isRejected && styles.resultRejected]}>
              <Text style={styles.resultLabel}>Tryckfall: {pressureDrop.toFixed(2)} bar</Text>
              <Text style={[styles.resultStatus, isApproved && styles.resultStatusOk, isRejected && styles.resultStatusFail]}>
                {isApproved ? "Godkänt" : "Underkänd"}
              </Text>
              {isRejected && (
                <Text style={styles.resultHint}>
                  Gräns för godkänt: max {PRESSURE_DROP_LIMIT_BAR} bar tryckfall.
                </Text>
              )}
            </View>
          )}

          <Text style={styles.sectionLabel}>TIMER (provtid)</Text>
          <View style={styles.timerBox}>
            <Text style={styles.timerDisplay}>{formatTime(isTimerRunning ? elapsedSeconds : timerSeconds)}</Text>
            <View style={styles.timerButtons}>
              {!isTimerRunning ? (
                <TouchableOpacity style={[styles.timerBtnStart, { backgroundColor: theme.colors.primary }]} onPress={startTimer}>
                  <Ionicons name="play" size={24} color="#FFF" />
                  <Text style={styles.timerBtnText}>Starta</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.timerButtonsRow}>
                  <TouchableOpacity style={styles.timerBtnStop} onPress={stopTimer}>
                    <Ionicons name="stop" size={24} color="#FFF" />
                    <Text style={styles.timerBtnText}>Stoppa</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.timerBtnAvsluta, { borderColor: theme.colors.primary }]}
                    onPress={avslutaTest}
                  >
                    <Ionicons name="checkmark-done" size={22} color={theme.colors.primary} />
                    <Text style={[styles.timerBtnAvslutaText, { color: theme.colors.primary }]}>Avsluta test</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <Text style={styles.timerHint}>Standard 30 min. Timer räknar ned.</Text>
          </View>

          <Text style={styles.sectionLabel}>SIGNATUR (kund / montör)</Text>
          <TouchableOpacity
            style={styles.signatureTrigger}
            onPress={openSignatureModal}
          >
            {signatureData ? (
              <>
                <Ionicons name="checkmark-circle" size={28} color={WorkaholicTheme.colors.success} />
                <Text style={styles.signatureTriggerTextOk}>✓ Signatur bekräftad</Text>
                <Text style={styles.signatureTriggerSub}>Tryck för att ändra</Text>
              </>
            ) : (
              <>
                <Ionicons name="pencil" size={28} color={theme.colors.primary} />
                <Text style={[styles.signatureTriggerText, { color: theme.colors.primary }]}>Signera protokollet</Text>
                <Text style={styles.signatureTriggerSub}>Öppnar signaturyta i popup</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>

        <SignModal
          visible={signatureModalVisible}
          title="Signera protokoll"
          buttonText="Bekräfta signatur"
          onClose={closeSignatureModal}
          onSignature={handleSignatureFromModal}
          onEmpty={handleSignatureEmpty}
        />

        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: theme.colors.primary }, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="document-text" size={22} color="#FFF" />
                <Text style={styles.saveBtnText}>Spara protokoll</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  centered: { justifyContent: "center", alignItems: "center", padding: 24 },
  placeholderText: { fontSize: 16, color: "#666", textAlign: "center" },
  backBtn: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  backBtnText: { color: "#FFF", fontWeight: "800" },
  scrollContent: { padding: 20 },
  sectionLabel: { fontSize: 11, fontWeight: "900", color: "#999", letterSpacing: 1, marginBottom: 10, marginTop: 20 },
  row: { flexDirection: "row", gap: 12 },
  inputWrap: { flex: 1 },
  inputLabel: { fontSize: 12, fontWeight: "700", color: "#555", marginBottom: 6 },
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#EEE",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontWeight: "700",
    color: "#1C1C1E",
  },
  resultBox: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 2,
    borderColor: "#EEE",
  },
  resultApproved: { borderColor: WorkaholicTheme.colors.success, backgroundColor: WorkaholicTheme.colors.success + "15" },
  resultRejected: { borderColor: WorkaholicTheme.colors.error, backgroundColor: WorkaholicTheme.colors.error + "15" },
  resultLabel: { fontSize: 14, fontWeight: "800", color: "#1C1C1E" },
  resultStatus: { fontSize: 18, fontWeight: "900", marginTop: 4 },
  resultStatusOk: { color: WorkaholicTheme.colors.success },
  resultStatusFail: { color: WorkaholicTheme.colors.error },
  resultHint: { fontSize: 11, color: "#666", marginTop: 6 },
  timerBox: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEE",
  },
  timerDisplay: { fontSize: 42, fontWeight: "900", color: "#1C1C1E", fontVariant: ["tabular-nums"] },
  timerButtons: { marginTop: 12 },
  timerButtonsRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 12 },
  timerBtnStart: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  timerBtnStop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: WorkaholicTheme.colors.error,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  timerBtnText: { color: "#FFF", fontWeight: "900", fontSize: 16 },
  timerBtnAvsluta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  timerBtnAvslutaText: { fontWeight: "800", fontSize: 15 },
  timerHint: { fontSize: 10, color: "#999", marginTop: 10 },
  signatureTrigger: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEE",
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 100,
  },
  signatureTriggerText: { fontSize: 16, fontWeight: "800" },
  signatureTriggerTextOk: { fontSize: 16, fontWeight: "800", color: WorkaholicTheme.colors.success },
  signatureTriggerSub: { fontSize: 12, color: "#666", marginTop: 4 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#EEE",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    elevation: 2,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: "#FFF", fontWeight: "900", fontSize: 16 },
});
