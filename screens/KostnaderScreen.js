import React, { useContext, useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Alert,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  StatusBar
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ProjectsContext } from "../context/ProjectsContext";
import AppHeader from "../components/AppHeader";
import { WorkaholicTheme } from "../theme";

// --- HJÄLPFUNKTIONER ---
const formatNumber = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "0,00";
  return Number(n).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const decimalOnly = (text) => {
  let cleaned = text.replace(",", ".").replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) cleaned = parts[0] + "." + parts.slice(1).join("");
  return cleaned;
};

const getTodayDate = () => {
  return new Date().toLocaleDateString('sv-SE');
};

// Flyttad utanför för att undvika onödiga re-renders
const initialRowState = {
  date: getTodayDate(),
  description: "",
  hours: "",
  hourPrice: "0",
  cars: "0",
  carCost: "0",
  markup: "0",
};

const CostsHeader = React.memo(({ 
  totalSum, 
  entryCount, 
  newRow, 
  setNewRow, 
  saveEntry, 
  editingIndex, 
  setEditingIndex 
}) => {
  
  // 🔑 FIX FÖR DISAPPEARING TEXT: Tvinga stor bokstav direkt i inmatningen
  const handleDescriptionChange = (v) => {
    const formatted = v.length > 0 ? v.charAt(0).toUpperCase() + v.slice(1) : v;
    setNewRow(s => ({ ...s, description: formatted }));
  };

  return (
    <>
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryLabel}>TOTALT VÄRDE (LOGGAT)</Text>
            <Text style={styles.summaryValue}>{formatNumber(totalSum)} kr</Text>
          </View>
          <View style={styles.badge}>
            <Ionicons name="time-outline" size={14} color="#FFF" />
            <Text style={styles.badgeText}>{entryCount} RADER</Text>
          </View>
        </View>
      </View>

      <View style={styles.inputCard}>
        <Text style={styles.sectionLabel}>
            {editingIndex !== null ? "REDIGERA REGISTRERING" : "NY REGISTRERING"}
        </Text>
        
        <View style={styles.inputRow}>
           <View style={{flex: 1.2}}>
              <Text style={styles.miniLabel}>DATUM</Text>
              <TextInput 
                value={newRow.date} 
                onChangeText={v => setNewRow(s => ({...s, date: v}))} 
                style={styles.input} 
              />
           </View>
           <View style={{flex: 2}}>
              <Text style={styles.miniLabel}>BESKRIVNING / MOMENT</Text>
              <TextInput
                placeholder="Vad har gjorts?"
                value={newRow.description}
                // 🔑 Här är fixen: handleDescriptionChange istället för direkt v
                onChangeText={handleDescriptionChange}
                style={styles.input}
                placeholderTextColor="#BBB"
                autoCapitalize="sentences" // Hjälper mobilen att förstå förväntat format
                blurOnSubmit={false}
              />
           </View>
        </View>

        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.miniLabel}>TIMMAR</Text>
            <TextInput 
              keyboardType="decimal-pad" 
              value={newRow.hours} 
              onChangeText={v => setNewRow(s => ({...s, hours: decimalOnly(v)}))} 
              style={styles.input} 
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.miniLabel}>TIMPRIS</Text>
            <TextInput 
              keyboardType="decimal-pad" 
              value={newRow.hourPrice} 
              onChangeText={v => setNewRow(s => ({...s, hourPrice: decimalOnly(v)}))} 
              style={styles.input} 
            />
          </View>
        </View>

        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.miniLabel}>ANTAL BILAR</Text>
            <TextInput 
              keyboardType="decimal-pad" 
              value={newRow.cars} 
              onChangeText={v => setNewRow(s => ({...s, cars: decimalOnly(v)}))} 
              style={styles.input} 
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.miniLabel}>KOSTNAD / BIL</Text>
            <TextInput 
              keyboardType="decimal-pad" 
              value={newRow.carCost} 
              onChangeText={v => setNewRow(s => ({...s, carCost: decimalOnly(v)}))} 
              style={styles.input} 
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.miniLabel}>PÅSLAG (%)</Text>
            <TextInput 
              keyboardType="decimal-pad" 
              value={newRow.markup} 
              onChangeText={v => setNewRow(s => ({...s, markup: decimalOnly(v)}))} 
              style={styles.input} 
            />
          </View>
        </View>

        <View style={styles.buttonRow}>
            <TouchableOpacity 
                style={[styles.mainAddBtn, editingIndex !== null && { backgroundColor: '#FFB300' }]} 
                onPress={saveEntry}
            >
                <Text style={styles.mainAddBtnText}>
                    {editingIndex !== null ? "UPPDATERA LOGG" : "LÄGG TILL I LOGG"}
                </Text>
            </TouchableOpacity>
            
            {editingIndex !== null && (
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditingIndex(null); setNewRow(initialRowState); }}>
                    <Text style={styles.cancelBtnText}>Avbryt</Text>
                </TouchableOpacity>
            )}
        </View>
      </View>

      <Text style={styles.listTitle}>REGISTRERINGSHISTORIK</Text>
    </>
  );
});

