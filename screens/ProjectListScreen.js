import React, { useContext, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Dimensions,
  StatusBar
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ProjectsContext } from "../context/ProjectsContext";
import { WorkaholicTheme } from "../theme";
import Button from "../components/Button";

const { width } = Dimensions.get("window");

// Hjälpfunktion för att alltid börja med stor bokstav
const capitalize = (text) => {
  if (!text) return "";
  return text.trim().charAt(0).toUpperCase() + text.trim().slice(1);
};

export default function ProjectListScreen({ navigation }) {
  const { projects, addProject, setSelectedProject } = useContext(ProjectsContext);
  const [modalVisible, setModalVisible] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      // Sparar projektet med stor bokstav enligt önskemål
      const formattedName = capitalize(newProjectName);
      addProject(formattedName);
      setNewProjectName("");
      setModalVisible(false);
    }
  };

  const openProject = (project) => {
    setSelectedProject(project);
    // Säkerställ att du har en route som heter ProjectDetails i din Stack Navigator
    navigation.navigate("ProjectDetails");
  };

  const renderProjectItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.projectCard} 
      onPress={() => openProject(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardInfo}>
        <View style={styles.iconCircle}>
          <Ionicons name="construct-outline" size={24} color={WorkaholicTheme.colors.primary} />
        </View>
        <View>
          <Text style={styles.projectName}>{item.name}</Text>
          <Text style={styles.projectSub}>
            {item.products?.length || 0} artiklar • {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Inget datum'}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#CCC" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Mina Projekt</Text>
          <Text style={styles.statsText}>{projects.length} aktiva arbeten</Text>
        </View>
        <TouchableOpacity 
          style={styles.addBtn} 
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={30} color="#FFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id || Math.random().toString()}
        renderItem={renderProjectItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="albums-outline" size={60} color="#DDD" />
            <Text style={styles.emptyText}>Inga Projekt ännu. Skapa ditt första för att komma igång!</Text>
          </View>
        }
      />

      {/* Modal för nytt Projekt */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>NYTT PROJEKT</Text>
            
            <TextInput
              placeholder="Namn (t.ex. Köksrenovering)"
              value={newProjectName}
              onChangeText={setNewProjectName}
              style={styles.modalInput}
              autoFocus
              placeholderTextColor="#AAA"
            />

            <View style={styles.modalButtons}>
              <View style={{ flex: 1 }}>
                <Button title="AVBRYT" type="secondary" onPress={() => setModalVisible(false)} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Button title="SKAPA" type="primary" onPress={handleCreateProject} />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WorkaholicTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  welcomeText: {
    ...WorkaholicTheme.typography.title,
    color: WorkaholicTheme.colors.primary,
  },
  statsText: {
    ...WorkaholicTheme.typography.body,
    fontSize: 14,
    color: '#999',
  },
  addBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: WorkaholicTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  projectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: WorkaholicTheme.colors.surface,
    padding: 15,
    borderRadius: WorkaholicTheme.borderRadius.medium,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  projectName: {
    ...WorkaholicTheme.typography.subtitle,
    fontSize: 16,
  },
  projectSub: {
    ...WorkaholicTheme.typography.body,
    fontSize: 12,
    color: '#AAA',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    ...WorkaholicTheme.typography.body,
    textAlign: 'center',
    color: '#BBB',
    marginTop: 10,
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.85,
    backgroundColor: '#FFF',
    borderRadius: WorkaholicTheme.borderRadius.large,
    padding: 25,
    elevation: 10,
  },
  modalTitle: {
    ...WorkaholicTheme.typography.subtitle,
    color: WorkaholicTheme.colors.primary,
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 1,
  },
  modalInput: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: WorkaholicTheme.borderRadius.small,
    padding: 15,
    fontSize: 16,
    marginBottom: 25,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
  }
});