// index.js

// 👇 Måste ligga allra högst upp för att navigation ska fungera korrekt
import "react-native-gesture-handler";

import { registerRootComponent } from "expo";
import App from "./App";

// ✅ Detta gör att Expo kan starta din App-komponent korrekt
registerRootComponent(App);