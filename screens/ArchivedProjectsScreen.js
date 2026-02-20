import React, { useContext, useState, useEffect } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Modal, ActivityIndicator, StatusBar, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProjectsContext } from "../context/ProjectsContext";
import { WorkaholicTheme } from "../theme";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../components/AppHeader"; 
import { auth, db } from "../firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";

// 🔑 NYA IMPORTER FÖR PDF (PUNKT 5)
import { handleCustomerPdf } from "../utils/pdfActions";

export default function ArchivedProjectsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { projects, restoreProject } = useContext(ProjectsContext);
  
  const [selectedArchiveProj, setSelectedArchiveProj] = useState(null);
  const [isSummaryVisible, setIsSummaryVisible] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [companyData, setCompanyData] = useState(null);

  // HÄMTA FÖRETAGINFO FÖR PDF-HEADERN
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) setCompanyData(docSnap.data());
    });
    return () => unsubscribe();
  }, []);

  const archivedProjects = projects.filter(p => p.isArchived || p.status === 'archived');

  const formatNumber = (n) => {
    if (n === null || n === undefined || isNaN(n)) return "0,00";
    return Number(n).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  // 🔑 UPPDATERAT PDF-ANROP (PUNKT 5)
  const handleGeneratePDF = async () => {
    if (!selectedArchiveProj) return;
    setIsGenerating(true);
    try {
      // Vi använder den nya handleCustomerPdf som har den fasta 3-kolumns headern
      await handleCustomerPdf(selectedArchiveProj, companyData, { showVat: true });
    } catch (error) {
      Alert.alert("Fel", "Kunde inte skapa arkiv-PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRestore = (proj) => {
    Alert.alert("Återställ", `Vill du återställa "${proj.name}" till aktiva projekt?`, [
      { text: "Avbryt", style: "cancel" },
      { text: "Ja", onPress: () => restoreProject(proj.id) }
    ]);
  };

  // --- BERÄKNINGAR (PUNKT 1 & 9) ---
  const calculateTotals = (proj) => {
    const workSum = (proj.kostnader || []).reduce((sum, item) => sum + Number(item.total || 0), 0);
    const materialSum = (proj.products || []).reduce((sum, item) => sum + (Number(item.unitPriceOutExclVat || item.price || 0) * Number(item.quantity || 1)), 0);
    return { workSum, materialSum, total: workSum + materialSum };
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => { setSelectedArchiveProj(item); setIsSummaryVisible(true); }}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardDate}>Status: Arkiverad</Text>
        </View>
        <Ionicons name="archive-outline" size={24} color="#CCC" />
      </View>
      
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.restoreBtn} onPress={() => handleRestore(item)}>
          <Ionicons name="refresh" size={16} color="#4CAF50" />
          <Text style={styles.restoreText}>Återställ projekt</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <AppHeader 
        title="ARKIVERADE PROJEKT"
        navigation={navigation}
      />

      {archivedProjects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="file-tray-outline" size={64} color="#DDD" />
          <Text style={styles.emptyText}>Inga arkiverade projekt.</Text>
        </View>
      ) : (
        <FlatList 
          data={archivedProjects} 
          keyExtractor={item => item.id} 
          renderItem={renderItem} 
          contentContainerStyle={{ padding: 15, paddingBottom: insets.bottom + 20 }}
        />
      )}

      <Modal visible={isSummaryVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>ARKIVÖVERSIKT</Text>
            <TouchableOpacity onPress={() => setIsSummaryVisible(false)}>
              <Ionicons name="close-circle" size={30} color="#DDD" />
            </TouchableOpacity>
          </View>

          {selectedArchiveProj && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalProjectName}>{selectedArchiveProj.name}</Text>
              <View style={styles.divider} />
              
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Arbetskostnad (Logg):</Text>
                  <Text style={styles.summaryValue}>{formatNumber(calculateTotals(selectedArchiveProj).workSum)} kr</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Material (Produkter):</Text>
                  <Text style={styles.summaryValue}>{formatNumber(calculateTotals(selectedArchiveProj).materialSum)} kr</Text>
                </View>
                <View style={[styles.summaryRow, { marginTop: 15, borderTopWidth: 1, borderColor: '#EEE', paddingTop: - 15 }]}>
                  <Text style={styles.totalLabel}>TOTALT NETTO:</Text>
                  <Text style={styles.totalValue}>{formatNumber(calculateTotals(selectedArchiveProj).total)} kr</Text>
                </View>
              </View>

              <View style={styles.modalActionButtons}>
                {/* 🔑 PDF-KNAPP SOM NU ÄR FULLBREDD EFTER ATT JSON-KNAPPEN TAGITS BORT (PUNKT 6) */}
                <TouchableOpacity style={styles.fullActionBtn} onPress={handleGeneratePDF} disabled={isGenerating}>
                  {isGenerating ? <ActivityIndicator color="#FFF" /> : <Ionicons name="document-text" size={20} color="#FFF" />}
                  <Text style={styles.actionBtnText}>Skapa Kund-PDF</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7F9" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { marginTop: 10, color: "#999", fontSize: 16, fontWeight: '600' },
  card: { backgroundColor: "#FFF", padding: 20, marginBottom: 15, borderRadius: 20, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 18, fontWeight: "900", color: "#1C1C1E" },
  cardDate: { fontSize: 12, color: "#8E8E93", fontWeight: '700', marginTop: 4, textTransform: 'uppercase' },
  cardActions: { flexDirection: "row", marginTop: 15, justifyContent: "flex-end" },
  restoreBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#E8F5E9", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  restoreText: { color: "#4CAF50", fontWeight: "800", fontSize: 12, marginLeft: 6 },
  modalContent: { flex: 1, padding: 25, backgroundColor: "#FFF" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20, alignItems: 'center' },
  modalTitle: { fontSize: 11, fontWeight: "900", color: "#BBB", letterSpacing: 1.5 },
  modalProjectName: { fontSize: 28, fontWeight: "900", color: WorkaholicTheme.colors.primary, marginBottom: 10 },
  divider: { height: 2, backgroundColor: "#F8F9FB", marginBottom: 20 },
  summaryCard: { backgroundColor: '#F8F9FB', padding: 20, borderRadius: 20, marginBottom: 25 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  summaryLabel: { color: "#666", fontWeight: "700", fontSize: 14 },
  summaryValue: { fontWeight: "800", color: "#333", fontSize: 14 },
  totalLabel: { fontWeight: "900", fontSize: 16, color: "#1C1C1E" },
  totalValue: { fontWeight: "900", fontSize: 22, color: WorkaholicTheme.colors.primary },
  modalActionButtons: { flexDirection: "row", justifyContent: "center" },
  fullActionBtn: { flex: 1, backgroundColor: WorkaholicTheme.colors.primary, padding: 18, borderRadius: 18, flexDirection: "row", justifyContent: "center", alignItems: "center", elevation: 4 },
  actionBtnText: { color: '#FFF', fontWeight: '900', marginLeft: 8, fontSize: 14 }
});