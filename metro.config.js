const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 1. Lägg till stöd för Firebase JS SDK (.mjs filer)
// Vi kollar först så att den inte redan finns för att undvika dubbletter
if (!config.resolver.sourceExts.includes("mjs")) {
  config.resolver.sourceExts.push("mjs");
}

// 2. Om du använder SVG:er i framtiden via react-native-svg-transformer 
// kan du lägga till logik för det här, men just nu räcker detta.

module.exports = config;