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

export default function HomeScreen() {
  const navigation = useNavigation();
  const {
    projects,
    selectedProject,
    setSelectedProject,
    createProject,
    importProject,
    renameProject,
    deleteProject,
  } = useContext(ProjectsContext);

  const [projectName, setProjectName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);
  const [renameVisible, setRenameVisible] = useState(false);
  const [activeProject, setActiveProject] = useState(null);
  const [editName, setEditName] = useState("");

  // HJÄLPFUNKTION: Tvingar fram versaler, siffror och mellanslag direkt vid inmatning
  const formatProjectInput = (text) => {
    return text.toUpperCase().replace(/[^A-ZÅÄÖ0-9\s]/g, "");
  };

  const handleSelectProject = () => {
    setSelectedProject(activeProject);
    setMenuVisible(false);
  };

  const handleRename = async () => {
    const cleanedName = editName.trim();
    if (cleanedName.length < 2) {
      return Alert.alert("Fel", "Namnet måste vara minst 2 tecken.");
    }
    try {
      await renameProject(activeProject.id, cleanedName);
      setRenameVisible(false);
      setMenuVisible(false);
      setEditName("");
      Keyboard.dismiss();
    } catch (error) {
      Alert.alert("Fel", "Kunde inte byta namn.");
    }
  };

  const handleCreateProject = async () => {
    const cleanedName = projectName.trim();
    if (cleanedName.length < 2) {
      return Alert.alert("Fel", "Ange ett projektnamn (minst 2 tecken).");
    }
    try {
      // Skapa en unik kod (8 tecken)
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      await createProject(cleanedName, code);
      setProjectName("");
      Keyboard.dismiss();
    } catch (error) { 
      Alert.alert("Fel", "Kunde inte skapa projekt."); 
    }
  };

  const handleImportProject = async () => {
    const cleanedCode = projectCode.trim();
    if (!cleanedCode) return Alert.alert("Fel", "Ange en projektkod.");
    try {
      await importProject(cleanedCode);
      setProjectCode("");
      Keyboard.dismiss();
    } catch (error) { 
      Alert.alert("Fel", "Projektkoden hittades inte."); 
    }
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
      <View style={styles.headerSection}>
        <View style={styles.infoBox}>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>AKTIVT PROJEKT</Text>
            <Text style={styles.infoTitle}>
              {selectedProject ? selectedProject.name : "VÄLJ ETT PROJEKT"}
            </Text>
          </View>
          <TouchableOpacity onPress={() => signOut(auth)} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color={WorkaholicTheme.colors.error} />
          </TouchableOpacity>
        </View>

        <View style={styles.inputArea}>
          <View style={styles.inputRow}>
            <TextInput 
              placeholder="NYTT PROJEKTNAMN..." 
              value={projectName} 
              onChangeText={(t) => setProjectName(formatProjectInput(t))} 
              style={styles.input} 
              placeholderTextColor="#999"
              autoCapitalize="characters"
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
              onChangeText={(t) => setProjectCode(formatProjectInput(t))} 
              style={styles.input} 
              autoCapitalize="characters"
              autoCorrect={false}
              placeholderTextColor="#999"
            />
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#555' }]} onPress={handleImportProject}>
              <Ionicons name="enter-outline" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>MINA PROJEKT</Text>
      
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        renderItem={renderProjectItem}
        contentContainerStyle={styles.listPadding}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={60} color="#CCC" />
            <Text style={styles.emptyText}>Inga projekt hittades.</Text>
          </View>
        }
      />

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
              Share.share({ message: `Gå med i mitt projekt i Workaholic! Kod: ${activeProject.code}` }); 
              setMenuVisible(false); 
            }} />
            <View style={{ height: 10 }} />
            <Button title="BYT NAMN" type="secondary" onPress={() => setRenameVisible(true)} />
            
            <View style={{ height: 10 }} />
            <TouchableOpacity 
              style={styles.deleteAction}
              onPress={() => {
                Alert.alert("Radera?", "Projektet försvinner för alla medlemmar.", [
                  { text: "Avbryt" },
                  { text: "Radera", style: "destructive", onPress: () => { deleteProject(activeProject.id); setMenuVisible(false); } }
                ]);
              }}
            >
              <Text style={styles.deleteActionText}>RADERA PROJEKT</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setMenuVisible(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>STÄNG</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={renameVisible} transparent animationType="fade">
        <View style={styles.centerModalContainer}>
          <View style={styles.centerModalContent}>
            <Text style={styles.modalTitle}>BYT NAMN PÅ PROJEKT</Text>
            
            <View style={styles.editInputWrapper}>
              <TextInput 
                style={styles.editInput}
                value={editName}
                onChangeText={(t) => setEditName(formatProjectInput(t))}
                placeholder="NYTT NAMN..."
                placeholderTextColor="#999"
                autoFocus
                autoCapitalize="characters"
                autoCorrect={false}
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
  headerSection: { padding: 20, backgroundColor: "#FFF", borderBottomLeftRadius: 25, borderBottomRightRadius: 25, elevation: 3 },
  infoBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  infoLabel: { fontSize: 10, fontWeight: "800", color: "#999", letterSpacing: 1 },
  infoTitle: { fontSize: 20, fontWeight: "bold", color: WorkaholicTheme.colors.primary },
  logoutBtn: { padding: 8, backgroundColor: "#FFF5F5", borderRadius: 10 },
  inputArea: { gap: 10 },
  inputRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, backgroundColor: "#F5F5F7", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#EEE", color: "#333", fontWeight: 'bold' },
  addBtn: { backgroundColor: WorkaholicTheme.colors.primary, width: 50, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginHorizontal: 20, marginTop: 25, marginBottom: 15 },
  listPadding: { paddingHorizontal: 20, paddingBottom: 40 },
  projectCard: { flexDirection: "row", backgroundColor: "#FFF", borderRadius: 16, padding: 15, marginBottom: 12, alignItems: "center", justifyContent: "space-between", elevation: 1 },
  selectedCard: { backgroundColor: WorkaholicTheme.colors.primary },
  projectInfo: { flexDirection: "row", alignItems: "center" },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F0F0F7", justifyContent: "center", alignItems: "center", marginRight: 12 },
  selectedIconCircle: { backgroundColor: "rgba(255,255,255,0.2)" },
  projectName: { fontSize: 16, fontWeight: "bold", color: "#333" },
  projectSub: { fontSize: 12, color: "#888" },
  selectedText: { color: "#FFF" },
  selectedTextSub: { color: "rgba(255,255,255,0.7)" },
  modalContainer: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { backgroundColor: "#fff", padding: 25, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  centerModalContainer: { flex: 1, justifyContent: "center", alignItems: 'center', backgroundColor: "rgba(0,0,0,0.6)", padding: 20 },
  centerModalContent: { backgroundColor: "#fff", padding: 20, borderRadius: 24, width: '100%', elevation: 5 },
  modalHeader: { marginBottom: 20, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: WorkaholicTheme.colors.primary, marginBottom: 15 },
  modalSubTitle: { fontSize: 14, color: "#666" },
  editInputWrapper: { backgroundColor: "#F5F5F7", borderRadius: 12, borderWidth: 1, borderColor: "#DDD", paddingHorizontal: 15, height: 50, justifyContent: 'center' },
  editInput: { fontSize: 16, color: "#333", fontWeight: 'bold' },
  flexBtn: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
  deleteAction: { padding: 15, alignItems: 'center' },
  deleteActionText: { color: WorkaholicTheme.colors.error, fontWeight: "bold" },
  closeBtn: { marginTop: 10, padding: 15 },
  closeBtnText: { textAlign: "center", color: "#999", fontWeight: "700" },
  emptyState: { alignItems: "center", marginTop: 40 },
  emptyText: { color: "#AAA", marginTop: 10 }
});