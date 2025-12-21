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
import Button from "../components/Button";
import { WorkaholicTheme } from "../theme";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password.trim() || !confirmPassword.trim()) {
      Alert.alert("Information saknas", "Vänligen fyll i alla fält.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Lösenordet är för kort", "Lösenordet måste vara minst 6 tecken.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Matchningsfel", "Lösenorden stämmer inte överens.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      const user = userCredential.user;

      // Spara användardata i Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        createdAt: new Date().toISOString(),
      });

      logAnalyticsEvent("user_signup", { method: "email" });
      Alert.alert("Klart!", "Ditt konto har skapats.");
    } catch (error) {
      let msg = "Det gick inte att skapa kontot.";
      if (error.code === 'auth/email-already-in-use') msg = "E-postadressen används redan.";
      if (error.code === 'auth/invalid-email') msg = "Ogiltig e-postadress.";
      
      Alert.alert("Registreringsfel", msg);
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

          <Text style={styles.title}>SKAPA KONTO</Text>

          {/* Email Input */}
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

          {/* Password Input */}
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

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#999" style={{ marginRight: 10 }} />
            <TextInput
              placeholder="Bekräfta lösenord"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              style={styles.textInput}
              placeholderTextColor="#AAA"
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 5 }}>
              <Ionicons
                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color={WorkaholicTheme.colors.primary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.buttonContainer}>
            <Button title="REGISTRERA DIG" type="primary" onPress={handleRegister} />
            <TouchableOpacity 
              onPress={() => navigation.navigate("Login")}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>Redan medlem? Logga in här</Text>
            </TouchableOpacity>
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
    padding: 30,
  },
  logo: {
    width: width * 0.4,
    height: width * 0.4,
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
    borderColor: "#EEE",
    borderRadius: 12,
    backgroundColor: "#FFF",
    paddingHorizontal: 15,
    marginBottom: 15,
    height: 55,
    elevation: 2,
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
  backButton: {
    marginTop: 10,
    alignItems: 'center',
  },
  backButtonText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "600",
  },
});