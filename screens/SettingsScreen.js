import React, { useState, useEffect, useMemo } from "react";
import { 
  View, Text, StyleSheet, Switch, TouchableOpacity, Alert, 
  Image, Platform, TextInput, Modal, ActivityIndicator, KeyboardAvoidingView, Keyboard,
  ScrollView
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WorkaholicTheme } from "../theme";
import { auth, db } from "../firebaseConfig"; 
import { signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore"; 
import { Ionicons } from "@expo/vector-icons";
import Button from "../components/Button";
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import { useBadges } from "../context/BadgeContext";
import { uploadLogoToCloud } from "../utils/settingsService";

const WHOLESALERS = [
  { id: 'rexel', name: 'Rexel', icon: 'flash' },
  { id: 'solar', name: 'Solar', icon: 'sunny' },
  { id: 'ahlsell', name: 'Ahlsell', icon: 'construct' },
  { id: 'elektroskandia', name: 'E-skandia', icon: 'bulb' }
];

const DISCOUNT_GROUPS = [
  { id: 'kabel', label: 'Kabel & Ledning' },
  { id: 'installation', label: 'Installationsmaterial' },
  { id: 'belysning', label: 'Belysning' },
  { id: 'central', label: 'Central & Norm' },
  { id: 'ovrigt', label: 'Övrigt / Standard' }
];

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { currentLogo, setCurrentLogo } = useBadges();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  
  const [discountAgreements, setDiscountAgreements] = useState({});
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeWholesaler, setActiveWholesaler] = useState(null);
  const [tempDiscounts, setTempDiscounts] = useState({});

  const appVersion = Constants.expoConfig?.version || "1.0.0";
  const buildVersion = Platform.OS === 'ios' 
    ? Constants.expoConfig?.ios?.buildNumber || "1"
    : Constants.expoConfig?.android?.versionCode || "1";

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        const discountDoc = await getDoc(doc(db, "userDiscounts", user.uid));
        if (discountDoc.exists()) {
          const rawData = discountDoc.data().data;
          if (typeof rawData === 'string') {
            setDiscountAgreements(JSON.parse(rawData));
          } else {
            setDiscountAgreements(discountDoc.data().agreements || {});
          }
        }
      }
    } catch (e) { 
      console.error("Laddningsfel:", e); 
    } finally { 
      setLoading(false); 
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    
    if (!result.canceled) {
      const selectedUri = result.assets[0].uri;
      setLoading(true);
      try {
        setCurrentLogo(selectedUri);
        await uploadLogoToCloud(selectedUri);
      } catch (e) { Alert.alert("Fel", "Logotypen kunde inte sparas."); }
      finally { setLoading(false); }
    }
  };

  const handleImportFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'text/plain' });
      if (result.canceled) return;

      setImporting(true);
      const fileUri = result.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri, { 
        encoding: FileSystem.EncodingType.UTF8 
      });
      
      const lines = fileContent.split('\n');
      const totalLines = lines.length;
      const importedData = {};
      let count = 0;
      let skipped = 0;
      const batchSize = 3000; 

      for (let i = 0; i < totalLines; i++) {
        const line = lines[i];
        if (line.length > 60 && line.includes("1N")) {
          const groupCodeRaw = line.substring(30, 36).trim();
          const rawDiscount = line.substring(36, 41).trim();

          if (groupCodeRaw && !isNaN(rawDiscount)) {
            const discountValue = parseFloat(rawDiscount);
            
            // 🚀 TVÄTT: Hoppa över rader med 0% rabatt direkt
            if (discountValue > 0) {
              const cleanCode = groupCodeRaw.replace(/\ufffd/g, 'Ä');
              if (!importedData[cleanCode]) {
                let label = line.substring(57, 95).trim()
                                 .replace(/\ufffd/g, 'Ä')
                                 .replace(/^[BT]ANSK\s+/, '');

                importedData[cleanCode] = {
                  p: (discountValue / 100).toString(),
                  l: label.substring(0, 20) || cleanCode // Korta ner label till 20 tecken
                };
                count++;
              }
            } else {
              skipped++;
            }
          }
        }
        if (i % batchSize === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      setTempDiscounts(prev => ({ ...prev, ...importedData }));
      Alert.alert("Import klar!", `Hittade ${count} unika grupper. Rensade bort ${skipped} rader utan rabatt.`);
    } catch (error) {
      Alert.alert("Fel", "Kunde inte läsa filen.");
    } finally {
      setImporting(false);
    }
  };

  const openDiscountModal = (wholesaler) => {
    setActiveWholesaler(wholesaler);
    const existing = discountAgreements[wholesaler.id] || {};
    setTempDiscounts(existing);
    setIsModalVisible(true);
  };

  const handleDiscountChange = (groupId, value, label) => {
    let cleaned = value.replace(/[^0-9.]/g, "");
    if (parseFloat(cleaned) > 100) cleaned = "100";
    
    setTempDiscounts(prev => ({ 
      ...prev, 
      [groupId]: { p: cleaned, l: (label || groupId).substring(0, 20) } 
    }));
  };

  const saveDiscountAgreement = async () => {
    if (!auth.currentUser || importing) return;
    setLoading(true);
    try {
      const discountRef = doc(db, "userDiscounts", auth.currentUser.uid);
      
      const filtered = {};
      Object.keys(tempDiscounts).forEach(key => {
        const item = tempDiscounts[key];
        const val = item.p || item.percent;
        const discountNum = parseFloat(val);
        
        // 🚀 AGGRESSIV TVÄTT: Spara endast om rabatten är över 0%
        if (!isNaN(discountNum) && discountNum > 0) {
          filtered[key] = {
            p: val.toString(),
            l: (item.l || item.label || key).substring(0, 20)
          };
        }
      });

      const updatedAgreements = { ...discountAgreements, [activeWholesaler.id]: filtered };
      
      // Spara som strängad JSON för att undvika Firebases indexeringsgränser
      const stringifiedData = JSON.stringify(updatedAgreements);
      
      await setDoc(discountRef, { data: stringifiedData }, { merge: true });
      
      setDiscountAgreements(updatedAgreements);
      setIsModalVisible(false);
      Alert.alert("Sparat!", "Dina rabatter är nu synkade.");
      Keyboard.dismiss();
    } catch (e) { 
      console.error(e);
      Alert.alert("Fel", "Kunde inte spara. Filen är fortfarande för stor."); 
    } finally { 
      setLoading(false); 
    }
  };

  const getActiveDiscountsCount = (wholesalerId) => {
    const agreement = discountAgreements[wholesalerId];
    if (!agreement) return 0;
    return Object.values(agreement).filter(val => {
      const v = val.p || val.percent;
      return v && parseFloat(v) > 0;
    }).length;
  };

  const SettingRow = ({ icon, label, children, onPress, subLabel, iconColor }) => (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={styles.leftContent}>
        <View style={[styles.iconContainer, iconColor && { backgroundColor: iconColor + '10' }]}>
          <Ionicons name={icon} size={20} color={iconColor || WorkaholicTheme.colors.primary} />
        </View>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.label}>{label}</Text>
          {subLabel && <Text style={styles.subLabel} numberOfLines={1}>{subLabel}</Text>}
        </View>
      </View>
      {children}
    </TouchableOpacity>
  );

  const importedCount = useMemo(() => {
    const standardKeys = DISCOUNT_GROUPS.map(g => g.id);
    return Object.keys(tempDiscounts).filter(k => !standardKeys.includes(k)).length;
  }, [tempDiscounts]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color={WorkaholicTheme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Inställningar</Text>
          <View style={{ width: 28 }} />
        </View>

        <Text style={styles.sectionTitle}>FÖRETAG & LOGOTYP</Text>
        <View style={styles.logoSection}>
          {currentLogo ? (
            <Image source={{ uri: currentLogo }} style={styles.logoPreview} />
          ) : (
            <View style={[styles.logoPreview, styles.logoPlaceholder]}>
              <Ionicons name="image-outline" size={40} color="#ccc" />
            </View>
          )}
          <TouchableOpacity style={styles.changeLogoButton} onPress={pickImage}>
            <Text style={styles.changeLogoText}>{currentLogo ? "Byt" : "Välj"} logotyp</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>PROJEKTINSTÄLLNINGAR</Text>
        <SettingRow 
          icon="checkbox-outline" 
          label="Egenkontroll-mall" 
          subLabel="Redigera standardpunkter & enheter"
          onPress={() => navigation.navigate("InspectionTemplate")}
        >
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </SettingRow>

        <Text style={styles.sectionTitle}>MINA RABATTBREV</Text>
        {WHOLESALERS.map(ws => (
          <SettingRow 
            key={ws.id}
            icon={ws.icon} 
            label={ws.name} 
            subLabel={getActiveDiscountsCount(ws.id) > 0 ? `${getActiveDiscountsCount(ws.id)} rabattgrupper` : "Ej upplagt"}
            onPress={() => openDiscountModal(ws)}
          >
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </SettingRow>
        ))}

        <Text style={styles.sectionTitle}>PREFERENSER</Text>
        <SettingRow icon="notifications-outline" label="Notiser">
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ true: WorkaholicTheme.colors.primary + "80", false: "#ccc" }}
            thumbColor={notificationsEnabled ? WorkaholicTheme.colors.primary : "#f4f3f4"}
          />
        </SettingRow>

        <View style={styles.logoutContainer}>
          <Button title="Logga ut" type="secondary" onPress={() => signOut(auth)} />
        </View>
      </ScrollView>

      <Modal visible={isModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Rabattbrev</Text>
                <Text style={styles.modalSubtitle}>{activeWholesaler?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#1C1C1E" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {activeWholesaler?.id === 'ahlsell' && (
                <View style={styles.importSection}>
                  <TouchableOpacity style={styles.importCard} onPress={handleImportFile} disabled={importing}>
                    <View style={styles.importIconCircle}>
                      {importing ? <ActivityIndicator size="small" color={WorkaholicTheme.colors.primary} /> : <Ionicons name="document-attach-outline" size={22} color={WorkaholicTheme.colors.primary} />}
                    </View>
                    <View style={{flex: 1}}>
                      <Text style={styles.importTitle}>Importera Ahlsell-fil</Text>
                      <Text style={styles.importSub}>Snabbtvättar bort 0% rader</Text>
                    </View>
                  </TouchableOpacity>
                  {importedCount > 0 && (
                    <View style={styles.statusBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                      <Text style={styles.statusText}>{importedCount} aktiva rabattkoder redo</Text>
                    </View>
                  )}
                </View>
              )}

              <Text style={styles.infoText}>Standardgrupper:</Text>
              {DISCOUNT_GROUPS.map(group => {
                const item = tempDiscounts[group.id] || {};
                const val = item.p || item.percent || "";
                return (
                  <View key={group.id} style={styles.discountRow}>
                    <Text style={styles.discountLabel}>{group.label}</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput 
                        style={styles.discountInput} 
                        value={val.toString()} 
                        onChangeText={t => handleDiscountChange(group.id, t, group.label)}
                        placeholder="0"
                        keyboardType="numeric"
                        maxLength={3}
                      />
                      <Text style={styles.percentSymbol}>%</Text>
                    </View>
                  </View>
                );
              })}

              <View style={{marginTop: 30}}>
                {loading ? <ActivityIndicator color={WorkaholicTheme.colors.primary} /> : <Button title={importing ? "IMPORTERAR..." : "SPARA ALLA RABATTER"} onPress={saveDiscountAgreement} disabled={importing} />}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  contentContainer: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "800", color: WorkaholicTheme.colors.primary },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: "#8E8E93", marginBottom: 10, marginTop: 15, letterSpacing: 1.2, textTransform: 'uppercase' },
  logoSection: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 12, elevation: 2 },
  logoPreview: { width: 100, height: 100, borderRadius: 12, resizeMode: 'contain', marginBottom: 15 },
  logoPlaceholder: { backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E5EA', borderStyle: 'dashed' },
  changeLogoButton: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: "rgba(0, 122, 255, 0.05)", borderRadius: 8 },
  changeLogoText: { color: WorkaholicTheme.colors.primary, fontWeight: "600", fontSize: 13 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", elevation: 2 },
  leftContent: { flexDirection: "row", alignItems: "center", flex: 1 },
  iconContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(0, 122, 255, 0.1)", justifyContent: "center", alignItems: "center", marginRight: 12 },
  label: { fontSize: 16, fontWeight: "600", color: "#1C1C1E" },
  subLabel: { fontSize: 12, color: "#8E8E93", marginTop: 2 },
  logoutContainer: { marginTop: 30 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  modalTitle: { fontSize: 24, fontWeight: '900', color: '#1C1C1E' },
  modalSubtitle: { fontSize: 14, fontWeight: '700', color: WorkaholicTheme.colors.primary, marginTop: 4 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center' },
  importSection: { marginBottom: 20 },
  importCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#E5E5EA' },
  importIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  importTitle: { fontSize: 15, fontWeight: '700', color: '#1C1C1E' },
  importSub: { fontSize: 12, color: '#8E8E93', marginTop: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: '#E8F5E9', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 12, color: '#2E7D32', fontWeight: '700' },
  infoText: { fontSize: 13, color: '#8E8E93', marginBottom: 15, fontWeight: '800', textTransform: 'uppercase' },
  discountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  discountLabel: { fontSize: 15, fontWeight: '700', color: '#333', flex: 1 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 10, paddingHorizontal: 15 },
  discountInput: { fontSize: 16, fontWeight: '800', color: '#1C1C1E', paddingVertical: 10, width: 45, textAlign: 'right' },
  percentSymbol: { fontSize: 16, fontWeight: '800', color: '#8E8E93', marginLeft: 5 },
});