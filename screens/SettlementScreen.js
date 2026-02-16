import React, { useContext, useState, useEffect } from "react";
import { View, Text, StyleSheet, Alert, TouchableOpacity, Switch, Image, ScrollView, Modal, ActivityIndicator, Share } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProjectsContext } from "../context/ProjectsContext";
import { useBadges } from "../context/BadgeContext"; 
import { WorkaholicTheme } from "../theme";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";

// 🔑 IMPORT
import { handleCustomerPdf, handleMaterialPdf } from "../utils/pdfActions";

const workaholicLogoAsset = require("../assets/logo.png");

export default function SettlementScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { selectedProject, projects, archiveProject } = useContext(ProjectsContext);
  const { currentLogo } = useBadges();
  const [showVat, setShowVat] = useState(true); 
  const [useRot, setUseRot] = useState(false);
  const [useRut, setUseRut] = useState(false); 
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false); 
  const [companyData, setCompanyData] = useState(null);
  const user = auth.currentUser;

  // Bestäm vilket projekt som ska visas (valt eller från route)
  const displayProject = route.params?.projectId 
    ? projects.find(p => (p.id === route.params.projectId || p.code === route.params.projectId)) 
    : selectedProject;

  const formatProjectTitle = (name) => { if (!name) return ""; const t = name.trim(); return t.charAt(0).toUpperCase() + t.slice(1); };
  const formatNumber = (n) => Number(n).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  
  const shareProjectCode = async () => {
    if (!displayProject?.code) return;
    try { await Share.share({ message: `Här är projektkoden för ${displayProject.name}: ${displayProject.code}`, }); } catch (error) { Alert.alert("Fel", "Kunde inte dela koden."); }
  };

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
       if(snap.exists()) setCompanyData(snap.data());
    });
    return () => unsub();
  }, [user]);

  // --- PUNKT 8: SKYDD OM INGET PROJEKT ÄR VALT ---
  if (!displayProject) {
    return (
      <View style={[styles.centeredContainer, { paddingTop: insets.top }]}>
        <Ionicons name="document-lock-outline" size={80} color="#CCC" />
        <Text style={styles.noProjectText}>INGET PROJEKT VALT</Text>
        <Text style={styles.noProjectSub}>
          Välj ett projekt i listan för att skapa underlag och se ekonomisk sammanställning.
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

  // --- BERÄKNINGAR (PUNKT 1 & 9) ---
  const kostnader = displayProject?.kostnader || [];
  const produkter = displayProject?.products || [];

  // Summera arbete/logg (Använder det nya total-fältet från KostnaderScreen)
  const arbeteExclVat = kostnader.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
  
  // Summera material (unitPriceOutExclVat inkluderar påslaget)
  const materialUtExclVat = produkter.reduce((acc, it) => acc + (Number(it.unitPriceOutExclVat || 0) * Number(it.quantity || 0)), 0);
  
  const totalExclVat = arbeteExclVat + materialUtExclVat;
  const momsBelopp = totalExclVat * 0.25;
  const aktuellBasSumma = showVat ? (totalExclVat + momsBelopp) : totalExclVat;

  // ROT/RUT baseras på arbetskostnaden
  const skatteunderlagMoms = arbeteExclVat * 1.25; 
  const rotAvdrag = useRot ? skatteunderlagMoms * 0.30 : 0;
  const rutAvdrag = useRut ? skatteunderlagMoms * 0.50 : 0;
  const totaltSkatteavdrag = rotAvdrag + rutAvdrag;
  const slutSumma = aktuellBasSumma - totaltSkatteavdrag;

  const handleArchiveProject = () => {
    if (!displayProject) return;
    Alert.alert("Arkivera", "Säker?", [{ text: "Avbryt" }, { text: "Arkivera", style: "destructive", onPress: async () => { try { await archiveProject(displayProject.id); navigation.navigate("MainTabs", { screen: "Home" }); } catch (e) { Alert.alert("Fel"); } } }]);
  };

  // 🔑 PDF-GENERERING (PUNKT 2 & 3)
  const onGeneratePdf = async (type) => {
    if (isGenerating || !displayProject) return;
    setIsGenerating(true);
    try {
      if (type === "master") {
        // Materialspecifikation visar inköpspriser (Punkt 3)
        await handleMaterialPdf(displayProject, produkter, companyData, workaholicLogoAsset);
      } else {
        // Kundunderlag sammanställer allt (Punkt 2)
        await handleCustomerPdf(displayProject, companyData, { showVat, useRot, useRut });
      }
    } catch (e) { 
      Alert.alert("Fel", "Kunde inte skapa PDF."); 
    } finally { setIsGenerating(false); }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top - 50, paddingBottom: insets.bottom + 20 }}>
        {displayProject.code && (
          <TouchableOpacity style={styles.shareCodeBtn} onPress={shareProjectCode}>
            <Text style={styles.shareCodeText}>PROJEKTKOD: {displayProject.code}</Text>
            <Ionicons name="share-outline" size={20} color="#FFF" />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.mainCard} onPress={() => setIsModalVisible(true)} activeOpacity={0.9}>
          {companyData?.logoUrl || currentLogo ? (
            <Image source={{ uri: companyData?.logoUrl || currentLogo }} style={styles.brandLogo} />
          ) : ( <Ionicons name="business" size={40} color="#fff" /> )}
          <Text style={styles.groupName}>PROJEKT: {formatProjectTitle(displayProject.name)}</Text>
          <Text style={styles.totalAmount}>{formatNumber(slutSumma)} kr</Text>
          <Text style={styles.tapInfo}>{showVat ? "Inklusive moms" : "Exklusive moms"}</Text>
        </TouchableOpacity>

        <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>AVSÄNDARE PÅ PDF</Text>
            <Text style={styles.infoText}>{companyData?.companyName || "Företagsnamn saknas"}</Text>
        </View>

        <View style={styles.settingsSection}>
          <View style={styles.settingCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.settingTitle}>Visa moms (25%)</Text>
              <Switch value={showVat} onValueChange={setShowVat} trackColor={{ true: WorkaholicTheme.colors.primary }} />
            </View>
          </View>
          <View style={styles.settingCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.settingTitle}>ROT-avdrag (30%)</Text>
              <Switch value={useRot} onValueChange={(val) => { setUseRot(val); if(val) setUseRut(false); }} trackColor={{ true: WorkaholicTheme.colors.primary }} />
            </View>
          </View>
          <View style={styles.settingCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.settingTitle}>RUT-avdrag (50%)</Text>
              <Switch value={useRut} onValueChange={(val) => { setUseRut(val); if(val) setUseRot(false); }} trackColor={{ true: WorkaholicTheme.colors.primary }} />
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.pdfBtn} onPress={() => onGeneratePdf("customer")} disabled={isGenerating}>
            {isGenerating ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>DELA KUND-PDF</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.masterBtn} onPress={() => onGeneratePdf("master")} disabled={isGenerating}>
            {isGenerating ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>DELA MATERIALSPEC</Text>}
          </TouchableOpacity>
          {!route.params?.fromArchive && (
            <TouchableOpacity style={[styles.masterBtn, { backgroundColor: '#666', marginTop: 10 }]} onPress={handleArchiveProject}>
              <Text style={styles.btnText}>SLUTFÖR & ARKIVERA PROJEKT</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, {color: '#000'}]}>EKONOMI: {formatProjectTitle(displayProject.name)}</Text>
            <View style={styles.detailRow}><Text style={{color: '#333'}}>Netto Arbete:</Text><Text style={{color: '#333'}}>{formatNumber(arbeteExclVat)} kr</Text></View>
            <View style={styles.detailRow}><Text style={{color: '#333'}}>Netto Material:</Text><Text style={{color: '#333'}}>{formatNumber(materialUtExclVat)} kr</Text></View>
            <View style={styles.detailRow}><Text style={{color: '#333'}}>Moms (25%):</Text><Text style={{color: '#333'}}>{formatNumber(momsBelopp)} kr</Text></View>
            <View style={[styles.detailRow, { marginTop: 10, borderTopWidth: 1, paddingTop: 10, borderColor: '#EEE' }]}>
              <Text style={{fontWeight:'bold', color: '#000'}}>Totalt Brutto:</Text>
              <Text style={{fontWeight:'bold', color: '#000'}}>{formatNumber(totalExclVat + momsBelopp)} kr</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setIsModalVisible(false)}>
              <Text style={styles.closeBtnText}>STÄNG</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB', paddingHorizontal: 20 },
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
  shareCodeBtn: { backgroundColor: WorkaholicTheme.colors.primary, marginVertical: 10, padding: 12, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  shareCodeText: { color: '#FFF', fontWeight: 'bold', marginRight: 10 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mainCard: { backgroundColor: WorkaholicTheme.colors.primary, borderRadius: 20, padding: 25, alignItems: 'center', marginTop: 10 },
  brandLogo: { width: 140, height: 70, resizeMode: 'contain', marginBottom: 10 },
  groupName: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '800' },
  totalAmount: { color: '#fff', fontSize: 32, fontWeight: '900' },
  tapInfo: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 10 },
  infoCard: { marginTop: 20, backgroundColor: '#fff', borderRadius: 15, padding: 15, borderWidth: 1, borderColor: '#EEE' },
  infoTitle: { fontSize: 10, fontWeight: '900', color: WorkaholicTheme.colors.primary, marginBottom: 5 },
  infoText: { fontSize: 16, fontWeight: '700', color: '#333' },
  settingsSection: { marginTop: 15 },
  settingCard: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 8, borderWidth: 1, borderColor: '#EEE' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingTitle: { fontWeight: '700', fontSize: 14, color: '#333' },
  actions: { marginTop: 20 },
  pdfBtn: { backgroundColor: WorkaholicTheme.colors.primary, padding: 18, borderRadius: 15, alignItems: 'center' },
  masterBtn: { backgroundColor: '#4A90E2', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30 },
  modalTitle: { fontSize: 14, fontWeight: '900', marginBottom: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  closeBtn: { backgroundColor: '#333', padding: 15, borderRadius: 15, marginTop: 15, alignItems: 'center' },
  closeBtnText: { color: '#fff', fontWeight: '800' }
});