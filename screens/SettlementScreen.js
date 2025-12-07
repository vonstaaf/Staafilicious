// screens/AvstamningsScreen.js
import React, { useContext } from "react";
import { View, Text, StyleSheet } from "react-native";
import { GroupsContext, calculateTotal } from "../context/GroupsContext";
import { WorkaholicTheme } from "../theme";

const formatNumber = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "0";
  return parseFloat(Number(n).toFixed(2)).toString();
};

export default function AvstamningsScreen() {
  const { selectedGroup } = useContext(GroupsContext);

  if (!selectedGroup) {
    return (
      <View style={styles.container}>
        <Text style={styles.infoText}>Ingen grupp vald. Gå tillbaka och välj en grupp.</Text>
      </View>
    );
  }

  // 🔑 Summera totalpris för produkter
  const materialSum = calculateTotal(selectedGroup?.products || []);

  // 🔑 Summera inköpspris för produkter
  const sumPurchase = (selectedGroup?.products || []).reduce(
    (acc, it) => acc + (Number(it.purchasePrice) || 0) * (Number(it.quantity) || 1),
    0
  );

  // 🔑 Summera arbetskostnader (timkostnad + bilkostnad)
  const kostnader = selectedGroup?.kostnader || [];
  const sumBilkostnad = kostnader.reduce((acc, it) => acc + (Number(it.bilkostnad) || 0), 0);
  const sumArbetskostnad = kostnader.reduce(
    (acc, it) => acc + (Number(it.timmar) || 0) * (Number(it.timpris) || 0),
    0
  );
  const arbetskostnad = sumBilkostnad + sumArbetskostnad;

  // 🔑 Produktvinst = totalpris - inköpspris
  const productProfit = materialSum - sumPurchase;

  // 🔑 Total Kostnad = materialkostnad + arbetskostnad
  const totalKostnad = materialSum + arbetskostnad;

  // 🔑 Total Vinst = produktvinst + arbetskostnad
  const totalVinst = productProfit + arbetskostnad;

  return (
    <View style={styles.container}>
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Avstämning för grupp: {selectedGroup.name}</Text>
        <Text style={styles.infoText}>Kod: {selectedGroup.code}</Text>
      </View>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryText}>
          Materialkostnad: {formatNumber(materialSum)} kr
        </Text>
        <Text style={styles.summaryText}>
          Arbetskostnad: {formatNumber(arbetskostnad)} kr
        </Text>
        <Text style={styles.summaryText}>
          Produktvinst: {formatNumber(productProfit)} kr
        </Text>
        <Text style={styles.summaryText}>
          Total Kostnad: {formatNumber(totalKostnad)} kr
        </Text>
        <Text
          style={[
            styles.summaryText,
            { color: totalVinst >= 0 ? "lightgreen" : "red" },
          ]}
        >
          Total vinst: {formatNumber(totalVinst)} kr
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
    marginBottom: 6,
  },
});