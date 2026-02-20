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
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useBadges } from "../context/BadgeContext";
import { uploadLogoToCloud } from "../utils/settingsService";

const WHOLESALERS = [
  { id: 'rexel', name: 'Rexel', icon: 'flash' },
  { id: 'solar', name: 'Solar', icon: 'sunny' },
  { id: 'ahlsell', name: 'Ahlsell', icon: 'construct' },
  { id: 'elektroskandia', name: 'E-skandia', icon: 'bulb' }
];

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { currentLogo, setCurrentLogo } = useBadges();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [integrations, setIntegrations] = useState({});
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeWholesaler, setActiveWholesaler] = useState(null);
  const [tempKeys, setTempKeys] = useState({ apiKey: '', apiSecret: '', customerNumber: '' });

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
        if (userDoc.exists()) setIntegrations(userDoc.data().integrations || {});
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

  const openIntegration = (wholesaler) => {
    setActiveWholesaler(wholesaler);
    const existing = integrations[wholesaler.id] || { apiKey: '', apiSecret: '', customerNumber: '' };
    setTempKeys(existing);
    setIsModalVisible(true);
  };

  const saveIntegration = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const updatedIntegrations = { ...integrations, [activeWholesaler.id]: tempKeys };
      await updateDoc(userRef, { integrations: updatedIntegrations });
      setIntegrations(updatedIntegrations);
      setIsModalVisible(false);
      Keyboard.dismiss();
      Alert.alert("Sparat", "Uppgifterna har uppdaterats.");
    } catch (e) { Alert.alert("Fel", "Kunde inte spara."); }
    finally { setLoading(false); }
  };

  const handleLogout = () => {
    Alert.alert("Logga ut", "Är du säker?", [
      { text: "Avbryt", style: "cancel" },
      { text: "Logga ut", style: "destructive", onPress: () => signOut(auth) }
    ]);
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

      <Text style={styles.sectionTitle}>INTEGRATIONER (GROSSISTER)</Text>
      {WHOLESALERS.map(ws => (
        <SettingRow 
          key={ws.id}
          icon={ws.icon} 
          label={ws.name} 
          subLabel={integrations[ws.id]?.apiKey ? "Kopplad ✓" : "Ej konfigurerad"}
          onPress={() => openIntegration(ws)}
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
              <Text style={styles.modalTitle}>{activeWholesaler?.name}</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#CCC" />
              </TouchableOpacity>
            </View>
            <ScrollView bounces={false}>
              <Text style={styles.inputLabel}>API KEY / CLIENT ID</Text>
              <TextInput 
                style={styles.input} 
                value={tempKeys.apiKey} 
                onChangeText={t => setTempKeys({...tempKeys, apiKey: t})}
                placeholder="Klistra in nyckel..."
                autoCapitalize="none"
              />
              <Text style={styles.inputLabel}>API SECRET</Text>
              <TextInput 
                style={styles.input} 
                value={tempKeys.apiSecret} 
                onChangeText={t => setTempKeys({...tempKeys, apiSecret: t})}
                placeholder="Klistra in secret..."
                secureTextEntry
              />
              <Text style={styles.inputLabel}>KUNDNUMMER</Text>
              <TextInput 
                style={styles.input} 
                value={tempKeys.customerNumber} 
                onChangeText={t => setTempKeys({...tempKeys, customerNumber: t})}
                placeholder="Ditt kundnummer"
                keyboardType="numeric"
              />
              <View style={{marginTop: 20}}>
                {loading ? <ActivityIndicator color={WorkaholicTheme.colors.primary} /> : <Button title="SPARA KOPPLING" onPress={saveIntegration} />}
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 20, padding: 25, elevation: 5, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: WorkaholicTheme.colors.primary },
  inputLabel: { fontSize: 10, fontWeight: '800', color: '#999', marginBottom: 5, marginTop: 15 },
  input: { backgroundColor: '#F2F2F7', padding: 15, borderRadius: 12, fontSize: 14, fontWeight: '600', color: '#1C1C1E' }
});