import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../components/AppHeader";
import { WorkaholicTheme } from "../theme";
import { CompanyContext } from "../context/CompanyContext";
import { db } from "../firebaseConfig";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";

export default function BarcodeScanScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { companyId } = React.useContext(CompanyContext);
  const { project } = route.params || {};
  const groupId = project?.id;
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [list, setList] = useState([]);

  const collectionRef =
    companyId && groupId
      ? collection(db, "companies", companyId, "groups", groupId, "scanned_products")
      : null;

  useEffect(() => {
    if (!collectionRef) return;
    const q = query(collectionRef, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setList(
        snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.() ?? d.data().createdAt }))
      );
    });
    return () => unsubscribe();
  }, [collectionRef]);

  const handleBarCodeScanned = useCallback(
    async ({ data, type }) => {
      if (scanned || saving || !companyId || !groupId) return;
      setScanned(true);
      setSaving(true);
      try {
        await addDoc(collection(db, "companies", companyId, "groups", groupId, "scanned_products"), {
          data: String(data),
          type: type || "unknown",
          createdAt: serverTimestamp(),
        });
        setTimeout(() => setScanned(false), 1200);
      } catch (e) {
        Alert.alert("Fel", "Kunde inte spara streckkoden.");
        setScanned(false);
      } finally {
        setSaving(false);
      }
    },
    [scanned, saving, companyId, groupId]
  );

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <AppHeader title="Skanna produkt" onBack={() => navigation.goBack()} />
        <View style={[styles.centered, { paddingBottom: insets.bottom + 40 }]}>
          <Text style={styles.permText}>Kamerabehörighet krävs för att skanna streckkoder.</Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Tillåt kamera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AppHeader title="Skanna produkt (EAN)" onBack={() => navigation.goBack()} />
      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFill}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["ean13", "ean8", "upc_a", "code128", "code39", "qr"],
          }}
        />
        {scanned && (
          <View style={styles.scanOverlay}>
            {saving ? (
              <ActivityIndicator size="large" color="#FFF" />
            ) : (
              <Ionicons name="checkmark-circle" size={48} color={WorkaholicTheme.colors.success} />
            )}
            <Text style={styles.scanOverlayText}>{saving ? "Sparar…" : "Skannad"}</Text>
          </View>
        )}
      </View>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.hint}>Håll kameran mot streckkoden på produkten (blandare, värmepump m.m.)</Text>
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {list.length === 0 && (
            <Text style={styles.listEmpty}>Inga skannade produkter än. Skanna för att bygga upp DU-instruktion.</Text>
          )}
          {list.slice(0, 20).map((item) => (
            <View key={item.id} style={styles.listRow}>
              <Text style={styles.listData}>{item.data}</Text>
              <Text style={styles.listType}>{item.type}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a1a" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  permText: { color: "#FFF", fontSize: 16, textAlign: "center", marginBottom: 20 },
  permBtn: { backgroundColor: WorkaholicTheme.colors.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 },
  permBtnText: { color: "#FFF", fontWeight: "800" },
  cameraWrap: { flex: 1, minHeight: 280, position: "relative" },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  scanOverlayText: { color: "#FFF", fontWeight: "800", marginTop: 8 },
  footer: { backgroundColor: "#FFF", paddingHorizontal: 20, paddingTop: 16, maxHeight: 220 },
  hint: { fontSize: 12, color: "#666", marginBottom: 12 },
  list: { maxHeight: 140 },
  listContent: { paddingBottom: 8 },
  listEmpty: { fontSize: 13, color: "#999", fontStyle: "italic" },
  listRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#EEE" },
  listData: { fontSize: 14, fontWeight: "700", color: "#1C1C1E" },
  listType: { fontSize: 12, color: "#888" },
});
