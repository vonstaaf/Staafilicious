// components/Button.js
import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { WorkaholicTheme } from "../theme";
import { useTheme } from "../context/ThemeContext";

export default function Button({
  title,
  onPress,
  type = "primary",
  style,
  disabled = false, // 🔑 stöd för disabled state
}) {
  const theme = useTheme();
  const backgroundColor =
    type === "primary"
      ? theme.colors.primary
      : type === "secondary"
      ? theme.colors.secondary
      : theme.colors.surface;

  const textColor =
    type === "primary" || type === "secondary"
      ? "#FFFFFF"
      : theme.colors.textPrimary;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: disabled ? theme.colors.textSecondary : backgroundColor },
        style,
      ]}
      onPress={disabled ? null : onPress}
      activeOpacity={disabled ? 1 : 0.8}
    >
      <Text
        style={[
          styles.text,
          { color: disabled ? "#ccc" : textColor },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: WorkaholicTheme.borderRadius.medium || 8, // 🔑 använd tema om tillgängligt
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
    shadowColor: "#000", // 🔑 lätt skugga för bättre UI
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  text: {
    fontSize: 16,
    fontWeight: "600", // 🔑 konsekvent med resten av appen
  },
});