export default function KostnaderScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { projects, selectedProject, updateProject } = useContext(ProjectsContext);
  
  const projectId = route.params?.project?.id || selectedProject?.id;
  const project = useMemo(() => {
    return projects.find(p => p.id === projectId) || selectedProject;
  }, [projects, projectId, selectedProject]);

  const [entries, setEntries] = useState([]);
  const [newRow, setNewRow] = useState(initialRowState);
  const [editingIndex, setEditingIndex] = useState(null);

  useEffect(() => {
    if (project?.kostnader) {
      setEntries(project.kostnader);
    } else {
      setEntries([]);
    }
  }, [project]);

  if (!project) return null;

  const saveEntry = async () => {
    if (!newRow.description.trim()) {
      Alert.alert("Information", "Beskrivning krävs.");
      return;
    }

    const h = parseFloat(newRow.hours) || 0;
    const hp = parseFloat(newRow.hourPrice) || 0;
    const b = parseFloat(newRow.cars) || 0;
    const bc = parseFloat(newRow.carCost) || 0;
    const mPercent = parseFloat(newRow.markup) || 0;

    const baseTotal = (h * hp) + (b * bc);
    const rowTotal = baseTotal * (1 + (mPercent / 100));

    const item = {
      ...newRow,
      hours: h,
      hourPrice: hp,
      cars: b,
      carCost: bc,
      markup: mPercent,
      total: rowTotal,
    };

    const currentList = project.kostnader || [];
    let updated = editingIndex !== null ? [...currentList] : [item, ...currentList];
    if (editingIndex !== null) updated[editingIndex] = item;

    try {
      await updateProject(project.id, { kostnader: updated });
      setNewRow(initialRowState);
      setEditingIndex(null);
      Keyboard.dismiss();
    } catch (e) {
      Alert.alert("Fel", "Kunde inte spara.");
    }
  };

  const deleteEntry = (index) => {
    Alert.alert("Radera?", "Vill du ta bort raderingen?", [
      { text: "Avbryt" },
      { text: "Radera", style: "destructive", onPress: async () => {
          const updated = (project.kostnader || []).filter((_, i) => i !== index);
          await updateProject(project.id, { kostnader: updated });
        }
      }
    ]);
  };

  const startEdit = (item, index) => {
    setNewRow({
      ...item,
      hours: String(item.hours),
      hourPrice: String(item.hourPrice || "0"),
      cars: String(item.cars || "0"),
      carCost: String(item.carCost || "0"),
      markup: String(item.markup || "0"),
    });
    setEditingIndex(index);
  };

  const totalSum = entries.reduce((acc, it) => acc + (parseFloat(it.total) || 0), 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <AppHeader title="KOSTNADER & TID" subTitle={project?.name} navigation={navigation} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <FlatList
          data={entries}
          keyExtractor={(_, i) => i.toString()}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100 }}
          ListHeaderComponent={
            <CostsHeader 
              totalSum={totalSum}
              entryCount={entries.length}
              newRow={newRow}
              setNewRow={setNewRow}
              saveEntry={saveEntry}
              editingIndex={editingIndex}
              setEditingIndex={setEditingIndex}
            />
          }
          renderItem={({ item, index }) => (
            <View style={styles.entryCard}>
              <View style={styles.entryMain}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryDesc}>{item.description}</Text>
                  <Text style={styles.entrySub}>
                    {item.date} • {item.hours}h ({item.hourPrice}:-) • {item.markup}% påslag
                  </Text>
                </View>
                <View style={styles.entryPriceArea}>
                  <Text style={styles.entryTotal}>{formatNumber(item.total)}:-</Text>
                  <Text style={styles.entryExclVat}>exkl. moms</Text>
                </View>
              </View>
              <View style={styles.entryActions}>
                <TouchableOpacity onPress={() => startEdit(item, index)} style={styles.actionBtn}>
                  <Ionicons name="pencil" size={16} color={WorkaholicTheme.colors.primary} />
                  <Text style={styles.actionBtnText}>Redigera</Text>
                </TouchableOpacity>
                <View style={styles.vDivider} />
                <TouchableOpacity onPress={() => deleteEntry(index)} style={styles.actionBtn}>
                  <Ionicons name="trash-outline" size={16} color={WorkaholicTheme.colors.error} />
                  <Text style={[styles.actionBtnText, {color: WorkaholicTheme.colors.error}]}>Radera</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  summaryCard: { backgroundColor: WorkaholicTheme.colors.primary, padding: 20, borderRadius: 25, marginBottom: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  summaryValue: { fontSize: 24, fontWeight: '900', color: '#FFF', marginTop: 4 },
  badge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  inputCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 25, marginBottom: 25, elevation: 2 },
  sectionLabel: { fontSize: 10, fontWeight: "900", color: "#CCC", letterSpacing: 1, marginBottom: 20 },
  inputRow: { flexDirection: "row", gap: 12, marginBottom: 15 },
  inputGroup: { flex: 1 },
  miniLabel: { fontSize: 9, color: "#AAA", marginBottom: 6, fontWeight: '900' },
  input: { backgroundColor: '#F5F5F7', borderRadius: 12, padding: 12, fontSize: 14, fontWeight: '700', color: '#1C1C1E' },
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 5 },
  mainAddBtn: { flex: 1, backgroundColor: WorkaholicTheme.colors.primary, padding: 16, borderRadius: 15, alignItems: 'center' },
  mainAddBtnText: { color: '#FFF', fontWeight: '900', fontSize: 14 },
  cancelBtn: { padding: 15 },
  cancelBtnText: { color: '#8E8E93', fontWeight: '800', fontSize: 13 },
  listTitle: { fontSize: 13, fontWeight: '900', color: '#8E8E93', marginBottom: 15, marginLeft: 5 },
  entryCard: { backgroundColor: '#FFF', borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#F0F0F0' },
  entryMain: { flexDirection: 'row', padding: 18, alignItems: 'center' },
  entryDesc: { fontSize: 15, fontWeight: '800', color: '#1C1C1E' },
  entrySub: { fontSize: 11, color: '#AAA', marginTop: 4 },
  entryPriceArea: { alignItems: 'flex-end', marginLeft: 10 },
  entryTotal: { fontSize: 16, fontWeight: '900', color: '#1C1C1E' },
  entryExclVat: { fontSize: 9, color: '#CCC', fontWeight: '800', marginTop: 2 },
  entryActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F8F8F8', backgroundColor: '#FAFAFA' },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, gap: 6 },
  actionBtnText: { fontSize: 12, fontWeight: '800', color: WorkaholicTheme.colors.primary },
  vDivider: { width: 1, backgroundColor: '#EEE' }
});