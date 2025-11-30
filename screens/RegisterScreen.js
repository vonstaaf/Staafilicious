// screens/RegisterScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { auth, db, logAnalyticsEvent } from "../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import Button from "../components/Button"; // 🔑 Workaholic-knapp
import { WorkaholicTheme } from "../theme";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window"); // 🔑 hämta skärmbredd

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 🔑 Hantera registrering
  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert("Fel", "Fyll i alla fält.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Fel", "Lösenordet måste vara minst 6 tecken.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Fel", "Lösenorden matchar inte.");
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 📦 Spara användare i Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        createdAt: new Date().toISOString(),
      });

      // 📊 Logga Analytics-event
      logAnalyticsEvent("user_signup", { method: "email" });

      Alert.alert("Konto skapat!", "Du är nu registrerad.");
      navigation.replace("Home"); // ✅ använd replace här
    } catch (error) {
      Alert.alert("Fel vid registrering", error.message || "Något gick fel vid registrering.");
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

          <Text style={styles.title}>Registrera konto</Text>

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

          {/* Lösenord */}
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

          {/* Bekräfta lösenord */}
          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Bekräfta lösenord"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              style={styles.textInput}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons
                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                size={24}
                color={WorkaholicTheme.colors.secondary}
              />
            </TouchableOpacity>
          </View>

          {/* Knappar */}
          <View style={styles.buttonContainer}>
            <Button title="Registrera" type="primary" onPress={handleRegister} />
            <Button
              title="Tillbaka till login"
              type="secondary"
              onPress={() => navigation.navigate("Login")} // ✅ navigate istället för replace
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
    padding: 20,
    backgroundColor: WorkaholicTheme.colors.background,
  },
  logo: {
    width: width * 0.7,   // 🔑 loggan tar 70% av skärmens bredd
    height: width * 0.7,  // kvadratisk
    alignSelf: "center",
    marginBottom: 30,
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