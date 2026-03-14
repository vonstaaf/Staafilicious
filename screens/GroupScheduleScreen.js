import React, { useContext, useState, useEffect, useCallback, useMemo } from "react";
import { 
  View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, 
  FlatList, KeyboardAvoidingView, Platform,
  Modal, ScrollView, StatusBar, Switch, ActivityIndicator
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ProjectsContext } from "../context/ProjectsContext";
import { capitalizeFirst } from "../utils/stringHelpers";
import { WorkaholicTheme } from "../theme";
import { db, auth } from "../firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";
import { handleGroupSchedulePdf } from "../utils/pdfActions";
import AppHeader from "../components/AppHeader";

// 🔑 NY INTERN KOMPONENT: HEADER-INFO (Fixar fokus-bugg i toppen)
const ScheduleHeader = React.memo(({ 
  headerInfo, setHeaderInfo, pageSize, setPageSize, 
  resetSchedule, moduleCount, adjustRowsCount, 
  showJfbText, setShowJfbText 
}) => {
  return (
    <View style={styles.headerCard}>
      <Text style={styles.sectionHeader}>ANLÄGGNINGSINFO</Text>
      
      <View style={styles.inputRow}>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Anläggning</Text>
          <TextInput 
            style={styles.headerInput} 
            value={headerInfo.anlaggning} 
            onChangeText={v => setHeaderInfo({...headerInfo, anlaggning: v})} 
          />
        </View>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Central</Text>
          <TextInput 
            style={styles.headerInput} 
            value={headerInfo.central} 
            onChangeText={v => setHeaderInfo({...headerInfo, central: v})} 
          />
        </View>
      </View>

      <View style={styles.inputRow}>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Säkring (A)</Text>
          <TextInput 
            style={styles.headerInput} 
            value={headerInfo.skring} 
            onChangeText={v => setHeaderInfo({...headerInfo, skring: v})} 
          />
        </View>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Matning</Text>
          <TextInput 
            style={styles.headerInput} 
            value={headerInfo.kabel} 
            onChangeText={v => setHeaderInfo({...headerInfo, kabel: v})} 
          />
        </View>
      </View>

      <View style={styles.inputRow}>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Ik3 (kA)</Text>
          <TextInput 
            style={styles.headerInput} 
            value={headerInfo.ik3} 
            placeholder="t.ex. 6" 
            placeholderTextColor="#CCC" 
            onChangeText={v => setHeaderInfo({...headerInfo, ik3: v})} 
          />
        </View>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Zför (Ω)</Text>
          <TextInput 
            style={styles.headerInput} 
            value={headerInfo.zfor} 
            placeholder="t.ex. 0.45" 
            placeholderTextColor="#CCC" 
            onChangeText={v => setHeaderInfo({...headerInfo, zfor: v})} 
          />
        </View>
      </View>

      <View style={styles.separator} />

      <View style={styles.formatRow}>
        <TouchableOpacity 
          style={[styles.formatBtn, pageSize === "A4" && styles.activeBtn]} 
          onPress={() => setPageSize("A4")}
        >
          <Text style={[styles.btnText, pageSize === "A4" && {color: "#FFF"}]}>A4</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.formatBtn, pageSize === "A5" && styles.activeBtn]} 
          onPress={() => setPageSize("A5")}
        >
          <Text style={[styles.btnText, pageSize === "A5" && {color: "#FFF"}]}>A5</Text>
        </TouchableOpacity>
        
        <View style={{flex: 1}} />
        
        <TouchableOpacity onPress={resetSchedule} style={styles.resetBtn}>
          <Ionicons name="trash-outline" size={18} color="#FF3B30" />
        </TouchableOpacity>

        <View style={{alignItems: 'center', marginLeft: 10}}>
            <TextInput 
              style={styles.modInput} 
              keyboardType="number-pad" 
              value={moduleCount} 
              onChangeText={adjustRowsCount} 
            />
            <Text style={styles.modLabel}>RADER</Text>
        </View>
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Visa text om Jordfelsbrytare på PDF</Text>
        <Switch 
          value={showJfbText}
          onValueChange={setShowJfbText}
          trackColor={{ false: "#EEE", true: WorkaholicTheme.colors.primary }}
          thumbColor="#FFF"
        />
      </View>
    </View>
  );
});

