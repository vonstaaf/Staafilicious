// screens/SettlementScreen.js
import React, { useContext } from "react";
import { View, Text, Alert, StyleSheet } from "react-native";
import { GroupsContext } from "../context/GroupsContext";
import { WorkaholicTheme } from "../theme"; // 🔑 Workaholic färger

// Hjälpfunktion för stor bokstav
const capitalizeFirst = (text) => {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export default function SettlementScreen() {
  const { selectedGroup } = useContext(GroupsContext);

  if (!selectedGroup) {
    Alert.alert("Ingen grupp vald", "Gå tillbaka och välj en grupp först.");
    return (
      <View style={styles.container}>
        <Text style={styles.infoTitle}>Ingen grupp vald</Text>
      </View>
    );
  }

  // Summera produkter och transaktioner (inklusive kvantitet)
  const totalProducts = selectedGroup.products?.reduce(
    (acc, p) => acc + (Number(p.totalPrice) || 0) * (Number(p.quantity) || 1),
    0
  );

  const totalTransactions = selectedGroup.transactions?.reduce(
    (acc, t) =>
      acc +
      (Number(t.amount) || 0) * (Number(t.quantity) || 1) +
      (Number(t.carCost) || 0) * (Number(t.quantity) || 1),
    0
  );

  // Beräkna avstämning
  const settlementBalance = totalTransactions - totalProducts;

  return (
    <View style={styles.container}>
      {/* Informationsbox */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>
          Grupp: {capitalizeFirst(selectedGroup?.name)} (Kod: {selectedGroup?.code})
        </Text>
        <Text style={styles.infoText}>
          Antal produkter: {selectedGroup.products?.length || 0}
        </Text>
        <Text style={styles.infoText}>
          Antal transaktioner: {selectedGroup.transactions?.length || 0}
        </Text>
      </View>

      {/* Summeringar */}
      <View style={styles.card}>
        <Text style={styles.label}>
          Summa produkter: {totalProducts.toFixed(2)} kr
        </Text>
        <Text style={styles.label}>
          Summa transaktioner: {totalTransactions.toFixed(2)} kr
        </Text>
      </View>

      {/* Avstämning */}
      <View
        style={[
          styles.settlementBox,
          {
            backgroundColor:
              settlementBalance >= 0
                ? WorkaholicTheme.colors.success || "#e7ffe7"
                : WorkaholicTheme.colors.error || "#ffe7e7",
          },
        ]}
      >
        <Text style={styles.settlementTitle}>
          Avstämning: {settlementBalance.toFixed(2)} kr
        </Text>
        <Text style={styles.infoText}>
          {settlementBalance >= 0
            ? "Transaktionerna täcker produkterna."
            : "Produkter kostar mer än transaktionerna."}
        </Text>
      </View>
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
    borderRadius: 10,
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
    backgroundColor: WorkaholicTheme.colors.surface, // ✅ använd temat
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: WorkaholicTheme.colors.textPrimary,
    marginBottom: 4,
  },
  settlementBox: {
    padding: 16,
    borderRadius: 10,
  },
  settlementTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: WorkaholicTheme.colors.textPrimary,
    marginBottom: 6,
  },
});