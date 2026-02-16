import React, { useContext, useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator, StatusBar } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProjectsContext } from "../context/ProjectsContext";
import { WorkaholicTheme } from "../theme";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../components/AppHeader"; 
import { auth, db } from "../firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";

// 🔑 IMPORT (Använder nu den uppdaterade PDF-motorn)
import { handleInspectionPdf } from "../utils/pdfActions";

export default function InspectionHistoryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { selectedProject, updateProject } = useContext(ProjectsContext);
  const history = selectedProject?.inspectionHistory || [];

  const [isPdfModalVisible, setIsPdfModalVisible] = useState(false);
  const [customPdfName, setCustomPdfName] = useState("");
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [companyData, setCompanyData] = useState(null);

  // Hämta företaginfo live för PDF-headern (Punkt 5)
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) setCompanyData(docSnap.data());
    });
    return () => unsubscribe();
  }, []);

  // --- PUNKT 8: SKYDD OM INGET PROJEKT ÄR VALT ---
  if (!selectedProject) {
    return (
      <View style={[styles.centeredContainer, { paddingTop: insets.top }]}>
        <Ionicons name="folder-open-outline" size={80} color="#CCC" />
        <Text style={styles.noProjectText}>INGET PROJEKT VALT</Text>
        <Text style={styles.noProjectSub}>
          Välj ett projekt för att se tidigare egenkontroller.
        </Text>
        <TouchableOpacity 
          style={styles.goBackBtn} 
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.goBackBtnText}>GÅ TILL PROJEKTLISTAN</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatProjectName = (name) => name ? name.charAt(0).toUpperCase() + name.slice(1) : "Projekt";

  // 🔑 UPPDATERAT ANROP (PUNKT 5)
  const onGeneratePdf = async (historyData) => {
    if (!historyData) return;
    setIsProcessing(true);
    try {
      // Vi skickar nu in rätt data för den standardiserade headern
      // handleInspectionPdf(projekt, kontrollData, företagsData)
      await handleInspectionPdf(selectedProject, historyData, companyData);
      setIsPdfModalVisible(false);
    } catch (e) {
      Alert.alert("Fel", "Kunde inte generera PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const openPdfModal = (item) => {
    setSelectedHistoryItem(item);
    const dateStr = new Date(item.date).toLocaleDateString('sv-SE');
    const projectName = formatProjectName(selectedProject?.name);
    const cleanDesc = item.description ? item.description.replace(/\s+/g, '_') : 'Kontroll';
    setCustomPdfName(`${projectName}_${cleanDesc}_${dateStr}`);
    setIsPdfModalVisible(true);
  };

  const deleteHistoryItem = (itemId) => {
    Alert.alert("Radera", "Vill du ta bort permanent?", [
      { text: "Avbryt", style: "cancel" },
      { text: "Radera", style: "destructive", onPress: async () => {
          const updatedHistory = history.filter(item => item.id !== itemId);
          await updateProject(selectedProject.id, { inspectionHistory: updatedHistory });
      }}
    ]);
  };

  const renderHistoryItem = ({ item }) => {
    const date = new Date(item.date).toLocaleDateString('sv-SE');
    return (
      <View style={styles.historyCard}>
        <View style={styles.cardInfo}>
          <Text style={styles.dateText}>{date}</Text>
          <Text style={styles.descText} numberOfLines={1}>{item.description || "Egenkontroll"}</Text>
          <Text style={styles.signerText}>Utförd av: {item.signedBy}</Text>
          <TouchableOpacity onPress={() => deleteHistoryItem(item.id)} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={14} color="#FF3B30" />
            <Text style={styles.deleteBtnText}> TA BORT</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.pdfBtn} onPress={() => openPdfModal(item)}>
          <Ionicons name="document-text-outline" size={24} color="#fff" />
          <Text style={styles.pdfBtnText}>PDF</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <AppHeader title="HISTORIK" subTitle={selectedProject?.name} navigation={navigation} />
      <FlatList
        data={[...history].reverse()} 
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderHistoryItem}
        contentContainerStyle={{ padding: 15, paddingBottom: insets.bottom + 20 }}
        ListEmptyComponent={<View style={{marginTop: 50, alignItems: 'center'}}><Text style={{color: '#999'}}>Inga arkiverade kontroller än.</Text></View>}
      />
      <Modal visible={isPdfModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.namingCard}>
            <Text style={styles.namingTitle}>Namnge PDF-fil</Text>
            <TextInput style={styles.namingInput} value={customPdfName} onChangeText={setCustomPdfName} autoFocus />
            <View style={styles.namingActions}>
              <TouchableOpacity onPress={() => setIsPdfModalVisible(false)} style={styles.namingCancel}><Text style={styles.namingCancelText}>Avbryt</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => onGeneratePdf(selectedHistoryItem)} style={styles.namingConfirm} disabled={isProcessing}>
                {isProcessing ? <ActivityIndicator color="#FFF" /> : <Text style={styles.namingConfirmText}>Skapa PDF</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7F9" },
  // --- NYA STILAR FÖR PUNKT 8 ---
  centeredContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#F8F9FB', 
    padding: 30 
  },
  noProjectText: { 
    fontSize: 20, 
    fontWeight: '900', 
    color: '#1C1C1E', 
    marginTop: 20 
  },
  noProjectSub: { 
    fontSize: 14, 
    color: '#8E8E93', 
    textAlign: 'center', 
    marginTop: 10, 
    lineHeight: 20 
  },
  goBackBtn: {
    marginTop: 25,
    backgroundColor: WorkaholicTheme.colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    elevation: 2
  },
  goBackBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14
  },
  // --- EXISTERANDE STILAR ---
  historyCard: { backgroundColor: "#fff", padding: 15, borderRadius: 20, marginBottom: 12, flexDirection: "row", alignItems: "center", elevation: 2 },
  cardInfo: { flex: 1 },
  dateText: { fontWeight: "900", fontSize: 16, color: WorkaholicTheme.colors.primary },
  descText: { fontSize: 14, color: "#333", fontWeight: '700' },
  signerText: { color: "#666", fontSize: 12, marginBottom: 10 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center' },
  deleteBtnText: { color: "#FF3B30", fontSize: 11, fontWeight: 'bold' },
  pdfBtn: { backgroundColor: WorkaholicTheme.colors.primary, padding: 15, borderRadius: 15, alignItems: "center", justifyContent: 'center', marginLeft: 10 },
  pdfBtnText: { color: "#fff", fontWeight: "900", fontSize: 10, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  namingCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 25 },
  namingTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  namingInput: { backgroundColor: '#F5F5F7', padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#DDD' },
  namingActions: { flexDirection: 'row', justifyContent: 'space-between' },
  namingCancel: { flex: 1, padding: 15, alignItems: 'center' },
  namingConfirm: { flex: 2, backgroundColor: WorkaholicTheme.colors.primary, padding: 15, borderRadius: 12, alignItems: 'center' },
  namingCancelText: { color: '#666', fontWeight: 'bold' },
  namingConfirmText: { color: '#FFF', fontWeight: 'bold' }
});