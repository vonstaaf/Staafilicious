import InfoBox from "../components/InfoBox"; // ✅ gemensam komponent
import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Alert,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { GroupsContext } from "../context/GroupsContext";
import Button from "../components/Button";
import { WorkaholicTheme } from "../theme";

// Hjälpfunktioner
const formatNumber = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "0";
  return parseFloat(Number(n).toFixed(2)).toString();
};

const capitalizeFirst = (text) => {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const numericOnly = (text) => text.replace(/[^0-9]/g, "");

const getTodayDate = () => {
  const d = new Date();
  return d.toISOString().split("T")[0];
};

export default function KostnaderScreen() {
  const { selectedGroup, updateKostnader } = useContext(GroupsContext);
  const [kostnader, setKostnader] = useState([]);
  const [newRow, setNewRow] = useState({
    info: "",
    timmar: "",
    timpris: "",
    bilkostnad: "",
    datum: "",
  });
  const [editingIndex, setEditingIndex] = useState(null);

  useEffect(() => {
    if (!selectedGroup) {
      Alert.alert("Ingen grupp vald", "Gå tillbaka och välj en grupp först.");
      return;
    }
    setKostnader(selectedGroup?.kostnader || []);
  }, [selectedGroup]);

  const addKostnad = async () => {
    if (!selectedGroup) {
      Alert.alert("Fel", "Ingen grupp vald.");
      return;
    }
    if (!newRow.info.trim()) {
      Alert.alert("Fel", "Info krävs.");
      return;
    }

    const newItem = {
      info: capitalizeFirst(newRow.info.trim()),
      timmar: Number(numericOnly(newRow.timmar)) || 0,
      timpris: Number(numericOnly(newRow.timpris)) || 0,
      bilkostnad: Number(numericOnly(newRow.bilkostnad)) || 0,
      datum: newRow.datum.trim() ? newRow.datum.trim() : getTodayDate(),
    };

    let updated;
    if (editingIndex !== null) {
      updated = [...kostnader];
      updated[editingIndex] = newItem;
      setEditingIndex(null);
      Alert.alert("Ändrad", `${newItem.info} har uppdaterats.`);
    } else {
      updated = [...kostnader, newItem];
      Alert.alert("Kostnad tillagd", `${newItem.info} har lagts till.`);
    }

    setKostnader(updated);
    await updateKostnader(selectedGroup.id, updated);

    // ✅ Tömmer inmatningsrutorna efter tillägg
    setNewRow({ info: "", timmar: "", timpris: "", bilkostnad: "", datum: "" });
  };

  const deleteKostnad = async (index) => {
    const updated = kostnader.filter((_, i) => i !== index);
    setKostnader(updated);
    await updateKostnader(selectedGroup.id, updated);
    Alert.alert("Raderad", "Kostnaden har tagits bort.");
  };

  const editKostnad = (item, index) => {
    setNewRow({
      info: item.info,
      timmar: String(item.timmar),
      timpris: String(item.timpris),
      bilkostnad: String(item.bilkostnad),
      datum: item.datum,
    });
    setEditingIndex(index);
  };

  const sumTimmar = kostnader.reduce((acc, it) => acc + (Number(it.timmar) || 0), 0);
  const sumBilkostnad = kostnader.reduce((acc, it) => acc + (Number(it.bilkostnad) || 0), 0);
  const sumArbetskostnad = kostnader.reduce(
    (acc, it) => acc + (Number(it.timmar) || 0) * (Number(it.timpris) || 0),
    0
  );

  return (
    <View style={styles.container}>
      {/* ✅ Gemensam InfoBox */}
      <InfoBox
        title={`Grupp: ${selectedGroup?.name} (Kod: ${selectedGroup?.code})`}
        items={[
          `Antal kostnader: ${kostnader.length}`,
          `Totalt antal timmar: ${sumTimmar}`,
          `Summa timkostnad: ${formatNumber(sumArbetskostnad)} kr`,
          `Summa bilkostnad: ${formatNumber(sumBilkostnad)} kr`,
        ]}
      />
            {/* Inmatningsraden */}
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.flexItem}>
            <Text style={styles.label}>Info</Text>
            <TextInput
              value={newRow.info}
              onChangeText={(v) => setNewRow((s) => ({ ...s, info: capitalizeFirst(v) }))}
              style={styles.input}
              placeholder="Beskrivning"
            />
          </View>
          <View style={styles.flexItem}>
            <Text style={styles.label}>Datum</Text>
            <TextInput
              value={newRow.datum}
              onChangeText={(v) => setNewRow((s) => ({ ...s, datum: v }))}
              style={styles.input}
              placeholder={`t.ex. ${getTodayDate()}`}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.flexItem}>
            <Text style={styles.label}>Timmar</Text>
            <TextInput
              value={newRow.timmar}
              onChangeText={(v) => setNewRow((s) => ({ ...s, timmar: numericOnly(v) }))}
              keyboardType="numeric"
              style={styles.input}
              placeholder="t.ex. 8"
            />
          </View>
          <View style={styles.flexItem}>
            <Text style={styles.label}>Timpris</Text>
            <TextInput
              value={newRow.timpris}
              onChangeText={(v) => setNewRow((s) => ({ ...s, timpris: numericOnly(v) }))}
              keyboardType="numeric"
              style={styles.input}
              placeholder="t.ex. 500"
            />
          </View>
          <View style={styles.flexItem}>
            <Text style={styles.label}>Bilkostnad</Text>
            <TextInput
              value={newRow.bilkostnad}
              onChangeText={(v) => setNewRow((s) => ({ ...s, bilkostnad: numericOnly(v) }))}
              keyboardType="numeric"
              style={styles.input}
              placeholder="t.ex. 750"
            />
          </View>
        </View>

        <Button
          title={editingIndex !== null ? "Spara ändring" : "Lägg till kostnad"}
          type="primary"
          onPress={addKostnad}
        />
      </View>

      {/* Rubriker för kostnadslistan */}
      <FlatList
        data={kostnader}
        keyExtractor={(item, i) => `${i}-${item.info}`}
        ListHeaderComponent={
          <View style={styles.slimRowHeader}>
            <Text style={styles.slimHeader}>Info</Text>
            <Text style={styles.slimHeader}>Datum</Text>
            <Text style={styles.slimHeader}>Timmar</Text>
            <Text style={styles.slimHeader}>Timpris</Text>
            <Text style={styles.slimHeader}>Bilkostnad</Text>
            <Text style={styles.slimHeader}></Text>
          </View>
        }
        stickyHeaderIndices={[0]}
        renderItem={({ item, index }) => (
          <View style={styles.slimRow}>
            <Text style={styles.slimText}>{item.info}</Text>
            <Text style={styles.slimText}>{item.datum}</Text>
            <Text style={styles.slimText}>{item.timmar}h</Text>
            <Text style={styles.slimText}>{item.timpris} kr/h</Text>
            <Text style={styles.slimText}>{item.bilkostnad} kr</Text>

            <View style={styles.iconContainer}>
              <TouchableOpacity onPress={() => editKostnad(item, index)} style={styles.iconButton}>
                <Text style={styles.icon}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteKostnad(index)} style={styles.iconButton}>
                <Text style={styles.icon}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: WorkaholicTheme.colors.background },

  card: {
    backgroundColor: WorkaholicTheme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginBottom: 12 },
  flexItem: { flex: 1 },
  label: { fontWeight: "600", color: WorkaholicTheme.colors.textPrimary, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: WorkaholicTheme.colors.secondary,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
    color: WorkaholicTheme.colors.textPrimary,
  },

  slimRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  slimText: { fontSize: 14, color: WorkaholicTheme.colors.textPrimary, flex: 1, textAlign: "center" },

  slimRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 2,
    borderColor: "#aaa",
    backgroundColor: "#f7f7f7",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  slimHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: WorkaholicTheme.colors.textPrimary,
    flex: 1,
    textAlign: "center",
  },

  iconContainer: { flexDirection: "row", justifyContent: "flex-end", flex: 1 },
  iconButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#f0f0f0",
    marginHorizontal: 2,
  },
  icon: { fontSize: 18 },
});