import React, { useContext, useState } from "react";
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  Modal, Alert, Share, StyleSheet, Keyboard
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { ProjectsContext } from "../context/ProjectsContext";
import { auth } from "../firebaseConfig";
import { signOut } from "firebase/auth";
import Button from "../components/Button";
import { WorkaholicTheme } from "../theme";

// Importera fil-hanteraren (Utility)
import { importProjectFromJson } from "../utils/exportUtils";

export default function HomeScreen() {
  const navigation = useNavigation();
  const {
    projects,
    selectedProject,
    setSelectedProject,
    createProject,
    importProject,        // Gå med via KOD
    importProjectFromFile, // FIX: Används för att spara JSON-data till Firebase
    renameProject,
    deleteProject,
    archiveProject,
  } = useContext(ProjectsContext);

  const [projectName, setProjectName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);
  const [renameVisible, setRenameVisible] = useState(false);
  const [activeProject, setActiveProject] = useState(null);
  const [editName, setEditName] = useState("");

  // Filtrera bort arkiverade projekt
  const activeProjects = projects.filter(p => p.status !== 'archived' && !p.isArchived);

  const formatProjectName = (text) => {
    if (!text) return "";
    const trimmed = text.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  };

  const handleSelectProject = () => {
    setSelectedProject(activeProject);
    setMenuVisible(false);
  };

  const handleRename = async () => {
    const cleanedName = formatProjectName(editName);
    if (cleanedName.length < 2) {
      return Alert.alert("Fel", "Namnet måste vara minst 2 tecken.");
    }

    try {
      await renameProject(activeProject.id, { name: cleanedName });
      setRenameVisible(false);
      setMenuVisible(false);
      setEditName("");
      Keyboard.dismiss();
    } catch (error) {
      console.error("Rename error:", error);
      Alert.alert("Fel", "Kunde inte spara namnet.");
    }
  };

  const handleCreateProject = async () => {
    const cleanedName = formatProjectName(projectName);
    if (cleanedName.length < 2) {
      return Alert.alert("Fel", "Ange ett projektnamn (minst 2 tecken).");
    }
    try {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      await createProject(cleanedName, code);
      setProjectName("");
      Keyboard.dismiss();
    } catch (error) { 
      Alert.alert("Fel", "Kunde inte skapa projekt."); 
    }
  };

  // Gå med via KOD (Cloud)
  const handleImportProjectByCode = async () => {
    const cleanedCode = projectCode.trim().toUpperCase();
    if (!cleanedCode) return Alert.alert("Fel", "Ange en projektkod.");
    try {
      await importProject(cleanedCode);
      setProjectCode("");
      Keyboard.dismiss();
    } catch (error) { 
      Alert.alert("Fel", "Projektkoden hittades inte."); 
    }
  };

  // NY FUNKTION: Importera via FIL (.json)
  const handleImportProjectFromFile = async () => {
    try {
      // 1. Välj fil och hämta data (Utility)
      const projectData = await importProjectFromJson();
      
      if (projectData) {
        // 2. Spara till Firebase (Context)
        // Vi använder Context-funktionen eftersom den hanterar hela objektet (produkter etc.)
        await importProjectFromFile(projectData);
        Alert.alert("Klart", `Projektet "${projectData.name}" har importerats!`);
      }
    } catch (error) {
      console.log("Import cancelled or failed", error);
      // Inget felmeddelande behövs om användaren bara avbröt
    }
  };

  const handleArchiveProject = () => {
    Alert.alert(
      "Arkivera Projekt",
      "Är du säker? Projektet flyttas till arkivet men kan återställas senare.",
      [
        { text: "Avbryt", style: "cancel" },
        { 
          text: "Arkivera", 
          style: "destructive", 
          onPress: async () => {
            try {
              await archiveProject(activeProject.id);
              setMenuVisible(false);
            } catch (e) {
              Alert.alert("Fel", "Kunde inte arkivera projektet.");
            }
          } 
        }
      ]
    );
  };

  const renderProjectItem = ({ item }) => {
    const isSelected = selectedProject?.id === item.id;
    return (
      <TouchableOpacity
        style={[styles.projectCard, isSelected && styles.selectedCard]}
        onPress={() => { 
          setActiveProject(item); 
          setEditName(item.name);
          setMenuVisible(true); 
        }}
      >
        <View style={styles.projectInfo}>
          <View style={[styles.iconCircle, isSelected && styles.selectedIconCircle]}>
            <Ionicons 
              name="briefcase" 
              size={22} 
              color={isSelected ? "#FFF" : WorkaholicTheme.colors.primary} 
            />
          </View>
          <View>
            <Text style={[styles.projectName, isSelected && styles.selectedText]}>{item.name}</Text>
            <Text style={[styles.projectSub, isSelected && styles.selectedTextSub]}>KOD: {item.code}</Text>
          </View>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color="#FFF" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER SECTION */}
      <View style={styles.headerSection}>
        <View style={styles.infoBox}>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>AKTIVT PROJEKT</Text>
            <Text style={styles.infoTitle} numberOfLines={1}>
              {selectedProject ? selectedProject.name : "VÄLJ ETT PROJEKT"}
            </Text>
          </View>

          {/* Knapp för FIL-import */}
          <TouchableOpacity 
            onPress={handleImportProjectFromFile} 
            style={[styles.headerActionBtn, { backgroundColor: "#E3F2FD" }]}
          >
            <Ionicons name="document-attach-outline" size={22} color="#1976D2" />
          </TouchableOpacity>

          {/* Arkiv-knapp */}
          <TouchableOpacity 
            onPress={() => navigation.navigate("Archive")} 
            style={[styles.headerActionBtn, { backgroundColor: "#F0F0F7" }]}
          >
            <Ionicons name="archive-outline" size={22} color={WorkaholicTheme.colors.primary} />
          </TouchableOpacity>

          {/* Logga ut */}
          <TouchableOpacity onPress={() => signOut(auth)} style={[styles.headerActionBtn, { backgroundColor: "#FFF5F5" }]}>
            <Ionicons name="log-out-outline" size={22} color={WorkaholicTheme.colors.error} />
          </TouchableOpacity>
        </View>

        <View style={styles.inputArea}>
          <View style={styles.inputRow}>
            <TextInput 
              placeholder="NYTT PROJEKTNAMN..." 
              value={projectName} 
              onChangeText={setProjectName} 
              style={styles.input} 
              placeholderTextColor="#999"
              autoCorrect={false}
            />
            <TouchableOpacity style={styles.addBtn} onPress={handleCreateProject}>
              <Ionicons name="add" size={28} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputRow}>
            <TextInput 
              placeholder="ANGE PROJEKTKOD..." 
              value={projectCode} 
              onChangeText={setProjectCode} 
              style={styles.input} 
              autoCapitalize="characters"
              autoCorrect={false}
              placeholderTextColor="#999"
            />
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#555' }]} onPress={handleImportProjectByCode}>
              <Ionicons name="enter-outline" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>MINA PROJEKT</Text>
      
      <FlatList
        data={activeProjects}
        keyExtractor={(item) => item.id}
        renderItem={renderProjectItem}
        contentContainerStyle={styles.listPadding}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={60} color="#CCC" />
            <Text style={styles.emptyText}>Inga aktiva projekt hittades.</Text>
          </View>
        }
      />

      {/* PROJEKT MENY MODAL */}
      <Modal visible={menuVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{activeProject?.name}</Text>
                <Text style={styles.modalSubTitle}>KOD: {activeProject?.code}</Text>
            </View>

            <Button title="VÄLJ SOM AKTIVT PROJEKT" type="primary" onPress={handleSelectProject} />
            <View style={{ height: 10 }} />
            <Button title="DELA PROJEKTKOD" type="secondary" onPress={() => { 
              Share.share({ message: `Gå med i mitt projekt i Workaholic! Kod: ${activeProject?.code}` }); 
              setMenuVisible(false); 
            }} />
            <View style={{ height: 10 }} />
            <Button title="BYT NAMN" type="secondary" onPress={() => setRenameVisible(true)} />
            
            <View style={{ height: 10 }} />
            <Button title="ARKIVERA PROJEKT" type="secondary" onPress={handleArchiveProject} />

            <View style={{ height: 10 }} />
            <TouchableOpacity 
              style={styles.deleteAction}
              onPress={() => {
                Alert.alert("Radera?", "Projektet försvinner permanent för alla medlemmar.", [
                  { text: "Avbryt" },
                  { text: "Radera", style: "destructive", onPress: () => { deleteProject(activeProject.id); setMenuVisible(false); } }
                ]);
              }}
            >
              <Text style={styles.deleteActionText}>RADERA PROJEKT PERMANENT</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setMenuVisible(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>STÄNG</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* RENAME MODAL */}
      <Modal visible={renameVisible} transparent animationType="fade">
        <View style={styles.centerModalContainer}>
          <View style={styles.centerModalContent}>
            <Text style={styles.modalTitle}>BYT NAMN PÅ PROJEKT</Text>
            <View style={styles.editInputWrapper}>
              <TextInput 
                style={styles.editInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="NYTT NAMN..."
                placeholderTextColor="#999"
                autoFocus
                autoCorrect={false}
                autoCapitalize="sentences"
                selectionColor={WorkaholicTheme.colors.primary}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <TouchableOpacity style={[styles.flexBtn, { backgroundColor: '#EEE' }]} onPress={() => setRenameVisible(false)}>
                <Text style={{ color: '#333', fontWeight: 'bold' }}>AVBRYT</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.flexBtn, { backgroundColor: WorkaholicTheme.colors.primary }]} onPress={handleRename}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>SPARA</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WorkaholicTheme.colors.background },
  headerSection: { padding: 20, backgroundColor: "#FFF", borderBottomLeftRadius: 25, borderBottomRightRadius: 25, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  infoBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  infoLabel: { fontSize: 10, fontWeight: "800", color: "#999", letterSpacing: 1 },
  infoTitle: { fontSize: 20, fontWeight: "bold", color: WorkaholicTheme.colors.primary },
  headerActionBtn: { padding: 10, borderRadius: 12, marginLeft: 8 },
  inputArea: { gap: 10 },
  inputRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, backgroundColor: "#F5F5F7", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#EEE", color: "#333", fontWeight: 'bold' },
  addBtn: { backgroundColor: WorkaholicTheme.colors.primary, width: 55, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "900", marginHorizontal: 20, marginTop: 25, marginBottom: 15, color: '#333' },
  listPadding: { paddingHorizontal: 20, paddingBottom: 40 },
  projectCard: { flexDirection: "row", backgroundColor: "#FFF", borderRadius: 18, padding: 16, marginBottom: 12, alignItems: "center", justifyContent: "space-between", elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  selectedCard: { backgroundColor: WorkaholicTheme.colors.primary },
  projectInfo: { flexDirection: "row", alignItems: "center" },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#F0F0F7", justifyContent: "center", alignItems: "center", marginRight: 15 },
  selectedIconCircle: { backgroundColor: "rgba(255,255,255,0.2)" },
  projectName: { fontSize: 16, fontWeight: "bold", color: "#1C1C1E" },
  projectSub: { fontSize: 12, color: "#8E8E93", marginTop: 2 },
  selectedText: { color: "#FFF" },
  selectedTextSub: { color: "rgba(255,255,255,0.7)" },
  modalContainer: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { backgroundColor: "#fff", padding: 25, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingBottom: 40 },
  centerModalContainer: { flex: 1, justifyContent: "center", alignItems: 'center', backgroundColor: "rgba(0,0,0,0.6)", padding: 20 },
  centerModalContent: { backgroundColor: "#fff", padding: 25, borderRadius: 28, width: '100%', elevation: 10 },
  modalHeader: { marginBottom: 25, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: "900", color: WorkaholicTheme.colors.primary, marginBottom: 5 },
  modalSubTitle: { fontSize: 14, color: "#8E8E93", fontWeight: '600' },
  editInputWrapper: { backgroundColor: "#F5F5F7", borderRadius: 15, borderWidth: 1, borderColor: "#DDD", paddingHorizontal: 15, height: 55, justifyContent: 'center' },
  editInput: { fontSize: 18, color: "#333", fontWeight: 'bold' },
  flexBtn: { flex: 1, padding: 18, borderRadius: 15, alignItems: 'center' },
  deleteAction: { padding: 15, alignItems: 'center', marginTop: 10 },
  deleteActionText: { color: WorkaholicTheme.colors.error, fontWeight: "800", fontSize: 13 },
  closeBtn: { marginTop: 15, padding: 10 },
  closeBtnText: { textAlign: "center", color: "#BBB", fontWeight: "800", fontSize: 14 },
  emptyState: { alignItems: "center", marginTop: 60 },
  emptyText: { color: "#CCC", marginTop: 15, fontWeight: '700' }
});