// babel.config.js
module.exports = function (api) {
  api.cache(true);

  return {
    presets: ["babel-preset-expo"], // ✅ Expo preset
    plugins: [
      // 👇 Viktigt: Reanimated måste ligga sist i plugins-arrayen
      "react-native-reanimated/plugin",
    ],
  };
};