import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  StatusBar,
  ActivityIndicator,
  PanResponder,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import Svg, { Path } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../components/AppHeader";
import { WorkaholicTheme } from "../theme";
import { CompanyContext } from "../context/CompanyContext";
import { db } from "../firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { uploadRelationsritningImage } from "../utils/uploadInspectionMedia";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAW_WIDTH = SCREEN_WIDTH - 40;
const DRAW_HEIGHT = 360;

export default function RelationsritningScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { companyId } = React.useContext(CompanyContext);
  const { project } = route.params || {};
  const groupId = project?.id;

  const [step, setStep] = useState("pick"); // pick | draw | saved
  const [localUri, setLocalUri] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const pathIdRef = useRef(0);

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Behörighet", "Bildbehörighet krävs för att välja planritning.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    setLocalUri(result.assets[0].uri);
    setPaths([]);
    setCurrentPath([]);
    setStep("draw");
  }, []);

  const uploadAndStartDrawing = useCallback(async () => {
    if (!localUri || !companyId || !groupId) return;
    setUploading(true);
    try {
      const url = await uploadRelationsritningImage(companyId, groupId, localUri);
      setImageUrl(url);
    } catch (e) {
      Alert.alert("Fel", e?.message || "Kunde inte ladda upp bilden.");
    } finally {
      setUploading(false);
    }
  }, [localUri, companyId, groupId]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const x = locationX / DRAW_WIDTH;
        const y = locationY / DRAW_HEIGHT;
        setCurrentPath([{ x, y }]);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const x = Math.max(0, Math.min(1, locationX / DRAW_WIDTH));
        const y = Math.max(0, Math.min(1, locationY / DRAW_HEIGHT));
        setCurrentPath((prev) => [...prev, { x, y }]);
      },
      onPanResponderRelease: () => {
        setCurrentPath((prev) => {
          if (prev.length > 1) {
            setPaths((p) => [...p, [...prev]]);
          }
          return [];
        });
      },
    })
  ).current;

  const clearDrawing = useCallback(() => {
    setPaths([]);
    setCurrentPath([]);
  }, []);

  const saveDrawing = useCallback(async () => {
    if (!companyId || !groupId || !imageUrl) return;
    const allPaths = currentPath.length > 1 ? [...paths, currentPath] : paths;
    setSaving(true);
    try {
      await addDoc(collection(db, "companies", companyId, "groups", groupId, "relationsritningar"), {
        imageUrl,
        paths: allPaths,
        createdAt: serverTimestamp(),
      });
      setStep("saved");
      Alert.alert("Sparat", "Relationsritningen är sparad.", [
        { text: "Rita en till", onPress: () => { setLocalUri(null); setImageUrl(null); setPaths([]); setStep("pick"); } },
        { text: "Tillbaka", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert("Fel", e?.message || "Kunde inte spara.");
    } finally {
      setSaving(false);
    }
  }, [companyId, groupId, imageUrl, paths, currentPath, navigation]);

  if (step === "pick") {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <AppHeader title="Relationsritning" onBack={() => navigation.goBack()} />
        <View style={[styles.centered, { paddingBottom: insets.bottom + 40 }]}>
          <Text style={styles.infoText}>
            Ladda upp en planritning och rita in var rören faktiskt hamnade (relationshandling).
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={pickImage}>
            <Ionicons name="image" size={24} color="#FFF" />
            <Text style={styles.primaryBtnText}>Välj planritning</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (step === "draw" && localUri) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <AppHeader title="Rita in rör" onBack={() => navigation.goBack()} />
        {!imageUrl ? (
          <View style={[styles.centered, { paddingBottom: insets.bottom + 40 }]}>
            {uploading ? (
              <ActivityIndicator size="large" color={WorkaholicTheme.colors.primary} />
            ) : (
              <>
                <Image source={{ uri: localUri }} style={styles.previewImg} resizeMode="contain" />
                <TouchableOpacity style={styles.primaryBtn} onPress={uploadAndStartDrawing} disabled={uploading}>
                  <Text style={styles.primaryBtnText}>Ladda upp och rita</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          <>
            <View style={[styles.drawContainer, { width: DRAW_WIDTH, height: DRAW_HEIGHT }]}>
              <Image source={{ uri: imageUrl }} style={styles.drawImage} resizeMode="contain" />
              <View
                style={[StyleSheet.absoluteFill, { width: DRAW_WIDTH, height: DRAW_HEIGHT }]}
                {...panResponder.panHandlers}
              >
                <Svg width={DRAW_WIDTH} height={DRAW_HEIGHT} style={StyleSheet.absoluteFill}>
                  {paths.map((pts, i) => (
                    <Path
                      key={i}
                      d={pts.reduce((acc, p, j) => (j === 0 ? `M ${p.x * DRAW_WIDTH} ${p.y * DRAW_HEIGHT}` : `${acc} L ${p.x * DRAW_WIDTH} ${p.y * DRAW_HEIGHT}`), "")}
                      stroke={WorkaholicTheme.colors.primary}
                      strokeWidth={3}
                      fill="none"
                    />
                  ))}
                  {currentPath.length > 1 && (
                    <Path
                      d={currentPath.reduce((acc, p, j) => (j === 0 ? `M ${p.x * DRAW_WIDTH} ${p.y * DRAW_HEIGHT}` : `${acc} L ${p.x * DRAW_WIDTH} ${p.y * DRAW_HEIGHT}`), "")}
                      stroke={WorkaholicTheme.colors.primary}
                      strokeWidth={3}
                      fill="none"
                    />
                  )}
                </Svg>
              </View>
            </View>
            <View style={[styles.drawFooter, { paddingBottom: insets.bottom + 16 }]}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={clearDrawing}>
                <Ionicons name="trash-outline" size={20} color={WorkaholicTheme.colors.error} />
                <Text style={styles.secondaryBtnText}>Rensa</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={saveDrawing} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.primaryBtnText}>Spara relationsritning</Text>}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Relationsritning" onBack={() => navigation.goBack()} />
      <View style={[styles.centered, { paddingBottom: insets.bottom + 40 }]}>
        <Text style={styles.savedText}>Relationsritningen är sparad.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryBtnText}>Tillbaka till kontroller</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WorkaholicTheme.colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  infoText: { color: "#666", textAlign: "center", marginBottom: 24, paddingHorizontal: 20 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: WorkaholicTheme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  primaryBtnText: { color: "#FFF", fontWeight: "800" },
  secondaryBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  secondaryBtnText: { color: WorkaholicTheme.colors.error, fontWeight: "700" },
  previewImg: { width: DRAW_WIDTH, height: 240, marginBottom: 20, borderRadius: 12 },
  drawContainer: { alignSelf: "center", marginTop: 20, borderRadius: 12, overflow: "hidden", backgroundColor: "#f0f0f0" },
  drawImage: { width: DRAW_WIDTH, height: DRAW_HEIGHT },
  drawFooter: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  savedText: { color: "#333", marginBottom: 20 },
});
