// screens/LoginScreen.js
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
      await signInWithEmailAndPassword(auth, email, password);
      logAnalyticsEvent("user_login", { method: "email" });
      // ✅ Ingen navigation här – auth hanterar det via App.js
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
          <Image
            source={require("../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.title}>Logga in</Text>

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

          <View style={styles.buttonContainer}>
            <Button title="Logga in" type="primary" onPress={handleLogin} />
            <Button
              title="Registrera nytt konto"
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
    padding: 0,
    backgroundColor: WorkaholicTheme.colors.background,
  },
  logo: {
    width: width * 0.5,
    height: width * 0.5,
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
    gap: 12,
  },
});