import React, { useState, useEffect } from "react";
import { 
  View, Text, StyleSheet, Switch, TouchableOpacity, Alert, ScrollView, 
  Image, Platform, TextInput, Modal, ActivityIndicator, KeyboardAvoidingView, Keyboard
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WorkaholicTheme } from "../theme";
import { auth, db } from "../firebaseConfig"; 
import { signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore"; 
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
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setDiscountAgreements(userDoc.data().discountAgreements || {});
        }
      }
    } catch (e) { console.error("Laddningsfel:", e); }
    finally { setLoading(false); }
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
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/plain',
      });

      if (result.canceled) return;

      setImporting(true);
      const fileUri = result.assets[0].uri;
      
      // Använder latin1 för att hantera Ahlsells teckenkodning (ÅÄÖ)
      const fileContent = await FileSystem.readAsStringAsync(fileUri, { encoding: 'latin1' });
      const lines = fileContent.split('\n');
      
      let newDiscounts = { ...tempDiscounts };
      let count = 0;

      lines.forEach(line => {
        // Ahlsell format: Letar efter rader som innehåller rabattdata (ofta märkt "1N")
        if (line.includes("1N") && line.length > 60) {
          const groupCode = line.substring(30, 36).trim();
          const rawDiscount = line.substring(36, 41).trim();
          const label = line.substring(66, 95).trim();

          if (groupCode && rawDiscount) {
            // Konverterar 04200 till 42.00
            const discountPercent = (parseFloat(rawDiscount) / 100).toString();
            newDiscounts[groupCode] = {
              percent: discountPercent,
              label: label || groupCode
            };
            count++;
          }
        }
      });

      if (count === 0) {
        Alert.alert("Ingen data hittades", "Kunde inte hitta giltiga rabattrader i filen.");
      } else {
        setTempDiscounts(newDiscounts);
        Alert.alert("Import klar", `Hittade ${count} rabattgrupper. Granska och tryck på SPARA.`);
      }
    } catch (error) {
      Alert.alert("Fel", "Kunde inte läsa rabattfilen.");
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
    let cleaned = value.replace(/[^0-9]/g, "");
    if (parseInt(cleaned) > 100) cleaned = "100";
    
    // Hanterar både objekt-format (importerat) och sträng-format (manuellt)
    setTempDiscounts({ 
      ...tempDiscounts, 
      [groupId]: typeof tempDiscounts[groupId] === 'object' 
        ? { ...tempDiscounts[groupId], percent: cleaned }
        : cleaned 
    });
  };

  const saveDiscountAgreement = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const updatedAgreements = { ...discountAgreements, [activeWholesaler.id]: tempDiscounts };
      
      await updateDoc(userRef, { discountAgreements: updatedAgreements });
      
      setDiscountAgreements(updatedAgreements);
      setIsModalVisible(false);
      Keyboard.dismiss();
    } catch (e) { Alert.alert("Fel", "Kunde inte spara rabattbrevet."); }
    finally { setLoading(false); }
  };

  const handleLogout = () => {
    Alert.alert("Logga ut", "Är du säker?", [
      { text: "Avbryt", style: "cancel" },
      { text: "Logga ut", style: "destructive", onPress: () => signOut(auth) }
    ]);
  };

  const getActiveDiscountsCount = (wholesalerId) => {
    const agreement = discountAgreements[wholesalerId];
    if (!agreement) return 0;
    return Object.values(agreement).filter(val => {
      const v = typeof val === 'object' ? val.percent : val;
      return v && v.toString().trim() !== "";
    }).length;
  };

  const renderDiscountInputs = () => {
    const keys = Object.keys(tempDiscounts);
    
    // Om det är Ahlsell och vi har specifika koder från filen, visa dem dynamiskt
    if (activeWholesaler?.id === 'ahlsell' && keys.length > 0 && !keys.every(k => DISCOUNT_GROUPS.some(dg => dg.id === k))) {
      return keys.sort().map(code => {
        const data = tempDiscounts[code];
        const percentValue = typeof data === 'object' ? data.percent : data;
        const labelValue = typeof data === 'object' ? data.label : code;

        return (
          <View key={code} style={styles.discountRow}>
            <View style={{flex: 1}}>
              <Text style={styles.discountLabel}>{labelValue}</Text>
              <Text style={styles.codeText}>{code}</Text>
            </View>
            <View style={styles.inputWrapper}>
              <TextInput 
                style={styles.discountInput} 
                value={percentValue?.toString() || ""} 
                onChangeText={t => handleDiscountChange(code, t, labelValue)}
                placeholder="0"
                keyboardType="numeric"
                maxLength={5}
              />
              <Text style={styles.percentSymbol}>%</Text>
            </View>
          </View>
        );
      });
    }

    // Annars visa standardgrupper
    return DISCOUNT_GROUPS.map(group => {
      const data = tempDiscounts[group.id];
      const percentValue = typeof data === 'object' ? data.percent : data;

      return (
        <View key={group.id} style={styles.discountRow}>
          <Text style={styles.discountLabel}>{group.label}</Text>
          <View style={styles.inputWrapper}>
            <TextInput 
              style={styles.discountInput} 
              value={percentValue?.toString() || ""} 
              onChangeText={t => handleDiscountChange(group.id, t, group.label)}
              placeholder="0"
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text style={styles.percentSymbol}>%</Text>
          </View>
        </View>
      );
    });
  };

  const SettingRow = ({ icon, label, children, onPress, subLabel, iconColor }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress} 
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.leftContent}>
        <View style={[styles.iconContainer, iconColor && { backgroundColor: iconColor + '10' }]}>
          <Ionicons name={icon} size={20} color={iconColor || WorkaholicTheme.colors.primary} />
        </View>
        <View>
          <Text style={styles.label}>{label}</Text>
          {subLabel && <Text style={styles.subLabel}>{subLabel}</Text>}
        </View>
      </View>
      {children}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 10 }]}>
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
          <Text style={styles.changeLogoText}>{currentLogo ? "Byt logotyp" : "Välj logotyp"}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>MINA RABATTBREV</Text>
      {WHOLESALERS.map(ws => {
        const count = getActiveDiscountsCount(ws.id);
        return (
          <SettingRow 
            key={ws.id}
            icon={ws.icon} 
            label={ws.name} 
            subLabel={count > 0 ? `${count} rabattgrupper inlagda` : "Inget rabattbrev upplagt"}
            onPress={() => openDiscountModal(ws)}
          >
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </SettingRow>
        );
      })}

      <Text style={styles.sectionTitle}>PREFERENSER</Text>
      <SettingRow icon="notifications-outline" label="Notiser">
        <Switch
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
          trackColor={{ true: WorkaholicTheme.colors.primary + "80", false: "#ccc" }}
          thumbColor={notificationsEnabled ? WorkaholicTheme.colors.primary : "#f4f3f4"}
        />
      </SettingRow>

      <Text style={styles.sectionTitle}>OM APPEN</Text>
      <SettingRow icon="information-circle-outline" label="Version">
        <Text style={styles.versionText}>{appVersion} ({buildVersion})</Text>
      </SettingRow>

      <View style={styles.logoutContainer}>
        <Button title="Logga ut" type="secondary" onPress={handleLogout} />
      </View>

      <Modal visible={isModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
          style={styles.modalOverlay}
        >
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
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 20}}>
              {activeWholesaler?.id === 'ahlsell' && (
                <TouchableOpacity 
                  style={styles.importCard} 
                  onPress={handleImportFile}
                  disabled={importing}
                >
                  <View style={styles.importIconCircle}>
                    {importing ? (
                      <ActivityIndicator size="small" color={WorkaholicTheme.colors.primary} />
                    ) : (
                      <Ionicons name="document-attach-outline" size={22} color={WorkaholicTheme.colors.primary} />
                    )}
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.importTitle}>Importera Ahlsell-fil</Text>
                    <Text style={styles.importSub}>Läs in rabattbrev (.txt) automatiskt</Text>
                  </View>
                  <Ionicons name="cloud-upload-outline" size={20} color="#8E8E93" />
                </TouchableOpacity>
              )}

              <Text style={styles.infoText}>
                {Object.keys(tempDiscounts).length > 0 
                  ? "Granska dina rabatter nedan. Du kan även justera dem manuellt."
                  : "Fyll i din rabattsats manuellt eller använd importfunktionen ovan."}
              </Text>

              {renderDiscountInputs()}

              <View style={{marginTop: 25}}>
                {loading ? (
                  <ActivityIndicator color={WorkaholicTheme.colors.primary} />
                ) : (
                  <Button title="SPARA RABATTBREV" onPress={saveDiscountAgreement} />
                )}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  contentContainer: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "800", color: WorkaholicTheme.colors.primary },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: "#8E8E93", marginBottom: 10, marginTop: 15, letterSpacing: 1.2, textTransform: 'uppercase' },
  logoSection: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 12, elevation: 2 },
  logoPreview: { width: 120, height: 120, borderRadius: 12, resizeMode: 'contain', marginBottom: 15 },
  logoPlaceholder: { backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E5EA', borderStyle: 'dashed' },
  changeLogoButton: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: "rgba(0, 122, 255, 0.05)", borderRadius: 8 },
  changeLogoText: { color: WorkaholicTheme.colors.primary, fontWeight: "600", fontSize: 14 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", elevation: 3 },
  leftContent: { flexDirection: "row", alignItems: "center" },
  iconContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(0, 122, 255, 0.1)", justifyContent: "center", alignItems: "center", marginRight: 12 },
  label: { fontSize: 16, fontWeight: "600", color: "#1C1C1E" },
  subLabel: { fontSize: 12, color: "#8E8E93", marginTop: 2 },
  versionText: { fontSize: 14, color: "#8E8E93", fontWeight: "500" },
  logoutContainer: { marginTop: 30 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  modalTitle: { fontSize: 24, fontWeight: '900', color: '#1C1C1E' },
  modalSubtitle: { fontSize: 14, fontWeight: '700', color: WorkaholicTheme.colors.primary, marginTop: 4 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center' },
  infoText: { fontSize: 13, color: '#666', lineHeight: 20, marginBottom: 25, fontWeight: '500' },
  importCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 12, padding: 15, marginBottom: 20, borderWidth: 1, borderColor: '#E5E5EA' },
  importIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  importTitle: { fontSize: 15, fontWeight: '700', color: '#1C1C1E' },
  importSub: { fontSize: 12, color: '#8E8E93', marginTop: 1 },
  discountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  discountLabel: { fontSize: 15, fontWeight: '700', color: '#333', flex: 1 },
  codeText: { fontSize: 10, color: WorkaholicTheme.colors.primary, fontWeight: '700', marginTop: 2 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 10, paddingHorizontal: 15 },
  discountInput: { fontSize: 16, fontWeight: '800', color: '#1C1C1E', paddingVertical: 12, width: 50, textAlign: 'right' },
  percentSymbol: { fontSize: 16, fontWeight: '800', color: '#8E8E93', marginLeft: 5 },
});