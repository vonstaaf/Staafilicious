import React, { useContext, useEffect, useState } from "react";
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
  Keyboard
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ProjectsContext } from "../context/ProjectsContext";
import InfoBox from "../components/InfoBox";
import Button from "../components/Button";
import { WorkaholicTheme } from "../theme";

// --- HJÄLPFUNKTIONER ---
const formatNumber = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "0,00";
  return Number(n).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const capitalizeFirst = (text) => {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
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

export default function KostnaderScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { selectedProject, updateProject } = useContext(ProjectsContext);
  const [entries, setEntries] = useState([]);

  // --- PUNKT 9: UTÖKAT STATE FÖR ALLA FÄLT ---
  const initialRowState = {
    date: getTodayDate(),
    description: "",
    hours: "",
    hourPrice: "0",
    cars: "0",
    carCost: "0",
    markup: "0",
  };

  const [newRow, setNewRow] = useState(initialRowState);
  const [editingIndex, setEditingIndex] = useState(null);

  useEffect(() => {
    if (selectedProject?.kostnader) {
      setEntries(selectedProject.kostnader);
    } else {
      setEntries([]);
    }
  }, [selectedProject]);

  // --- PUNKT 8: SKYDD OM INGET PROJEKT ÄR VALT ---
  if (!selectedProject) {
    return (
      <View style={[styles.centeredContainer, { paddingTop: insets.top }]}>
        <Ionicons name="calculator-outline" size={80} color="#CCC" />
        <Text style={styles.noProjectText}>INGET PROJEKT VALT</Text>
        <Text style={styles.noProjectSub}>
          Välj ett projekt i listan för att kunna registrera tider och kostnader.
        </Text>
        <TouchableOpacity 
          style={styles.goBackBtn} 
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.goBackBtnText}>GÅ TILL PROJEKTLISTAN</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const saveEntry = async () => {
    if (!selectedProject || !newRow.description.trim()) {
      Alert.alert("Information", "Beskrivning krävs.");
      return;
    }

    // Konvertera strängar till tal för beräkning
    const h = parseFloat(newRow.hours) || 0;
    const hp = parseFloat(newRow.hourPrice) || 0;
    const b = parseFloat(newRow.cars) || 0;
    const bc = parseFloat(newRow.carCost) || 0;
    const m = parseFloat(newRow.markup) || 0;

    // Räkna ut radens totala kostnad (Punkt 1 Logik)
    const rowTotal = (h * hp) + (b * bc) + m;

    const item = {
      ...newRow,
      description: capitalizeFirst(newRow.description.trim()),
      hours: h,
      hourPrice: hp,
      cars: b,
      carCost: bc,
      markup: m,
      total: rowTotal, // Vi sparar totalen direkt för enklare summering senare
    };

    let updated = editingIndex !== null ? [...entries] : [item, ...entries];
    if (editingIndex !== null) updated[editingIndex] = item;

    try {
      await updateProject(selectedProject.id, { kostnader: updated });
      setNewRow(initialRowState);
      setEditingIndex(null);
      Keyboard.dismiss();
    } catch (e) {
      Alert.alert("Fel", "Kunde inte spara rader.");
    }
  };

  const deleteEntry = (index) => {
    Alert.alert("Radera", "Vill du ta bort raden från loggen?", [
      { text: "Avbryt", style: "cancel" },
      { text: "Radera", style: "destructive", onPress: async () => {
          const updated = entries.filter((_, i) => i !== index);
          await updateProject(selectedProject.id, { kostnader: updated });
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
  const formattedProjectName = selectedProject ? capitalizeFirst(selectedProject.name) : "";

  return (
    <View style={{ flex: 1, backgroundColor: WorkaholicTheme.colors.background }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <FlatList
          data={entries}
          keyExtractor={(_, i) => i.toString()}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 15, paddingBottom: insets.bottom + 100 }}
          ListHeaderComponent={
            <>
              <InfoBox 
                title="Arbetslogg & Kostnader" 
                items={[`Värde: ${formatNumber(totalSum)} kr`, `Projekt: ${formattedProjectName}`]} 
              />
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{editingIndex !== null ? "REDIGERA RAD" : "NY REGISTRERING"}</Text>
                
                <View style={styles.inputRow}>
                   <View style={{flex: 1.5}}>
                      <Text style={styles.miniLabel}>DATUM</Text>
                      <TextInput 
                        value={newRow.date} 
                        onChangeText={v => setNewRow(s => ({...s, date: v}))} 
                        style={styles.input} 
                      />
                   </View>
                   <View style={{flex: 3}}>
                      <Text style={styles.miniLabel}>BESKRIVNING</Text>
                      <TextInput
                        placeholder="Arbetsmoment..."
                        value={newRow.description}
                        onChangeText={(v) => setNewRow(s => ({ ...s, description: v }))}
                        style={styles.input}
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
                    <Text style={styles.miniLabel}>BILAR</Text>
                    <TextInput 
                      keyboardType="decimal-pad" 
                      value={newRow.cars} 
                      onChangeText={v => setNewRow(s => ({...s, cars: decimalOnly(v)}))} 
                      style={styles.input} 
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.miniLabel}>BILKOSTNAD</Text>
                    <TextInput 
                      keyboardType="decimal-pad" 
                      value={newRow.carCost} 
                      onChangeText={v => setNewRow(s => ({...s, carCost: decimalOnly(v)}))} 
                      style={styles.input} 
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.miniLabel}>PÅSLAG %</Text>
                     <TextInput keyboardType="decimal-pad" value={newRow.markup} onChangeText={v => setNewRow(s => ({...s, markup: decimalOnly(v)}))} style={styles.input} />
                     </View>
                </View>

                <View style={styles.buttonRow}>
                    <View style={{flex: 1}}>
                        <Button title={editingIndex !== null ? "UPPDATERA RAD" : "LÄGG TILL I LOGG"} type="primary" onPress={saveEntry} />
                    </View>
                    {editingIndex !== null && (
                        <TouchableOpacity style={{ marginLeft: 15, padding: 10 }} onPress={() => { setEditingIndex(null); setNewRow(initialRowState); }}>
                            <Text style={{color: '#666', fontWeight: '600'}}>Avbryt</Text>
                        </TouchableOpacity>
                    )}
                </View>
              </View>
              <Text style={styles.sectionTitle}>TIDIGARE REGISTRERINGAR</Text>
            </>
          }
          renderItem={({ item, index }) => (
            <View style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemInfo}>{item.description}</Text>
                <Text style={styles.itemSub}>
                  {item.date} • {item.hours}h ({item.hourPrice}:-) • {item.cars} bil • {formatNumber(item.total)} kr
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 15 }}>
                <TouchableOpacity onPress={() => startEdit(item, index)}>
                  <Ionicons name="pencil" size={20} color={WorkaholicTheme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteEntry(index)}>
                  <Ionicons name="trash-outline" size={20} color={WorkaholicTheme.colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 30, color: '#999', fontWeight: '600' }}>Inga registreringar än.</Text>}
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  // --- NYA STILAR FÖR PUNKT 8 ---
  centeredContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#F8F9FB', 
    padding: 30 
  },
  noProjectText: { 
    fontSize: 20, 
    fontWeight: '900', 
    color: '#1C1C1E', 
    marginTop: 20 
  },
  noProjectSub: { 
    fontSize: 14, 
    color: '#8E8E93', 
    textAlign: 'center', 
    marginTop: 10, 
    lineHeight: 20 
  },
  goBackBtn: {
    marginTop: 25,
    backgroundColor: WorkaholicTheme.colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    elevation: 2
  },
  goBackBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14
  },
  // --- EXISTERANDE STILAR ---
  card: { backgroundColor: "#fff", borderRadius: 15, padding: 15, marginBottom: 15, elevation: 4 },
  cardTitle: { fontSize: 14, fontWeight: "800", marginBottom: 15, color: WorkaholicTheme.colors.primary },
  inputRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  inputGroup: { flex: 1 },
  miniLabel: { fontSize: 9, color: "#999", marginBottom: 4, fontWeight: '800' },
  input: { borderWidth: 1, borderColor: "#EEE", borderRadius: 10, padding: 10, backgroundColor: "#F9F9F9", fontSize: 13, color: '#333', fontWeight: '600' },
  buttonRow: { flexDirection: 'row', marginTop: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#8E8E93', marginBottom: 10, marginTop: 5, letterSpacing: 0.5 },
  itemRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 15, borderRadius: 12, marginBottom: 8, elevation: 2 },
  itemInfo: { fontWeight: "700", fontSize: 14 },
  itemSub: { fontSize: 12, color: "#999", marginTop: 2 }
});