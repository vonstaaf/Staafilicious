import React, { useContext, useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert, 
  TouchableOpacity, 
  Switch,
  Image,
  ScrollView,
  Dimensions
} from "react-native";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ProjectsContext } from "../context/ProjectsContext";
import { useBadges } from "../context/BadgeContext";
import Button from "../components/Button";
import { WorkaholicTheme } from "../theme";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const formatNumber = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "0,00";
  return Number(n).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

export default function SettlementScreen() {
  const { selectedProject, updateProjectData } = useContext(ProjectsContext);
  const { setCurrentLogo } = useBadges(); 
  const [showVat, setShowVat] = useState(true); 
  const [useRot, setUseRot] = useState(false);
  const [logo, setLogo] = useState(null);

  // Laddar sparad logo vid start
  useEffect(() => {
    const loadLogo = async () => {
      const savedLogo = await AsyncStorage.getItem("user_logo");
      if (savedLogo) setLogo(savedLogo);
    };
    loadLogo();
  }, []);

  if (!selectedProject) {
    return (
      <View style={styles.centered}>
        <Ionicons name="document-text-outline" size={64} color="#ccc" />
        <Text style={styles.emptyText}>Välj ett projekt på hemskärmen</Text>
      </View>
    );
  }

  // --- BERÄKNINGAR ---
  const kostnader = selectedProject.kostnader || [];
  const produkter = selectedProject.products || [];

  const arbeteExclVat = kostnader.reduce((acc, it) => acc + (Number(it.totalExclVat) || 0), 0);
  const materialExclVat = produkter.reduce((acc, it) => acc + (Number(it.unitPriceOutExclVat || 0) * Number(it.quantity || 0)), 0);
  
  const totalExclVat = arbeteExclVat + materialExclVat;
  const momsBelopp = showVat ? totalExclVat * 0.25 : 0;
  const totalInklValdMoms = totalExclVat + momsBelopp;

  const rotBas = showVat ? arbeteExclVat * 1.25 : arbeteExclVat;
  const rotAvdrag = useRot ? rotBas * 0.30 : 0;
  
  const slutSumma = totalInklValdMoms - rotAvdrag;

  // --- LOGO HANTERING ---
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled) {
      const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setLogo(base64Img); 
      await AsyncStorage.setItem("user_logo", base64Img); 
      if (setCurrentLogo) setCurrentLogo(base64Img);
    }
  };

  const removeLogo = () => {
    Alert.alert("Ta bort logotyp?", "Vill du radera din sparade företagslogga?", [
      { text: "Avbryt", style: "cancel" },
      { text: "Radera", style: "destructive", onPress: async () => {
          setLogo(null);
          if (setCurrentLogo) setCurrentLogo(null);
          await AsyncStorage.removeItem("user_logo");
        } 
      }
    ]);
  };

  // --- EXPORT FUNKTIONER ---
  const exportToExcel = async () => {
    try {
      let csv = "\uFEFF"; 
      csv += "Kategori;Beskrivning;Info;Mängd;Pris exkl;Summa exkl\n";
      kostnader.forEach(it => csv += `Arbete;${it.info};${it.datum};${it.timmar} h;${it.timpris};${it.totalExclVat}\n`);
      produkter.forEach(it => csv += `Material;${it.name};E-nr: ${it.eNumber};${it.quantity} st;${it.unitPriceOutExclVat};${it.unitPriceOutExclVat * it.quantity}\n`);
      
      const filename = `${FileSystem.cacheDirectory}Projekt_${selectedProject.name.replace(/\s/g, '_')}.csv`;
      await FileSystem.writeAsStringAsync(filename, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(filename);
    } catch (e) {
      Alert.alert("Fel", "Kunde inte skapa filen.");
    }
  };

  const createPDF = async () => {
    const html = `
      <html>
        <body style="font-family: sans-serif; padding: 40px;">
          <h1 style="color: ${WorkaholicTheme.colors.primary};">PROJEKTUNDERLAG</h1>
          <p><strong>Projekt: ${selectedProject.name.toUpperCase()}</strong></p>
          <hr/>
          <p>Totalt att betala: ${formatNumber(slutSumma)} kr</p>
        </body>
      </html>
    `;
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* HUVUDKORT */}
        <View style={styles.mainCard}>
          {logo ? (
            <Image source={{ uri: logo }} style={styles.brandLogo} />
          ) : (
            <Ionicons name="business" size={60} color="rgba(255,255,255,0.4)" style={{ marginBottom: 20 }} />
          )}
          <Text style={styles.groupName}>PROJEKT: {selectedProject.name.toUpperCase()}</Text>
          <Text style={styles.totalAmount}>{formatNumber(slutSumma)} kr</Text>
          <Text style={styles.totalLabel}>
            {useRot ? "Att betala efter ROT" : `Totalt (${showVat ? 'inkl.' : 'exkl.'} moms)`}
          </Text>
        </View>

        <View style={styles.settingsSection}>
          <View style={styles.settingCard}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.settingTitle}>Moms (25%)</Text>
                <Text style={styles.settingSub}>Visa priser inkl. moms</Text>
              </View>
              <Switch value={showVat} onValueChange={setShowVat} trackColor={{ true: WorkaholicTheme.colors.primary }} />
            </View>
          </View>

          <View style={styles.settingCard}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.settingTitle}>ROT-avdrag</Text>
                <Text style={styles.settingSub}>30% avdrag på arbetet</Text>
              </View>
              <Switch value={useRot} onValueChange={setUseRot} trackColor={{ true: WorkaholicTheme.colors.primary }} />
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.logoPicker} onPress={pickImage} onLongPress={logo ? removeLogo : null}>
          <Ionicons name={logo ? "sync" : "image-outline"} size={22} color={WorkaholicTheme.colors.primary} />
          <Text style={styles.logoPickerText}>
            {logo ? "Byt logotyp (Håll inne för att ta bort)" : "Ladda upp företagssymbol"}
          </Text>
        </TouchableOpacity>

        <View style={styles.actions}>
          <Button title="DELA PDF-UNDERLAG" type="primary" onPress={createPDF} />
          <View style={{ height: 12 }} />
          <TouchableOpacity style={styles.excelBtn} onPress={exportToExcel}>
            <Ionicons name="stats-chart" size={18} color="#fff" />
            <Text style={styles.excelBtnText}>EXPORTERA TILL EXCEL</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.resetLink} 
          onPress={() => Alert.alert("Nollställ?", "Detta raderar allt material och all tid i projektet.", [
            { text: "Avbryt" }, 
            { text: "Nollställ", style: "destructive", onPress: () => updateProjectData(selectedProject.id, { kostnader: [], products: [] }) }
          ])}
        >
          <Text style={styles.resetText}>Nollställ projektdata</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB', paddingHorizontal: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mainCard: { 
    backgroundColor: WorkaholicTheme.colors.primary, 
    borderRadius: 25, 
    paddingVertical: 40, 
    paddingHorizontal: 20,
    alignItems: 'center', 
    marginTop: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  brandLogo: { width: '80%', height: 100, resizeMode: 'contain', marginBottom: 20 },
  groupName: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  totalAmount: { color: '#fff', fontSize: 36, fontWeight: '900', marginVertical: 5 },
  totalLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
  settingsSection: { marginTop: 20 },
  settingCard: { backgroundColor: '#fff', borderRadius: 15, padding: 18, marginBottom: 10, elevation: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingTitle: { fontWeight: '800', fontSize: 15, color: '#333' },
  settingSub: { fontSize: 12, color: '#AAA', marginTop: 2 },
  logoPicker: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    padding: 18, 
    borderRadius: 15, 
    marginTop: 10, 
    borderStyle: 'dashed', 
    borderWidth: 1.5, 
    borderColor: '#DDD' 
  },
  logoPickerText: { flex: 1, marginLeft: 12, color: WorkaholicTheme.colors.primary, fontSize: 14, fontWeight: '700' },
  actions: { marginTop: 25 },
  excelBtn: { 
    flexDirection: 'row', 
    backgroundColor: '#1D6F42', 
    height: 55, 
    borderRadius: 15, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  excelBtnText: { color: '#fff', fontWeight: '800', marginLeft: 10, letterSpacing: 0.5 },
  resetLink: { marginTop: 35, alignItems: 'center', marginBottom: 50 },
  resetText: { color: '#FF3B30', fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
  emptyText: { textAlign: 'center', marginTop: 15, color: '#999', fontWeight: '600' }
});