// 🔑 NY INTERN KOMPONENT: RAD-KOMPONENT (Fixar fokus-bugg i listan)
const ScheduleRow = React.memo(({ 
  item, index, totalRows, handleLabelChange, copyLabelToNext, 
  openPicker, copyValuesToNext 
}) => {
  return (
    <View style={styles.rowCard}>
      <View style={styles.numBadge}>
        <Text style={styles.numText}>{item.id}</Text>
      </View>
      
      <TextInput 
        style={styles.input} 
        placeholder="Beskrivning..." 
        placeholderTextColor="#CCC"
        value={item.label} 
        onChangeText={(v) => handleLabelChange(v, item.id)} 
      />
      
      {index < totalRows - 1 && (
        <TouchableOpacity style={styles.copyBtn} onPress={() => copyLabelToNext(index)}>
          <Ionicons name="arrow-down-circle-outline" size={20} color="#DDD" />
        </TouchableOpacity>
      )}

      <View style={styles.pickerArea}>
        <TouchableOpacity style={styles.pickerTrigger} onPress={() => openPicker(item.id, 'current')}>
          <Text style={styles.pickerValue}>
            {item.current ? (item.current === 'N' ? 'N' : `${item.current}A`) : 'Amp'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.pickerTrigger} onPress={() => openPicker(item.id, 'area')}>
          <Text style={styles.pickerValue}>
            {item.area ? `${item.area}mm²` : 'Area'}
          </Text>
        </TouchableOpacity>
      </View>

      {index < totalRows - 1 && (
        <TouchableOpacity style={styles.copyBtn} onPress={() => copyValuesToNext(index)}>
          <Ionicons name="arrow-down-circle-outline" size={20} color={WorkaholicTheme.colors.primary + '40'} />
        </TouchableOpacity>
      )}
    </View>
  );
});

