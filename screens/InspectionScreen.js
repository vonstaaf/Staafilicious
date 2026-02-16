import React, { useContext, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import SignatureScreen from "react-native-signature-canvas";
import { ProjectsContext } from "../context/ProjectsContext";
import { WorkaholicTheme } from "../theme";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";

const DEFAULT_ITEMS = [
  { id: "k1", label: "Kontroll förläggning", section: "Allmänt" },
  { id: "k2", label: "Fastsättn. apparater o dyl.", section: "Allmänt" },
  { id: "k3", label: "Håltagningar, tätning", section: "Allmänt" },
  { id: "k4", label: "Funktionskontroll", section: "Allmänt" },
  { id: "k5", label: "Böjradie", section: "Allmänt" },
  { id: "k6", label: "Kontrollera anslutningar", section: "Allmänt" },
  { id: "k7", label: "Märkning", section: "Allmänt" },
  { id: "k8", label: "Isolationsprovning", section: "Allmänt" },
  { id: "k9", label: "Kontinuitetsprovning", section: "Allmänt" },
  { id: "g1", label: "Längd / area", section: "Golvvärme" },
  { id: "g2", label: "Fotodokumentation", section: "Golvvärme" },
  { id: "g3", label: "R före förläggning", section: "Golvvärme" },
  { id: "g4", label: "Riso före förläggning", section: "Golvvärme" },
  { id: "g5", label: "R efter förläggning", section: "Golvvärme" },
  { id: "g6", label: "Riso efter förläggning", section: "Golvvärme" },
  { id: "g7", label: "R före inkoppling", section: "Golvvärme" },
  { id: "g8", label: "Riso före inkoppling", section: "Golvvärme" },
];

export default function InspectionScreen() {
  const { selectedProject, updateProject, updateProjectData, currentUser } = useContext(ProjectsContext);
  const signatureRef = useRef();
  const isSavingRef = useRef(false);

  const [items, setItems] = useState(DEFAULT_ITEMS);
  const [checks, setChecks] = useState({});
  const [rowComments, setRowComments] = useState({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [nameClarification, setNameClarification] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [headerClickCount, setHeaderClickCount] = useState(0);
  const [isSignModalVisible, setIsSignModalVisible] = useState(false);
  const [userLogo, setUserLogo] = useState(null);

  useEffect(() => {
    if (selectedProject) {
      setItems(selectedProject.inspectionTemplate || DEFAULT_ITEMS);
      setChecks(selectedProject.inspections || {});
      setRowComments(selectedProject.inspectionRowComments || {});
      setGeneralNotes(selectedProject.inspectionNotes || "");
      setNameClarification(selectedProject.nameClarification || "");
      AsyncStorage.getItem("user_logo").then(logo => logo && setUserLogo(logo));
    }
  }, [selectedProject]);

  const capitalize = (text) => {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const persistData = async (updatedFields = {}) => {
    if (!selectedProject?.id || isSavingRef.current) return;
    isSavingRef.current = true;
    const payload = {
      ...selectedProject,
      name: capitalize(selectedProject.name),
      inspections: updatedFields.inspections ?? checks,
      inspectionRowComments: updatedFields.inspectionRowComments ?? rowComments,
      inspectionNotes: updatedFields.inspectionNotes ?? generalNotes,
      inspectionTemplate: updatedFields.inspectionTemplate ?? items,
      nameClarification: updatedFields.nameClarification ?? nameClarification,
      ...updatedFields,
    };
    try {
      const updateFn = updateProject || updateProjectData;
      await updateFn(selectedProject.id, payload);
    } catch (err) {
      await AsyncStorage.setItem(`project_fallback_${selectedProject.id}`, JSON.stringify(payload));
    } finally {
      isSavingRef.current = false;
    }
  };

  const updateSectionName = (oldName, newName) => {
    const updatedItems = items.map(it => it.section === oldName ? { ...it, section: newName } : it);
    setItems(updatedItems);
  };

  const addItemToSection = (sectionName) => {
    const newItem = {
      id: "custom_" + Date.now(),
      label: "Ny kontrollpunkt",
      section: sectionName
    };
    const updated = [...items, newItem];
    setItems(updated);
    persistData({ inspectionTemplate: updated });
  };

  const removeItem = (id) => {
    const updated = items.filter(it => it.id !== id);
    setItems(updated);
    persistData({ inspectionTemplate: updated });
  };

  const getAppLogoBase64 = async () => {
    try {
      const moduleRef = require("../assets/logo.png");
      const asset = Asset.fromModule(moduleRef);
      await asset.downloadAsync();
      const cachePath = `${FileSystem.cacheDirectory}app_logo_temp.png`;
      await FileSystem.copyAsync({ from: asset.localUri || asset.uri, to: cachePath });
      const base64 = await FileSystem.readAsStringAsync(cachePath, { encoding: FileSystem.EncodingType.Base64 });
      return `data:image/png;base64,${base64}`;
    } catch (err) { return null; }
  };

  const handleSignature = async (sig) => {
    const fullSig = sig.startsWith("data:") ? sig : "data:image/png;base64," + sig;
    await persistData({ signature: fullSig, signedBy: currentUser?.displayName || "Installatör", nameClarification });
    setIsSignModalVisible(false);
  };

  const generateInspectionPDF = async () => {
    try {
      const appLogo = await getAppLogoBase64();
      const [cName, cAddr, cZip, cPhone, cWeb, cOrg, storedLogo] = await Promise.all([
        AsyncStorage.getItem("user_company_name"),
        AsyncStorage.getItem("user_address"),
        AsyncStorage.getItem("user_zip"),
        AsyncStorage.getItem("user_phone"),
        AsyncStorage.getItem("user_web"),
        AsyncStorage.getItem("user_company_orgnr"),
        AsyncStorage.getItem("user_logo"),
      ]);

      let normalizedUserLogo = storedLogo || userLogo;
      if (normalizedUserLogo && (normalizedUserLogo.startsWith("file") || normalizedUserLogo.startsWith("/"))) {
        const base64 = await FileSystem.readAsStringAsync(normalizedUserLogo, { encoding: "base64" });
        normalizedUserLogo = "data:image/png;base64," + base64;
      }

      const companyData = {
        name: cName || "Företagsnamn saknas",
        address: `${cAddr || ""} ${cZip || ""}`.trim() || "Adress saknas",
        phone: cPhone || "", website: cWeb || "", orgNr: cOrg || "",
        logo: normalizedUserLogo || null
      };

      const html = getHtmlTemplate({
        projectName: capitalize(selectedProject.name),
        items, checks, rowComments, generalNotes, appLogo: appLogo || "", 
        companyData, signedBy: selectedProject.signedBy,
        signature: selectedProject.signature, nameClarification
      });

      const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
      await Sharing.shareAsync(uri);
    } catch (e) { Alert.alert("Fel", "Kunde inte skapa PDF."); }
  };

  if (!selectedProject) return <View style={styles.centered}><Text>Välj ett projekt först</Text></View>;

  // Gruppera items för rendering
  const sections = Array.from(new Set(items.map(i => i.section)));

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => {
              const n = headerClickCount + 1;
              if (n >= 5) { setEditMode(!editMode); setHeaderClickCount(0); }
              else { setHeaderClickCount(n); setTimeout(() => setHeaderClickCount(0), 2000); }
          }} style={styles.header}>
            <Text style={styles.title}>EGENKONTROLL {editMode ? "🛠 ADMIN" : ""}</Text>
            <Text style={styles.projectSub}>{selectedProject.name.toUpperCase()}</Text>
          </TouchableOpacity>

          {!editMode ? (
            <View style={styles.tipBox}>
              <Ionicons name="bulb-outline" size={18} color="#4A90E2" />
              <Text style={styles.tipText}>Tips: Tryck 5 gånger på rubriken för adminläge.</Text>
            </View>
          ) : (
            <View style={styles.adminInfoBox}>
              <Ionicons name="construct" size={18} color="#856404" />
              <Text style={styles.adminInfoText}>ADMIN: Lägg till/ta bort eller ändra texter.</Text>
            </View>
          )}

          {sections.map(secName => (
            <View key={secName}>
              <View style={styles.sectionHeaderRow}>
                {editMode ? (
                  <TextInput
                    style={styles.sectionEditInput}
                    value={secName}
                    onChangeText={(t) => updateSectionName(secName, t)}
                    onBlur={() => persistData({ inspectionTemplate: items })}
                  />
                ) : (
                  <Text style={styles.sectionHeader}>{secName.toUpperCase()}</Text>
                )}
              </View>

              {items.filter(it => it.section === secName).map((item) => (
                <View key={item.id} style={[styles.card, editMode && styles.cardEdit]}>
                  <View style={styles.checkRow}>
                    {editMode && (
                      <TouchableOpacity onPress={() => removeItem(item.id)} style={{ marginRight: 10 }}>
                        <Ionicons name="trash-outline" size={20} color="#FF5252" />
                      </TouchableOpacity>
                    )}
                    <View style={{ flex: 1 }}>
                      {editMode ? (
                        <TextInput
                          style={styles.editInput}
                          value={item.label}
                          onChangeText={t => setItems(items.map(x => x.id === item.id ? {...x, label: t} : x))}
                          onBlur={() => persistData({ inspectionTemplate: items })}
                        />
                      ) : (
                        <Text style={styles.checkText}>{item.label}</Text>
                      )}
                    </View>
                    {!editMode && (
                      <TouchableOpacity onPress={() => {
                          const nc = { ...checks, [item.id]: !checks[item.id] };
                          setChecks(nc);
                          persistData({ inspections: nc });
                        }} style={[styles.checkbox, checks[item.id] && styles.checkboxActive]}>
                        <Ionicons name={checks[item.id] ? "checkmark" : "ellipse-outline"} size={22} color={checks[item.id] ? "#fff" : "#ccc"} />
                      </TouchableOpacity>
                    )}
                  </View>
                  {!editMode && (
                    <TextInput
                      style={styles.rowCommentInput}
                      placeholder="Mätvärde / Notering..."
                      value={rowComments[item.id] || ""}
                      onChangeText={t => setRowComments({ ...rowComments, [item.id]: t })}
                      onBlur={() => persistData({ inspectionRowComments: rowComments })}
                    />
                  )}
                </View>
              ))}
              
              {editMode && (
                <TouchableOpacity style={styles.addItemBtn} onPress={() => addItemToSection(secName)}>
                  <Ionicons name="add-circle-outline" size={20} color="#FFB300" />
                  <Text style={styles.addItemText}>Lägg till punkt i {secName}</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          <View style={styles.notesContainer}>
            <Text style={styles.notesTitle}>ÖVRIGA ANTECKNINGAR</Text>
            <TextInput 
              style={styles.noteInput} 
              multiline 
              placeholder="Skriv dina anteckningar här..."
              value={generalNotes} 
              onChangeText={setGeneralNotes} 
              onBlur={() => persistData({ inspectionNotes: generalNotes })} 
            />
          </View>

          <View style={styles.notesContainer}>
            <Text style={styles.notesTitle}>NAMNFÖRTYDLIGANDE</Text>
            <TextInput 
              style={styles.smallInput} 
              value={nameClarification} 
              onChangeText={setNameClarification} 
              onBlur={() => persistData({ nameClarification })} 
            />
          </View>

          <View style={styles.actionArea}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setIsSignModalVisible(true)}>
              <Ionicons name="create-outline" size={20} color="#fff" />
              <Text style={styles.btnText}> {selectedProject.signature ? "SIGNERA IGEN" : "SIGNERA"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={generateInspectionPDF}>
              <Ionicons name="share-outline" size={20} color="#fff" />
              <Text style={styles.btnText}> DELA PDF</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 50 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={isSignModalVisible} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Signera protokoll</Text>
            <TouchableOpacity onPress={() => setIsSignModalVisible(false)}>
              <Ionicons name="close-circle" size={32} color="#333" />
            </TouchableOpacity>
          </View>
          <SignatureScreen 
            ref={signatureRef} 
            onOK={handleSignature} 
            descriptionText="Signera här" 
            confirmText="Spara" 
            clearText="Rensa" 
            autoClear={false} 
          />
        </View>
      </Modal>
    </View>
  );
}

const getHtmlTemplate = (d) => {
    const sections = Array.from(new Set(d.items.map(i => i.section)));
    const rows = (sec) => d.items.filter(i => i.section === sec).map(i => `
        <tr>
          <td>${i.label}</td>
          <td style="text-align:center;">${d.checks[i.id] ? "✔" : "—"}</td>
          <td>${(d.rowComments[i.id] || "")}</td>
        </tr>
    `).join("");

    const c = d.companyData || {};
    return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 8mm; }
          body { font-family: 'Helvetica', sans-serif; color: #333; line-height: 1.1; margin: 0; padding: 0; font-size: 9px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 10px; align-items: center; }
          .logo-app { height: 50px; width: auto; }
          .logo-user { height: 50px; max-width: 180px; object-fit: contain; }
          .info-box { background: #f9f9f9; border: 1px solid #ddd; padding: 8px; margin-bottom: 10px; border-radius: 5px; }
          .info-box h1 { margin: 0; font-size: 14px; text-transform: uppercase; }
          h2 { font-size: 10px; background: #eee; padding: 4px; margin: 8px 0 4px 0; border-left: 3px solid #333; font-weight: bold; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
          th, td { border: 1px solid #ccc; padding: 4px; text-align: left; }
          th { background: #f8f8f8; font-weight: bold; font-size: 8px; text-transform: uppercase; }
          .notes-section { margin-top: 10px; padding: 8px; border: 1px solid #eee; background: #fff; min-height: 40px; }
          .sig-area { margin-top: 15px; }
          .sig-img { height: 55px; border-bottom: 1px solid #000; width: 220px; object-fit: contain; display: block; }
          .name-val { font-weight: bold; font-size: 11px; margin-top: 3px; }
          .footer { position: fixed; bottom: 0; width: 100%; border-top: 1px solid #eee; padding-top: 3px; display: flex; justify-content: space-between; font-size: 8px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>${d.appLogo ? `<img src="${d.appLogo}" class="logo-app" />` : `<div style="height:50px;"></div>`}</div>
          <div style="text-align: right;">
            ${c.logo ? `<img src="${c.logo}" class="logo-user" />` : `<strong>${c.name}</strong>`}
          </div>
        </div>
        <div class="info-box">
          <h1>PROTOKOLL: ${d.projectName}</h1>
          <p style="margin: 2px 0;"><strong>Datum:</strong> ${new Date().toLocaleDateString('sv-SE')} | <strong>Utförd av:</strong> ${d.signedBy || 'Ej signerat'}</p>
        </div>
        ${sections.map(sec => `
          <h2>${sec}</h2>
          <table>
            <tr><th style="width:50%">Beskrivning</th><th style="width:10%; text-align:center">OK</th><th style="width:40%">Notering</th></tr>
            ${rows(sec)}
          </table>
        `).join("")}
        <div class="notes-section">
          <strong>ÖVRIGA ANTECKNINGAR:</strong><br/>
          ${(d.generalNotes || "Inga kommentarer.").replace(/\n/g, "<br/>")}
        </div>
        <div class="sig-area">
          <div style="font-size: 8px; color: #666;">Signatur:</div>
          ${d.signature ? `<img src="${d.signature}" class="sig-img" />` : `<div style="height:55px; width:220px; border-bottom:1px solid #000;"></div>`}
          <div class="name-val">${d.nameClarification || ""}</div>
        </div>
        <div class="footer">
          <span>${c.name}</span>
          <span>${c.phone}</span>
          <span>${c.orgNr ? `Org.nr: ${c.orgNr}` : ""}</span>
        </div>
      </body>
    </html>`;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7F9" },
  header: { padding: 25, backgroundColor: "#fff", borderBottomWidth: 1, borderColor: "#EEE" },
  title: { fontSize: 18, fontWeight: "900", color: WorkaholicTheme.colors.primary },
  projectSub: { fontSize: 12, color: "#666", fontWeight: "700" },
  tipBox: { backgroundColor: "#e7f3ff", margin: 15, padding: 12, borderRadius: 10, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#b3d7ff" },
  tipText: { color: "#2c5282", fontSize: 12, marginLeft: 10, flex: 1, fontWeight: "500" },
  adminInfoBox: { backgroundColor: "#fff3cd", margin: 15, padding: 12, borderRadius: 10, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#ffeeba" },
  adminInfoText: { color: "#856404", fontSize: 12, fontWeight: "700", marginLeft: 10, flex: 1 },
  sectionHeaderRow: { paddingHorizontal: 15, paddingTop: 20, marginBottom: 5 },
  sectionHeader: { fontSize: 11, fontWeight: "800", color: "#999" },
  sectionEditInput: { backgroundColor: "#fff", padding: 8, borderRadius: 8, borderWidth: 1, borderColor: "#FFB300", fontSize: 13, fontWeight: "800", color: "#FFB300" },
  card: { backgroundColor: "#FFF", marginHorizontal: 15, borderRadius: 12, padding: 15, marginBottom: 8, borderWidth: 1, borderColor: "#EEE" },
  cardEdit: { borderColor: "#FFB300", backgroundColor: "#FFFDF0" },
  checkRow: { flexDirection: "row", alignItems: "center" },
  checkText: { fontSize: 14, fontWeight: "700" },
  checkbox: { width: 35, height: 35, borderRadius: 10, backgroundColor: "#F0F0F0", justifyContent: "center", alignItems: "center" },
  checkboxActive: { backgroundColor: "#4CAF50" },
  editInput: { backgroundColor: "#fff", padding: 8, borderRadius: 6, borderWidth: 1, borderColor: "#FFB300" },
  rowCommentInput: { marginTop: 10, backgroundColor: "#F9F9F9", padding: 10, borderRadius: 8, fontSize: 13, borderWidth: 1, borderColor: '#eee' },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 20, marginTop: -5 },
  addItemText: { color: '#FFB300', fontWeight: 'bold', marginLeft: 5, fontSize: 12 },
  notesContainer: { marginHorizontal: 15, marginTop: 20, marginBottom: 5 },
  notesTitle: { fontSize: 11, fontWeight: "800", color: "#999", marginBottom: 8 },
  noteInput: { backgroundColor: "#FFF", borderRadius: 12, padding: 15, height: 120, textAlignVertical: "top", borderWidth: 1, borderColor: '#eee', fontSize: 14 },
  smallInput: { backgroundColor: "#FFF", padding: 15, borderRadius: 12, borderWidth: 1, borderColor: "#EEE" },
  actionArea: { padding: 20, marginTop: 10 },
  primaryBtn: { backgroundColor: WorkaholicTheme.colors.primary, padding: 16, borderRadius: 15, alignItems: "center", flexDirection: "row", justifyContent: "center", marginBottom: 10 },
  secondaryBtn: { backgroundColor: "#4A90E2", padding: 16, borderRadius: 15, alignItems: "center", flexDirection: "row", justifyContent: "center" },
  btnText: { color: "#fff", fontWeight: "800" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", padding: 25, paddingTop: 50, alignItems: "center", borderBottomWidth: 1, borderColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: "900" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" }
});