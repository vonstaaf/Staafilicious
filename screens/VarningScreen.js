import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  StatusBar,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../components/AppHeader";
import { WorkaholicTheme } from "../theme";
import { CompanyContext } from "../context/CompanyContext";
import { db } from "../firebaseConfig";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { uploadInspectionPhoto } from "../utils/uploadInspectionMedia";

const YRKESGRUPPER = [
  { value: "snickare", label: "Snickare" },
  { value: "platssättare", label: "Platssättare" },
  { value: "el", label: "El" },
  { value: "måleri", label: "Måleri" },
  { value: "annan", label: "Annan yrkesgrupp" },
];

export default function VarningScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { companyId } = React.useContext(CompanyContext);
  const { project } = route.params || {};
  const groupId = project?.id;

  const [yrkesgrupp, setYrkesgrupp] = useState("snickare");
  const [beskrivning, setBeskrivning] = useState("");
  const [photoUri, setPhotoUri] = useState(null);
  const [saving, setSaving] = useState(false);
  const [list, setList] = useState([]);

  const collectionRef =
    companyId && groupId
      ? collection(db, "companies", companyId, "groups", groupId, "varningar")
      : null;

  React.useEffect(() => {
    if (!collectionRef) return;
    const q = query(collectionRef, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setList(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate?.() ?? d.data().createdAt,
        }))
      );
    });
    return () => unsubscribe();
  }, [collectionRef]);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Behörighet", "Kamerabehörighet krävs.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    setPhotoUri(result.assets[0].uri);
  }, []);

  const saveVarning = useCallback(async () => {
    const desc = (beskrivning || "").trim();
    if (!desc) {
      Alert.alert("Beskrivning krävs", "Skriv vad som hindrar dig från att följa branschreglerna.");
      return;
    }
    if (!companyId || !groupId) {
      Alert.alert("Fel", "Projekt eller företag saknas.");
      return;
    }
    setSaving(true);
    try {
      let photoUrl = null;
      if (photoUri) {
        const entry = await uploadInspectionPhoto(companyId, groupId, photoUri, "varning");
        photoUrl = entry.url;
      }
      await addDoc(collection(db, "companies", companyId, "groups", groupId, "varningar"), {
        yrkesgrupp,
        beskrivning: desc,
        photoUrl,
        createdAt: serverTimestamp(),
      });
      setBeskrivning("");
      setPhotoUri(null);
      Alert.alert("Sparat", "Avvikelsen är dokumenterad (juridiskt skydd).");
    } catch (e) {
      Alert.alert("Fel", e?.message || "Kunde inte spara.");
    } finally {
      setSaving(false);
    }
  }, [yrkesgrupp, beskrivning, photoUri, companyId, groupId]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AppHeader title="Avvikelse (Varningen)" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.intro}>
            Dokumentera när en annan yrkesgrupp har gjort något som hindrar dig från att följa branschreglerna. Detta är
            ett viktigt juridiskt skydd.
          </Text>

          <Text style={styles.label}>YRKESGRUPP SOM ORSAKAT</Text>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={yrkesgrupp}
              onValueChange={setYrkesgrupp}
              style={styles.picker}
              dropdownIconColor={WorkaholicTheme.colors.primary}
            >
              {YRKESGRUPPER.map((o) => (
                <Picker.Item key={o.value} label={o.label} value={o.value} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>BESKRIVNING *</Text>
          <TextInput
            style={styles.input}
            placeholder="Beskriv vad som är fel och hur det hindrar rörläggningen..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            value={beskrivning}
            onChangeText={setBeskrivning}
          />

          <Text style={styles.label}>FOTO (valfritt)</Text>
          <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            ) : (
              <>
                <Ionicons name="camera" size={32} color="#999" />
                <Text style={styles.photoBtnText}>Ta foto</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveBtn} onPress={saveVarning} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="warning" size={22} color="#FFF" />
                <Text style={styles.saveBtnText}>Spara avvikelse</Text>
              </>
            )}
          </TouchableOpacity>

          {list.length > 0 && (
            <>
              <Text style={styles.listTitle}>Tidigare avvikelser</Text>
              {list.slice(0, 10).map((item) => (
                <View key={item.id} style={styles.listCard}>
                  <Text style={styles.listTrade}>{YRKESGRUPPER.find((y) => y.value === item.yrkesgrupp)?.label ?? item.yrkesgrupp}</Text>
                  <Text style={styles.listDesc} numberOfLines={2}>{item.beskrivning}</Text>
                  <Text style={styles.listDate}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("sv-SE") : ""}</Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  intro: { fontSize: 14, color: "#555", marginBottom: 20, lineHeight: 20 },
  label: { fontSize: 11, fontWeight: "900", color: "#666", letterSpacing: 1, marginBottom: 8 },
  pickerWrap: { backgroundColor: "#FFF", borderRadius: 12, borderWidth: 1, borderColor: "#EEE", marginBottom: 16 },
  picker: { height: 48 },
  input: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEE",
    padding: 14,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  photoBtn: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#DDD",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  photoBtnText: { fontSize: 12, color: "#999", marginTop: 6 },
  photoPreview: { width: "100%", height: "100%", borderRadius: 10 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: WorkaholicTheme.colors.warning,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 24,
  },
  saveBtnText: { color: "#FFF", fontWeight: "900", fontSize: 16 },
  listTitle: { fontSize: 14, fontWeight: "800", color: "#333", marginBottom: 12 },
  listCard: {
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: WorkaholicTheme.colors.warning,
  },
  listTrade: { fontSize: 12, fontWeight: "800", color: "#666", marginBottom: 4 },
  listDesc: { fontSize: 14, color: "#333", marginBottom: 4 },
  listDate: { fontSize: 11, color: "#999" },
});
