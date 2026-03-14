import React, { useContext, useState, useMemo } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput,
  Modal, StatusBar, Alert, Share
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProjectsContext } from "../context/ProjectsContext";
import { capitalizeFirst } from "../utils/stringHelpers";
import { WorkaholicTheme } from "../theme";
import Button from "../components/Button";

export default function ProjectListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { 
    projects, updateProject, deleteProject, 
    setSelectedProject, selectedProject, archiveProject 
  } = useContext(ProjectsContext);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState(""); 
  const [activeMenuProject, setActiveMenuProject] = useState(null);
  const [projectNameInput, setProjectNameInput] = useState("");

  // --- FILTRERING ---
  const filteredProjects = useMemo(() => {
    return projects
      .filter(p => p.status !== 'archived')
      .filter(p => {
        const pName = p.name || "Namnlöst projekt";
        return pName.toLowerCase().includes(searchQuery.toLowerCase());
      });
  }, [projects, searchQuery]);

  // --- LOGIK ---
  const handleNameChange = (text) => {
    setProjectNameInput(capitalizeFirst(text) || text);
  };

  const renderProjectItem = ({ item }) => {
    const isSelected = selectedProject?.id === item.id;
    return (
      <TouchableOpacity 
        style={[styles.projectCard, isSelected && styles.selectedCard]} 
        onPress={() => {
          setSelectedProject(item);
          navigation.navigate("ProjectHub", { project: item });
        }}
        activeOpacity={0.8}
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
               <Text style={[styles.itemCount, isSelected && styles.selectedTextSub]}>{item.products?.length || 0} st</Text>
            </View>
          </View>
        </View>
        
        {/* DE TRE PRICKARNA (MENY) */}
        <TouchableOpacity 
          style={styles.moreBtn} 
          onPress={() => { 
            setActiveMenuProject(item); 
            setProjectNameInput(item.name);
            setOptionsVisible(true); 
          }}
        >
          <Ionicons name="ellipsis-vertical" size={22} color={isSelected ? "#FFF" : "#CCC"} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* SLIMMAD HEADER */}
      <View style={[styles.header, { paddingTop: insets.top - 15 }]}>
        <View>
          <Text style={styles.brandText}>MINA <Text style={{color: WorkaholicTheme.colors.primary}}>PROJEKT</Text></Text>
          <View style={styles.activeStatusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.activeLabel}>
              AKTIVT: {selectedProject ? selectedProject.name.toUpperCase() : "INGET VALT"}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.archiveTopBtn} onPress={() => navigation.navigate("Archive")}>
          <Ionicons name="archive-outline" size={22} color={WorkaholicTheme.colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList 
        data={filteredProjects} 
        keyExtractor={(item) => item.id} 
        renderItem={renderProjectItem} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        ListHeaderComponent={
          <>
            {/* SÖKFÄLT */}
            <View style={styles.searchCard}>
              <Ionicons name="search" size={18} color="#999" />
              <TextInput 
                placeholder="Sök bland dina projekt..." 
                value={searchQuery} 
                onChangeText={setSearchQuery}
                style={styles.searchInput}
                placeholderTextColor="#BBB"
              />
            </View>

            <Text style={styles.sectionTitle}>AKTIVA PROJEKT ({filteredProjects.length})</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={60} color="#CCC" />
            <Text style={styles.emptyText}>Inga projekt hittades.</Text>
          </View>
        }
      />

      {/* OPTIONS MODAL (BOTTOM SHEET) */}
      <Modal visible={optionsVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOptionsVisible(false)}>
          <View style={styles.optionsSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{activeMenuProject?.name}</Text>
            
            <TouchableOpacity style={styles.menuOption} onPress={() => { 
              setSelectedProject(activeMenuProject); 
              navigation.navigate("ProjectHub", { project: activeMenuProject });
              setOptionsVisible(false); 
            }}>
              <Ionicons name="play-circle-outline" size={24} color="#444" />
              <Text style={styles.menuOptionText}>Öppna projektnav</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuOption} onPress={() => { 
              Share.share({ message: `Gå med i mitt projekt: ${activeMenuProject?.name}. Kod: ${activeMenuProject?.code}` }); 
              setOptionsVisible(false); 
            }}>
              <Ionicons name="share-social-outline" size={24} color="#444" />
              <Text style={styles.menuOptionText}>Dela kod</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuOption} onPress={() => { setModalVisible(true); setOptionsVisible(false); }}>
              <Ionicons name="create-outline" size={24} color="#444" />
              <Text style={styles.menuOptionText}>Byt namn</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuOption} onPress={() => { archiveProject(activeMenuProject.id); setOptionsVisible(false); }}>
              <Ionicons name="archive-outline" size={24} color="#444" />
              <Text style={styles.menuOptionText}>Arkivera projekt</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuOption} onPress={() => {
                Alert.alert("Radera?", "Detta går inte att ångra för någon i projektet.", [
                  { text: "Avbryt", style: "cancel" },
                  { text: "Radera", style: "destructive", onPress: () => { deleteProject(activeMenuProject.id); setOptionsVisible(false); } }
                ]);
            }}>
              <Ionicons name="trash-outline" size={24} color={WorkaholicTheme.colors.error} />
              <Text style={[styles.menuOptionText, {color: WorkaholicTheme.colors.error}]}>Ta bort permanent</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* RENAME MODAL */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.centerModalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>BYT NAMN</Text>
            <TextInput 
              value={projectNameInput} 
              onChangeText={handleNameChange} 
              style={styles.modalInput} 
              autoFocus 
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button title="AVBRYT" type="secondary" style={{ flex: 1 }} onPress={() => {setModalVisible(false); setProjectNameInput("");}} />
              <Button title="SPARA" type="primary" style={{ flex: 1 }} onPress={() => { updateProject(activeMenuProject.id, { name: projectNameInput }); setModalVisible(false); setProjectNameInput(""); }} />
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
    paddingHorizontal: 25, 
    paddingBottom: 15, 
    backgroundColor: "#FFF", 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    borderBottomWidth: 1, 
    borderBottomColor: '#EEE' 
  },
  brandText: { fontSize: 22, fontWeight: "900", color: "#1C1C1E" },
  activeStatusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#34C759', marginRight: 6 },
  activeLabel: { fontSize: 10, fontWeight: "800", color: "#999", letterSpacing: 0.5 },
  archiveTopBtn: { padding: 10, borderRadius: 12, backgroundColor: '#F0F0FF' },

  scrollContent: { padding: 20 },
  
  searchCard: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', 
    paddingHorizontal: 15, height: 50, borderRadius: 15, marginBottom: 25,
    borderWidth: 1, borderColor: '#EEE'
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, fontWeight: '600', color: '#333' },

  sectionTitle: { fontSize: 14, fontWeight: "900", color: '#8E8E93', letterSpacing: 1, marginBottom: 15, marginLeft: 5 },
  
  projectCard: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    backgroundColor: '#FFF', padding: 16, borderRadius: 20, marginBottom: 12, 
    elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5 
  },
  selectedCard: { backgroundColor: WorkaholicTheme.colors.primary },
  cardInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconCircle: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#F0F0FF", justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  selectedIconCircle: { backgroundColor: "rgba(255,255,255,0.2)" },
  textContainer: { flex: 1 },
  projectName: { fontSize: 16, fontWeight: "800", color: "#1C1C1E" },
  selectedText: { color: "#FFF" },
  selectedTextSub: { color: "rgba(255,255,255,0.7)" },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  codeText: { fontSize: 11, fontWeight: "bold", color: "#888" },
  dot: { marginHorizontal: 6, color: '#CCC' },
  itemCount: { fontSize: 11, color: "#AAA", fontWeight: "600" },
  moreBtn: { padding: 10, marginRight: -5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  optionsSheet: { backgroundColor: "#FFF", borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 50 },
  sheetHandle: { width: 40, height: 5, backgroundColor: "#DDD", borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: "900", color: "#1C1C1E", marginBottom: 25, textAlign: 'center' },
  menuOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: "#F0F0F0" },
  menuOptionText: { fontSize: 16, fontWeight: "700", marginLeft: 15, color: '#333' },
  
  centerModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 25 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 25, padding: 25, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: "900", textAlign: 'center', marginBottom: 20, color: WorkaholicTheme.colors.primary },
  modalInput: { backgroundColor: '#F5F5F7', padding: 15, borderRadius: 12, fontSize: 16, fontWeight: "800", marginBottom: 20, borderWidth: 1, borderColor: '#EEE' },
  
  emptyState: { alignItems: "center", marginTop: 50 },
  emptyText: { color: "#CCC", marginTop: 10, fontWeight: '700' }
});