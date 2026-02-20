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
  StatusBar
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth, logAnalyticsEvent } from "../firebaseConfig";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"; 
import Button from "../components/Button";
import { WorkaholicTheme } from "../theme";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Information", "Vänligen fyll i både e-post och lösenord.");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      logAnalyticsEvent("user_login", { method: "email" });
    } catch (error) {
      Alert.alert("Inloggning misslyckades", "Kontrollera dina uppgifter och försök igen.");
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert("E-post saknas", "Skriv in din e-postadress först så skickar vi en länk.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert("Mejl skickat", "En länk för att återställa ditt lösenord har skickats.");
      logAnalyticsEvent("forgot_password_click", { email: email.trim() });
    } catch (error) {
      Alert.alert("Kunde inte skicka", "Kontrollera att e-postadressen är korrekt.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.innerContainer, { paddingTop: insets.top + 20 }]}>
          
          <Image
            source={require("../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <View style={styles.welcomeHeader}>
            <Text style={styles.brandTitle}>WORKAHOLIC <Text style={{color: WorkaholicTheme.colors.primary}}>PRO</Text></Text>
            <Text style={styles.brandSub}>Logga in för att hantera dina projekt</Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color="#AAA" style={styles.inputIcon} />
              <TextInput
                placeholder="E-postadress"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.textInput}
                placeholderTextColor="#BBB"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color="#AAA" style={styles.inputIcon} />
              <TextInput
                placeholder="Lösenord"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                style={styles.textInput}
                placeholderTextColor="#BBB"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={WorkaholicTheme.colors.primary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              onPress={handleForgotPassword} 
              style={styles.forgotBtn}
            >
              <Text style={styles.forgotBtnText}>Glömt lösenord?</Text>
            </TouchableOpacity>

            <View style={styles.buttonStack}>
              <Button title="LOGGA IN" type="primary" onPress={handleLogin} />
              <TouchableOpacity 
                style={styles.registerLink} 
                onPress={() => navigation.navigate("Register")}
              >
                <Text style={styles.registerText}>Inget konto än? <Text style={styles.registerTextBold}>Skapa ett här</Text></Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <Text style={styles.versionText}>v2.4.0 — Secured by Workaholic Cloud</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingBottom: 40 },
  innerContainer: { paddingHorizontal: 30, alignItems: 'center' },
  
  logo: {
    width: width * 0.45,
    height: width * 0.45,
    marginBottom: 20,
  },
  
  welcomeHeader: { alignItems: 'center', marginBottom: 35 },
  brandTitle: { fontSize: 24, fontWeight: "900", color: "#1C1C1E", letterSpacing: -0.5 },
  brandSub: { fontSize: 13, color: "#AAA", fontWeight: "600", marginTop: 5 },

  formCard: { width: '100%', maxWidth: 400 },
  
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F7",
    borderRadius: 15,
    paddingHorizontal: 18,
    marginBottom: 15,
    height: 60,
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  inputIcon: { marginRight: 12 },
  textInput: {
    flex: 1,
    height: "100%",
    color: "#1C1C1E",
    fontSize: 15,
    fontWeight: "700",
  },
  eyeBtn: { padding: 5 },
  
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 25, paddingHorizontal: 5 },
  forgotBtnText: { color: '#BBB', fontWeight: "700", fontSize: 12 },
  
  buttonStack: { gap: 15 },
  registerLink: { alignSelf: 'center', marginTop: 10, padding: 10 },
  registerText: { color: '#8E8E93', fontSize: 13, fontWeight: '600' },
  registerTextBold: { color: WorkaholicTheme.colors.primary, fontWeight: '800' },
  
  versionText: { textAlign: 'center', fontSize: 9, color: '#DDD', fontWeight: '900', marginTop: 30, letterSpacing: 1 }
});