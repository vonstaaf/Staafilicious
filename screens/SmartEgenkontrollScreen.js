import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ScreenOrientation from "expo-screen-orientation";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../components/AppHeader";
import SignModal from "../components/inspection/SignModal";
import { WorkaholicTheme } from "../theme";
import { CompanyContext } from "../context/CompanyContext";
import { db, auth } from "../firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { capitalizeFirst } from "../utils/stringHelpers";
import { rotateSignatureForPortrait } from "../utils/signatureHelpers";
import { uploadInspectionPhoto } from "../utils/uploadInspectionMedia";
import { VVS_EGENKONTROLL_ITEMS } from "../constants/vvsChecklist";
import VoiceInputButton from "../components/VoiceInputButton";

export default function SmartEgenkontrollScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { companyId } = React.useContext(CompanyContext);
  const { project } = route.params || {};
  const groupId = project?.id;

  const [items] = useState(VVS_EGENKONTROLL_ITEMS);
  const [checks, setChecks] = useState({});
  const [rowComments, setRowComments] = useState({});
  const [photos, setPhotos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [signModalVisible, setSignModalVisible] = useState(false);
  const [nameClarification, setNameClarification] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const setStatus = useCallback((id, status) => {
    const newChecks = { ...checks, [id]: checks[id] === status ? null : status };
    setChecks(newChecks);
    if (currentIndex < items.length - 1) {
      setTimeout(() => setCurrentIndex((prev) => prev + 1), 250);
    }
  }, [checks, currentIndex, items.length]);

  const photosForItem = (itemId) => photos.filter((p) => p.itemId === itemId);
  const hasRequiredPhoto = (item) => !item.requiresPhoto || photosForItem(item.id).length > 0;
  const allRequiredPhotosTaken = items.every(hasRequiredPhoto);

  const takePhoto = useCallback(async () => {
    if (!companyId || !groupId || !project) {
      Alert.alert("Fel", "Projekt eller företag saknas.");
      return;
    }
    const item = items[currentIndex];
    if (!item) return;

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Behörighet", "Kamerabehörighet krävs för att ta foton.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled) return;

    setUploadingPhoto(true);
    try {
      let coords = null;
      try {
        const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
        if (locStatus === "granted") {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        }
      } catch {
        // fortsätt utan koordinater
      }
      const entry = await uploadInspectionPhoto(companyId, groupId, result.assets[0].uri, item.id, coords);
      setPhotos((prev) => [...prev, entry]);
    } catch (e) {
      Alert.alert("Uppladdning misslyckades", e?.message || "Försök igen.");
    } finally {
      setUploadingPhoto(false);
    }
  }, [companyId, groupId, project, currentIndex, items]);

  const removePhoto = useCallback((index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const openSignModal = async () => {
    if (!allRequiredPhotosTaken) {
      const missing = items.filter((i) => i.requiresPhoto && photosForItem(i.id).length === 0);
      Alert.alert("Foto krävs", `Ta minst ett foto för: ${missing.map((m) => m.label).join(", ")}`);
      return;
    }
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
    setSignModalVisible(true);
  };

  const closeSignModal = async () => {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    setSignModalVisible(false);
  };

  const handleSignature = async (sig) => {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    setSignModalVisible(false);
    if (!companyId || !groupId || !project) {
      return;
    }
    if (!auth.currentUser) {
      Alert.alert("Session", "Du är inte inloggad. Logga in och försök igen.");
      return;
    }

    const raw = typeof sig === "string" ? sig.trim() : "";
    const base64Part = raw.includes("base64,") ? raw.split("base64,")[1] : raw.replace(/^data:image\/\w+;base64,/, "");
    if (!base64Part || base64Part.length < 80) {
      Alert.alert("Signatur saknas", "Rita en tydlig signatur och försök igen.");
      return;
    }

    let fullSig = raw.startsWith("data:") ? raw : `data:image/png;base64,${raw}`;
    try {
      fullSig = await rotateSignatureForPortrait(fullSig);
    } catch {
      /* behåll oförändrad */
    }

    setIsProcessing(true);
    try {
      await addDoc(collection(db, "companies", companyId, "groups", groupId, "documents"), {
        type: "smart_inspection",
        projectName: capitalizeFirst(project.name),
        items,
        checks,
        rowComments,
        photos,
        signature: fullSig,
        signedBy: nameClarification || "Installatör",
        createdBy: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
      });
      Alert.alert("Sparat", "Smart egenkontroll har arkiverats.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert("Kunde inte spara", e?.message || "Försök igen.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!project) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.placeholderText}>Inget projekt valt.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>TILLBAKA</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const item = items[currentIndex];
  const itemPhotos = item ? photosForItem(item.id) : [];
  const canSign = allRequiredPhotosTaken;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <AppHeader
        title="SMART EGENKONTROLL"
        subTitle={capitalizeFirst(project.name)}
        navigation={navigation}
      />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
        >
          {item ? (
            <>
              <Text style={styles.sectionLabel}>{item.section}</Text>
              <View style={styles.card}>
                <Text style={styles.label}>{item.label}</Text>
                {item.desc ? (
                  <View style={styles.descBox}>
                    <Ionicons name="information-circle" size={18} color={WorkaholicTheme.colors.primary} />
                    <Text style={styles.descText}>{item.desc}</Text>
                  </View>
                ) : null}
                {item.requiresPhoto && (
                  <View style={styles.requiredPhotoHint}>
                    <Ionicons name="camera" size={16} color={WorkaholicTheme.colors.primary} />
                    <Text style={styles.requiredPhotoText}>Minst ett foto krävs för denna punkt</Text>
                  </View>
                )}

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.btn, checks[item.id] === "checked" && styles.btnOk]}
                    onPress={() => setStatus(item.id, "checked")}
                  >
                    <Ionicons name="checkmark-circle" size={28} color={checks[item.id] === "checked" ? "#FFF" : "#CCC"} />
                    <Text style={[styles.btnText, checks[item.id] === "checked" && { color: "#FFF" }]}>OK</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, checks[item.id] === "na" && styles.btnNa]}
                    onPress={() => setStatus(item.id, "na")}
                  >
                    <Ionicons name="remove-circle" size={28} color={checks[item.id] === "na" ? "#FFF" : "#CCC"} />
                    <Text style={[styles.btnText, checks[item.id] === "na" && { color: "#FFF" }]}>N/A</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, checks[item.id] === "fail" && styles.btnFail]}
                    onPress={() => setStatus(item.id, "fail")}
                  >
                    <Ionicons name="alert-circle" size={28} color={checks[item.id] === "fail" ? "#FFF" : "#CCC"} />
                    <Text style={[styles.btnText, checks[item.id] === "fail" && { color: "#FFF" }]}>FEL</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.commentRow}>
                  <TextInput
                    style={styles.comment}
                    placeholder="Noteringar eller avvikelse..."
                    multiline
                    value={rowComments[item.id] || ""}
                    onChangeText={(t) => setRowComments((prev) => ({ ...prev, [item.id]: t }))}
                    placeholderTextColor="#999"
                  />
                  <VoiceInputButton
                    onResult={(text) =>
                      setRowComments((prev) => ({
                        ...prev,
                        [item.id]: [prev[item.id], text].filter(Boolean).join(" "),
                      }))
                    }
                    disabled={isProcessing}
                  />
                </View>

                <View style={styles.photoSection}>
                  <Text style={styles.photoLabel}>Foton för denna punkt</Text>
                  <View style={styles.photoRow}>
                    {itemPhotos.map((p, idx) => (
                      <TouchableOpacity
                        key={`${p.url}-${idx}`}
                        onPress={() => removePhoto(photos.findIndex((x) => x.url === p.url && x.itemId === p.itemId))}
                        style={styles.thumbWrap}
                      >
                        <Image source={{ uri: p.url }} style={styles.thumb} />
                        <View style={styles.thumbRemove}>
                          <Ionicons name="close" size={14} color="#FFF" />
                        </View>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={styles.addPhoto}
                      onPress={takePhoto}
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? (
                        <ActivityIndicator size="small" color={WorkaholicTheme.colors.primary} />
                      ) : (
                        <Ionicons name="camera" size={32} color="#999" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.progress}>
            <Text style={styles.progressText}>
              {currentIndex + 1} / {items.length}
            </Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBar, { width: `${((currentIndex + 1) / items.length) * 100}%` }]} />
            </View>
          </View>
          {currentIndex < items.length - 1 ? (
            <TouchableOpacity style={styles.nextBtn} onPress={() => setCurrentIndex((prev) => prev + 1)}>
              <Text style={styles.nextBtnText}>Nästa punkt</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.signBtn, !canSign && styles.signBtnDisabled]}
              onPress={openSignModal}
              disabled={!canSign || isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="create" size={22} color="#FFF" />
                  <Text style={styles.signBtnText}>Signera och arkivera</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      <SignModal
        visible={signModalVisible}
        title="Signera egenkontroll"
        buttonText="SLUTFÖR & ARKIVERA"
        onClose={closeSignModal}
        onSignature={handleSignature}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  centered: { justifyContent: "center", alignItems: "center", padding: 24 },
  placeholderText: { fontSize: 16, color: "#666", textAlign: "center" },
  backBtn: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: WorkaholicTheme.colors.primary, borderRadius: 12 },
  backBtnText: { color: "#FFF", fontWeight: "800" },
  scrollContent: { padding: 20 },
  sectionLabel: { fontSize: 11, fontWeight: "900", color: "#999", letterSpacing: 1, marginBottom: 8 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  label: { fontSize: 20, fontWeight: "900", color: "#1C1C1E", marginBottom: 12 },
  descBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F0F7FF",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: WorkaholicTheme.colors.primary,
  },
  descText: { flex: 1, fontSize: 13, color: "#444", lineHeight: 20 },
  requiredPhotoHint: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  requiredPhotoText: { fontSize: 12, fontWeight: "700", color: WorkaholicTheme.colors.primary },
  actions: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginBottom: 16 },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#EEE",
  },
  btnOk: { backgroundColor: WorkaholicTheme.colors.success, borderColor: WorkaholicTheme.colors.success },
  btnNa: { backgroundColor: "#6c757d", borderColor: "#6c757d" },
  btnFail: { backgroundColor: WorkaholicTheme.colors.error, borderColor: WorkaholicTheme.colors.error },
  btnText: { fontSize: 14, fontWeight: "800", color: "#555" },
  commentRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginBottom: 16 },
  comment: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#EEE",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
  photoSection: { marginTop: 8 },
  photoLabel: { fontSize: 12, fontWeight: "700", color: "#555", marginBottom: 8 },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  thumbWrap: { position: "relative" },
  thumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: "#EEE" },
  thumbRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  addPhoto: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#DDD",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
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
  progress: { marginBottom: 12 },
  progressText: { fontSize: 11, fontWeight: "800", color: "#999", marginBottom: 4 },
  progressBarBg: { height: 6, backgroundColor: "#EEE", borderRadius: 3, overflow: "hidden" },
  progressBar: { height: "100%", backgroundColor: WorkaholicTheme.colors.primary },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: WorkaholicTheme.colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
  },
  nextBtnText: { color: "#FFF", fontWeight: "900", fontSize: 16 },
  signBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: WorkaholicTheme.colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
  },
  signBtnDisabled: { opacity: 0.6 },
  signBtnText: { color: "#FFF", fontWeight: "900", fontSize: 16 },
});
