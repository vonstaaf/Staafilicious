import React, { useContext, useState } from "react";
import {
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Keyboard, 
  StatusBar, 
  ScrollView,
  Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProjectsContext } from "../context/ProjectsContext";
import { auth } from "../firebaseConfig";
import { signOut } from "firebase/auth";
import { WorkaholicTheme } from "../theme";

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { createProject, importProject, selectedProject } = useContext(ProjectsContext);
  
  const [projectName, setProjectName] = useState("");
  const [projectCode, setProjectCode] = useState("");

  const formatProjectName = (text) => {
    if (!text) return "";
    const trimmed = text.trim();
    // Säkerställer stor bokstav enligt dina önskemål
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  };

  const handleCreate = async () => {
    const cleanedName = formatProjectName(projectName);
    if (cleanedName.length < 2) {
      return Alert.alert("Information", "Namnge projektet (minst 2 tecken).");
    }
    try {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      await createProject(cleanedName, code);
      setProjectName("");
      Keyboard.dismiss();
      Alert.alert("Succé!", `Projektet "${cleanedName}" är nu skapat.`);
    } catch (error) { 
      Alert.alert("Fel", "Kunde inte skapa projektet just nu."); 
    }
  };

  const handleJoinByCode = async () => {
    const cleanedCode = projectCode.trim().toUpperCase();
    if (!cleanedCode) return Alert.alert("Fel", "Ange en projektkod.");
    try {
      await importProject(cleanedCode);
      setProjectCode("");
      Keyboard.dismiss();
    } catch (error) { 
      Alert.alert("Fel", "Koden är ogiltig eller har gått ut."); 
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top - 15 }]}>
        <View>
          <Text style={styles.brandText}>WORKAHOLIC <Text style={{color: WorkaholicTheme.colors.primary}}>PRO</Text></Text>
          <Text style={styles.dateText}>{new Date().toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => signOut(auth)}>
          <Ionicons name="log-out-outline" size={20} color={WorkaholicTheme.colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* AKTIVT PROJEKT GENVÄG */}
        {selectedProject ? (
          <View style={styles.activeProjectCard}>
            <View style={styles.activeHeader}>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>AKTIVT JUST NU</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate("MainTabs")}>
                <Text style={styles.changeText}>BYT PROJEKT</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.projectName}>{selectedProject.name.toUpperCase()}</Text>
            
            <View style={styles.shortcutRow}>
              <TouchableOpacity style={styles.shortcutBtn} onPress={() => navigation.navigate("Inspection")}>
                <Ionicons name="shield-checkmark" size={20} color={WorkaholicTheme.colors.primary} />
                <Text style={styles.shortcutText}>Egenkontroll</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shortcutBtn} onPress={() => navigation.navigate("GroupSchedule")}>
                <Ionicons name="list" size={20} color={WorkaholicTheme.colors.primary} />
                <Text style={styles.shortcutText}>Gruppschema</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.welcomeArea}>
            <View style={styles.iconCircle}>
              <Ionicons name="flash" size={40} color={WorkaholicTheme.colors.primary} />
            </View>
            <Text style={styles.welcomeTitle}>Välkommen</Text>
            <Text style={styles.welcomeSub}>Välj ett projekt i listan eller skapa ett nytt nedan för att komma igång.</Text>
          </View>
        )}

        {/* INPUTS */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>NYTT PROJEKT</Text>
          <View style={styles.inputRow}>
            <TextInput 
              placeholder="NAMN PÅ PROJEKTET..." 
              value={projectName} 
              onChangeText={setProjectName} 
              style={styles.input} 
              placeholderTextColor="#BBB"
            />
            <TouchableOpacity style={styles.addBtn} onPress={handleCreate}>
              <Ionicons name="add" size={30} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>ANSLUT MED KOD</Text>
          <View style={styles.inputRow}>
            <TextInput 
              placeholder="ANGE 8-TECKEN KOD..." 
              value={projectCode} 
              onChangeText={setProjectCode} 
              style={styles.input} 
              autoCapitalize="characters"
              placeholderTextColor="#BBB"
            />
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#1C1C1E' }]} onPress={handleJoinByCode}>
              <Ionicons name="key-outline" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.infoFooter}>Workaholic Pro v2.4.0 — 2026 Edition</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  header: { paddingHorizontal: 25, paddingBottom: 20, backgroundColor: "#FFF", flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  brandText: { fontSize: 20, fontWeight: "900", color: "#1C1C1E", letterSpacing: -0.5 },
  dateText: { fontSize: 9, fontWeight: "800", color: "#BBB", marginTop: 2, letterSpacing: 0.5 },
  logoutBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF5F5', justifyContent: 'center', alignItems: 'center' },

  scrollContent: { padding: 20 },
  
  // Aktivt projekt-kort
  activeProjectCard: { backgroundColor: '#FFF', borderRadius: 25, padding: 20, marginBottom: 25, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1, borderColor: '#F0F0F0' },
  activeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34C759', marginRight: 6 },
  statusText: { fontSize: 9, fontWeight: '900', color: '#34C759' },
  changeText: { fontSize: 10, fontWeight: '800', color: '#BBB' },
  projectName: { fontSize: 24, fontWeight: '900', color: '#1C1C1E', marginBottom: 20 },
  shortcutRow: { flexDirection: 'row', gap: 10 },
  shortcutBtn: { flex: 1, backgroundColor: '#F8F9FB', padding: 15, borderRadius: 15, alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'center' },
  shortcutText: { fontSize: 12, fontWeight: '800', color: '#555' },

  welcomeArea: { alignItems: 'center', marginVertical: 30, paddingHorizontal: 30 },
  iconCircle: { width: 80, height: 80, borderRadius: 30, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, marginBottom: 15 },
  welcomeTitle: { fontSize: 22, fontWeight: '900', color: '#1C1C1E' },
  welcomeSub: { fontSize: 13, color: '#AAA', textAlign: 'center', marginTop: 10, lineHeight: 18, fontWeight: '600' },

  card: { backgroundColor: '#FFF', padding: 25, borderRadius: 25, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1, borderColor: '#F0F0F0' },
  sectionLabel: { fontSize: 10, fontWeight: "900", color: "#CCC", letterSpacing: 1.2, marginBottom: 15 },
  inputRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, backgroundColor: "#F5F5F7", padding: 16, borderRadius: 15, fontSize: 14, fontWeight: '700', color: '#1C1C1E' },
  addBtn: { backgroundColor: WorkaholicTheme.colors.primary, width: 55, borderRadius: 15, justifyContent: "center", alignItems: "center", elevation: 2 },
  divider: { height: 1, backgroundColor: '#F8F9FB', marginVertical: 25 },
  infoFooter: { textAlign: 'center', fontSize: 10, color: '#DDD', fontWeight: '800', marginTop: 30, letterSpacing: 1 }
});