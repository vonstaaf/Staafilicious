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
import { Ionicons } from "@expo/vector-icons";
import { ProjectsContext } from "../context/ProjectsContext";
import InfoBox from "../components/InfoBox";
import Button from "../components/Button";
import { WorkaholicTheme } from "../theme";

// Hjälpfunktioner för formatering
const formatNumber = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "0,00";
  return Number(n).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const capitalizeFirst = (text) => {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// Förbättrad decimal-hantering som tillåter punkt/komma under inmatning
const decimalOnly = (text) => {
  // Ersätt komma med punkt för logiken
  let cleaned = text.replace(",", ".");
  
  // Tillåt siffror och max en punkt. 
  // Rensar bort allt utom siffror och den första punkten den hittar.
  cleaned = cleaned.replace(/[^0-9.]/g, "");
  
  const parts = cleaned.split(".");
  if (parts.length > 2) {
    // Om användaren skriver en andra punkt, behåll bara allt fram till den andra punkten
    cleaned = parts[0] + "." + parts[1];
  }
  return cleaned;
};

export default function ProductsScreen() {
  const { selectedProject, updateProjectData } = useContext(ProjectsContext);
  const [products, setProducts] = useState([]);
  
  const initialRowState = {
    name: "",
    articleNumber: "",
    purchasePrice: "",
    markup: "25", 
    quantity: "1",
  };

  const [newRow, setNewRow] = useState(initialRowState);
  const [editingIndex, setEditingIndex] = useState(null);

  useEffect(() => {
    if (selectedProject?.products) {
      setProducts(selectedProject.products);
    } else {
      setProducts([]);
    }
  }, [selectedProject]);

  const saveProduct = async () => {
    if (!selectedProject) return;
    if (!newRow.name.trim()) {
      Alert.alert("Information saknas", "Ange produktnamn.");
      return;
    }

    // Konvertera till siffror för beräkning
    const p = parseFloat(newRow.purchasePrice) || 0;
    const m = parseFloat(newRow.markup) || 0;
    const q = parseFloat(newRow.quantity) || 0;

    // Beräkna utpris exkl. moms
    const unitPriceOutExclVat = p * (1 + m / 100);

    const newItem = {
      name: capitalizeFirst(newRow.name.trim()),
      articleNumber: newRow.articleNumber.trim() || "-",
      purchasePrice: p,
      markup: m,
      quantity: q,
      unitPriceOutExclVat: unitPriceOutExclVat,
    };

    let updated;
    if (editingIndex !== null) {
      updated = [...products];
      updated[editingIndex] = newItem;
      setEditingIndex(null);
    } else {
      updated = [newItem, ...products];
    }

    try {
      await updateProjectData(selectedProject.id, { products: updated });
      setNewRow(initialRowState);
      Keyboard.dismiss();
    } catch (e) {
      Alert.alert("Fel", "Kunde inte spara produkten till projektet.");
    }
  };

  const deleteProduct = async (index) => {
    Alert.alert("Radera", "Vill du ta bort produkten?", [
      { text: "Avbryt", style: "cancel" },
      {
        text: "Radera",
        style: "destructive",
        onPress: async () => {
          const updated = products.filter((_, i) => i !== index);
          await updateProjectData(selectedProject.id, { products: updated });
        }
      }
    ]);
  };

  const startEdit = (item, index) => {
    setNewRow({
      name: item.name,
      articleNumber: item.articleNumber === "-" ? "" : item.articleNumber,
      purchasePrice: String(item.purchasePrice),
      markup: String(item.markup),
      quantity: String(item.quantity),
    });
    setEditingIndex(index);
  };

  const sumPurchase = products.reduce((acc, it) => acc + (Number(it.purchasePrice) * Number(it.quantity) || 0), 0);
  const sumTotalOutExclVat = products.reduce((acc, it) => acc + (Number(it.unitPriceOutExclVat) * Number(it.quantity) || 0), 0);

  if (!selectedProject) {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons name="cart-outline" size={80} color="#ccc" />
        <Text style={styles.noGroupText}>INGET AKTIVT PROJEKT VALT</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <FlatList
        data={products}
        keyExtractor={(_, i) => i.toString()}
        ListHeaderComponent={
          <>
            <InfoBox
              title={`Material: ${selectedProject.name}`}
              items={[
                `Antal artiklar: ${products.length} st`,
                `Totalt inköp: ${formatNumber(sumPurchase)} kr`,
                `Summa ut (exkl. moms): ${formatNumber(sumTotalOutExclVat)} kr`,
              ]}
            />

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{editingIndex !== null ? "REDIGERA PRODUKT" : "NY PRODUKT"}</Text>

              <View style={styles.inputRow}>
                <TextInput
                  placeholder="Produktnamn"
                  value={newRow.name}
                  onChangeText={(v) => setNewRow(s => ({ ...s, name: v }))}
                  style={[styles.input, { flex: 2 }]}
                  placeholderTextColor="#AAA"
                />
                <TextInput
                  placeholder="Art.nr"
                  value={newRow.articleNumber}
                  onChangeText={(v) => setNewRow(s => ({ ...s, articleNumber: v }))}
                  style={[styles.input, { flex: 1 }]}
                  placeholderTextColor="#AAA"
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.miniLabel}>ANTAL</Text>
                  <TextInput
                    value={newRow.quantity}
                    onChangeText={(v) => setNewRow(s => ({ ...s, quantity: decimalOnly(v) }))}
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.miniLabel}>INKÖPSPRIS</Text>
                  <TextInput
                    value={newRow.purchasePrice}
                    onChangeText={(v) => setNewRow(s => ({ ...s, purchasePrice: decimalOnly(v) }))}
                    keyboardType="decimal-pad"
                    style={styles.input}
                    placeholder="0.00"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.miniLabel}>PÅSLAG %</Text>
                  <TextInput
                    value={newRow.markup}
                    onChangeText={(v) => setNewRow(s => ({ ...s, markup: decimalOnly(v) }))}
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.buttonRow}>
                <View style={{ flex: 1 }}>
                  <Button
                    title={editingIndex !== null ? "SPARA ÄNDRING" : "LÄGG TILL MATERIAL"}
                    type="primary"
                    onPress={saveProduct}
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
            <Text style={styles.sectionTitle}>PRODUKTLISTA (EXKL. MOMS)</Text>
          </>
        }
        renderItem={({ item, index }) => (
          <View style={styles.itemRow}>
            <View style={{ flex: 2 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemSub}>Art.nr: {item.articleNumber} • {item.markup}% påslag</Text>
            </View>
            <View style={styles.itemRight}>
              <Text style={styles.itemTotal}>{formatNumber(item.unitPriceOutExclVat * item.quantity)}:-</Text>
              <Text style={styles.itemSub}>{item.quantity} st</Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity onPress={() => startEdit(item, index)} style={styles.actionBtn}>
                <Ionicons name="pencil" size={16} color={WorkaholicTheme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteProduct(index)} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={16} color={WorkaholicTheme.colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Inga produkter tillagda än.</Text>}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: WorkaholicTheme.colors.background },
  centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  noGroupText: { fontSize: 16, fontWeight: '800', color: '#666' },
  card: { backgroundColor: "#fff", borderRadius: 15, padding: 15, marginBottom: 15, elevation: 4 },
  cardTitle: { fontSize: 14, fontWeight: "800", marginBottom: 15, color: WorkaholicTheme.colors.primary },
  inputRow: { flexDirection: "row", gap: 10, marginBottom: 12, alignItems: 'flex-end' },
  inputGroup: { flex: 1 },
  miniLabel: { fontSize: 9, color: "#999", marginBottom: 4, fontWeight: '800' },
  input: { borderWidth: 1, borderColor: "#EEE", borderRadius: 10, padding: 10, backgroundColor: "#F9F9F9", fontSize: 13, fontWeight: '600', color: '#333' },
  buttonRow: { flexDirection: 'row', marginTop: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#8E8E93', marginBottom: 10, letterSpacing: 0.5 },
  itemRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 12, borderRadius: 12, marginBottom: 8, elevation: 2 },
  itemName: { fontWeight: "700", fontSize: 14, color: '#333' },
  itemSub: { fontSize: 11, color: "#888", marginTop: 2 },
  itemRight: { flex: 1, alignItems: 'flex-end', marginRight: 10 },
  itemTotal: { fontWeight: "800", fontSize: 14, color: '#000' },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: { padding: 8, backgroundColor: "#F5F5F5", borderRadius: 8 },
  emptyText: { textAlign: 'center', marginTop: 20, color: "#AAA", fontWeight: '600' }
});