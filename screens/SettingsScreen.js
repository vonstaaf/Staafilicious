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
import { getWholesalersForProfession, getDiscountGroupsForProfession, getProfessionKeys } from "../constants/wholesalers";
import JSZip from 'jszip';

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
  const [profession, setProfession] = useState("");

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        const [discountDoc, userDoc] = await Promise.all([
          getDoc(doc(db, "userDiscounts", user.uid)),
          getDoc(doc(db, "users", user.uid)),
        ]);
        if (discountDoc.exists()) {
          const rawData = discountDoc.data().data;
          if (typeof rawData === 'string') {
            setDiscountAgreements(JSON.parse(rawData));
          } else {
            setDiscountAgreements(discountDoc.data().agreements || {});
          }
        }
        if (userDoc.exists() && userDoc.data().profession != null) {
          setProfession(userDoc.data().profession);
        }
      }
    } catch (e) { 
      console.error("Laddningsfel:", e); 
    } finally { 
      setLoading(false); 
    }
  };

  const professionKeys = getProfessionKeys(profession);
  const isEl = professionKeys.includes("el");
  const isVvs = professionKeys.includes("vvs");
  const isBygg = professionKeys.includes("bygg");
  const hasEgenkontrollMall = isEl || isVvs || isBygg;

  const visibleWholesalers = getWholesalersForProfession(profession);
  const discountGroups = getDiscountGroupsForProfession(profession);

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
        type: ['text/plain', 'application/zip', 'application/x-zip-compressed', '*/*'] 
      });
      if (result.canceled) return;

      setImporting(true);
      const fileUri = result.assets[0].uri;
      const fileName = result.assets[0].name ? result.assets[0].name.toLowerCase() : '';
      
      const importedData = {};
      let count = 0;
      let skipped = 0;

      // DIN URSPRUNGLIGA REXEL-LOGIK (Sparar som t.ex. "0.42" för 42%)
      const parseRexelContent = (content) => {
        const lines = content.split('\n');
        lines.forEach(line => {
          const parts = line.trim().split(';');
          if (parts.length >= 2) {
            const key = parts[0].trim();
            const rawDiscount = parts[1].trim();
            if (key && !isNaN(rawDiscount)) {
              const discountValue = parseFloat(rawDiscount) / 10;
              if (discountValue > 0) {
                importedData[key] = {
                  p: (discountValue / 100).toString(),
                  l: key 
                };
                count++;
              } else {
                skipped++;
              }
            }
          }
        });
      };

      if (fileName.endsWith('.zip')) {
        const base64Data = await FileSystem.readAsStringAsync(fileUri, { 
          encoding: FileSystem.EncodingType.Base64 
        });
        const zip = new JSZip();
        const unzipped = await zip.loadAsync(base64Data, { base64: true });
        
        let mainFile = null;
        let itemFile = null;

        for (const path in unzipped.files) {
          const p = path.toLowerCase();
          if (p.endsWith('.txt')) {
            if (p.includes('itemdiscount')) itemFile = path;
            else mainFile = path;
          }
        }

        if (mainFile) {
          const content = await unzipped.file(mainFile).async('string');
          parseRexelContent(content);
        }
        if (itemFile) {
          const content = await unzipped.file(itemFile).async('string');
          parseRexelContent(content);
        }

      } else {
        const content = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
        
        if (activeWholesaler?.id === 'rexel') {
          parseRexelContent(content);
        } else if (activeWholesaler?.id === 'ahlsell') {
          // NY OCH FIXAD AHLSELL-LOGIK
          const lines = content.split('\n');
          lines.forEach(line => {
            if (line.length > 60 && line.includes("1N")) {
              // Fixar teckenkodningen direkt på nyckeln (B0100 -> BÄ0100)
              const materialClass = line.substring(30, 36).trim().replace(/\ufffd/g, 'Ä');
              
              // Hämtar rabatten, t.ex. "0420" för 42.0%
              const discountStr = line.substring(36, 40); 
              const rawNum = parseInt(discountStr, 10);

              if (materialClass && !isNaN(rawNum) && rawNum > 0) {
                // Konverterar 420 till 0.42 (för att matcha hur Rexel fungerar)
                const decimalDiscount = rawNum / 1000;

                let label = line.substring(57, 95).trim()
                                .replace(/\ufffd/g, 'Ä') 
                                .replace(/^[BT]ANSK\s+/, '');

                if (!importedData[materialClass]) {
                  importedData[materialClass] = { 
                    p: decimalDiscount.toString(), 
                    l: label.substring(0, 25) || materialClass 
                  };
                  count++;
                }
              } else {
                skipped++;
              }
            }
          });
        }
      }

      setTempDiscounts(prev => ({ ...prev, ...importedData }));
      Alert.alert("Import klar!", `Hittade ${count} rader som lades till i listan.`);
    } catch (error) {
      console.error(error);
      Alert.alert("Fel", "Kunde inte bearbeta filen.");
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
        if (!isNaN(discountNum) && discountNum > 0) {
          filtered[key] = { p: val.toString(), l: (item.l || item.label || key).substring(0, 20) };
        }
      });
      const updatedAgreements = { ...discountAgreements, [activeWholesaler.id]: filtered };
      const stringifiedData = JSON.stringify(updatedAgreements);
      await setDoc(discountRef, { data: stringifiedData }, { merge: true });
      setDiscountAgreements(updatedAgreements);
      setIsModalVisible(false);
      Alert.alert("Sparat!", "Dina rabatter är nu synkade.");
      Keyboard.dismiss();
    } catch (e) { 
      console.error(e);
      Alert.alert("Fel", "Kunde inte spara."); 
    } finally { setLoading(false); }
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top - 15 }]}>
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
        {hasEgenkontrollMall && (
          <SettingRow 
            icon="checkbox-outline" 
            label="Egenkontroll-mall" 
            subLabel={isEl ? "Allmän & Golvvärme" : isVvs ? "VVS-mall" : "Bygg-mall"}
            onPress={() => navigation.navigate("InspectionTemplate")}
          >
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </SettingRow>
        )}

        <Text style={styles.sectionTitle}>MINA RABATTBREV</Text>
        {visibleWholesalers.length === 0 ? (
          <Text style={styles.hintText}>Sätt yrke i profilen (EL, Rör/VVS eller Bygg) för att se grossister och rabattgrupper.</Text>
        ) : (
          visibleWholesalers.map(ws => (
            <SettingRow 
              key={ws.id}
              icon={ws.icon} 
              label={ws.name} 
              subLabel={getActiveDiscountsCount(ws.id) > 0 ? `${getActiveDiscountsCount(ws.id)} rabattgrupper` : "Ej upplagt"}
              onPress={() => openDiscountModal(ws)}
            >
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </SettingRow>
          ))
        )}

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
              {(activeWholesaler?.id === 'ahlsell' || activeWholesaler?.id === 'rexel') && (
                <View style={styles.importSection}>
                  <TouchableOpacity style={styles.importCard} onPress={handleImportFile} disabled={importing}>
                    <View style={styles.importIconCircle}>
                      {importing ? <ActivityIndicator size="small" color={WorkaholicTheme.colors.primary} /> : <Ionicons name="document-attach-outline" size={22} color={WorkaholicTheme.colors.primary} />}
                    </View>
                    <View style={{flex: 1}}>
                      <Text style={styles.importTitle}>Importera {activeWholesaler?.name}-fil</Text>
                      <Text style={styles.importSub}>Välj fil från telefonen</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              <Text style={styles.infoText}>Standardgrupper:</Text>
              {discountGroups.map(group => {
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
                        maxLength={4}
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
  hintText: { fontSize: 13, color: "#8E8E93", marginBottom: 12, lineHeight: 20 },
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
  infoText: { fontSize: 13, color: '#8E8E93', marginBottom: 15, fontWeight: '800', textTransform: 'uppercase' },
  discountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  discountLabel: { fontSize: 15, fontWeight: '700', color: '#333', flex: 1 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 10, paddingHorizontal: 15 },
  discountInput: { fontSize: 16, fontWeight: '800', color: '#1C1C1E', paddingVertical: 10, width: 45, textAlign: 'right' },
  percentSymbol: { fontSize: 16, fontWeight: '800', color: '#8E8E93', marginLeft: 5 },
});