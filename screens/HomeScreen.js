// screens/HomeScreen.js
import React, { useContext, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  Share,
  StyleSheet,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { GroupsContext } from "../context/GroupsContext";
import { auth } from "../firebaseConfig";
import { signOut, onAuthStateChanged } from "firebase/auth";
import Button from "../components/Button"; // 🔑 Workaholic-knapp
import { WorkaholicTheme } from "../theme"; // 🔑 importera temat

// Hjälpfunktion för stor bokstav
const capitalizeFirst = (text) => {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// Generera gruppkod
const generateGroupCode = (length = 8) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export default function HomeScreen({ navigation }) {
  const {
    groups,
    selectedGroup,
    setSelectedGroup,
    createGroup,
    importGroup,
    renameGroup,
    deleteGroup,
  } = useContext(GroupsContext);

  const [groupName, setGroupName] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);
  const [renameVisible, setRenameVisible] = useState(false);
  const [activeGroup, setActiveGroup] = useState(null);
  const [newName, setNewName] = useState("");

  // 🔑 Kontrollera om användaren är inloggad
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigation.navigate("Login"); // ✅ byt från replace → navigate
      }
    });
    return unsubscribe;
  }, []);

  // 🔑 Logout-funktion
  const handleLogout = async () => {
    try {
      await signOut(auth);
      Alert.alert("Utloggad", "Du är nu utloggad.");
      // ✅ räcker med signOut, App.js hanterar navigationen
    } catch (error) {
      Alert.alert("Fel vid utloggning", error.message || "Något gick fel.");
    }
  };

  // Header med vald grupp + logout-knapp
  const Header = () => (
    <View style={styles.header}>
      <Text style={styles.headerText}>
        {selectedGroup
          ? `Grupp: ${capitalizeFirst(selectedGroup.name)} (Kod: ${selectedGroup.code})`
          : "Ingen grupp vald"}
      </Text>
      <Button title="Logga ut" type="secondary" onPress={handleLogout} />
    </View>
  );

  // Skapa grupp
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert("Fel", "Ange ett gruppnamn.");
      return;
    }
    const code = generateGroupCode(8);
    await createGroup(capitalizeFirst(groupName.trim()), code);
    setGroupName("");
    Alert.alert("Grupp skapad", `Gruppen "${capitalizeFirst(groupName)}" har skapats med kod: ${code}`);
  };

  // Importera grupp via kod
  const handleImportGroup = async () => {
    if (!groupCode.trim()) {
      Alert.alert("Fel", "Ange en gruppkod.");
      return;
    }
    await importGroup(groupCode.trim().toUpperCase());
    setGroupCode("");
    Alert.alert("Grupp importerad", `Grupp med kod ${groupCode.trim().toUpperCase()} har importerats.`);
  };
    // Öppna meny
  const openMenu = (group) => {
    setActiveGroup(group);
    setMenuVisible(true);
  };

  const closeMenu = () => {
    setMenuVisible(false);
    setActiveGroup(null);
  };

  const handleSelectGroup = () => {
    setSelectedGroup(activeGroup);
    closeMenu();
  };

  const handleShareCode = () => {
    if (!activeGroup) return;
    Share.share({
      message: `Gå med i gruppen "${capitalizeFirst(activeGroup.name)}" med kod: ${activeGroup.code}`,
    });
    closeMenu();
  };

  const handleCopyCode = async () => {
    if (!activeGroup) return;
    await Clipboard.setStringAsync(activeGroup.code);
    Alert.alert("Kopierat!", `Gruppkod ${activeGroup.code} är kopierad.`);
    closeMenu();
  };

  const handleDeleteGroup = () => {
    if (!activeGroup) return;
    Alert.alert("Ta bort grupp", "Är du säker?", [
      { text: "Avbryt", style: "cancel" },
      {
        text: "Ta bort",
        style: "destructive",
        onPress: () => {
          deleteGroup(activeGroup.id);
          if (selectedGroup?.id === activeGroup.id) setSelectedGroup(null);
          closeMenu();
          Alert.alert("Grupp borttagen", "Gruppen har tagits bort.");
        },
      },
    ]);
  };

  const handleRename = async () => {
    if (!activeGroup) return;
    if (!newName.trim()) {
      Alert.alert("Fel", "Ange ett nytt namn.");
      return;
    }
    await renameGroup(activeGroup.id, capitalizeFirst(newName.trim()));
    setNewName("");
    setRenameVisible(false);
    Alert.alert("Grupp uppdaterad", "Gruppnamnet har ändrats.");
  };

  return (
    <View style={styles.container}>
      <Header />

      {/* Skapa grupp */}
      <TextInput
        placeholder="Gruppnamn"
        value={groupName}
        onChangeText={setGroupName}
        style={styles.input}
      />
      <Button title="Skapa grupp" type="primary" onPress={handleCreateGroup} />

      {/* Importera grupp */}
      <TextInput
        placeholder="Gruppkod"
        value={groupCode}
        onChangeText={setGroupCode}
        style={styles.input}
      />
      <Button title="Importera grupp" type="secondary" onPress={handleImportGroup} />

      {/* Lista grupper */}
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.groupItem} onPress={() => openMenu(item)}>
            <Text style={styles.groupText}>
              {capitalizeFirst(item.name)} ({item.code})
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.groupText}>Inga grupper ännu</Text>} // ✅ tomvy
      />

      {/* Gruppmeny */}
      <Modal visible={menuVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {activeGroup ? capitalizeFirst(activeGroup.name) : ""}
            </Text>
            <Button title="Välj grupp" type="primary" onPress={handleSelectGroup} />
            <Button title="Dela kod" type="secondary" onPress={handleShareCode} />
            <Button title="Kopiera kod" type="secondary" onPress={handleCopyCode} />
            <Button title="Byt namn" type="secondary" onPress={() => setRenameVisible(true)} />
            <Button title="Ta bort grupp" type="secondary" onPress={handleDeleteGroup} />
            <Button title="Stäng" type="secondary" onPress={closeMenu} />
          </View>
        </View>
      </Modal>

      {/* Byt namn-modal */}
      <Modal visible={renameVisible} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TextInput
              placeholder="Nytt namn"
              value={newName}
              onChangeText={setNewName}
              style={styles.input}
            />
            <Button title="Spara" type="primary" onPress={handleRename} />
            <Button title="Avbryt" type="secondary" onPress={() => setRenameVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: WorkaholicTheme.colors.background,
  },
  header: {
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerText: {
    fontSize: 20,
    fontWeight: "600",
    color: WorkaholicTheme.colors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: WorkaholicTheme.colors.secondary,
    padding: 10,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: WorkaholicTheme.colors.surface,
    color: WorkaholicTheme.colors.textPrimary,
  },
  groupItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: WorkaholicTheme.colors.secondary,
  },
  groupText: {
    fontSize: 16,
    color: WorkaholicTheme.colors.textPrimary,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    margin: 20,
    padding: 20,
    backgroundColor: WorkaholicTheme.colors.surface,
    borderRadius: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: WorkaholicTheme.colors.primary,
    textAlign: "center",
  },
});