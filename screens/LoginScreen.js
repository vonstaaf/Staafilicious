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
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"; // Tillagd: sendPasswordResetEmail
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
      await signInWithEmailAndPassword(auth, email.trim(), password);
      logAnalyticsEvent("user_login", { method: "email" });
    } catch (error) {
      Alert.alert("Fel vid inloggning", "Kontrollera dina uppgifter och försök igen.");
    }
  };

  // Ny funktion för att återställa lösenord
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert("E-post saknas", "Skriv in din e-postadress i fältet ovan först så skickar vi en återställningslänk.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert("Mejl skickat", "En länk för att återställa ditt lösenord har skickats till din e-post.");
      logAnalyticsEvent("forgot_password_click", { email: email.trim() });
    } catch (error) {
      Alert.alert("Kunde inte skicka mejl", "Kontrollera att e-postadressen är korrekt.");
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
            source={require("../assets/logo.png")}
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
            
            {/* Tillagd: Glömt lösenord-länk */}
            <TouchableOpacity 
              onPress={handleForgotPassword} 
              style={styles.forgotPasswordContainer}
            >
              <Text style={styles.forgotPasswordText}>Glömt lösenordet?</Text>
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
    width: width * 0.65,
    height: width * 0.65,
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
  // Nya stilar för glömt lösenord
  forgotPasswordContainer: {
    marginTop: 5,
    alignSelf: "center",
    padding: 10,
  },
  forgotPasswordText: {
    color: WorkaholicTheme.colors.primary,
    fontWeight: "600",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});