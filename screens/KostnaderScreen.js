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
import { GroupsContext } from "../context/GroupsContext";
import InfoBox from "../components/InfoBox";
import Button from "../components/Button";
import { WorkaholicTheme } from "../theme";

// Hjälpfunktioner
const formatNumber = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "0";
  return new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 2 }).format(n);
};

const capitalizeFirst = (text) => {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const decimalOnly = (text) => {
  return text.replace(/[^0-9.,]/g, "").replace(",", ".");
};

const getTodayDate = () => {
  const d = new Date();
  return d.toISOString().split("T")[0];
};

export default function KostnaderScreen() {
  const { selectedGroup, updateKostnader } = useContext(GroupsContext);
  const navigation = useNavigation();
  const [kostnader, setKostnader] = useState([]);
  const [newRow, setNewRow] = useState({
    info: "",
    timmar: "",
    timpris: "",
    bilkostnad: "",
    antalBilar: "1", // ✅ Nytt fält
    datum: getTodayDate(),
  });
  const [editingIndex, setEditingIndex] = useState(null);

  // Synka lokal state med context/firestore
  useEffect(() => {
    if (selectedGroup?.kostnader) {
      setKostnader(selectedGroup.kostnader);
    } else {
      setKostnader([]);
    }
  }, [selectedGroup]);

  if (!selectedGroup) {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons name="layers-outline" size={80} color="#ccc" />
        <Text style={styles.noGroupText}>Ingen aktiv grupp vald</Text>
        <Text style={styles.noGroupSubText}>Välj ett projekt på hem-skärmen först.</Text>
        <Button 
          title="Gå till Hem" 
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

    const newItem = {
      info: capitalizeFirst(newRow.info.trim()),
      timmar: parseFloat(newRow.timmar) || 0,
      timpris: parseFloat(newRow.timpris) || 0,
      bilkostnad: parseFloat(newRow.bilkostnad) || 0,
      antalBilar: parseInt(newRow.antalBilar) || 1, // ✅ Spara antal bilar
      datum: newRow.datum.trim() || getTodayDate(),
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
      await updateKostnader(selectedGroup.id, updated);
      setNewRow({ 
        info: "", 
        timmar: "", 
        timpris: newItem.timpris.toString(), 
        bilkostnad: "", 
        antalBilar: "1",
        datum: getTodayDate() 
      });
      Keyboard.dismiss();
    } catch (e) {
      Alert.alert("Fel", "Kunde inte spara.");
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
          await updateKostnader(selectedGroup.id, updated);
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

  // Beräkningar för InfoBox (Inkluderar antal bilar)
  const sumTimmar = kostnader.reduce((acc, it) => acc + (Number(it.timmar) || 0), 0);
  const sumBilkostnad = kostnader.reduce((acc, it) => {
    const bilar = Number(it.antalBilar) || 1;
    return acc + ((Number(it.bilkostnad) || 0) * bilar);
  }, 0);
  const sumArbetskostnad = kostnader.reduce((acc, it) => acc + (Number(it.timmar) * Number(it.timpris) || 0), 0);
  const totalSum = sumArbetskostnad + sumBilkostnad;

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
              title={`Logg: ${selectedGroup.name}`}
              items={[
                `Totalt timmar: ${sumTimmar} h`,
                `Arbete: ${formatNumber(sumArbetskostnad)} kr`,
                `Bil/Övrigt: ${formatNumber(sumBilkostnad)} kr`,
                `TOTALT: ${formatNumber(totalSum)} kr`,
              ]}
            />

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{editingIndex !== null ? "Redigera post" : "Ny loggpost"}</Text>
              
              <View style={styles.inputRow}>
                <TextInput
                  placeholder="Beskrivning"
                  value={newRow.info}
                  onChangeText={(v) => setNewRow(s => ({ ...s, info: v }))}
                  style={[styles.input, { flex: 2 }]}
                />
                <TextInput
                  placeholder="Datum"
                  value={newRow.datum}
                  onChangeText={(v) => setNewRow(s => ({ ...s, datum: v }))}
                  style={[styles.input, { flex: 1 }]}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.miniLabel}>Timmar</Text>
                  <TextInput
                    value={newRow.timmar}
                    onChangeText={(v) => setNewRow(s => ({ ...s, timmar: decimalOnly(v) }))}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.miniLabel}>Pris/h</Text>
                  <TextInput
                    value={newRow.timpris}
                    onChangeText={(v) => setNewRow(s => ({ ...s, timpris: decimalOnly(v) }))}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.miniLabel}>Bilpris (st)</Text>
                  <TextInput
                    value={newRow.bilkostnad}
                    onChangeText={(v) => setNewRow(s => ({ ...s, bilkostnad: decimalOnly(v) }))}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.miniLabel}>Antal bilar</Text>
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
                    title={editingIndex !== null ? "Spara ändring" : "Lägg till"} 
                    type="primary" 
                    onPress={handleSave} 
                  />
                </View>
                {editingIndex !== null && (
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Button 
                      title="Avbryt" 
                      type="secondary" 
                      onPress={() => {
                        setEditingIndex(null);
                        setNewRow({ info: "", timmar: "", timpris: "", bilkostnad: "", antalBilar: "1", datum: getTodayDate() });
                      }} 
                    />
                  </View>
                )}
              </View>
            </View>
          </>
        }
        renderItem={({ item, index }) => {
          const bilar = Number(item.antalBilar) || 1;
          const bilSumma = (Number(item.bilkostnad) || 0) * bilar;
          return (
            <View style={styles.itemRow}>
              <View style={{ flex: 2 }}>
                <Text style={styles.itemInfo}>{item.info}</Text>
                <Text style={styles.itemDate}>{item.datum}</Text>
              </View>
              <View style={styles.itemValues}>
                <Text style={styles.mainValue}>{item.timmar}h × {item.timpris}:-</Text>
                {bilSumma > 0 && (
                  <Text style={styles.subValue}>
                    Bil: {bilSumma}:- ({bilar}st)
                  </Text>
                )}
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
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyText}>Inga poster loggade än.</Text>}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: WorkaholicTheme.colors.background },
  centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  noGroupText: { fontSize: 20, fontWeight: 'bold', marginTop: 20 },
  noGroupSubText: { textAlign: 'center', color: '#666', marginBottom: 30, marginTop: 10 },
  card: { backgroundColor: "#fff", borderRadius: 15, padding: 15, marginBottom: 15, elevation: 4 },
  cardTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 10, color: WorkaholicTheme.colors.primary },
  inputRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  inputGroup: { flex: 1 },
  miniLabel: { fontSize: 10, color: "#888", marginBottom: 2 },
  input: { borderWidth: 1, borderColor: "#eee", borderRadius: 8, padding: 8, backgroundColor: "#f9f9f9" },
  buttonRow: { flexDirection: 'row', marginTop: 10 },
  itemRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 12, borderRadius: 12, marginBottom: 8, elevation: 2 },
  itemInfo: { fontWeight: "bold", fontSize: 14 },
  itemDate: { fontSize: 11, color: "#888" },
  itemValues: { flex: 1.5, alignItems: 'flex-end', marginRight: 10 },
  mainValue: { fontSize: 13, fontWeight: "600" },
  subValue: { fontSize: 11, color: WorkaholicTheme.colors.secondary },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: { padding: 10, backgroundColor: "#f5f5f5", borderRadius: 8 },
  emptyText: { textAlign: 'center', marginTop: 20, color: "#999" }
});