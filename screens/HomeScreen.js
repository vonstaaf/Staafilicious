import React, { useContext, useState } from "react";
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  Modal, Alert, Share, StyleSheet
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { GroupsContext } from "../context/GroupsContext";
import { auth } from "../firebaseConfig";
import { signOut } from "firebase/auth";
import Button from "../components/Button";
import { WorkaholicTheme } from "../theme";

export default function HomeScreen() {
  const navigation = useNavigation();
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

  const handleSelectGroup = () => {
    setSelectedGroup(activeGroup);
    setMenuVisible(false);
    // ✅ Förbättring 1: Navigera automatiskt
    navigation.navigate("Kostnads"); 
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return Alert.alert("Fel", "Ange ett gruppnamn.");
    try {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      await createGroup(groupName.trim(), code);
      setGroupName("");
    } catch (error) { Alert.alert("Fel", "Kunde inte skapa grupp."); }
  };

  const handleImportGroup = async () => {
    if (!groupCode.trim()) return Alert.alert("Fel", "Ange en gruppkod.");
    try {
      await importGroup(groupCode.trim().toUpperCase());
      setGroupCode("");
    } catch (error) { Alert.alert("Fel", "Koden hittades inte."); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.infoBox}>
        <View>
          <Text style={styles.infoTitle}>
            {selectedGroup ? `Aktiv: ${selectedGroup.name}` : "Ingen grupp vald"}
          </Text>
          {selectedGroup && <Text style={styles.infoText}>Kod: {selectedGroup.code}</Text>}
        </View>
        <TouchableOpacity onPress={() => signOut(auth)}>
          <Text style={styles.logoutText}>Logga ut</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionSection}>
        <TextInput 
          placeholder="Nytt gruppnamn" 
          value={groupName} 
          onChangeText={setGroupName} 
          style={styles.input} 
        />
        <Button title="Skapa ny grupp" type="primary" onPress={handleCreateGroup} />
      </View>

      <View style={styles.actionSection}>
        <TextInput 
          placeholder="Ange gruppkod" 
          value={groupCode} 
          onChangeText={setGroupCode} 
          style={styles.input} 
          autoCapitalize="characters"
        />
        <Button title="Gå med i grupp" type="secondary" onPress={handleImportGroup} />
      </View>

      <Text style={styles.sectionTitle}>Dina grupper</Text>
      
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isSelected = selectedGroup?.id === item.id;
          return (
            <TouchableOpacity
              style={[styles.groupItem, isSelected && styles.selectedItem]}
              onPress={() => { setActiveGroup(item); setMenuVisible(true); }}
            >
              <View style={styles.groupRow}>
                <View>
                  <Text style={[styles.groupText, isSelected && styles.selectedText]}>{item.name}</Text>
                  <Text style={styles.groupCodeSub}>{item.code}</Text>
                </View>
                {/* ✅ Förbättring 2: Visuell bock */}
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={26} color={WorkaholicTheme.colors.primary} />
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Modal för gruppalternativ */}
      <Modal visible={menuVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{activeGroup?.name}</Text>
            <Button title="Välj som aktiv grupp" type="primary" onPress={handleSelectGroup} />
            <Button title="Dela kod" type="secondary" onPress={() => { Share.share({ message: `Kod: ${activeGroup.code}` }); setMenuVisible(false); }} />
            <Button title="Byt namn" type="secondary" onPress={() => setRenameVisible(true)} />
            <Button title="Radera" type="secondary" onPress={() => {
              Alert.alert("Radera?", "Är du säker?", [
                { text: "Nej" },
                { text: "Ja", onPress: () => { deleteGroup(activeGroup.id); setMenuVisible(false); } }
              ]);
            }} />
            <TouchableOpacity onPress={() => setMenuVisible(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Stäng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: WorkaholicTheme.colors.background },
  infoBox: { backgroundColor: "#fff", padding: 20, borderRadius: 15, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2 },
  infoTitle: { fontSize: 18, fontWeight: "bold", color: WorkaholicTheme.colors.primary },
  infoText: { fontSize: 13, color: "#666" },
  logoutText: { color: WorkaholicTheme.colors.error, fontWeight: "bold" },
  actionSection: { marginBottom: 15 },
  input: { backgroundColor: "#fff", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#ddd", marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  groupItem: { backgroundColor: "#fff", padding: 15, borderRadius: 12, marginBottom: 10, borderLeftWidth: 6, borderLeftColor: "#ccc" },
  selectedItem: { borderLeftColor: WorkaholicTheme.colors.primary, backgroundColor: "#f0f9ff" },
  groupRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  groupText: { fontSize: 16, fontWeight: "600" },
  selectedText: { color: WorkaholicTheme.colors.primary },
  groupCodeSub: { fontSize: 12, color: "#888" },
  modalContainer: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { backgroundColor: "#fff", padding: 25, borderTopLeftRadius: 25, borderTopRightRadius: 25 },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  closeBtn: { marginTop: 10, padding: 10 },
  closeBtnText: { textAlign: "center", color: "#666", fontWeight: "bold" }
});