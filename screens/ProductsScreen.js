// screens/ProductsScreen.js
import InfoBox from "../components/InfoBox";
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

const computeTotal = (purchasePrice, markup, vat) => {
  const p = Number(purchasePrice) || 0;
  const m = Number(markup) || 0;
  const v = Number(vat) || 0;
  return p * (1 + m / 100) * (1 + v / 100);
};

const capitalizeFirst = (text) => {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const numericOnly = (text) => {
  if (!text) return "";
  return text.replace(/[^0-9]/g, "");
};

export default function ProductsScreen() {
  const { selectedGroup, updateProducts } = useContext(GroupsContext);
  const [products, setProducts] = useState([]);
  const [newRow, setNewRow] = useState({
    name: "",
    eNumber: "",
    purchasePrice: "",
    markup: "",
    vat: "",
    quantity: "1",
  });
  const [editingIndex, setEditingIndex] = useState(null);

  useEffect(() => {
    if (!selectedGroup) {
      Alert.alert("Ingen grupp vald", "Gå tillbaka och välj en grupp först.");
      return;
    }
    setProducts(selectedGroup?.products || []);
  }, [selectedGroup]);

  const addProduct = async () => {
    if (!selectedGroup) return;
    if (!newRow.name.trim() || !newRow.eNumber.trim()) {
      Alert.alert("Fel", "Ange både produktnamn och E‑nummer.");
      return;
    }

    const p = Number(newRow.purchasePrice) || 0;
    const m = Number(newRow.markup) || 0;
    const v = Number(newRow.vat) || 0;
    const q = Number(newRow.quantity) || 1;
    const total = computeTotal(p, m, v);

    const newItem = {
      name: capitalizeFirst(newRow.name.trim()),
      eNumber: numericOnly(newRow.eNumber.trim()),
      purchasePrice: p,
      markup: m,
      vat: v,
      quantity: q,
      totalPrice: total,
    };

    let updated;
    if (editingIndex !== null) {
      updated = [...products];
      updated[editingIndex] = newItem;
      setEditingIndex(null);
      Alert.alert("Ändrad", `${newItem.name} har uppdaterats.`);
    } else {
      updated = [...products, newItem];
      Alert.alert("Produkt tillagd", `${newItem.name} har lagts till.`);
    }

    setProducts(updated);
    await updateProducts(selectedGroup.id, updated);

    setNewRow({
      name: "",
      eNumber: "",
      purchasePrice: "",
      markup: "",
      vat: "",
      quantity: "1",
    });
  };

  const deleteProduct = async (index) => {
    const updated = products.filter((_, i) => i !== index);
    setProducts(updated);
    await updateProducts(selectedGroup.id, updated);
    Alert.alert("Raderad", "Produkten har tagits bort.");
  };

  const editProduct = (item, index) => {
    setNewRow({
      name: item.name,
      eNumber: String(item.eNumber),
      purchasePrice: String(item.purchasePrice),
      markup: String(item.markup),
      vat: String(item.vat),
      quantity: String(item.quantity),
    });
    setEditingIndex(index);
  };

  const sumPurchase = products.reduce(
    (acc, it) => acc + (Number(it.purchasePrice) || 0) * (Number(it.quantity) || 1),
    0
  );

  const sumTotal = products.reduce(
    (acc, it) => acc + (Number(it.totalPrice) || 0) * (Number(it.quantity) || 1),
    0
  );

  // ✅ Differens mellan totalpris och inköpspris
  const diffPurchaseVsTotal = sumTotal - sumPurchase;
    return (
    <View style={styles.container}>
      {/* Informationsbox ovanför listan */}
      <InfoBox
        title={`Grupp: ${selectedGroup?.name} (Kod: ${selectedGroup?.code})`}
        items={[
          `Antal produkter: ${products.length}`,
          `Summa inköpspris: ${formatNumber(sumPurchase)} kr`,
          `Summa totalpris: ${formatNumber(sumTotal)} kr`,
          `Vinst: ${formatNumber(diffPurchaseVsTotal)} kr`,
        ]}
      />

      {/* Inmatningsraden */}
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.flexItem}>
            <Text style={styles.label}>Produktnamn</Text>
            <TextInput
              value={newRow.name}
              onChangeText={(v) => setNewRow((s) => ({ ...s, name: capitalizeFirst(v) }))}
              style={styles.input}
              placeholder="t.ex. 2-Vägs uttag"
            />
          </View>
          <View style={styles.flexItem}>
            <Text style={styles.label}>E‑nummer</Text>
            <TextInput
              value={newRow.eNumber}
              onChangeText={(v) => setNewRow((s) => ({ ...s, eNumber: numericOnly(v) }))}
              keyboardType="numeric"
              style={styles.input}
              placeholder="t.ex. 4999998"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.flexItem}>
            <Text style={styles.label}>Antal</Text>
            <TextInput
              value={newRow.quantity}
              onChangeText={(v) => setNewRow((s) => ({ ...s, quantity: numericOnly(v) }))}
              keyboardType="numeric"
              style={styles.input}
              placeholder="t.ex. 5"
            />
          </View>
          <View style={styles.flexItem}>
            <Text style={styles.label}>Inköpspris</Text>
            <TextInput
              value={newRow.purchasePrice}
              onChangeText={(v) => setNewRow((s) => ({ ...s, purchasePrice: numericOnly(v) }))}
              keyboardType="numeric"
              style={styles.input}
              placeholder="t.ex. 250"
            />
          </View>
          <View style={styles.flexItem}>
            <Text style={styles.label}>Påslag (%)</Text>
            <TextInput
              value={newRow.markup}
              onChangeText={(v) => setNewRow((s) => ({ ...s, markup: numericOnly(v) }))}
              keyboardType="numeric"
              style={styles.input}
              placeholder="t.ex. 25"
            />
          </View>
          <View style={styles.flexItem}>
            <Text style={styles.label}>Moms (%)</Text>
            <TextInput
              value={newRow.vat}
              onChangeText={(v) => setNewRow((s) => ({ ...s, vat: numericOnly(v) }))}
              keyboardType="numeric"
              style={styles.input}
              placeholder="t.ex. 25"
            />
          </View>
        </View>

        <Button
          title={editingIndex !== null ? "Spara ändring" : "Lägg till produkt"}
          type="primary"
          onPress={addProduct}
        />
      </View>

      {/* Rubrikrad */}
      <FlatList
        data={products}
        keyExtractor={(item, i) => item.eNumber || i.toString()}
        ListHeaderComponent={
          <View style={styles.slimRowHeader}>
            <Text style={styles.slimHeader}>Produktnamn</Text>
            <Text style={styles.slimHeader}>E‑nummer</Text>
            <Text style={styles.slimHeader}>Antal</Text>
            <Text style={styles.slimHeader}>Inköpspris</Text>
            <Text style={styles.slimHeader}>Påslag %</Text>
            <Text style={styles.slimHeader}>Moms %</Text>
            <Text style={styles.slimHeader}></Text>
          </View>
        }
        stickyHeaderIndices={[0]}
        renderItem={({ item, index }) => (
          <View style={styles.slimRow}>
            <Text style={styles.slimText}>{item.name}</Text>
            <Text style={styles.slimText}>{item.eNumber}</Text>
            <Text style={styles.slimText}>{item.quantity}</Text>
            <Text style={styles.slimText}>{item.purchasePrice} kr</Text>
            <Text style={styles.slimText}>{item.markup} %</Text>
            <Text style={styles.slimText}>{item.vat} %</Text>

            <View style={styles.iconContainer}>
              <TouchableOpacity onPress={() => editProduct(item, index)} style={styles.iconButton}>
                <Text style={styles.icon}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteProduct(index)} style={styles.iconButton}>
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