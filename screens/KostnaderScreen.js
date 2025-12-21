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
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { ProjectsContext } from "../context/ProjectsContext";
import InfoBox from "../components/InfoBox";
import Button from "../components/Button";
import { WorkaholicTheme } from "../theme";

// Hjälpfunktioner
const formatNumber = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "0,00";
  return Number(n).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const capitalizeFirst = (text) => {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const decimalOnly = (text) => {
  // Tillåter siffror och gör om komma till punkt, men tillåter bara EN punkt
  let cleaned = text.replace(",", ".").replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) cleaned = parts[0] + "." + parts.slice(1).join("");
  return cleaned;
};

const getTodayDate = () => {
  const d = new Date();
  return d.toISOString().split("T")[0];
};

export default function KostnaderScreen() {
  const { selectedProject, updateProjectData } = useContext(ProjectsContext);
  const navigation = useNavigation();
  const [kostnader, setKostnader] = useState([]);
  
  const initialRowState = {
    info: "",
    timmar: "",
    timpris: "650", 
    bilkostnad: "",
    antalBilar: "1",
    datum: getTodayDate(),
  };

  const [newRow, setNewRow] = useState(initialRowState);
  const [editingIndex, setEditingIndex] = useState(null);

  useEffect(() => {
    if (selectedProject?.kostnader) {
      setKostnader(selectedProject.kostnader);
    } else {
      setKostnader([]);
    }
  }, [selectedProject]);

  if (!selectedProject) {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons name="construct-outline" size={80} color="#ccc" />
        <Text style={styles.noGroupText}>INGET AKTIVT PROJEKT VALT</Text>
        <Button 
          title="GÅ TILL HEM" 
          type="primary" 
          onPress={() => navigation.navigate("Home")} 
        />
      </View>
    );
  }

  const handleSave = async () => {
    if (!newRow.info.trim() || !newRow.timmar || !newRow.timpris) {
      Alert.alert("Information saknas", "Beskrivning, timmar och timpris krävs.");
      return;
    }

    const timmar = parseFloat(newRow.timmar) || 0;
    const timpris = parseFloat(newRow.timpris) || 0;
    const bilkostnad = parseFloat(newRow.bilkostnad) || 0;
    const antalBilar = parseInt(newRow.antalBilar) || 0;

    const newItem = {
      info: capitalizeFirst(newRow.info.trim()),
      timmar,
      timpris,
      bilkostnad,
      antalBilar,
      datum: newRow.datum.trim() || getTodayDate(),
      totalExclVat: (timmar * timpris) + (bilkostnad * antalBilar)
    };

    let updated;
    if (editingIndex !== null) {
      updated = [...kostnader];
      updated[editingIndex] = newItem;
      setEditingIndex(null);
    } else {
      updated = [newItem, ...kostnader];
    }

    try {
      await updateProjectData(selectedProject.id, { kostnader: updated });
      setNewRow(initialRowState);
      Keyboard.dismiss();
    } catch (e) {
      Alert.alert("Fel", "Kunde inte spara till projektet.");
    }
  };

  const deleteItem = async (index) => {
    Alert.alert("Radera", "Vill du ta bort denna post?", [
      { text: "Avbryt", style: "cancel" },
      { 
        text: "Radera", 
        style: "destructive", 
        onPress: async () => {
          const updated = kostnader.filter((_, i) => i !== index);
          await updateProjectData(selectedProject.id, { kostnader: updated });
        }
      }
    ]);
  };

  const startEdit = (item, index) => {
    setNewRow({
      info: item.info,
      timmar: String(item.timmar),
      timpris: String(item.timpris),
      bilkostnad: String(item.bilkostnad || ""),
      antalBilar: String(item.antalBilar || "1"),
      datum: item.datum,
    });
    setEditingIndex(index);
  };

  const sumTimmar = kostnader.reduce((acc, it) => acc + (Number(it.timmar) || 0), 0);
  const totalSumExclVat = kostnader.reduce((acc, it) => acc + (Number(it.totalExclVat) || 0), 0);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={styles.container}
    >
      <FlatList
        data={kostnader}
        keyExtractor={(_, i) => i.toString()}
        ListHeaderComponent={
          <>
            <InfoBox
              title={`Arbetslogg: ${selectedProject.name}`}
              items={[
                `Totalt arbetat: ${sumTimmar} h`,
                `Summa exkl. moms: ${formatNumber(totalSumExclVat)} kr`,
              ]}
            />

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{editingIndex !== null ? "REDIGERA POST" : "NY LOGGPOST"}</Text>
              
              <View style={styles.inputRow}>
                <TextInput
                  placeholder="Beskrivning (t.ex. Installation)"
                  value={newRow.info}
                  onChangeText={(v) => setNewRow(s => ({ ...s, info: v }))}
                  style={[styles.input, { flex: 2 }]}
                  placeholderTextColor="#AAA"
                />
                <TextInput
                  placeholder="ÅÅÅÅ-MM-DD"
                  value={newRow.datum}
                  onChangeText={(v) => setNewRow(s => ({ ...s, datum: v }))}
                  style={[styles.input, { flex: 1 }]}
                  placeholderTextColor="#AAA"
                />
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.miniLabel}>TIMMAR</Text>
                  <TextInput
                    value={newRow.timmar}
                    onChangeText={(v) => setNewRow(s => ({ ...s, timmar: decimalOnly(v) }))}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.miniLabel}>PRIS/H</Text>
                  <TextInput
                    value={newRow.timpris}
                    onChangeText={(v) => setNewRow(s => ({ ...s, timpris: decimalOnly(v) }))}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.miniLabel}>BILPRIS</Text>
                  <TextInput
                    value={newRow.bilkostnad}
                    onChangeText={(v) => setNewRow(s => ({ ...s, bilkostnad: decimalOnly(v) }))}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.miniLabel}>ANTAL BIL</Text>
                  <TextInput
                    value={newRow.antalBilar}
                    onChangeText={(v) => setNewRow(s => ({ ...s, antalBilar: v.replace(/[^0-9]/g, "") }))}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.buttonRow}>
                <View style={{ flex: 1 }}>
                  <Button 
                    title={editingIndex !== null ? "SPARA ÄNDRING" : "LÄGG TILL I LOGG"} 
                    type="primary" 
                    onPress={handleSave} 
                  />
                </View>
                {editingIndex !== null && (
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Button 
                      title="AVBRYT" 
                      type="secondary" 
                      onPress={() => {
                        setEditingIndex(null);
                        setNewRow(initialRowState);
                        Keyboard.dismiss();
                      }} 
                    />
                  </View>
                )}
              </View>
            </View>
            <Text style={styles.sectionTitle}>LOGGADE POSTER (EXKL. MOMS)</Text>
          </>
        }
        renderItem={({ item, index }) => (
          <View style={styles.itemRow}>
            <View style={{ flex: 2 }}>
              <Text style={styles.itemInfo}>{item.info}</Text>
              <Text style={styles.itemDate}>{item.datum} • {item.timmar}h á {item.timpris}:-</Text>
            </View>
            <View style={styles.itemValues}>
              <Text style={styles.mainValue}>{formatNumber(item.totalExclVat)}:-</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => startEdit(item, index)} style={styles.actionBtn}>
                <Ionicons name="pencil" size={16} color={WorkaholicTheme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteItem(index)} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={16} color={WorkaholicTheme.colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Inga poster loggade än för detta projekt.</Text>}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: WorkaholicTheme.colors.background },
  centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  noGroupText: { fontSize: 16, fontWeight: '800', marginBottom: 20, color: '#666' },
  card: { backgroundColor: "#fff", borderRadius: 15, padding: 15, marginBottom: 15, elevation: 4 },
  cardTitle: { fontSize: 14, fontWeight: "800", marginBottom: 15, color: WorkaholicTheme.colors.primary },
  inputRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  inputGroup: { flex: 1 },
  miniLabel: { fontSize: 9, color: "#999", marginBottom: 4, fontWeight: '800' },
  input: { borderWidth: 1, borderColor: "#EEE", borderRadius: 10, padding: 10, backgroundColor: "#F9F9F9", fontSize: 13, color: '#333', fontWeight: '600' },
  buttonRow: { flexDirection: 'row', marginTop: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#8E8E93', marginBottom: 10, marginTop: 5, letterSpacing: 0.5 },
  itemRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 12, borderRadius: 12, marginBottom: 8, elevation: 2 },
  itemInfo: { fontWeight: "700", fontSize: 14, color: '#333' },
  itemDate: { fontSize: 11, color: "#888", marginTop: 2 },
  itemValues: { flex: 1, alignItems: 'flex-end', marginRight: 10 },
  mainValue: { fontSize: 14, fontWeight: "800", color: "#333" },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: { padding: 8, backgroundColor: "#F5F5F5", borderRadius: 8 },
  emptyText: { textAlign: 'center', marginTop: 20, color: "#AAA", fontWeight: '600' }
});