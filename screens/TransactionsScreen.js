// screens/TransactionsScreen.js
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
import { logAnalyticsEvent } from "../firebaseConfig";
import Button from "../components/Button";
import { WorkaholicTheme } from "../theme";

// Hjälpfunktioner
const formatNumber = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "";
  return parseFloat(Number(n).toFixed(2)).toString();
};
const capitalizeFirst = (text) => {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};
const numericOnly = (text) => text.replace(/[^0-9]/g, "");

export default function TransactionsScreen() {
  const { selectedGroup, updateTransactions } = useContext(GroupsContext);
  const [transactions, setTransactions] = useState([]);
  const [newRow, setNewRow] = useState({
    description: "",
    amount: "",
    carCost: "",
    quantity: "",
  });

  useEffect(() => {
    if (!selectedGroup) {
      Alert.alert("Ingen grupp vald", "Gå tillbaka och välj en grupp först.");
      return;
    }
    setTransactions(selectedGroup?.transactions || []);
  }, [selectedGroup]);

  const updateRowField = (index, field, value) => {
    const updated = [...transactions];
    updated[index] = {
      ...updated[index],
      [field]:
        ["amount", "carCost", "quantity"].includes(field) ? Number(value) : value,
    };
    setTransactions(updated);
  };

  const saveRow = async () => {
    if (!selectedGroup) return;
    await updateTransactions(selectedGroup.id, transactions);
    Alert.alert("Sparat", "Transaktioner har uppdaterats.");
  };

  const addTransaction = async () => {
    if (!selectedGroup) return;
    if (!newRow.description.trim()) {
      Alert.alert("Fel", "Ange en beskrivning.");
      return;
    }
    const newItem = {
      description: capitalizeFirst(newRow.description.trim()),
      amount: Number(newRow.amount) || 0,
      carCost: Number(newRow.carCost) || 0,
      quantity: Number(newRow.quantity) || 1,
    };
    const updated = [...transactions, newItem];
    setTransactions(updated);
    await updateTransactions(selectedGroup.id, updated);

    logAnalyticsEvent("transaction_created", {
      groupId: selectedGroup.id,
      description: newItem.description,
      amount: newItem.amount,
      carCost: newItem.carCost,
      quantity: newItem.quantity,
    });

    setNewRow({ description: "", amount: "", carCost: "", quantity: "" });
    Alert.alert("Transaktion tillagd", `${newItem.description} har lagts till.`);
  };

  // Summeringar tar hänsyn till antal
  const sumAmount = transactions.reduce(
    (acc, it) => acc + (Number(it.amount) || 0) * (Number(it.quantity) || 1),
    0
  );
  const sumCarCost = transactions.reduce(
    (acc, it) => acc + (Number(it.carCost) || 0) * (Number(it.quantity) || 1),
    0
  );

  const renderRow = ({ item, index }) => (
    <View style={styles.card}>
      {/* Rad 1 */}
      <View style={{ flexDirection: "row", marginBottom: 8 }}>
        <View style={{ flex: 2, marginRight: 8 }}>
          <Text style={styles.label}>Beskrivning</Text>
          <TextInput
            value={item.description}
            onChangeText={(v) =>
              updateRowField(index, "description", capitalizeFirst(v))
            }
            onEndEditing={saveRow}
            style={styles.input}
          />
        </View>
      </View>

      {/* Rad 2 */}
      <View style={{ flexDirection: "row", marginBottom: 8 }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.label}>Antal</Text>
          <TextInput
            value={String(item.quantity || 1)}
            onChangeText={(v) => updateRowField(index, "quantity", numericOnly(v))}
            onEndEditing={saveRow}
            keyboardType="numeric"
            style={styles.input}
          />
        </View>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.label}>Belopp (kr)</Text>
          <TextInput
            value={formatNumber(item.amount)}
            onChangeText={(v) => updateRowField(index, "amount", numericOnly(v))}
            onEndEditing={saveRow}
            keyboardType="numeric"
            style={styles.input}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Bilkostnad (kr)</Text>
          <TextInput
            value={formatNumber(item.carCost)}
            onChangeText={(v) => updateRowField(index, "carCost", numericOnly(v))}
            onEndEditing={saveRow}
            keyboardType="numeric"
            style={styles.input}
          />
        </View>
      </View>
    </View>
  );
    return (
    <View style={styles.container}>
      {/* Informationsbox */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>
          Grupp: {selectedGroup?.name} (Kod: {selectedGroup?.code})
        </Text>
        <Text style={styles.infoText}>
          Antal transaktioner: {transactions.length}
        </Text>
        <Text style={styles.infoText}>
          Summa belopp: {formatNumber(sumAmount)} kr
        </Text>
        <Text style={styles.infoText}>
          Summa bilkostnad: {formatNumber(sumCarCost)} kr
        </Text>
      </View>

      {/* Lista */}
      <FlatList
        data={transactions}
        keyExtractor={(item, i) => item.description || i.toString()}
        renderItem={renderRow}
        ListFooterComponent={
          <View style={{ marginTop: 12 }}>
            {/* Ny rad */}
            <View style={styles.card}>
              <View style={{ flexDirection: "row", marginBottom: 8 }}>
                <View style={{ flex: 2, marginRight: 8 }}>
                  <Text style={styles.label}>Beskrivning</Text>
                  <TextInput
                    value={newRow.description}
                    onChangeText={(v) =>
                      setNewRow((s) => ({
                        ...s,
                        description: capitalizeFirst(v),
                      }))
                    }
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
                  <Text style={styles.label}>Belopp (kr)</Text>
                  <TextInput
                    value={newRow.amount}
                    onChangeText={(v) =>
                      setNewRow((s) => ({ ...s, amount: numericOnly(v) }))
                    }
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Bilkostnad (kr)</Text>
                  <TextInput
                    value={newRow.carCost}
                    onChangeText={(v) =>
                      setNewRow((s) => ({ ...s, carCost: numericOnly(v) }))
                    }
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
              </View>
            </View>

            <Button
              title="Lägg till transaktion"
              type="primary"
              onPress={addTransaction}
            />

            {/* Summering */}
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>
                Summa belopp: {formatNumber(sumAmount)} kr
              </Text>
              <Text style={styles.summaryText}>
                Summa bilkostnad: {formatNumber(sumCarCost)} kr
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