// components/Logo.js
import React from "react";
import { Image, StyleSheet } from "react-native";

export default function Logo() {
  return (
    <Image
      source={require("../assets/logo.png")} // 🔑 se till att logo.png ligger i /assets
      style={styles.logo}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 120,
    height: 120,
    alignSelf: "center",
    marginBottom: 20,
  },
});