export default function GroupScheduleScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { selectedProject, updateProject } = useContext(ProjectsContext);
  
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [companyData, setCompanyData] = useState(null);
  
  const [headerInfo, setHeaderInfo] = useState({ 
    anlaggning: "", central: "", skring: "", kabel: "", ik3: "", zfor: ""
  });
  const [showJfbText, setShowJfbText] = useState(false);
  const [pageSize, setPageSize] = useState("A4");
  const [moduleCount, setModuleCount] = useState("12");
  const [rows, setRows] = useState([]);
  
  const [pickerVisible, setPickerVisible] = useState(false);
  const [activePicker, setActivePicker] = useState({ rowId: null, type: null });

  const AMPERE_VALUES = ["", "N", "6", "10", "13", "16", "20", "25", "32", "35", "40", "50", "63"];
  const AREA_VALUES = ["", "1,5", "2,5", "4", "6", "10", "16"];

  useEffect(() => {
    if (!auth.currentUser) return;
    const unsubscribe = onSnapshot(doc(db, "users", auth.currentUser.uid), (docSnap) => {
      if (docSnap.exists()) setCompanyData(docSnap.data());
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedProject?.groupScheduleHeader) {
      setHeaderInfo({
        anlaggning: selectedProject.groupScheduleHeader.anlaggning || selectedProject.name || "",
        central: selectedProject.groupScheduleHeader.central || "",
        skring: selectedProject.groupScheduleHeader.skring || "",
        kabel: selectedProject.groupScheduleHeader.kabel || "",
        ik3: selectedProject.groupScheduleHeader.ik3 || "",
        zfor: selectedProject.groupScheduleHeader.zfor || ""
      });
      setShowJfbText(selectedProject.groupScheduleHeader.showJfbText || false);
      setRows(selectedProject.groupScheduleRows || []);
      setModuleCount(String(selectedProject.groupScheduleRows?.length || "12"));
    } else if (selectedProject?.groupSchedule) {
      const gs = selectedProject.groupSchedule;
      setHeaderInfo({
        anlaggning: gs.headerInfo?.anlaggning || selectedProject.name || "",
        central: gs.headerInfo?.central || "",
        skring: gs.headerInfo?.skring || "",
        kabel: gs.headerInfo?.kabel || "",
        ik3: gs.headerInfo?.ik3 || "",
        zfor: gs.headerInfo?.zfor || ""
      });
      setShowJfbText(gs.headerInfo?.showJfbText || false);
      setPageSize(gs.pageSize || "A4");
      setModuleCount(String(gs.moduleCount || "12"));
      setRows(gs.rows || []);
    } else {
      setHeaderInfo(s => ({ ...s, anlaggning: selectedProject?.name || "" }));
      const initialRows = Array.from({ length: 12 }, (_, i) => ({ 
        id: (i + 1).toString(), label: "", current: "", area: "" 
      }));
      setRows(initialRows);
    }
  }, [selectedProject]);

  const resetSchedule = useCallback(() => {
    Alert.alert("Rensa schema?", "Vill du tömma hela schemat?", [
      { text: "Avbryt", style: "cancel" },
      { text: "Ja, rensa", style: "destructive", onPress: () => {
          setModuleCount("12");
          setRows(Array.from({ length: 12 }, (_, i) => ({ id: (i + 1).toString(), label: "", current: "", area: "" })));
      }}
    ]);
  }, [rows]);

  const adjustRowsCount = useCallback((newCountStr) => {
    const num = parseInt(newCountStr) || 0;
    setModuleCount(newCountStr);
    if (num === rows.length) return;
    if (num < rows.length) {
      setRows(rows.slice(0, num));
    } else {
      const diff = num - rows.length;
      const newRows = Array.from({ length: diff }, (_, i) => ({
        id: (rows.length + i + 1).toString(), label: "", current: "", area: ""
      }));
      setRows([...rows, ...newRows]);
    }
  }, [rows]);

  const openPicker = useCallback((rowId, type) => { 
    setActivePicker({ rowId, type }); 
    setPickerVisible(true); 
  }, []);
  
  const selectValue = (value) => {
    const { rowId, type } = activePicker;
    setRows(rows.map(r => r.id === rowId ? { ...r, [type]: value } : r));
    setPickerVisible(false);
  };

  const handleLabelChange = useCallback((text, id) => {
    const formatted = capitalizeFirst(text) || text;
    setRows(prevRows => prevRows.map(r => r.id === id ? {...r, label: formatted} : r));
  }, []);

  const copyLabelToNext = useCallback((index) => {
    if (index >= rows.length - 1) return;
    const newRows = [...rows];
    newRows[index + 1].label = newRows[index].label;
    setRows(newRows);
  }, [rows]);

  const copyValuesToNext = useCallback((index) => {
    if (index >= rows.length - 1) return;
    const newRows = [...rows];
    newRows[index + 1].current = newRows[index].current;
    newRows[index + 1].area = newRows[index].area;
    setRows(newRows);
  }, [rows]);

  const saveSchedule = async (silent = false) => {
    try {
      await updateProject(selectedProject.id, {
        groupScheduleRows: rows,
        groupScheduleHeader: { ...headerInfo, showJfbText },
        groupSchedule: { 
          headerInfo: { ...headerInfo, showJfbText }, 
          pageSize, moduleCount: parseInt(moduleCount), rows, updatedAt: new Date().toISOString() 
        } 
      });
      if (!silent) Alert.alert("Sparat!");
      return true;
    } catch (e) {
      if (!silent) Alert.alert("Kunde inte spara.");
      return false;
    }
  };

  const onCreatePdf = async () => {
    if (loadingPdf) return;
    setLoadingPdf(true);
    const saveOk = await saveSchedule(true);
    if (!saveOk) { setLoadingPdf(false); return; }
    try {
      await handleGroupSchedulePdf(selectedProject, { rows, headerInfo: { ...headerInfo, showJfbText }, pageSize }, companyData);
    } catch (e) { Alert.alert("Fel", "Kunde inte skapa PDF."); } 
    finally { setLoadingPdf(false); }
  };

  if (!selectedProject) return null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      <AppHeader 
        title="GRUPPSCHEMA"
        subTitle={selectedProject?.name?.toUpperCase()}
        navigation={navigation}
        rightIcon="share-outline"
        onRightPress={onCreatePdf}
      />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <FlatList
          data={rows}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <ScheduleHeader 
              headerInfo={headerInfo}
              setHeaderInfo={setHeaderInfo}
              pageSize={pageSize}
              setPageSize={setPageSize}
              resetSchedule={resetSchedule}
              moduleCount={moduleCount}
              adjustRowsCount={adjustRowsCount}
              showJfbText={showJfbText}
              setShowJfbText={setShowJfbText}
            />
          }
          renderItem={({item, index}) => (
            <ScheduleRow 
              item={item}
              index={index}
              totalRows={rows.length}
              handleLabelChange={handleLabelChange}
              copyLabelToNext={copyLabelToNext}
              openPicker={openPicker}
              copyValuesToNext={copyValuesToNext}
            />
          )}
        />
      </KeyboardAvoidingView>
      
      <View style={[styles.footer, { paddingBottom: insets.bottom + 15 }]}>
         <TouchableOpacity style={styles.saveBtn} onPress={() => saveSchedule(false)}>
            {loadingPdf ? <ActivityIndicator color="#FFF" /> : (
              <><Ionicons name="save-outline" size={20} color="#FFF" /><Text style={styles.saveBtnText}>SPARA SCHEMA</Text></>
            )}
         </TouchableOpacity>
      </View>

      <Modal visible={pickerVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPickerVisible(false)}>
          <View style={styles.pickerContent}>
            <Text style={styles.pickerTitle}>VÄLJ {activePicker.type === 'current' ? 'SÄKRING' : 'AREA'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {(activePicker.type === 'current' ? AMPERE_VALUES : AREA_VALUES).map(val => (
                <TouchableOpacity key={val || 'blank'} style={styles.pickerItem} onPress={() => selectValue(val)}>
                  <Text style={styles.pickerItemText}>
                    {val === "" ? "Blankt" : (val === 'N' ? 'N' : `${val} ${activePicker.type === 'current' ? 'A' : 'mm²'}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  headerCard: { padding: 20, margin: 20, backgroundColor: '#FFF', borderRadius: 25, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  sectionHeader: { color: "#CCC", fontWeight: '900', marginBottom: 20, fontSize: 10, letterSpacing: 1 },
  inputRow: { flexDirection: 'row', gap: 12, marginBottom: 15 },
  halfInput: { flex: 1 },
  label: { fontSize: 9, fontWeight: '900', color: '#AAA', marginBottom: 6, letterSpacing: 0.5 },
  headerInput: { backgroundColor: "#F5F5F7", borderRadius: 12, padding: 12, fontSize: 14, fontWeight: '700', color: '#1C1C1E' },
  separator: { height: 1, backgroundColor: "#F0F0F0", marginVertical: 15 },
  formatRow: { flexDirection: "row", gap: 10, alignItems: 'center' },
  formatBtn: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 10, backgroundColor: "#F5F5F7" },
  activeBtn: { backgroundColor: WorkaholicTheme.colors.primary },
  btnText: { color: "#999", fontWeight: '800', fontSize: 12 },
  resetBtn: { padding: 10, backgroundColor: '#FFF5F5', borderRadius: 10 },
  modInput: { borderBottomWidth: 2, borderColor: WorkaholicTheme.colors.primary, width: 40, textAlign: 'center', fontWeight: '900', fontSize: 16, color: '#1C1C1E' },
  modLabel: { fontSize: 8, fontWeight: '900', color: '#CCC', textAlign: 'center', marginTop: 2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F5F5F7' },
  switchLabel: { fontSize: 12, fontWeight: '700', color: '#666', flex: 1 },

  rowCard: { flexDirection: "row", marginHorizontal: 20, marginBottom: 10, borderRadius: 20, padding: 12, alignItems: "center", backgroundColor: '#FFF', elevation: 2, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5 },
  numBadge: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#F0F7FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  numText: { fontSize: 12, fontWeight: "900", color: WorkaholicTheme.colors.primary },
  input: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1C1C1E' },
  copyBtn: { padding: 5, marginLeft: 5 }, 
  pickerArea: { flexDirection: 'row', gap: 6, marginLeft: 10 },
  pickerTrigger: { backgroundColor: '#F5F5F7', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, minWidth: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EEE' },
  pickerValue: { fontWeight: '800', color: '#555', fontSize: 10 },
  
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', padding: 15, borderTopWidth: 1, borderColor: '#EEE' },
  saveBtn: { backgroundColor: '#1C1C1E', padding: 18, borderRadius: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  saveBtnText: { fontWeight: '900', color: '#FFF', fontSize: 14, letterSpacing: 0.5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  pickerContent: { backgroundColor: '#FFF', width: '80%', maxHeight: '60%', borderRadius: 30, padding: 25 },
  pickerTitle: { textAlign: 'center', fontWeight: '900', fontSize: 12, marginBottom: 20, color: '#CCC', letterSpacing: 1 },
  pickerItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F7', alignItems: 'center' },
  pickerItemText: { fontSize: 18, fontWeight: '800', color: '#1C1C1E' }
});