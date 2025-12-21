import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { auth, logAnalyticsEvent } from "../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import Button from "../components/Button";
import { WorkaholicTheme } from "../theme";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Fel", "Fyll i både email och lösenord.");
      return;
    }
    try {
      // Trimma email för att undvika dolda mellanslag
      await signInWithEmailAndPassword(auth, email.trim(), password);
      logAnalyticsEvent("user_login", { method: "email" });
    } catch (error) {
      Alert.alert("Fel vid inloggning", "Kontrollera dina uppgifter och försök igen.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: WorkaholicTheme.colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <Image
            source={require("../assets/workaholic_logo_white.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.title}>LOGGA IN</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#999" style={{ marginRight: 10 }} />
            <TextInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.textInput}
              placeholderTextColor="#AAA"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#999" style={{ marginRight: 10 }} />
            <TextInput
              placeholder="Lösenord"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              style={styles.textInput}
              placeholderTextColor="#AAA"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 5 }}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color={WorkaholicTheme.colors.primary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.buttonContainer}>
            <Button title="LOGGA IN" type="primary" onPress={handleLogin} />
            <Button
              title="SKAPA NYTT KONTO"
              type="secondary"
              onPress={() => navigation.navigate("Register")}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 30, // Mer padding för att det inte ska gå ut i kanterna
  },
  logo: {
    width: width * 0.45,
    height: width * 0.45,
    alignSelf: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 30,
    color: WorkaholicTheme.colors.primary,
    textAlign: "center",
    letterSpacing: 1,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEE", // Ljusare gräns för modernare look
    borderRadius: 12,
    backgroundColor: "#FFF",
    paddingHorizontal: 15,
    marginBottom: 15,
    height: 55, // Fast höjd för symmetri
    elevation: 2, // Liten skugga för djup
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  textInput: {
    flex: 1,
    height: "100%",
    color: "#333",
    fontSize: 15,
    fontWeight: "600",
  },
  buttonContainer: {
    marginTop: 15,
    gap: 12,
  },
});