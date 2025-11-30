// screens/ProductsScreen.js
import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Alert,
  StyleSheet,
} from "react-native";
import { GroupsContext } from "../context/GroupsContext";
import Button from "../components/Button"; // 🔑 Workaholic-knapp
import { WorkaholicTheme } from "../theme"; // 🔑 Workaholic färger

// Hjälpfunktioner
const formatNumber = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "";
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
const numericOnly = (text) => text.replace(/[^0-9]/g, "");

export default function ProductsScreen() {
  const { selectedGroup, updateProducts } = useContext(GroupsContext);
  const [products, setProducts] = useState([]);
  const [newRow, setNewRow] = useState({
    name: "",
    eNumber: "",
    purchasePrice: "",
    markup: "",
    vat: "",
    quantity: "",
  });

  useEffect(() => {
    if (!selectedGroup) {
      Alert.alert("Ingen grupp vald", "Gå tillbaka och välj en grupp först.");
      return;
    }
    setProducts(selectedGroup?.products || []);
  }, [selectedGroup]);

  const updateRowField = (index, field, value) => {
    const updated = [...products];
    updated[index] = {
      ...updated[index],
      [field]:
        ["purchasePrice", "markup", "vat", "quantity"].includes(field)
          ? Number(value)
          : value,
    };
    if (["purchasePrice", "markup", "vat"].includes(field)) {
      updated[index].totalPrice = computeTotal(
        updated[index].purchasePrice,
        updated[index].markup,
        updated[index].vat
      );
    }
    setProducts(updated);
  };

  const saveRow = async () => {
    if (!selectedGroup) return;
    await updateProducts(selectedGroup.id, products);
    Alert.alert("Sparat", "Produkter har uppdaterats.");
  };

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
    const updated = [...products, newItem];
    setProducts(updated);
    await updateProducts(selectedGroup.id, updated);
    setNewRow({
      name: "",
      eNumber: "",
      purchasePrice: "",
      markup: "",
      vat: "",
      quantity: "",
    });
    Alert.alert("Produkt tillagd", `${newItem.name} har lagts till.`);
  };
    // Summeringar tar hänsyn till antal
  const sumPurchase = products.reduce(
    (acc, it) =>
      acc + (Number(it.purchasePrice) || 0) * (Number(it.quantity) || 1),
    0
  );
  const sumTotal = products.reduce(
    (acc, it) =>
      acc + (Number(it.totalPrice) || 0) * (Number(it.quantity) || 1),
    0
  );

  return (
    <View style={styles.container}>
      {/* Informationsbox ovanför listan */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>
          Grupp: {selectedGroup?.name} (Kod: {selectedGroup?.code})
        </Text>
        <Text style={styles.infoText}>Antal produkter: {products.length}</Text>
        <Text style={styles.infoText}>
          Summa inköpspris: {formatNumber(sumPurchase)} kr
        </Text>
        <Text style={styles.infoText}>
          Summa totalpris: {formatNumber(sumTotal)} kr
        </Text>
      </View>

      {/* Lista produkter */}
      <FlatList
        data={products}
        keyExtractor={(item, i) => item.eNumber || i.toString()}
        renderItem={({ item, index }) => (
          <View style={styles.card}>
            {/* Rad 1 */}
            <View style={{ flexDirection: "row", marginBottom: 8 }}>
              <View style={{ flex: 2, marginRight: 8 }}>
                <Text style={styles.label}>Produktnamn</Text>
                <TextInput
                  value={item.name}
                  onChangeText={(v) =>
                    updateRowField(index, "name", capitalizeFirst(v))
                  }
                  onEndEditing={saveRow}
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>E-nummer</Text>
                <TextInput
                  value={item.eNumber}
                  onChangeText={(v) =>
                    updateRowField(index, "eNumber", numericOnly(v))
                  }
                  onEndEditing={saveRow}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
            </View>

            {/* Rad 2 */}
            <View style={{ flexDirection: "row" }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Antal</Text>
                <TextInput
                  value={String(item.quantity || 1)}
                  onChangeText={(v) =>
                    updateRowField(index, "quantity", numericOnly(v))
                  }
                  onEndEditing={saveRow}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Inköpspris (kr)</Text>
                <TextInput
                  value={formatNumber(item.purchasePrice)}
                  onChangeText={(v) =>
                    updateRowField(index, "purchasePrice", numericOnly(v))
                  }
                  onEndEditing={saveRow}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Påslag (%)</Text>
                <TextInput
                  value={formatNumber(item.markup)}
                  onChangeText={(v) =>
                    updateRowField(index, "markup", numericOnly(v))
                  }
                  onEndEditing={saveRow}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Moms (%)</Text>
                <TextInput
                  value={formatNumber(item.vat)}
                  onChangeText={(v) =>
                    updateRowField(index, "vat", numericOnly(v))
                  }
                  onEndEditing={saveRow}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View style={{ marginTop: 12 }}>
            {/* Ny rad för inmatning */}
            <View style={styles.card}>
              <View style={{ flexDirection: "row", marginBottom: 8 }}>
                <View style={{ flex: 2, marginRight: 8 }}>
                  <Text style={styles.label}>Produktnamn</Text>
                  <TextInput
                    value={newRow.name}
                    onChangeText={(v) =>
                      setNewRow((s) => ({ ...s, name: capitalizeFirst(v) }))
                    }
                    style={styles.input}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>E-nummer</Text>
                  <TextInput
                    value={newRow.eNumber}
                    onChangeText={(v) =>
                      setNewRow((s) => ({ ...s, eNumber: numericOnly(v) }))
                    }
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
              </View>
                            <View style={{ flexDirection: "row" }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Antal</Text>
                  <TextInput
                    value={newRow.quantity}
                    onChangeText={(v) =>
                      setNewRow((s) => ({ ...s, quantity: numericOnly(v) }))
                    }
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Inköpspris (kr)</Text>
                  <TextInput
                    value={newRow.purchasePrice}
                    onChangeText={(v) =>
                      setNewRow((s) => ({ ...s, purchasePrice: numericOnly(v) }))
                    }
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Påslag (%)</Text>
                  <TextInput
                    value={newRow.markup}
                    onChangeText={(v) =>
                      setNewRow((s) => ({ ...s, markup: numericOnly(v) }))
                    }
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Moms (%)</Text>
                  <TextInput
                    value={newRow.vat}
                    onChangeText={(v) =>
                      setNewRow((s) => ({ ...s, vat: numericOnly(v) }))
                    }
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
              </View>
            </View>

            <Button title="Lägg till produkt" type="primary" onPress={addProduct} />

            {/* Summeringsbox längst ner */}
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>
                Summa inköpspris: {formatNumber(sumPurchase)} kr
              </Text>
              <Text style={styles.summaryText}>
                Summa totalpris: {formatNumber(sumTotal)} kr
              </Text>
            </View>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: WorkaholicTheme.colors.background,
  },
  infoBox: {
    backgroundColor: WorkaholicTheme.colors.surface,
    padding: 16,
    borderRadius: WorkaholicTheme.borderRadius.medium || 10,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: WorkaholicTheme.colors.textPrimary,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 16,
    color: WorkaholicTheme.colors.textSecondary,
  },
  card: {
    backgroundColor: WorkaholicTheme.colors.surface,
    borderRadius: WorkaholicTheme.borderRadius.medium || 10,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontWeight: "600",
    color: WorkaholicTheme.colors.textPrimary,
    marginBottom: 4,
  },
  input: {
    borderBottomWidth: 1,
    borderColor: WorkaholicTheme.colors.secondary,
    textAlign: "left",
    paddingVertical: 4,
    color: WorkaholicTheme.colors.textPrimary,
  },
  summaryBox: {
    marginTop: 20,
    padding: 16,
    backgroundColor: WorkaholicTheme.colors.secondary,
    borderRadius: WorkaholicTheme.borderRadius.medium || 10,
    alignItems: "flex-start",
  },
  summaryText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});