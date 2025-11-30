// screens/LoadingScreen.js
import React from "react";
import { View, Text, ActivityIndicator, StyleSheet, Image } from "react-native";
import { WorkaholicTheme } from "../theme"; // 🔑 Workaholic färger

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      {/* 🔑 Logotyp */}
      <Image
        source={require("../assets/icon.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* 📄 Appnamn */}
      <Text style={styles.title}>Workaholic</Text>

      {/* 🔄 Spinner */}
      <ActivityIndicator
        size="large"
        color={WorkaholicTheme.colors.primary}
        style={styles.spinner}
      />

      {/* 📄 Text */}
      <Text style={styles.text}>Laddar din app...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WorkaholicTheme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20, // ✅ lite padding för bättre layout
  },
  logo: {
    width: 140, // ✅ något större logga för bättre synlighet
    height: 140,
    marginBottom: 25,
  },
  title: {
    fontSize: 28,
    fontWeight: "700", // ✅ konsekvent med övriga titlar
    color: WorkaholicTheme.colors.primary,
    marginBottom: 20,
    textAlign: "center",
  },
  spinner: {
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    color: WorkaholicTheme.colors.textSecondary,
    textAlign: "center", // ✅ centrerad text
  },
});