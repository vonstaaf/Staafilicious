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
  Platform,
  Image,
  ActivityIndicator,
  StatusBar
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SignatureScreen from "react-native-signature-canvas";
import * as ScreenOrientation from 'expo-screen-orientation'; 
import { ProjectsContext } from "../context/ProjectsContext";
import { WorkaholicTheme } from "../theme";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import AppHeader from "../components/AppHeader";
import { auth, db } from "../firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";

import { handleInspectionPdf } from "../utils/pdfActions";

const APP_LOGO = require("../assets/logo.png");
const DEFAULT_ITEMS = [];

export default function InspectionScreen({ route, navigation }) {
  const { selectedProject, updateProject } = useContext(ProjectsContext);
  const signatureRef = useRef();
  const isSavingRef = useRef(false);
  const insets = useSafeAreaInsets();

  // States
  const [items, setItems] = useState(DEFAULT_ITEMS);
  const [checks, setChecks] = useState({}); 
  const [rowComments, setRowComments] = useState({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [nameClarification, setNameClarification] = useState("");
  const [images, setImages] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [isSignModalVisible, setIsSignModalVisible] = useState(false);
  const [isNameEntryModalVisible, setIsNameEntryModalVisible] = useState(false);
  const [inspectionSubtitle, setInspectionSubtitle] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingHistoryId, setEditingHistoryId] = useState(null);
  const [companyData, setCompanyData] = useState(null);

  const formatProjectName = (name) => name ? name.charAt(0).toUpperCase() + name.slice(1) : "PROJEKT";

  // Hämta företagsuppgifter live för PDF-generering
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) setCompanyData(docSnap.data());
    });
    return () => unsubscribe();
  }, []);

  // Ladda data från kontext eller router
  useEffect(() => {
    if (route.params?.editMode && route.params?.existingData) {
      const data = route.params.existingData;
      setEditingHistoryId(data.id);
      setItems(data.items || []); 
      setChecks(data.checks || {}); 
      setRowComments(data.rowComments || {});
      setGeneralNotes(data.notes || ""); 
      setNameClarification(data.signedBy || ""); 
      setImages(data.images || []);
    } else if (selectedProject) {
      setItems(selectedProject.inspectionTemplate || DEFAULT_ITEMS);
      setChecks(selectedProject.currentInspections || {});
      setRowComments(selectedProject.currentInspectionRowComments || {});
      setGeneralNotes(selectedProject.currentInspectionNotes || "");
      setNameClarification(selectedProject.nameClarification || "");
      setImages(selectedProject.currentImages || []);
    }
  }, [selectedProject, route.params]);

  // Autosave funktion
  const persistData = async (updatedFields = {}) => {
    if (!selectedProject?.id || isSavingRef.current || editingHistoryId || isProcessing) return;
    isSavingRef.current = true;
    try {
      const user = auth.currentUser;

      // 1. Spara till det specifika projektet (som vanligt)
      await updateProject(selectedProject.id, {
        currentInspections: updatedFields.inspections ?? checks,
        currentInspectionRowComments: updatedFields.inspectionRowComments ?? rowComments,
        currentInspectionNotes: updatedFields.inspectionNotes ?? generalNotes,
        inspectionTemplate: updatedFields.inspectionTemplate ?? items,
        nameClarification: updatedFields.nameClarification ?? nameClarification,
        currentImages: updatedFields.images ?? images,
        ...updatedFields,
      });

      // 2. NYTT: Spara mallen globalt på användaren för framtida projekt
      // Vi sparar bara om det faktiskt finns punkter i mallen
      const templateToSave = updatedFields.inspectionTemplate ?? items;
      if (user && templateToSave && templateToSave.length > 0) {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          defaultInspectionTemplate: templateToSave
        });
        console.log("Global mall uppdaterad!");
      }

    } catch (err) {
      console.log("Autosave error:", err);
    } finally { 
      isSavingRef.current = false; 
    }
  };

  const pickImage = async () => {
    if (images.length >= 4) { Alert.alert("Gräns nådd", "Max 4 bilder."); return; }
    let r = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      quality: 0.2, 
      allowsEditing: true 
    });
    if (!r.canceled) { 
        const n = [...images, r.assets[0].uri]; 
        setImages(n); 
        persistData({ images: n }); 
    }
  };

  // UPPDATERAD: Skickar nu argument i rätt ordning (project, inspection, companyData)
  const onGeneratePdf = async (historyData) => {
    setIsProcessing(true);
    try {
      // historyData innehåller den specifika inspektionen (checks, images, etc.)
      await handleInspectionPdf(selectedProject, historyData, companyData);
    } catch (e) {
      console.error(e);
      Alert.alert("Fel", "PDF:en kunde inte skapas.");
    } finally {
      setIsProcessing(false); 
    }
  };

  const handleSignature = async (sig) => {
    if (items.length === 0) return;
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    setIsSignModalVisible(false);

    setTimeout(async () => {
      setIsProcessing(true);
      try {
        const fullSig = sig.startsWith("data:") ? sig : "data:image/png;base64," + sig;
        const entryData = {
          id: editingHistoryId || Date.now(),
          date: editingHistoryId ? route.params.existingData.date : new Date().toISOString(),
          description: inspectionSubtitle || formatProjectName(selectedProject.name),
          checks, 
          rowComments, 
          notes: generalNotes, 
          images, 
          signature: fullSig,
          signedBy: nameClarification || "Installatör", 
          items
        };
        
        let updatedHistory = editingHistoryId 
          ? (selectedProject.inspectionHistory || []).map(item => item.id === editingHistoryId ? entryData : item)
          : [entryData, ...(selectedProject.inspectionHistory || [])];
        
        await updateProject(selectedProject.id, {
          inspectionHistory: updatedHistory,
          ...(editingHistoryId ? {} : { 
              currentInspections: {}, 
              currentInspectionRowComments: {}, 
              currentInspectionNotes: "", 
              currentImages: [], 
              nameClarification: "" 
          })
        });

        setIsNameEntryModalVisible(false);
        navigation.goBack();
        setTimeout(() => { Alert.alert("Sparat", "Kontrollen har arkiverats."); }, 500);

      } catch (e) { 
        Alert.alert("Fel", "Kunde inte spara."); 
      } finally { 
        setIsProcessing(false); 
      }
    }, 400);
  };

  const setStatus = (id, s) => { 
    const n = checks[id] === s ? null : s; 
    setChecks({...checks, [id]: n}); 
    persistData({ inspections: {...checks, [id]: n} }); 
  };

  const markSectionAsNA = (sec) => { 
    const c = {...checks}; 
    items.filter(i => i.section === sec).forEach(i => c[i.id] = 'na'); 
    setChecks(c); 
    persistData({inspections: c}); 
  };

  const addNewSection = () => { 
    const n = [...items, {id: "s"+Date.now(), label: "Ny punkt", section: "Ny Kategori"}]; 
    setItems(n); 
    persistData({inspectionTemplate: n}); 
  };

  const removeSection = (sec) => { 
    const n = items.filter(i => i.section !== sec); 
    setItems(n); 
    persistData({inspectionTemplate: n}); 
  };

  const addNewItem = (sec) => { 
    const n = [...items, {id: "i"+Date.now(), label: "Ny punkt", section: sec}]; 
    setItems(n); 
    persistData({inspectionTemplate: n}); 
  };

  const removeItem = (id) => { 
    const n = items.filter(i => i.id !== id); 
    setItems(n); 
    persistData({inspectionTemplate: n}); 
  };
  
  const moveItem = (id, dir) => { 
    const index = items.findIndex(it => it.id === id);
    if (index < 0) return;
    const newIndex = dir === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;
    const updated = [...items];
    const [movedItem] = updated.splice(index, 1);
    updated.splice(newIndex, 0, movedItem);
    setItems(updated);
    persistData({ inspectionTemplate: updated });
  };

  const openSignature = async () => { 
    setIsNameEntryModalVisible(false); 
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT); 
    setIsSignModalVisible(true); 
  };
  
  const closeSignature = async () => { 
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP); 
    setIsSignModalVisible(false); 
  };

  if (!selectedProject) return <View style={styles.centered}><Text>Välj projekt</Text></View>;
  const sections = Array.from(new Set(items.map(i => i.section)));

  return (
    <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        
        <AppHeader 
            title={editingHistoryId ? "Ändra arkiv" : "Egenkontroll"} 
            subTitle={selectedProject.name}
            navigation={navigation}
            rightIcon="archive-outline"
            onRightPress={() => navigation.navigate("InspectionHistory")}
        />

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 50 }}>
            
            <View style={styles.topInfo}>
                <TouchableOpacity onPress={() => setEditMode(!editMode)} style={[styles.adminToggleBtn, editMode && styles.adminToggleActive]}>
                    <Ionicons name={editMode ? "checkmark" : "hammer-outline"} size={18} color={editMode ? "#FFF" : WorkaholicTheme.colors.primary} />
                    <Text style={[styles.adminToggleText, editMode && {color: "#FFF"}]}>{editMode ? "KLAR" : "REDIGERA MALL"}</Text>
                </TouchableOpacity>
            </View>

            {editMode && (
              <View style={styles.adminBanner}>
                <TouchableOpacity style={styles.addSectionBtn} onPress={addNewSection}>
                  <Ionicons name="add-circle" size={20} color="#FFF" />
                  <Text style={styles.addSectionText}>NY KATEGORI</Text>
                </TouchableOpacity>
              </View>
            )}

            {sections.map((secName, index) => (
              <View key={`section-${index}`} style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  {editMode ? (
                    <View style={{flexDirection: 'row', flex: 1, alignItems: 'center'}}>
                      <TextInput 
                        style={styles.sectionEditInput} 
                        value={secName} 
                        onChangeText={(txt) => setItems(items.map(it => it.section === secName ? { ...it, section: txt } : it))} 
                        onBlur={() => persistData({ inspectionTemplate: items })} 
                      />
                      <TouchableOpacity onPress={() => removeSection(secName)} style={styles.removeSectionBtn}>
                        <Ionicons name="trash" size={20} color="#FF5252" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.sectionHeader}>{secName.toUpperCase()}</Text>
                      <TouchableOpacity onPress={() => markSectionAsNA(secName)} style={styles.naAllBtn}>
                        <Text style={styles.naAllText}>Ej aktuell </Text>
                        <Ionicons name="close-circle" size={14} color="#FF5252" />
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                {items.filter(it => it.section === secName).map((item) => (
                  <View key={item.id} style={[styles.card, editMode && styles.cardEdit]}>
                    <View style={styles.checkRow}>
                      <View style={{ flex: 1 }}>
                        {editMode ? (
                          <TextInput 
                            style={styles.editInput} 
                            value={item.label} 
                            onChangeText={(txt) => setItems(items.map(it => it.id === item.id ? { ...it, label: txt } : it))} 
                            onBlur={() => persistData({ inspectionTemplate: items })} 
                          />
                        ) : <Text style={styles.checkText}>{item.label}</Text>}
                      </View>
                      {!editMode && (
                        <View style={styles.choiceContainer}>
                          <TouchableOpacity onPress={() => setStatus(item.id, 'na')} style={[styles.choiceBtn, checks[item.id] === 'na' && styles.choiceNA]}>
                            <Ionicons name="close" size={20} color={checks[item.id] === 'na' ? "#fff" : "#999"} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => setStatus(item.id, 'checked')} style={[styles.choiceBtn, checks[item.id] === 'checked' && styles.choiceOK]}>
                            <Ionicons name="checkmark" size={20} color={checks[item.id] === 'checked' ? "#fff" : "#999"} />
                          </TouchableOpacity>
                        </View>
                      )}
                      {editMode && (
                        <View style={{flexDirection: 'row'}}>
                            <TouchableOpacity onPress={() => moveItem(item.id, 'up')} style={{padding: 5}}><Ionicons name="chevron-up" size={22} color="#FFB300" /></TouchableOpacity>
                            <TouchableOpacity onPress={() => removeItem(item.id)} style={{padding: 5}}><Ionicons name="trash-outline" size={22} color="#FF5252" /></TouchableOpacity>
                        </View>
                      )}
                    </View>
                    {!editMode && (
                      <View style={styles.commentInputWrapper}>
                        <TextInput 
                          style={styles.rowCommentInput} 
                          placeholder="Notering..." 
                          value={rowComments[item.id] || ""} 
                          onChangeText={t => setRowComments({ ...rowComments, [item.id]: t })} 
                          onBlur={() => persistData({ inspectionRowComments: rowComments })} 
                        />
                      </View>
                    )}
                  </View>
                ))}
                {editMode && (
                  <TouchableOpacity style={styles.addItemBtn} onPress={() => addNewItem(secName)}>
                    <Ionicons name="add" size={18} color="#FFB300" />
                    <Text style={styles.addItemText}>Lägg till punkt</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <View style={styles.notesContainer}>
              <Text style={styles.notesTitle}>BILDER & ANTECKNINGAR</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                {images.map((uri, idx) => (
                  <TouchableOpacity key={idx} onPress={() => { const n = images.filter((_, i) => i !== idx); setImages(n); persistData({ images: n }); }}>
                    <Image source={{ uri }} style={styles.docImage} />
                    <View style={styles.removeBadge}><Ionicons name="close" size={12} color="#fff" /></View>
                  </TouchableOpacity>
                ))}
                {images.length < 4 && (
                  <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
                    <Ionicons name="camera" size={30} color="#777" />
                    <Text style={{fontSize: 9, fontWeight: 'bold', color: '#777'}}>{images.length}/4</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
              <TextInput style={styles.noteInput} multiline placeholder="Allmänna anteckningar..." value={generalNotes} onChangeText={setGeneralNotes} onBlur={() => persistData({ inspectionNotes: generalNotes })} />
              <TextInput style={[styles.smallInput, {marginTop: 10}]} value={nameClarification} onChangeText={setNameClarification} onBlur={() => persistData({ nameClarification })} placeholder="Namnförtydligande" />
              
              <View style={styles.actionArea}> 
                <TouchableOpacity style={[styles.primaryBtn, editingHistoryId && {backgroundColor: '#FFB300'}]} onPress={() => setIsNameEntryModalVisible(true)} disabled={isProcessing}>
                  {isProcessing ? <ActivityIndicator color="#fff" /> : <><Ionicons name="pencil-sharp" size={20} color="#fff" /><Text style={styles.btnText}>{editingHistoryId ? " UPPDATERA ARKIV" : " SIGNERA & ARKIVERA"}</Text></>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <Modal visible={isNameEntryModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.namingCard}>
              <Text style={styles.namingTitle}>Kontrollens namn</Text>
              <TextInput style={styles.namingInput} value={inspectionSubtitle} onChangeText={setInspectionSubtitle} placeholder="T.ex. Slutkontroll" autoFocus />
              <View style={styles.namingActions}>
                <TouchableOpacity style={styles.namingCancel} onPress={() => setIsNameEntryModalVisible(false)}><Text style={styles.namingCancelText}>Avbryt</Text></TouchableOpacity>
                <TouchableOpacity style={styles.namingConfirm} onPress={openSignature}><Text style={styles.namingConfirmText}>Gå till signering</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={isSignModalVisible} animationType="slide">
          <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Signera kontroll</Text>
              <TouchableOpacity onPress={closeSignature}><Ionicons name="close-circle" size={32} color="#333" /></TouchableOpacity>
            </View>
            <SignatureScreen ref={signatureRef} onOK={handleSignature} descriptionText="Signera här" autoClear={false} imageType="image/png" />
            <View style={{ padding: 20, paddingBottom: 40 }}>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#4CAF50' }]} onPress={() => signatureRef.current.readSignature()}>
                <Text style={styles.btnText}>SPARA KONTROLL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7F9" },
  topInfo: { padding: 15, flexDirection: 'row', justifyContent: 'flex-end' },
  adminToggleBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#DDD', elevation: 1 },
  adminToggleActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  adminToggleText: { fontSize: 10, fontWeight: '800', marginLeft: 5, color: WorkaholicTheme.colors.primary },
  adminBanner: { backgroundColor: '#FFFDF0', padding: 15, borderBottomWidth: 1, borderBottomColor: '#FFB300' },
  sectionContainer: { marginBottom: 10 },
  sectionHeaderRow: { paddingHorizontal: 15, paddingTop: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionHeader: { fontSize: 11, fontWeight: "800", color: "#999" },
  sectionEditInput: { flex: 1, backgroundColor: "#fff", padding: 10, borderRadius: 8, borderWidth: 2, borderColor: "#FFB300", fontWeight: 'bold' },
  removeSectionBtn: { marginLeft: 10, padding: 8, backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#FF5252' },
  naAllBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#EEE' },
  naAllText: { fontSize: 10, color: '#FF5252', fontWeight: 'bold' },
  card: { backgroundColor: "#FFF", marginHorizontal: 15, borderRadius: 12, padding: 15, marginTop: 8, borderWidth: 1, borderColor: "#DDD" },
  cardEdit: { borderColor: "#FFB300", backgroundColor: "#FFFDF0" },
  checkRow: { flexDirection: "row", alignItems: "center" },
  checkText: { fontSize: 14, fontWeight: "700", color: '#1C1C1E' },
  choiceContainer: { flexDirection: 'row', backgroundColor: '#F0F0F0', borderRadius: 10, padding: 3 },
  choiceBtn: { width: 40, height: 35, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  choiceOK: { backgroundColor: '#4CAF50' },
  choiceNA: { backgroundColor: '#FF5252' },
  editInput: { borderBottomWidth: 1, borderColor: "#FFB300", padding: 5, fontSize: 14 },
  commentInputWrapper: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  rowCommentInput: { flex: 1, backgroundColor: "#F9F9F9", padding: 10, borderRadius: 8, fontSize: 13, borderStyle: 'dashed', borderWidth: 1, borderColor: '#CCC' },
  addSectionBtn: { backgroundColor: "#FFB300", padding: 12, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  addSectionText: { color: "#FFF", fontWeight: "800", marginLeft: 8 },
  addItemBtn: { marginHorizontal: 15, padding: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  addItemText: { color: "#FFB300", fontWeight: "700", marginLeft: 5, fontSize: 12 },
  notesContainer: { padding: 15 },
  notesTitle: { fontSize: 11, fontWeight: "800", color: "#666", marginBottom: 8 },
  noteInput: { backgroundColor: "#FFF", borderRadius: 12, padding: 15, height: 80, textAlignVertical: "top", borderWidth: 1, borderColor: '#DDD' },
  smallInput: { backgroundColor: "#FFF", padding: 15, borderRadius: 12, borderWidth: 1, borderColor: "#DDD" },
  docImage: { width: 90, height: 90, borderRadius: 10, marginRight: 10 },
  addImageBtn: { width: 90, height: 90, borderRadius: 10, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#BBB' },
  removeBadge: { position: 'absolute', top: -5, right: 5, backgroundColor: '#FF5252', borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  actionArea: { paddingVertical: 20 },
  primaryBtn: { backgroundColor: WorkaholicTheme.colors.primary, padding: 18, borderRadius: 15, alignItems: "center", flexDirection: "row", justifyContent: "center", elevation: 2 },
  btnText: { color: "#fff", fontWeight: "800", marginLeft: 8 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", padding: 20, alignItems: "center", borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalTitle: { fontSize: 18, fontWeight: "900", color: '#1C1C1E' },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  namingCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 25 },
  namingTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  namingInput: { backgroundColor: '#F5F5F5', padding: 15, borderRadius: 10, marginBottom: 20, fontSize: 16, borderWidth: 1, borderColor: '#DDD' },
  namingActions: { flexDirection: 'row', justifyContent: 'space-between' },
  namingCancel: { flex: 1, padding: 15, alignItems: 'center' },
  namingConfirm: { flex: 2, backgroundColor: '#FFB300', padding: 15, borderRadius: 10, alignItems: 'center' },
  namingCancelText: { color: '#666', fontWeight: 'bold' },
  namingConfirmText: { color: '#FFF', fontWeight: 'bold' }
});