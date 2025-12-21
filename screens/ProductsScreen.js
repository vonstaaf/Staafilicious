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
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { GroupsContext } from "../context/GroupsContext";
import Button from "../components/Button";
import { WorkaholicTheme } from "../theme";

// Hjälpfunktioner
const formatNumber = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "0";
  return new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
};

const computeTotal = (purchasePrice, markup, vat) => {
  const p = parseFloat(purchasePrice) || 0;
  const m = parseFloat(markup) || 0;
  const v = parseFloat(vat) || 0;
  return p * (1 + m / 100) * (1 + v / 100);
};

const capitalizeFirst = (text) => {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// Tillåter siffror och punkt/komma för decimaler
const decimalOnly = (text) => {
  return text.replace(/[^0-9.,]/g, "").replace(",", ".");
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

  // Synka lokalt state med molndatan när gruppen uppdateras (t.ex. av annan användare)
  useEffect(() => {
    if (selectedGroup?.products) {
      setProducts(selectedGroup.products);
    }
  }, [selectedGroup?.products]);

  const saveProduct = async () => {
    if (!selectedGroup) return;
    if (!newRow.name.trim() || !newRow.eNumber.trim()) {
      Alert.alert("Fel", "Ange både produktnamn och E‑nummer.");
      return;
    }

    const p = parseFloat(newRow.purchasePrice) || 0;
    const m = parseFloat(newRow.markup) || 0;
    const v = parseFloat(newRow.vat) || 0;
    const q = parseInt(newRow.quantity) || 1;
    const total = computeTotal(p, m, v);

    const newItem = {
      name: capitalizeFirst(newRow.name.trim()),
      eNumber: newRow.eNumber.trim(),
      purchasePrice: p,
      markup: m,
      vat: v,
      quantity: q,
      totalPrice: total, // Pris per styck inkl. allt
    };

    let updated;
    if (editingIndex !== null) {
      updated = [...products];
      updated[editingIndex] = newItem;
      setEditingIndex(null);
    } else {
      updated = [...products, newItem];
    }

    // Uppdatera molnet (Context anropar Firestore)
    await updateProducts(selectedGroup.id, updated);

    // Nollställ formulär
    setNewRow({ name: "", eNumber: "", purchasePrice: "", markup: "", vat: "", quantity: "1" });
  };

  const deleteProduct = async (index) => {
    Alert.alert("Radera", "Vill du ta bort produkten?", [
      { text: "Avbryt", style: "cancel" },
      { 
        text: "Radera", 
        style: "destructive", 
        onPress: async () => {
          const updated = products.filter((_, i) => i !== index);
          await updateProducts(selectedGroup.id, updated);
        } 
      }
    ]);
  };

  const startEdit = (item, index) => {
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

  // Summeringar
  const sumPurchase = products.reduce((acc, it) => acc + (it.purchasePrice * it.quantity), 0);
  const sumTotal = products.reduce((acc, it) => acc + (it.totalPrice * it.quantity), 0);
  const profit = sumTotal - sumPurchase;

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={styles.container}
    >
      <InfoBox
        title={`${selectedGroup?.name || "Ingen grupp"}`}
        items={[
          `Antal artiklar: ${products.length}`,
          `Totalt inköp: ${formatNumber(sumPurchase)} kr`,
          `Totalt ut: ${formatNumber(sumTotal)} kr`,
          `Vinst: ${formatNumber(profit)} kr`,
        ]}
      />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{editingIndex !== null ? "Redigera produkt" : "Ny produkt"}</Text>
        
        <View style={styles.inputRow}>
          <TextInput
            placeholder="Produktnamn"
            value={newRow.name}
            onChangeText={(v) => setNewRow(s => ({ ...s, name: v }))}
            style={[styles.input, { flex: 2 }]}
          />
          <TextInput
            placeholder="E-nummer"
            value={newRow.eNumber}
            onChangeText={(v) => setNewRow(s => ({ ...s, eNumber: v }))}
            keyboardType="numeric"
            style={[styles.input, { flex: 1 }]}
          />
        </View>

        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.miniLabel}>Antal</Text>
            <TextInput
              value={newRow.quantity}
              onChangeText={(v) => setNewRow(s => ({ ...s, quantity: decimalOnly(v) }))}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.miniLabel}>Inköp</Text>
            <TextInput
              value={newRow.purchasePrice}
              onChangeText={(v) => setNewRow(s => ({ ...s, purchasePrice: decimalOnly(v) }))}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.miniLabel}>Påslag %</Text>
            <TextInput
              value={newRow.markup}
              onChangeText={(v) => setNewRow(s => ({ ...s, markup: decimalOnly(v) }))}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.miniLabel}>Moms %</Text>
            <TextInput
              value={newRow.vat}
              onChangeText={(v) => setNewRow(s => ({ ...s, vat: decimalOnly(v) }))}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.buttonRow}>
          <View style={{ flex: 1 }}>
             <Button 
                title={editingIndex !== null ? "Spara" : "Lägg till"} 
                type="primary" 
                onPress={saveProduct} 
              />
          </View>
          {editingIndex !== null && (
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Button 
                title="Avbryt" 
                type="secondary" 
                onPress={() => {
                  setEditingIndex(null);
                  setNewRow({ name: "", eNumber: "", purchasePrice: "", markup: "", vat: "", quantity: "1" });
                }} 
              />
            </View>
          )}
        </View>
      </View>

      <FlatList
        data={products}
        keyExtractor={(_, i) => i.toString()}
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <Text style={[styles.headerText, { flex: 2, textAlign: 'left' }]}>Produkt</Text>
            <Text style={styles.headerText}>Antal</Text>
            <Text style={styles.headerText}>Totalt</Text>
            <Text style={styles.headerText}></Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={styles.itemRow}>
            <View style={{ flex: 2 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemSub}>{item.eNumber}</Text>
            </View>
            <Text style={styles.itemValue}>{item.quantity}st</Text>
            <Text style={styles.itemValue}>{formatNumber(item.totalPrice * item.quantity)}:-</Text>
            
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => startEdit(item, index)} style={styles.actionBtn}>
                <Text>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteProduct(index)} style={styles.actionBtn}>
                <Text>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: WorkaholicTheme.colors.background },
  card: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  cardTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 10, color: WorkaholicTheme.colors.primary },
  inputRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  inputGroup: { flex: 1 },
  miniLabel: { fontSize: 10, color: "#888", marginBottom: 2 },
  input: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 8,
    backgroundColor: "#f9f9f9",
    fontSize: 14,
  },
  buttonRow: { flexDirection: 'row', marginTop: 5 },
  headerRow: {
    flexDirection: "row",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: "#ccc",
    marginBottom: 5,
  },
  headerText: { flex: 1, fontWeight: "bold", fontSize: 12, textAlign: 'center', color: "#666" },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  itemName: { fontWeight: "bold", fontSize: 14 },
  itemSub: { fontSize: 11, color: "#888" },
  itemValue: { flex: 1, textAlign: 'center', fontSize: 13 },
  actions: { flexDirection: "row", gap: 10 },
  actionBtn: { padding: 5, backgroundColor: "#f0f0f0", borderRadius: 5 }
});