import React, { useContext, useState, useEffect } from "react";
import { 
  View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, 
  FlatList, KeyboardAvoidingView, Platform,
  Modal, ScrollView, StatusBar
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ProjectsContext } from "../context/ProjectsContext";
import { WorkaholicTheme } from "../theme";
import Button from "../components/Button";
import { db, auth } from "../firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";
import { handleGroupSchedulePdf } from "../utils/pdfActions";
import AppHeader from "../components/AppHeader";

const PDF_APP_LOGO = require("../assets/logo.png");

export default function GroupScheduleScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { selectedProject, updateProject } = useContext(ProjectsContext);
  
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [companyData, setCompanyData] = useState(null);
  const [headerInfo, setHeaderInfo] = useState({ anlaggning: "", central: "", skring: "", kabel: "" });
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
    if (selectedProject?.groupSchedule) {
      const gs = selectedProject.groupSchedule;
      setHeaderInfo(gs.headerInfo || { anlaggning: selectedProject.name, central: "", skring: "", kabel: "" });
      setPageSize(gs.pageSize || "A4");
      setModuleCount(String(gs.moduleCount || "12"));
      setRows(gs.rows || []);
    } else {
      setHeaderInfo(s => ({ ...s, anlaggning: selectedProject?.name || "" }));
      const initialRows = Array.from({ length: 12 }, (_, i) => ({ 
        id: i + 1, label: "", current: "", area: "" 
      }));
      setRows(initialRows);
    }
  }, [selectedProject]);

  // --- NY FUNKTION: RENSA HELA SCHEMAT ---
  const resetSchedule = () => {
    Alert.alert(
      "Rensa schema?",
      "Vill du tömma hela gruppschemat för detta projekt och börja om med 12 tomma rader?",
      [
        { text: "Avbryt", style: "cancel" },
        { 
          text: "Ja, rensa", 
          style: "destructive", 
          onPress: () => {
            setModuleCount("12");
            const resetRows = Array.from({ length: 12 }, (_, i) => ({
              id: i + 1, label: "", current: "", area: ""
            }));
            setRows(resetRows);
          }
        }
      ]
    );
  };

  const adjustRowsCount = (newCountStr) => {
    const num = parseInt(newCountStr) || 0;
    setModuleCount(newCountStr);

    if (num === rows.length) return;

    if (num < rows.length) {
      const rowsToDelete = rows.slice(num);
      const hasData = rowsToDelete.some(r => r.label !== "" || r.current !== "" || r.area !== "");

      if (hasData) {
        Alert.alert(
          "Minska rader?",
          "De sista raderna innehåller information som kommer att raderas. Vill du fortsätta?",
          [
            { text: "Avbryt", style: "cancel", onPress: () => setModuleCount(String(rows.length)) },
            { text: "Radera", style: "destructive", onPress: () => setRows(rows.slice(0, num)) }
          ]
        );
      } else {
        setRows(rows.slice(0, num));
      }
    } else {
      const diff = num - rows.length;
      const newRows = Array.from({ length: diff }, (_, i) => ({
        id: rows.length + i + 1,
        label: "",
        current: "",
        area: ""
      }));
      setRows([...rows, ...newRows]);
    }
  };

  const openPicker = (rowId, type) => { setActivePicker({ rowId, type }); setPickerVisible(true); };
  
  const selectValue = (value) => {
    const { rowId, type } = activePicker;
    setRows(rows.map(r => r.id === rowId ? { ...r, [type]: value } : r));
    setPickerVisible(false);
  };

  const handleLabelChange = (text, id) => {
    const formattedText = text.length > 0 ? text.charAt(0).toUpperCase() + text.slice(1) : text;
    setRows(rows.map(r => r.id === id ? {...r, label: formattedText} : r));
  };

  const copyLabelToNext = (index) => {
    if (index >= rows.length - 1) return;
    const newRows = [...rows];
    newRows[index + 1].label = newRows[index].label;
    setRows(newRows);
  };

  const copyValuesToNext = (index) => {
    if (index >= rows.length - 1) return;
    const newRows = [...rows];
    newRows[index + 1].current = newRows[index].current;
    newRows[index + 1].area = newRows[index].area;
    setRows(newRows);
  };

  const saveSchedule = async (silent = false) => {
    try {
      await updateProject(selectedProject.id, { 
        groupSchedule: { 
          headerInfo, pageSize, moduleCount: parseInt(moduleCount), rows, 
          updatedAt: new Date().toISOString() 
        } 
      });
      if (!silent) Alert.alert("Sparat!");
      return true;
    } catch (e) {
      if (!silent) Alert.alert("Fel", "Kunde inte spara.");
      return false;
    }
  };

  const onCreatePdf = async () => {
    if (loadingPdf) return;
    setLoadingPdf(true);
    const saveOk = await saveSchedule(true);
    if (!saveOk) { setLoadingPdf(false); return; }
    try {
      await handleGroupSchedulePdf(
        { ...selectedProject, groupSchedule: { headerInfo, pageSize, rows } }, 
        { headerInfo, pageSize, rows },
        companyData,
        PDF_APP_LOGO
      );
    } catch (e) { 
      Alert.alert("Fel", "Kunde inte skapa PDF."); 
    } finally { 
      setLoadingPdf(false); 
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <AppHeader 
        title="GRUPPSCHEMA"
        subTitle={selectedProject?.name}
        navigation={navigation}
        rightIcon="share-outline"
        onRightPress={onCreatePdf}
      />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <FlatList
          data={rows}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ paddingBottom: insets.bottom + 50 }}
          ListHeaderComponent={
            <View style={styles.headerCard}>
              <Text style={styles.sectionHeader}>ANLÄGGNINGSINFO</Text>
              <View style={{ gap: 10, marginBottom: 15 }}>
                <TextInput style={styles.headerInput} placeholder="Anläggning" value={headerInfo.anlaggning} onChangeText={v => setHeaderInfo({...headerInfo, anlaggning: v})} />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TextInput style={[styles.headerInput, {flex:1}]} placeholder="Central" value={headerInfo.central} onChangeText={v => setHeaderInfo({...headerInfo, central: v})} />
                  <TextInput style={[styles.headerInput, {flex:1}]} placeholder="Säkring" value={headerInfo.skring} onChangeText={v => setHeaderInfo({...headerInfo, skring: v})} />
                  <TextInput style={[styles.headerInput, {flex:1}]} placeholder="Matning" value={headerInfo.kabel} onChangeText={v => setHeaderInfo({...headerInfo, kabel: v})} />
                </View>
              </View>
              <View style={styles.separator} />
              <View style={styles.formatRow}>
                <TouchableOpacity style={[styles.formatBtn, pageSize === "A4" && styles.activeBtn]} onPress={() => setPageSize("A4")}><Text style={[styles.btnText, pageSize === "A4" && {color: "#FFF"}]}>A4</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.formatBtn, pageSize === "A5" && styles.activeBtn]} onPress={() => setPageSize("A5")}><Text style={[styles.btnText, pageSize === "A5" && {color: "#FFF"}]}>A5</Text></TouchableOpacity>
                
                <View style={{flex: 1}} />
                
                {/* RENSA-KNAPP */}
                <TouchableOpacity onPress={resetSchedule} style={styles.resetBtn}>
                  <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                </TouchableOpacity>

                <TextInput 
                  style={styles.modInput} 
                  keyboardType="number-pad" 
                  value={moduleCount} 
                  onChangeText={adjustRowsCount} 
                />
                <Text style={styles.modLabel}> RADER</Text>
              </View>
            </View>
          }
          renderItem={({item, index}) => (
            <View style={styles.rowCard}>
              <Text style={styles.numText}>{item.id}</Text>
              <TextInput style={styles.input} placeholder="Beskrivning..." value={item.label} onChangeText={(v) => handleLabelChange(v, item.id)} />
              
              {index < rows.length - 1 && (
                <TouchableOpacity style={styles.copyBtn} onPress={() => copyLabelToNext(index)}>
                  <Ionicons name="arrow-down" size={14} color="#CCC" />
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.pickerTrigger} onPress={() => openPicker(item.id, 'current')}>
                <Text style={styles.pickerValue}>
                  {item.current ? (item.current === 'N' ? 'N' : `${item.current}A`) : ''}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.pickerTrigger} onPress={() => openPicker(item.id, 'area')}>
                <Text style={styles.pickerValue}>
                  {item.area ? `${item.area}mm²` : ''}
                </Text>
              </TouchableOpacity>

              {index < rows.length - 1 && (
                <TouchableOpacity style={[styles.copyBtn, { marginLeft: 5 }]} onPress={() => copyValuesToNext(index)}>
                  <Ionicons name="arrow-down" size={14} color="#CCC" />
                </TouchableOpacity>
              )}
            </View>
          )}
          ListFooterComponent={<View style={{padding: 20}}><Button title={loadingPdf ? "SKAPAR PDF..." : "SPARA ÄNDRINGAR"} onPress={() => saveSchedule(false)} type="primary" disabled={loadingPdf} /></View>}
        />
      </KeyboardAvoidingView>

      <Modal visible={pickerVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setPickerVisible(false)}>
          <View style={styles.pickerContent}>
            <ScrollView>
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
  headerCard: { padding: 20, margin: 15, backgroundColor: '#FFF', borderRadius: 20, elevation: 2 },
  sectionHeader: { color: WorkaholicTheme.colors.primary, fontWeight: 'bold', marginBottom: 10, fontSize: 12 },
  headerInput: { backgroundColor: "#F5F5F7", borderRadius: 10, padding: 12, fontSize: 14, fontWeight: '600' },
  separator: { height: 1, backgroundColor: "#EEE", marginVertical: 15 },
  formatRow: { flexDirection: "row", gap: 10, alignItems: 'center' },
  formatBtn: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8, backgroundColor: "#EEE" },
  activeBtn: { backgroundColor: WorkaholicTheme.colors.primary },
  btnText: { color: "#666", fontWeight: '700' },
  resetBtn: { padding: 8, backgroundColor: '#FFF5F5', borderRadius: 8, marginRight: 5 },
  modInput: { borderBottomWidth: 2, borderColor: WorkaholicTheme.colors.primary, width: 40, textAlign: 'center', fontWeight: 'bold' },
  modLabel: { fontSize: 10, fontWeight: '800', color: '#AAA' },
  rowCard: { flexDirection: "row", marginHorizontal: 15, marginBottom: 8, borderRadius: 12, padding: 12, alignItems: "center", backgroundColor: '#FFF', elevation: 1 },
  numText: { width: 25, fontWeight: "900", color: "#CCC" },
  input: { flex: 1, fontSize: 14, fontWeight: '700', color: '#333' },
  copyBtn: { paddingHorizontal: 5, paddingVertical: 10 }, 
  pickerTrigger: { backgroundColor: '#F8F9FB', padding: 8, borderRadius: 8, marginLeft: 5, minWidth: 65, minHeight: 35, alignItems: 'center', justifyContent: 'center' },
  pickerValue: { fontWeight: 'bold', color: WorkaholicTheme.colors.primary, fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  pickerContent: { backgroundColor: '#FFF', width: '70%', maxHeight: '60%', borderRadius: 25, padding: 20 },
  pickerItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', alignItems: 'center' },
  pickerItemText: { fontSize: 18, fontWeight: '700', color: WorkaholicTheme.colors.primary }
});