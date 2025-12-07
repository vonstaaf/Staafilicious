// components/InfoBox.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { WorkaholicTheme } from "../theme";

export default function InfoBox({ title, items }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoTitle}>{title}</Text>
      {items.map((line, i) => (
        <Text key={i} style={styles.infoText}>{line}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
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
});