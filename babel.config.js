module.exports = function (api) {
  api.cache(true);

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Vi tar bort worklets-pluginet då det orsakar kraschen.
      // Reanimated hanterar det som behövs för dina Projekt.
      "react-native-reanimated/plugin", 
    ],
  };
};