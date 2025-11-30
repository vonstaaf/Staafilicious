// screens/LoginScreen.js
import React, { useState, useEffect } from "react";
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
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import Button from "../components/Button"; // 🔑 Workaholic-knapp
import { WorkaholicTheme } from "../theme";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window"); // 🔑 hämta skärmbredd

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // 🔑 Kolla auth-state och navigera till Home om användaren redan är inloggad
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigation.replace("Home"); // ✅ rätt att använda replace här
      }
    });
    return unsubscribe;
  }, []);

  // 🔑 Hantera login
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Fel", "Fyll i både email och lösenord.");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      logAnalyticsEvent("user_login", { method: "email" });
      navigation.replace("Home"); // ✅ använd replace här
    } catch (error) {
      Alert.alert("Fel vid inloggning", error.message || "Något gick fel vid inloggning.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.container}>
          {/* 🔑 Responsiv stor logga */}
          <Image
            source={require("../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.title}>Logga in</Text>

          {/* Email */}
          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.textInput}
            />
          </View>

          {/* Lösenord med ikon */}
          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Lösenord"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              style={styles.textInput}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={24}
                color={WorkaholicTheme.colors.secondary}
              />
            </TouchableOpacity>
          </View>

          {/* Knappar */}
          <View style={styles.buttonContainer}>
            <Button title="Logga in" type="primary" onPress={handleLogin} />
            <Button
              title="Registrera nytt konto"
              type="secondary"
              onPress={() => navigation.navigate("Register")} // ✅ navigate istället för replace
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
    padding: 0,
    backgroundColor: WorkaholicTheme.colors.background,
  },
  logo: {
    width: width * 0.5, // 🔑 loggan tar 50% av skärmens bredd
    height: width * 0.5, // kvadratisk
    alignSelf: "center",
    marginBottom: 0,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
    color: WorkaholicTheme.colors.primary,
    textAlign: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: WorkaholicTheme.colors.secondary,
    borderRadius: 8,
    backgroundColor: WorkaholicTheme.colors.surface,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  textInput: {
    flex: 1,
    padding: 10,
    color: WorkaholicTheme.colors.textPrimary,
  },
  buttonContainer: {
    marginTop: 20,
    gap: 12, // 🔑 ger mellanrum mellan knapparna
  },
});