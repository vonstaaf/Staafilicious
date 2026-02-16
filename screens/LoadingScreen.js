// screens/LoadingScreen.js
import React from "react";
import { View, Text, ActivityIndicator, StyleSheet, Image } from "react-native";
import { WorkaholicTheme } from "../theme"; 

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      {/* 🔑 Ändrad från icon.png till logo.png för att matcha din asset-mapp */}
      <Image
        source={require("../assets/logo.png")} 
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>Workaholic</Text>

      <ActivityIndicator
        size="large"
        color={WorkaholicTheme.colors.primary}
        style={styles.spinner}
      />

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
    paddingHorizontal: 20,
  },
  logo: {
    width: 140, 
    height: 140,
    marginBottom: 25,
  },
  title: {
    fontSize: 28,
    fontWeight: "700", 
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
    textAlign: "center",
  },
});