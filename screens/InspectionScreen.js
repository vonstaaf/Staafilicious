import React, { useContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
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

const capitalizeFirst = (text) => {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// Hjälpfunktion för att visa rätt symbol baserat på enhetsnamn
const getUnitSymbol = (unit) => {
  switch (unit) {
    case 'MegaOhm': return 'MΩ';
    case 'Ohm': return 'Ω';
    case 'Meter': return 'm';
    case 'mA': return 'mA';
    case 'kA': return 'kA';
    default: return unit;
  }
};

// 🔑 MEMOISERAD STORY ITEM: Förhindrar tangentbords-lag och fokus-buggar
const InspectionStoryItem = React.memo(({ 
  item, checks, setStatus, rowComments, setRowComments, images, takePhoto, persistData 
}) => {
  
  // Funktion för att hantera textändring utan att tappa fokus
  const handleCommentChange = (t) => {
    setRowComments(prev => ({ ...prev, [item.id]: t }));
  };

  const unitSymbol = getUnitSymbol(item.unit);

  return (
    <ScrollView contentContainerStyle={styles.storyContent} keyboardShouldPersistTaps="handled">
      <View style={styles.storyCard}>
        <Text style={styles.storySection}>{item.section}</Text>
        <Text style={styles.storyLabel}>{item.label}</Text>
        
        {item.desc ? (
          <View style={styles.descBox}>
            <Ionicons name="information-circle-outline" size={18} color={WorkaholicTheme.colors.primary} />
            <Text style={styles.storyDesc}>{item.desc}</Text>
          </View>
        ) : null}

        <View style={styles.storyActions}>
          <TouchableOpacity 
            style={[styles.storyBtn, checks[item.id] === 'checked' && styles.storyBtnOk]} 
            onPress={() => setStatus(item.id, 'checked')}
          >
             <Ionicons name="checkmark-circle" size={30} color={checks[item.id] === 'checked' ? "#FFF" : "#DDD"} />
             <Text style={[styles.storyBtnText, checks[item.id] === 'checked' && {color:"#FFF"}]}>OK</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.storyBtn, checks[item.id] === 'na' && styles.storyBtnNa]} 
            onPress={() => setStatus(item.id, 'na')}
          >
             <Ionicons name="remove-circle" size={30} color={checks[item.id] === 'na' ? "#FFF" : "#DDD"} />
             <Text style={[styles.storyBtnText, checks[item.id] === 'na' && {color:"#FFF"}]}>N/A</Text>
          </TouchableOpacity>

           <TouchableOpacity 
            style={[styles.storyBtn, checks[item.id] === 'fail' && styles.storyBtnFail]} 
            onPress={() => setStatus(item.id, 'fail')}
          >
             <Ionicons name="alert-circle" size={30} color={checks[item.id] === 'fail' ? "#FFF" : "#DDD"} />
             <Text style={[styles.storyBtnText, checks[item.id] === 'fail' && {color:"#FFF"}]}>FEL</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputWrapper}>
          <TextInput 
            style={styles.storyComment} 
            placeholder={item.unit ? `Ange värde i ${unitSymbol}...` : "Mätvärden eller noteringar..."} 
            multiline
            value={rowComments[item.id] || ""}
            onChangeText={handleCommentChange}
            onBlur={() => persistData({ inspectionRowComments: rowComments })}
            placeholderTextColor="#BBB"
          />
          {item.unit ? (
            <View style={styles.unitBadge}>
              <Text style={styles.unitBadgeText}>{unitSymbol}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.miniGallery}>
        {images.map((uri, idx) => (
          <TouchableOpacity key={idx} onPress={() => { 
            const n = images.filter((_, i) => i !== idx); 
            persistData({ images: n }); 
          }}>
            <Image source={{ uri }} style={styles.miniThumb} />
            <View style={styles.miniRemove}><Ionicons name="close" size={10} color="#fff" /></View>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.miniAdd} onPress={takePhoto}>
            <Ionicons name="camera" size={24} color="#CCC" />
            <Text style={{fontSize: 9, color: '#AAA', fontWeight: '900', marginTop: 2}}>FOTO</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
});

export default function InspectionScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const signatureRef = useRef();
  const isSavingRef = useRef(false);
  const { projects, selectedProject, updateProject } = useContext(ProjectsContext);

  // 🔑 1. Hitta projektet LIVE för att UI ska uppdateras direkt vid ändringar
  const projectId = route.params?.project?.id || selectedProject?.id;
  const project = useMemo(() => {
    return projects.find(p => p.id === projectId) || selectedProject;
  }, [projects, projectId, selectedProject]);

  // States
  const [items, setItems] = useState([]);
  const [checks, setChecks] = useState({}); 
  const [rowComments, setRowComments] = useState({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [nameClarification, setNameClarification] = useState("");
  const [images, setImages] = useState([]);
  
  const [editMode, setEditMode] = useState(false); 
  const [currentIndex, setCurrentIndex] = useState(0); 
  const [isSignModalVisible, setIsSignModalVisible] = useState(false);
  const [isNameEntryModalVisible, setIsNameEntryModalVisible] = useState(false);
  const [inspectionSubtitle, setInspectionSubtitle] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingHistoryId, setEditingHistoryId] = useState(null);
  const [companyData, setCompanyData] = useState(null);

  // Lyssna på företagsuppgifter
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) setCompanyData(docSnap.data());
    });
    return () => unsubscribe();
  }, []);

  // 🔑 2. Synka lokal state med Live-projektet (om vi inte redigerar ett arkiv)
  useEffect(() => {
    if (route.params?.customTemplate) {
        setItems(route.params.customTemplate);
        setInspectionSubtitle(route.params.customTitle || ""); 
    } 
    else if (route.params?.editMode && route.params?.existingData) {
      const data = route.params.existingData;
      setEditingHistoryId(data.id);
      setItems(data.items || []); 
      setChecks(data.checks || {}); 
      setRowComments(data.rowComments || {});
      setGeneralNotes(data.notes || ""); 
      setNameClarification(data.signedBy || ""); 
      setImages(data.images || []);
      setInspectionSubtitle(data.description || "");
    } 
    else if (project) {
      setItems(project.inspectionItems || []);
      setChecks(project.currentInspections || {});
      setRowComments(project.currentInspectionRowComments || {});
      setGeneralNotes(project.currentInspectionNotes || "");
      setNameClarification(project.nameClarification || "");
      setImages(project.currentImages || []);
    }
  }, [project, route.params]);

  const persistData = useCallback(async (updatedFields = {}) => {
    if (route.params?.customTemplate || !project?.id || isSavingRef.current || editingHistoryId || isProcessing) return;
    
    isSavingRef.current = true;
    try {
      await updateProject(project.id, {
        currentInspections: updatedFields.inspections ?? checks,
        currentInspectionRowComments: updatedFields.inspectionRowComments ?? rowComments,
        currentInspectionNotes: updatedFields.inspectionNotes ?? generalNotes,
        inspectionItems: updatedFields.inspectionItems ?? items,
        nameClarification: updatedFields.nameClarification ?? nameClarification,
        currentImages: updatedFields.images ?? images,
        ...updatedFields,
      });
    } catch (err) {
      console.log("Autosave error:", err);
    } finally { 
      isSavingRef.current = false; 
    }
  }, [project, checks, rowComments, generalNotes, items, nameClarification, images, isProcessing, editingHistoryId]);

  const takePhoto = async () => {
    if (images.length >= 6) { Alert.alert("Gräns nådd", "Max 6 bilder."); return; }
    let r = await ImagePicker.launchCameraAsync({ quality: 0.3 });
    if (!r.canceled) {
        const n = [...images, r.assets[0].uri];
        setImages(n);
        persistData({ images: n }); 
    }
  };

  const currentItem = items[currentIndex];
  const isLastStep = currentIndex === items.length - 1;
  const progress = items.length > 0 ? (currentIndex + 1) / items.length : 0;

  const handleNext = () => {
    if (isLastStep) setIsNameEntryModalVisible(true);
    else setCurrentIndex(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  const setStatus = (id, s) => { 
    const n = checks[id] === s ? null : s; 
    const newChecks = {...checks, [id]: n};
    setChecks(newChecks); 
    persistData({ inspections: newChecks }); 
    
    if (!editMode && (s === 'checked' || s === 'na') && !isLastStep) {
        setTimeout(() => setCurrentIndex(prev => prev + 1), 250);
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
          description: inspectionSubtitle || capitalizeFirst(project.name),
          checks, rowComments, notes: generalNotes, images, signature: fullSig,
          signedBy: nameClarification || "Installatör", items 
        };
        
        let updatedHistory = editingHistoryId 
          ? (project.inspectionHistory || []).map(item => item.id === editingHistoryId ? entryData : item)
          : [entryData, ...(project.inspectionHistory || [])];
        
        await updateProject(project.id, {
          inspectionHistory: updatedHistory,
          ...(editingHistoryId || route.params?.customTemplate ? {} : { 
              currentInspections: {}, currentInspectionRowComments: {}, currentInspectionNotes: "", currentImages: [], nameClarification: "" 
          })
        });

        setIsNameEntryModalVisible(false);
        navigation.goBack();
        
        setTimeout(() => { 
            Alert.alert("Sparat!", "Egenkontrollen har arkiverats. Vill du skapa PDF nu?", [
                { text: "Nej", style: "cancel" },
                { text: "Ja", onPress: () => handleInspectionPdf(project, entryData, companyData) }
            ]); 
        }, 500);
      } catch (e) { Alert.alert("Fel", "Kunde inte spara."); }
      finally { setIsProcessing(false); }
    }, 400);
  };

  // Mall-funktioner
  const addNewSection = () => { 
    const n = [...items, {id: "s"+Date.now(), label: "Ny punkt", section: "Ny Kategori", desc: "", unit: ""}]; 
    setItems(n); persistData({inspectionItems: n}); 
  };
  const removeSection = (sec) => { 
    const n = items.filter(i => i.section !== sec); setItems(n); persistData({inspectionItems: n}); 
  };
  const addNewItem = (sec) => { 
    const n = [...items, {id: "i"+Date.now(), label: "Ny punkt", section: sec, desc: "", unit: ""}]; setItems(n); persistData({inspectionItems: n}); 
  };
  const removeItem = (id) => { 
    const n = items.filter(i => i.id !== id); setItems(n); persistData({inspectionItems: n}); 
  };

  if (!project) return null;
  const sections = Array.from(new Set(items.map(i => i.section)));

  return (
    <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        
        <AppHeader 
            title={editingHistoryId ? "ÄNDRA ARKIV" : (route.params?.customTitle || "EGENKONTROLL")} 
            subTitle={capitalizeFirst(project.name)}
            navigation={navigation}
            rightIcon="archive-outline"
            onRightPress={() => navigation.navigate("InspectionHistory", { project })}
        />

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={styles.topBar}>
                {!editMode && items.length > 0 && (
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
                    </View>
                )}
                
                <TouchableOpacity onPress={() => setEditMode(!editMode)} style={[styles.modeToggle, editMode && styles.modeToggleActive]}>
                    <Ionicons name={editMode ? "checkmark-circle" : "settings-outline"} size={16} color={editMode ? "#FFF" : WorkaholicTheme.colors.primary} />
                    <Text style={[styles.modeText, editMode && {color: "#FFF"}]}>{editMode ? "KLAR" : "MALL"}</Text>
                </TouchableOpacity>
          </View>

          {!editMode && currentItem ? (
              <InspectionStoryItem 
                item={currentItem}
                checks={checks}
                setStatus={setStatus}
                rowComments={rowComments}
                setRowComments={setRowComments}
                images={images}
                takePhoto={takePhoto}
                persistData={persistData}
              />
          ) : (
          
          <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
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
                        onBlur={() => persistData({ inspectionItems: items })} 
                      />
                      <TouchableOpacity onPress={() => removeSection(secName)} style={styles.removeSectionBtn}><Ionicons name="trash" size={18} color="#FF3B30" /></TouchableOpacity>
                    </View>
                  ) : <Text style={styles.sectionHeader}>{secName.toUpperCase()}</Text>}
                </View>

                {items.filter(it => it.section === secName).map((item) => (
                  <View key={item.id} style={[styles.card, editMode && styles.cardEdit]}>
                    <View style={styles.checkRow}>
                      <View style={{ flex: 1 }}>
                        {editMode ? (
                          <View>
                            <TextInput 
                              style={styles.editInput} 
                              value={item.label} 
                              onChangeText={(txt) => setItems(items.map(it => it.id === item.id ? { ...it, label: txt } : it))} 
                              onBlur={() => persistData({ inspectionItems: items })}
                            />
                            <TextInput 
                              style={[styles.editInput, {fontSize: 12, color: '#666', borderBottomWidth: 0}]} 
                              value={item.desc} 
                              placeholder="Kort instruktion (valfritt)"
                              onChangeText={(txt) => setItems(items.map(it => it.id === item.id ? { ...it, desc: txt } : it))} 
                              onBlur={() => persistData({ inspectionItems: items })}
                            />
                          </View>
                        ) : <Text style={styles.checkText}>{item.label}</Text>}
                      </View>
                      {!editMode ? (
                        <View style={styles.choiceContainer}>
                          <TouchableOpacity onPress={() => setStatus(item.id, 'na')} style={[styles.choiceBtn, checks[item.id] === 'na' && styles.choiceNA]}><Ionicons name="close" size={18} color={checks[item.id] === 'na' ? "#fff" : "#DDD"} /></TouchableOpacity>
                          <TouchableOpacity onPress={() => setStatus(item.id, 'checked')} style={[styles.choiceBtn, checks[item.id] === 'checked' && styles.choiceOK]}><Ionicons name="checkmark" size={18} color={checks[item.id] === 'checked' ? "#fff" : "#DDD"} /></TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity onPress={() => removeItem(item.id)} style={{padding: 5}}><Ionicons name="trash-outline" size={20} color="#FF3B30" /></TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
                {editMode && (
                  <TouchableOpacity style={styles.addItemBtn} onPress={() => addNewItem(secName)}>
                    <Ionicons name="add" size={18} color="#FFB300" /><Text style={styles.addItemText}>Lägg till punkt</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <View style={styles.notesContainer}>
              <Text style={styles.notesTitle}>ÖVRIGA ANTECKNINGAR</Text>
              <TextInput 
                style={styles.noteInput} multiline value={generalNotes} onChangeText={setGeneralNotes} 
                onBlur={() => persistData({ inspectionNotes: generalNotes })} placeholderTextColor="#BBB"
              />
            </View>
          </ScrollView>
          )}

          {!editMode && (
             <View style={[styles.stickyFooter, { paddingBottom: insets.bottom + 15 }]}>
                {currentItem ? (
                    <View style={styles.navRow}>
                        <TouchableOpacity onPress={handlePrev} disabled={currentIndex === 0} style={[styles.navBtn, currentIndex === 0 && {opacity: 0.3}]}>
                            <Ionicons name="arrow-back" size={20} color="#1C1C1E" /><Text style={styles.navText}>BAKÅT</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleNext} style={[styles.navBtn, {backgroundColor: WorkaholicTheme.colors.primary}]}>
                            <Text style={[styles.navText, {color: '#FFF'}]}>{isLastStep ? "SLUTFÖR" : "NÄSTA"}</Text><Ionicons name={isLastStep ? "checkmark" : "arrow-forward"} size={20} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.primaryBtn} onPress={() => setIsNameEntryModalVisible(true)} disabled={isProcessing}>
                        {isProcessing ? <ActivityIndicator color="#fff" /> : <><Ionicons name="pencil-sharp" size={20} color="#fff" /><Text style={styles.btnText}> SIGNERA & SPARA</Text></>}
                    </TouchableOpacity>
                )}
             </View>
          )}
        </KeyboardAvoidingView>

        <Modal visible={isNameEntryModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.namingCard}>
              <Text style={styles.namingTitle}>Slutför Protokoll</Text>
              <TextInput style={styles.namingInput} value={inspectionSubtitle} onChangeText={setInspectionSubtitle} placeholder="Protokollets namn" autoFocus placeholderTextColor="#BBB" />
              <TextInput style={[styles.namingInput, {marginTop: 15}]} value={nameClarification} onChangeText={setNameClarification} placeholder="Ditt namn" placeholderTextColor="#BBB" />
              <View style={styles.namingActions}>
                <TouchableOpacity style={styles.namingCancel} onPress={() => setIsNameEntryModalVisible(false)}><Text style={styles.namingCancelText}>Tillbaka</Text></TouchableOpacity>
                <TouchableOpacity style={styles.namingConfirm} onPress={async () => { setIsNameEntryModalVisible(false); await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT); setIsSignModalVisible(true); }}><Text style={styles.namingConfirmText}>Gå till signering</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={isSignModalVisible} animationType="slide">
          <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Signera Kontroll</Text>
              <TouchableOpacity onPress={async () => { await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP); setIsSignModalVisible(false); }}><Ionicons name="close-circle" size={32} color="#1C1C1E" /></TouchableOpacity>
            </View>
            <SignatureScreen ref={signatureRef} onOK={handleSignature} descriptionText="Signera här" autoClear={false} imageType="image/png" />
            <View style={{ padding: 20, paddingBottom: 40 }}>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => signatureRef.current.readSignature()}><Text style={styles.btnText}>SLUTFÖR & ARKIVERA</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  topBar: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 10, flexDirection: 'row', alignItems: 'center' },
  progressContainer: { flex: 1, height: 6, backgroundColor: '#EEE', borderRadius: 3, marginRight: 15, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: WorkaholicTheme.colors.primary },
  modeToggle: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, elevation: 2 },
  modeToggleActive: { backgroundColor: WorkaholicTheme.colors.primary },
  modeText: { fontSize: 10, fontWeight: '900', marginLeft: 6, color: WorkaholicTheme.colors.primary, letterSpacing: 0.5 },
  storyContent: { padding: 20, flexGrow: 1, justifyContent: 'center' },
  storyCard: { backgroundColor: '#FFF', borderRadius: 25, padding: 25, elevation: 4 },
  storySection: { fontSize: 10, fontWeight: '900', color: '#BBB', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1.2 },
  storyLabel: { fontSize: 22, fontWeight: '900', color: '#1C1C1E', marginBottom: 15 },
  descBox: { flexDirection: 'row', backgroundColor: '#F0F7FF', padding: 15, borderRadius: 15, marginBottom: 25, gap: 10 },
  storyDesc: { fontSize: 13, color: '#444', lineHeight: 18, flex: 1, fontWeight: '600' },
  storyActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 25 },
  storyBtn: { flex: 1, paddingVertical: 20, borderRadius: 18, backgroundColor: '#F8F9FB', alignItems: 'center', borderWidth: 1, borderColor: '#EEE' },
  storyBtnOk: { backgroundColor: '#34C759', borderColor: '#34C759' },
  storyBtnNa: { backgroundColor: '#8E8E93', borderColor: '#8E8E93' },
  storyBtnFail: { backgroundColor: '#FF3B30', borderColor: '#FF3B30' },
  storyBtnText: { fontSize: 10, fontWeight: '900', marginTop: 10, color: '#AAA' },
  storyComment: { backgroundColor: '#F5F5F7', padding: 18, borderRadius: 18, fontSize: 15, minHeight: 120, textAlignVertical: 'top', fontWeight: '600', color: '#333' },
  inputWrapper: { position: 'relative' },
  unitBadge: { position: 'absolute', right: 15, top: 15, backgroundColor: '#E5E5EA', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  unitBadgeText: { fontSize: 12, fontWeight: '900', color: '#8E8E93' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 15 },
  navBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, backgroundColor: '#FFF', elevation: 2, gap: 10, justifyContent: 'center' },
  navText: { fontWeight: '900', fontSize: 13, color: '#1C1C1E', letterSpacing: 0.5 },
  miniGallery: { flexDirection: 'row', marginTop: 30, gap: 12, flexWrap: 'wrap', justifyContent: 'center' },
  miniThumb: { width: 70, height: 70, borderRadius: 15 },
  miniAdd: { width: 70, height: 70, borderRadius: 15, borderWidth: 1, borderColor: '#EEE', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  miniRemove: { position: 'absolute', top: -5, right: -5, backgroundColor: '#FF3B30', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
  adminBanner: { backgroundColor: '#FFFDF0', padding: 20, borderBottomWidth: 1, borderBottomColor: '#FFB300' },
  sectionContainer: { marginBottom: 25, paddingHorizontal: 20 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionHeader: { fontSize: 11, fontWeight: "900", color: "#BBB", letterSpacing: 1 },
  sectionEditInput: { flex: 1, backgroundColor: "#fff", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#FFB300", fontWeight: '800' },
  removeSectionBtn: { marginLeft: 10, padding: 10 },
  card: { backgroundColor: "#FFF", borderRadius: 20, padding: 18, marginBottom: 12, elevation: 2 },
  cardEdit: { borderColor: "#FFB300", backgroundColor: "#FFFDF0", borderWidth: 1 },
  checkRow: { flexDirection: "row", alignItems: "center" },
  checkText: { fontSize: 15, fontWeight: "800", color: '#1C1C1E' },
  choiceContainer: { flexDirection: 'row', backgroundColor: '#F5F5F7', borderRadius: 12, padding: 4 },
  choiceBtn: { width: 45, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  choiceOK: { backgroundColor: '#34C759' },
  choiceNA: { backgroundColor: '#8E8E93' },
  choiceFail: { backgroundColor: '#FF3B30' },
  editInput: { borderBottomWidth: 1, borderColor: "#EEE", padding: 10, fontSize: 15, fontWeight: '700', marginBottom: 5 },
  addSectionBtn: { backgroundColor: "#FFB300", padding: 18, borderRadius: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  addSectionText: { color: "#FFF", fontWeight: "900", marginLeft: 8, fontSize: 13 },
  addItemBtn: { padding: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  addItemText: { color: "#FFB300", fontWeight: "800", marginLeft: 6, fontSize: 13 },
  notesContainer: { padding: 20 },
  notesTitle: { fontSize: 11, fontWeight: "900", color: "#BBB", marginBottom: 12, letterSpacing: 1 },
  noteInput: { backgroundColor: "#FFF", borderRadius: 20, padding: 20, height: 130, textAlignVertical: "top", borderWidth: 1, borderColor: '#EEE', fontSize: 14, fontWeight: '600' },
  primaryBtn: { backgroundColor: WorkaholicTheme.colors.primary, padding: 18, borderRadius: 20, alignItems: "center", flexDirection: "row", justifyContent: "center", elevation: 3 },
  btnText: { color: "#fff", fontWeight: "900", fontSize: 15, letterSpacing: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 25 },
  namingCard: { backgroundColor: '#FFF', borderRadius: 30, padding: 30, elevation: 15 },
  namingTitle: { fontSize: 20, fontWeight: '900', marginBottom: 25, textAlign: 'center', color: '#1C1C1E' },
  namingInput: { backgroundColor: '#F5F5F7', padding: 18, borderRadius: 18, fontSize: 15, fontWeight: '700', color: '#333' },
  namingActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30, gap: 15 },
  namingCancel: { flex: 1, padding: 15, alignItems: 'center' },
  namingConfirm: { flex: 2, backgroundColor: WorkaholicTheme.colors.primary, padding: 15, borderRadius: 15, alignItems: 'center' },
  namingCancelText: { color: '#8E8E93', fontWeight: '800' },
  namingConfirmText: { color: '#FFF', fontWeight: '900' },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", padding: 25, alignItems: "center", borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalTitle: { fontSize: 18, fontWeight: "900", color: '#1C1C1E' },
  stickyFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', padding: 15, borderTopWidth: 1, borderTopColor: '#EEE' },
});