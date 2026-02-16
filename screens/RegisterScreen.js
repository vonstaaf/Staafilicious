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
  ActivityIndicator,
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
  const [loading, setLoading] = useState(false);
  
  // NYTT: State för yrkesval (default 'bygg' om man missar att välja)
  const [profession, setProfession] = useState("bygg");

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

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      const user = userCredential.user;

      // VIKTIGT: Här sparar vi både det nya "profession" OCH de gamla fälten (logoUrl etc)
      // så att SettingsScreen och PDF-generering fungerar som förr.
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        profession: profession, // "el", "vvs" eller "bygg"
        logoUrl: null,          // Behövs för att appen inte ska krascha i Settings
        companyName: "", 
        orgNr: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      logAnalyticsEvent("user_signup", { method: "email", profession });
      
      Alert.alert("Klart!", "Ditt konto har skapats.", [
         { text: "OK", onPress: () => { /* Navigation sköts av auth-listener i App.js */ } }
      ]);
    } catch (error) {
      console.error(error);
      let msg = "Det gick inte att skapa kontot.";
      if (error.code === 'auth/email-already-in-use') msg = "E-postadressen används redan.";
      if (error.code === 'auth/invalid-email') msg = "Ogiltig e-postadress.";
      Alert.alert("Registreringsfel", msg);
    } finally {
      setLoading(false);
    }
  };

  // Komponent för yrkesknapp
  const ProfessionBtn = ({ type, label, icon }) => {
    const isActive = profession === type;
    return (
      <TouchableOpacity 
        style={[styles.profBtn, isActive && styles.profBtnActive]}
        onPress={() => setProfession(type)}
        activeOpacity={0.8}
      >
        <Ionicons 
          name={icon} 
          size={24} 
          color={isActive ? "#FFF" : "#666"} 
        />
        <Text style={[styles.profText, isActive && { color: "#FFF" }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: WorkaholicTheme.colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 30 }}
        keyboardShouldPersistTaps="handled"
      >
        <Image
          source={require("../assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>SKAPA KONTO</Text>

        {/* YRKESVÄLJARE */}
        <Text style={styles.sectionLabel}>VÄLJ DITT YRKE</Text>
        <View style={styles.professionRow}>
          <ProfessionBtn type="el" label="EL" icon="flash" />
          <ProfessionBtn type="vvs" label="VVS" icon="water" />
          <ProfessionBtn type="bygg" label="BYGG" icon="hammer" />
        </View>

        {/* Formulär */}
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
            editable={!loading}
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
            editable={!loading}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 5 }}>
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color={WorkaholicTheme.colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#999" style={{ marginRight: 10 }} />
          <TextInput
            placeholder="Bekräfta lösenord"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            style={styles.textInput}
            placeholderTextColor="#AAA"
            editable={!loading}
          />
          <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 5 }}>
            <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={22} color={WorkaholicTheme.colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.buttonContainer}>
          {loading ? (
            <ActivityIndicator size="large" color={WorkaholicTheme.colors.primary} />
          ) : (
            <Button title="REGISTRERA DIG" type="primary" onPress={handleRegister} />
          )}
          
          <TouchableOpacity 
            onPress={() => navigation.navigate("Login")}
            style={styles.backButton}
            disabled={loading}
          >
            <Text style={styles.backButtonText}>Redan medlem? Logga in här</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  logo: { width: width * 0.45, height: width * 0.45, alignSelf: "center", marginBottom: 10 },
  title: { fontSize: 20, fontWeight: "800", marginBottom: 20, color: WorkaholicTheme.colors.primary, textAlign: "center", letterSpacing: 1 },
  
  // Styles för yrkesval
  sectionLabel: { fontSize: 12, fontWeight: "800", color: "#666", marginBottom: 10, textAlign: 'center', letterSpacing: 1 },
  professionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  profBtn: { flex: 1, backgroundColor: '#F5F5F5', marginHorizontal: 5, paddingVertical: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#EEE' },
  profBtnActive: { backgroundColor: WorkaholicTheme.colors.primary, borderColor: WorkaholicTheme.colors.primary },
  profText: { marginTop: 5, fontWeight: '800', fontSize: 12, color: '#666' },

  inputContainer: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#EEE", borderRadius: 12, backgroundColor: "#FFF", paddingHorizontal: 15, marginBottom: 15, height: 55, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  textInput: { flex: 1, height: "100%", color: "#333", fontSize: 15, fontWeight: "600" },
  buttonContainer: { marginTop: 15, gap: 12 },
  backButton: { marginTop: 10, alignItems: 'center' },
  backButtonText: { color: "#666", fontSize: 14, fontWeight: "600" },
});