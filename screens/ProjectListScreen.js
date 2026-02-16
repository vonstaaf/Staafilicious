import React, { useContext, useState, useMemo } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput,
  Modal, StatusBar, Alert, Keyboard, Share, Platform, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProjectsContext } from "../context/ProjectsContext";
import { WorkaholicTheme } from "../theme";
import Button from "../components/Button";

export default function ProjectListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { 
    projects, addProject, updateProject, deleteProject, 
    setSelectedProject, selectedProject, importProject, archiveProject 
  } = useContext(ProjectsContext);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [projectNameInput, setProjectNameInput] = useState("");
  const [projectCodeInput, setProjectCodeInput] = useState("");
  const [searchQuery, setSearchQuery] = useState(""); 
  const [activeMenuProject, setActiveMenuProject] = useState(null);
  const [isCreating, setIsCreating] = useState(false); // Förhindra dubbelklick

  const filteredProjects = useMemo(() => {
    return projects
      .filter(p => p.status !== 'archived')
      .filter(p => {
        const pName = p.name || "Namnlöst projekt";
        return pName.toLowerCase().includes(searchQuery.toLowerCase());
      });
  }, [projects, searchQuery]);

  const handleNameChange = (text) => {
    const formatted = text.length > 0 ? text.charAt(0).toUpperCase() + text.slice(1) : "";
    setProjectNameInput(formatted);
  };

  const handleCodeChange = (text) => {
    const formatted = text.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    setProjectCodeInput(formatted);
  };

  const handleCreateNewProject = async () => {
    if (!projectNameInput || isCreating) return;
    
    setIsCreating(true);
    try {
      // addProject i Context sköter nu hämtning av standardmall automatiskt
      await addProject(projectNameInput);
      setProjectNameInput("");
      Keyboard.dismiss();
    } catch (error) {
      Alert.alert("Fel", "Kunde inte skapa projektet.");
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const shareProjectCode = async (project) => {
    if (!project?.code) {
      Alert.alert("Ingen kod", "Detta projekt saknar en kod.");
      return;
    }
    try {
      await Share.share({
        message: `Här är projektkoden för ${project.name}: ${project.code}`,
      });
    } catch (error) {
      Alert.alert("Fel", "Kunde inte dela koden.");
    }
  };

  const renderProjectItem = ({ item }) => {
    const isSelected = selectedProject?.id === item.id;
    return (
      <TouchableOpacity 
        style={[styles.projectCard, isSelected && styles.selectedCard]} 
        onPress={() => {
          setSelectedProject(item);
          navigation.navigate("Products");
        }}
        onLongPress={() => { setActiveMenuProject(item); setOptionsVisible(true); }}
      >
        <View style={styles.cardInfo}>
          <View style={[styles.iconCircle, isSelected && styles.selectedIconCircle]}>
            <Ionicons name="briefcase" size={20} color={isSelected ? "#FFF" : WorkaholicTheme.colors.primary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.projectName, isSelected && styles.selectedText]} numberOfLines={1}>{item.name}</Text>
            <View style={styles.badgeRow}>
               <Text style={[styles.codeText, isSelected && styles.selectedTextSub]}>Kod: {item.code}</Text>
               <Text style={styles.dot}>•</Text>
               <Text style={[styles.itemCount, isSelected && styles.selectedTextSub]}>{item.products?.length || 0} artiklar</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.moreBtn} onPress={() => { setActiveMenuProject(item); setOptionsVisible(true); }}>
            <Ionicons name="ellipsis-vertical" size={18} color={isSelected ? "#FFF" : "#CCC"} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Mina Arbeten</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Archive")} style={styles.archiveHeaderBtn}>
            <Ionicons name="archive-outline" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
            <Ionicons name="search" size={16} color="#BBB" style={{marginLeft: 10}} />
            <TextInput 
              placeholder="Sök projekt..." 
              value={searchQuery} 
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              placeholderTextColor="#BBB"
              autoCorrect={false}
            />
        </View>

        <View style={styles.compactInputRow}>
            <TextInput 
              placeholder="NYTT PROJEKT..." 
              value={projectNameInput} 
              onChangeText={handleNameChange}
              style={styles.miniInput} 
              placeholderTextColor="#BBB"
              autoCorrect={false}
              editable={!isCreating}
            />
            <TouchableOpacity onPress={handleCreateNewProject} disabled={isCreating}>
              {isCreating ? (
                <ActivityIndicator color="#FFF" style={{ marginHorizontal: 5 }} />
              ) : (
                <Ionicons name="add-circle" size={32} color="#FFF" />
              )}
            </TouchableOpacity>
            
            <View style={styles.vDivider} />

            <TextInput 
              placeholder="KOD..." 
              value={projectCodeInput} 
              onChangeText={handleCodeChange}
              style={[styles.miniInput, { flex: 0.6 }]} 
              placeholderTextColor="#BBB"
              autoCorrect={false}
              autoCapitalize="characters"
            />
            <TouchableOpacity onPress={() => { if(projectCodeInput) { importProject(projectCodeInput); setProjectCodeInput(""); Keyboard.dismiss(); }}}><Ionicons name="enter" size={32} color="#FFF" /></TouchableOpacity>
        </View>
      </View>

      <FlatList 
        data={filteredProjects} 
        keyExtractor={(item) => item.id} 
        renderItem={renderProjectItem} 
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
      />

      {/* Options Modal */}
      <Modal visible={optionsVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOptionsVisible(false)}>
          <View style={styles.optionsSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{activeMenuProject?.name}</Text>
            <TouchableOpacity style={styles.menuOption} onPress={() => { setSelectedProject(activeMenuProject); navigation.navigate("Products"); setOptionsVisible(false); }}>
              <Ionicons name="play-circle-outline" size={22} color="#444" /><Text style={styles.menuOptionText}>Välj projekt</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuOption} onPress={() => { shareProjectCode(activeMenuProject); setOptionsVisible(false); }}>
              <Ionicons name="share-social-outline" size={22} color="#444" /><Text style={styles.menuOptionText}>Dela kod</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuOption} onPress={() => { setProjectNameInput(activeMenuProject.name); setModalVisible(true); setOptionsVisible(false); }}>
              <Ionicons name="create-outline" size={22} color="#444" /><Text style={styles.menuOptionText}>Byt namn</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuOption} onPress={() => { archiveProject(activeMenuProject.id); setOptionsVisible(false); }}>
              <Ionicons name="archive-outline" size={22} color="#444" /><Text style={styles.menuOptionText}>Arkivera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuOption} onPress={() => {
                Alert.alert("Radera?", "Kan inte ångras.", [
                  { text: "Avbryt" },
                  { text: "Radera", style: "destructive", onPress: () => { deleteProject(activeMenuProject.id); setOptionsVisible(false); } }
                ]);
            }}>
              <Ionicons name="trash-outline" size={22} color={WorkaholicTheme.colors.error} /><Text style={[styles.menuOptionText, {color: WorkaholicTheme.colors.error}]}>Radera</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Byt namn Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.centerModalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>BYT NAMN</Text>
            <TextInput value={projectNameInput} onChangeText={handleNameChange} style={styles.modalInput} autoFocus autoCorrect={false} />
            <View style={styles.modalButtons}>
              <Button title="AVBRYT" type="secondary" style={{ flex: 1 }} onPress={() => {setModalVisible(false); setProjectNameInput("");}} />
              <Button title="SPARA" type="primary" style={{ flex: 1, marginLeft: 10 }} onPress={() => { updateProject(activeMenuProject.id, { name: projectNameInput }); setModalVisible(false); setProjectNameInput(""); }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  header: { 
    backgroundColor: WorkaholicTheme.colors.primary, 
    paddingHorizontal: 15, 
    paddingBottom: 25, 
    borderBottomLeftRadius: 30, 
    borderBottomRightRadius: 30,
    marginTop: Platform.OS === 'android' ? -StatusBar.currentHeight : 0,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  headerTitle: { color: "#FFF", fontSize: 22, fontWeight: "900" },
  archiveHeaderBtn: { backgroundColor: "rgba(255, 255, 255, 0)", padding: 8, borderRadius: 10 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: "#FFF", borderRadius: 12, marginBottom: 15, height: 40 },
  searchInput: { flex: 1, color: '#1C1C1E', paddingHorizontal: 10, fontSize: 14, fontWeight: '600' },
  compactInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniInput: { flex: 1, backgroundColor: "#FFF", color: "#1C1C1E", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, fontSize: 13, fontWeight: "800" },
  vDivider: { width: 1, height: 25, backgroundColor: "rgba(255, 255, 255, 0)" },
  listContent: { padding: 15 },
  projectCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', padding: 15, borderRadius: 20, marginBottom: 12, elevation: 3, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 5 },
  selectedCard: { backgroundColor: WorkaholicTheme.colors.primary },
  cardInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconCircle: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#F0F0FF", justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  selectedIconCircle: { backgroundColor: "rgba(255,255,255,0.2)" },
  textContainer: { flex: 1 },
  projectName: { fontSize: 16, fontWeight: "800", color: "#1C1C1E" },
  selectedText: { color: "#FFF" },
  selectedTextSub: { color: "rgba(255,255,255,0.7)" },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  codeText: { fontSize: 11, fontWeight: "bold", color: "#888" },
  dot: { marginHorizontal: 5, color: '#CCC' },
  itemCount: { fontSize: 11, color: "#AAA", fontWeight: "600" },
  moreBtn: { padding: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  optionsSheet: { backgroundColor: "#FFF", borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 5, backgroundColor: "#DDD", borderRadius: 3, alignSelf: 'center', marginBottom: 15 },
  sheetTitle: { fontSize: 18, fontWeight: "900", color: "#333", marginBottom: 20, textAlign: 'center' },
  menuOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: "#F0F0F0" },
  menuOptionText: { fontSize: 16, fontWeight: "600", marginLeft: 15 },
  centerModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 25, padding: 25 },
  modalTitle: { fontSize: 18, fontWeight: "900", textAlign: 'center', marginBottom: 20, color: WorkaholicTheme.colors.primary },
  modalInput: { backgroundColor: '#F5F5F7', color: "#1C1C1E", padding: 15, borderRadius: 12, fontSize: 16, fontWeight: "700", marginBottom: 20, borderWidth: 1, borderColor: '#DDD' },
  modalButtons: { flexDirection: 'row' }
});