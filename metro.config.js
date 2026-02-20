const { getDefaultConfig } = require("@expo/metro-config");

const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

// 1. Lägg till stöd för Firebase JS SDK (.mjs filer)
config.resolver.sourceExts.push("mjs");

// 2. Säkerställ att SVG eller andra specifika tillägg hanteras om du lägger till dem senare
// config.resolver.assetExts.push("glb", "gltf", "png", "jpg");

module.exports = config;