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
  TextInput,
  LayoutAnimation,
  Modal,
  ActivityIndicator,
  Platform
} from "react-native";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing'; 
import * as FileSystem from 'expo-file-system'; 
import * as ImagePicker from 'expo-image-picker';
import { Asset } from 'expo-asset'; 
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ProjectsContext } from "../context/ProjectsContext";
import { WorkaholicTheme } from "../theme";
import { Ionicons } from "@expo/vector-icons";

export default function SettlementScreen() {
  const { selectedProject } = useContext(ProjectsContext);
  const [showVat, setShowVat] = useState(true); 
  const [useRot, setUseRot] = useState(false);
  const [logo, setLogo] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false); 
  
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [zipCity, setZipCity] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [orgNr, setOrgNr] = useState(""); 
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedLogo = await AsyncStorage.getItem("user_logo");
        const savedName = await AsyncStorage.getItem("user_company_name");
        const savedAddress = await AsyncStorage.getItem("user_address");
        const savedZip = await AsyncStorage.getItem("user_zip");
        const savedPhone = await AsyncStorage.getItem("user_phone");
        const savedWeb = await AsyncStorage.getItem("user_web");
        const savedOrg = await AsyncStorage.getItem("user_company_orgnr");

        if (savedLogo) setLogo(savedLogo);
        if (savedName) setCompanyName(savedName);
        if (savedAddress) setAddress(savedAddress);
        if (savedZip) setZipCity(savedZip);
        if (savedPhone) setPhone(savedPhone);
        if (savedWeb) setWebsite(savedWeb);
        if (savedOrg) setOrgNr(savedOrg);
        
        if (!savedName) setIsExpanded(true);
      } catch (e) {
        console.error("Fel vid laddning av data", e);
      }
    };
    loadData();
  }, []);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const capitalize = (text) => {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const updateInfo = async (key, value, setter, type = "text") => {
    let formattedValue = value;
    if (type === "name") {
      formattedValue = capitalize(value);
    } else if (type === "web") {
      if (value.length > 0 && !value.toLowerCase().startsWith("www.") && !value.toLowerCase().startsWith("http")) {
        formattedValue = "www." + value;
      }
    }
    setter(formattedValue);
    await AsyncStorage.setItem(key, formattedValue);
  };

  const getAppLogoBase64 = async () => {
    try {
      const moduleRef = require("../assets/logo.png");
      const asset = Asset.fromModule(moduleRef);
      await asset.downloadAsync();
      const cachePath = `${FileSystem.cacheDirectory}app_logo_temp_settle.png`;
      await FileSystem.copyAsync({
        from: asset.localUri || asset.uri,
        to: cachePath
      });
      const base64 = await FileSystem.readAsStringAsync(cachePath, { encoding: 'base64' });
      return `data:image/png;base64,${base64}`;
    } catch (e) { 
      return null; 
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.4,
      base64: true,
    });
    if (!result.canceled) {
      const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setLogo(base64Img); 
      await AsyncStorage.setItem("user_logo", base64Img); 
    }
  };

  if (!selectedProject) {
    return (
      <View style={styles.centered}>
        <Ionicons name="document-text-outline" size={64} color="#ccc" />
        <Text style={styles.emptyText}>Välj ett Projekt på hemskärmen</Text>
      </View>
    );
  }

  // Beräkningar
  const kostnader = selectedProject.kostnader || [];
  const produkter = selectedProject.products || [];
  const arbeteExclVat = kostnader.reduce((acc, it) => acc + (Number(it.totalExclVat) || 0), 0);
  const materialUtExclVat = produkter.reduce((acc, it) => acc + (Number(it.unitPriceOutExclVat || 0) * Number(it.quantity || 0)), 0);
  const totalExclVat = arbeteExclVat + materialUtExclVat;
  const momsBelopp = totalExclVat * 0.25;
  const totalInklMoms = totalExclVat + momsBelopp;
  const rotBas = arbeteExclVat * 1.25; 
  const rotAvdrag = useRot ? rotBas * 0.30 : 0;
  const slutSumma = showVat ? (totalInklMoms - rotAvdrag) : (totalExclVat - (rotAvdrag / 1.25));

  const formatNumber = (n) => Number(n).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  const pdfStyles = `
    <style>
      body { font-family: Helvetica; padding: 20px; color: #333; }
      .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
      .logo-app { height: 60px; }
      .logo-user { height: 80px; max-width: 250px; object-fit: contain; }
      .company-text { text-align: right; line-height: 1.3; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      th { background: #f2f2f2; padding: 8px; border: 1px solid #ddd; font-size: 10px; text-align: left; text-transform: uppercase; }
      td { padding: 8px; border: 1px solid #ddd; font-size: 10px; }
      .total-container { margin-top: 30px; border: 2px solid #000; padding: 15px; background: #fafafa; }
      .footer { position: fixed; bottom: 0; width: 100%; border-top: 1px solid #eee; padding-top: 10px; display: flex; justify-content: space-between; font-size: 10px; color: #666; }
    </style>
  `;

  const createMasterPDF = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const workaholicLogo = await getAppLogoBase64();
      const html = `
        <html>
          <head>${pdfStyles}</head>
          <body>
            <div class="header">
              ${workaholicLogo ? `<img src="${workaholicLogo}" class="logo-app" />` : '<div></div>'}
              <div class="company-text">
                ${logo ? `<img src="${logo}" class="logo-user" /><br/>` : ''}
                <strong style="font-size: 20px;">${companyName}</strong><br/>
                <span>${address}<br/>${zipCity}</span>
              </div>
            </div>
            <h2 style="text-align: center;">INTERNT FAKTURERINGSUNDERLAG</h2>
            <p><b>Projekt:</b> ${selectedProject.name.toUpperCase()}</p>
            <table>
              <tr><th>Beskrivning</th><th style="text-align: right;">Summa (exkl. moms)</th></tr>
              ${kostnader.map(it => `<tr><td>${it.description || 'Arbete'}</td><td style="text-align: right;">${formatNumber(it.totalExclVat)} kr</td></tr>`).join('')}
              <tr style="font-weight:bold;"><td>TOTALT ARBETE</td><td style="text-align: right;">${formatNumber(arbeteExclVat)} kr</td></tr>
            </table>
            <table>
              <tr><th>Artikelnr</th><th>Artikel</th><th>Antal</th><th>Utpris/st</th><th style="text-align: right;">Totalt Ut (exkl)</th></tr>
              ${produkter.map(it => `
                <tr>
                  <td>${it.articleNumber || '-'}</td>
                  <td>${it.name}</td>
                  <td>${it.quantity}</td>
                  <td>${formatNumber(it.unitPriceOutExclVat)}</td>
                  <td style="text-align: right;">${formatNumber(it.unitPriceOutExclVat * it.quantity)} kr</td>
                </tr>`).join('')}
            </table>
            <div class="total-container">
              <div style="display:flex; justify-content:space-between; font-size:16px;"><b>SUMMA NETTO ATT FAKTURERA:</b><b>${formatNumber(totalExclVat)} kr</b></div>
            </div>
            <div class="footer">
                <span>${companyName}</span>
                <span>${phone}</span>
                <span>${orgNr ? `Org.nr: ${orgNr}` : ""}</span>
            </div>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (e) { Alert.alert("Fel", e.message); }
    finally { setIsGenerating(false); }
  };

  const createCustomerPDF = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const workaholicLogo = await getAppLogoBase64();
      const html = `
        <html>
          <head>${pdfStyles}</head>
          <body>
            <div class="header">
              ${workaholicLogo ? `<img src="${workaholicLogo}" class="logo-app" />` : '<div></div>'}
              <div class="company-text">
                ${logo ? `<img src="${logo}" class="logo-user" /><br/>` : ''}
                <strong style="font-size: 20px;">${companyName}</strong><br/>
                <span>${address}<br/>${zipCity}</span>
              </div>
            </div>
            <h1 style="text-transform: uppercase;">Avstämning: ${selectedProject.name}</h1>
            <p><b>Datum:</b> ${new Date().toLocaleDateString('sv-SE')}</p>
            
            <table>
              <tr style="background: #f2f2f2;"><th>BESKRIVNING</th><th style="text-align: right;">SUMMA</th></tr>
              <tr><td>Arbetsprestation</td><td style="text-align: right;">${formatNumber(showVat ? arbeteExclVat * 1.25 : arbeteExclVat)} kr</td></tr>
              <tr><td>Installationsmaterial (specifikation nedan)</td><td style="text-align: right;">${formatNumber(showVat ? materialUtExclVat * 1.25 : materialUtExclVat)} kr</td></tr>
              ${useRot ? `<tr><td>ROT-avdrag (30% på arbete)</td><td style="text-align: right; color: red;">-${formatNumber(rotAvdrag)} kr</td></tr>` : ''}
            </table>

            <h3 style="font-size: 10px; margin-top: 20px; text-transform: uppercase;">Materialspecifikation</h3>
            <table>
              <tr><th>Artikel</th><th style="text-align: right;">Antal</th></tr>
              ${produkter.map(it => `
                <tr>
                  <td>${it.name}${it.articleNumber ? ` (${it.articleNumber})` : ''}</td>
                  <td style="text-align: right;">${it.quantity} ${it.unit || 'st'}</td>
                </tr>`).join('')}
            </table>

            <div style="text-align: right; margin-top: 20px;">
              <div style="font-size: 22px; font-weight: 900; border-top: 3px solid #000; display: inline-block; padding-top: 10px;">
                ATT BETALA: ${formatNumber(slutSumma)} kr
              </div>
              <p style="font-size: 12px; color: #666;">${showVat ? 'Priser inkl. moms' : 'Priser exkl. moms'}</p>
            </div>
            <div class="footer">
                <span>${companyName}</span>
                <span>${phone}</span>
                <span>${orgNr ? `Org.nr: ${orgNr}` : ""}</span>
            </div>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (e) { Alert.alert("Fel", e.message); }
    finally { setIsGenerating(false); }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.mainCard} onPress={() => setIsModalVisible(true)} activeOpacity={0.9}>
          {logo ? <Image source={{ uri: logo }} style={styles.brandLogo} /> : <Ionicons name="business" size={40} color="#fff" />}
          <Text style={styles.groupName}>PROJEKT: {selectedProject.name.toUpperCase()}</Text>
          <Text style={styles.totalAmount}>{formatNumber(slutSumma)} kr</Text>
          <Text style={styles.tapInfo}>Tryck för ekonomisk överblick</Text>
        </TouchableOpacity>

        <View style={styles.accordionContainer}>
          <TouchableOpacity style={styles.accordionHeader} onPress={toggleExpand}>
            <Ionicons name={isExpanded ? "chevron-down-circle" : "chevron-forward-circle"} size={22} color={WorkaholicTheme.colors.primary} />
            <Text style={styles.sectionTitleText}>FÖRETAGSINFO & LOGOTYP</Text>
          </TouchableOpacity>
          
          {isExpanded && (
            <View style={styles.accordionContent}>
              <TextInput style={styles.textInput} placeholder="Företagsnamn" value={companyName} onChangeText={(v) => updateInfo("user_company_name", v, setCompanyName, "name")} />
              <TextInput style={[styles.textInput, { marginTop: 8 }]} placeholder="Adress" value={address} onChangeText={(v) => updateInfo("user_address", v, setAddress, "name")} />
              <TextInput style={[styles.textInput, { marginTop: 8 }]} placeholder="Postnr & Ort" value={zipCity} onChangeText={(v) => updateInfo("user_zip", v, setZipCity, "name")} />
              <TextInput style={[styles.textInput, { marginTop: 8 }]} placeholder="Telefon" value={phone} keyboardType="phone-pad" onChangeText={(v) => updateInfo("user_phone", v, setPhone)} />
              <TextInput style={[styles.textInput, { marginTop: 8 }]} placeholder="Webbadress" value={website} onChangeText={(v) => updateInfo("user_web", v, setWebsite, "web")} />
              <TextInput style={[styles.textInput, { marginTop: 8 }]} placeholder="Org.nr" value={orgNr} onChangeText={(v) => updateInfo("user_company_orgnr", v, setOrgNr)} />
              
              <TouchableOpacity style={styles.logoPickerSmall} onPress={pickImage}>
                <Ionicons name="image-outline" size={16} color={WorkaholicTheme.colors.primary} />
                <Text style={styles.logoPickerTextSmall}>{logo ? " Byt sparad logotyp" : " Ladda upp logotyp"}</Text>
              </TouchableOpacity>
            </View>
          )}
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
              <Switch value={useRot} onValueChange={setUseRot} trackColor={{ true: WorkaholicTheme.colors.primary }} />
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.pdfBtn} onPress={createCustomerPDF} disabled={isGenerating}>
            {isGenerating ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>DELA KUND-PDF (AVSTÄMNING)</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.masterBtn} onPress={createMasterPDF} disabled={isGenerating}>
            {isGenerating ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>DELA SAMMANSTÄLLNING (INTERN)</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>EKONOMI: {selectedProject.name.toUpperCase()}</Text>
            <View style={styles.detailRow}>
              <Text>Netto Arbete:</Text>
              <Text>{formatNumber(arbeteExclVat)} kr</Text>
            </View>
            <View style={styles.detailRow}>
              <Text>Netto Material:</Text>
              <Text>{formatNumber(materialUtExclVat)} kr</Text>
            </View>
            <View style={[styles.detailRow, { marginTop: 10, borderTopWidth: 1, paddingTop: 10, borderColor: '#EEE' }]}>
              <Text style={{fontWeight:'bold'}}>Totalt Netto:</Text>
              <Text style={{fontWeight:'bold'}}>{formatNumber(totalExclVat)} kr</Text>
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mainCard: { backgroundColor: WorkaholicTheme.colors.primary, borderRadius: 20, padding: 25, alignItems: 'center', marginTop: 20 },
  brandLogo: { width: 140, height: 70, resizeMode: 'contain', marginBottom: 10 },
  groupName: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '800' },
  totalAmount: { color: '#fff', fontSize: 32, fontWeight: '900' },
  tapInfo: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 10 },
  accordionContainer: { marginTop: 20, backgroundColor: '#fff', borderRadius: 15, padding: 15, borderWidth: 1, borderColor: '#EEE' },
  accordionHeader: { flexDirection: 'row', alignItems: 'center' },
  sectionTitleText: { fontSize: 10, fontWeight: '900', color: WorkaholicTheme.colors.primary, marginLeft: 8 },
  accordionContent: { marginTop: 15 },
  textInput: { backgroundColor: '#F9F9F9', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#EEE' },
  logoPickerSmall: { marginTop: 12, padding: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#DDD', borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  logoPickerTextSmall: { color: WorkaholicTheme.colors.primary, fontWeight: '700', fontSize: 12 },
  settingsSection: { marginTop: 15 },
  settingCard: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 8, borderWidth: 1, borderColor: '#EEE' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingTitle: { fontWeight: '700', fontSize: 14 },
  actions: { marginTop: 20, marginBottom: 40 },
  pdfBtn: { backgroundColor: WorkaholicTheme.colors.primary, padding: 18, borderRadius: 15, alignItems: 'center' },
  masterBtn: { backgroundColor: '#4A90E2', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30 },
  modalTitle: { fontSize: 14, fontWeight: '900', marginBottom: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  closeBtn: { backgroundColor: '#333', padding: 15, borderRadius: 15, marginTop: 20, alignItems: 'center' },
  closeBtnText: { color: '#fff', fontWeight: '800' },
  emptyText: { marginTop: 10, color: '#999' }
});