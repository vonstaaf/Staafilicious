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

  // Hämta företaginfo live för PDF-headern
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) setCompanyData(docSnap.data());
    });
    return () => unsubscribe();
  }, []);

  // SKYDD OM INGET PROJEKT ÄR VALT
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
          onPress={() => navigation.navigate("MainTabs")}
        >
          <Text style={styles.goBackBtnText}>GÅ TILL PROJEKTLISTAN</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatProjectName = (name) => name ? name.charAt(0).toUpperCase() + name.slice(1) : "Projekt";

  const onGeneratePdf = async (historyData) => {
    if (!historyData) return;
    setIsProcessing(true);
    try {
      // Skickar med företagsdata för logga i headern
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
    Alert.alert("Radera", "Vill du ta bort denna permanent?", [
      { text: "Avbryt", style: "cancel" },
      { text: "Radera", style: "destructive", onPress: async () => {
          const updatedHistory = history.filter(item => item.id !== itemId);
          await updateProject(selectedProject.id, { inspectionHistory: updatedHistory });
      }}
    ]);
  };

  // 🔑 NYTT: Navigera in i arkivet för att läsa eller redigera
  const openHistoryItem = (item) => {
    navigation.navigate("InspectionScreen", { 
      editMode: true, 
      existingData: item,
      project: selectedProject 
    });
  };

  const renderHistoryItem = ({ item }) => {
    const date = new Date(item.date).toLocaleDateString('sv-SE');
    return (
      // TouchableOpacity för att kunna klicka upp kontrollen igen
      <TouchableOpacity 
        style={styles.historyCard} 
        onPress={() => openHistoryItem(item)}
        activeOpacity={0.7}
      >
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
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <AppHeader title="HISTORIK" subTitle={selectedProject?.name} navigation={navigation} />
      
      <FlatList
        data={[...history].reverse()} 
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderHistoryItem}
        contentContainerStyle={{ padding: 15, paddingBottom: insets.bottom + 20 }}
        ListEmptyComponent={
          <View style={{marginTop: 50, alignItems: 'center'}}>
            <Ionicons name="documents-outline" size={50} color="#DDD" />
            <Text style={{color: '#999', marginTop: 10, fontWeight: '600'}}>Inga arkiverade kontroller än.</Text>
          </View>
        }
      />

      <Modal visible={isPdfModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.namingCard}>
            <Text style={styles.namingTitle}>Namnge PDF-fil</Text>
            <TextInput style={styles.namingInput} value={customPdfName} onChangeText={setCustomPdfName} autoFocus />
            <View style={styles.namingActions}>
              <TouchableOpacity onPress={() => setIsPdfModalVisible(false)} style={styles.namingCancel}>
                <Text style={styles.namingCancelText}>Avbryt</Text>
              </TouchableOpacity>
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
  historyCard: { 
    backgroundColor: "#fff", 
    padding: 15, 
    borderRadius: 20, 
    marginBottom: 12, 
    flexDirection: "row", 
    alignItems: "center", 
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  cardInfo: { flex: 1 },
  dateText: { fontWeight: "900", fontSize: 16, color: WorkaholicTheme.colors.primary },
  descText: { fontSize: 14, color: "#333", fontWeight: '700', marginTop: 2 },
  signerText: { color: "#8E8E93", fontSize: 12, marginBottom: 12, marginTop: 2, fontWeight: '600' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', padding: 5, backgroundColor: '#FFF5F5', borderRadius: 6 },
  deleteBtnText: { color: "#FF3B30", fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  pdfBtn: { backgroundColor: WorkaholicTheme.colors.primary, paddingVertical: 18, paddingHorizontal: 15, borderRadius: 16, alignItems: "center", justifyContent: 'center', marginLeft: 10, elevation: 3 },
  pdfBtnText: { color: "#fff", fontWeight: "900", fontSize: 10, marginTop: 4, letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  namingCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 25, elevation: 10 },
  namingTitle: { fontSize: 18, fontWeight: '900', marginBottom: 15, textAlign: 'center', color: '#1C1C1E' },
  namingInput: { backgroundColor: '#F5F5F7', padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#E5E5EA', fontWeight: '600', color: '#333' },
  namingActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  namingCancel: { flex: 1, padding: 15, alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 12 },
  namingConfirm: { flex: 2, backgroundColor: WorkaholicTheme.colors.primary, padding: 15, borderRadius: 12, alignItems: 'center', elevation: 2 },
  namingCancelText: { color: '#8E8E93', fontWeight: '800' },
  namingConfirmText: { color: '#FFF', fontWeight: '900' }
});