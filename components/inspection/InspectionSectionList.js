import React from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WorkaholicTheme } from "../../theme";

/**
 * Lista över sektioner och kontrollpunkter. Visar antingen listvy (edit mode) eller legal banner.
 */
export default function InspectionSectionList({
  items,
  setItems,
  sections,
  editMode,
  checks,
  setStatus,
  persistData,
  addNewSection,
  removeSection,
  addNewItem,
  removeItem,
  generalNotes,
  setGeneralNotes,
  contentPaddingBottom,
}) {
  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: contentPaddingBottom }}
      keyboardShouldPersistTaps="handled"
    >
      {!editMode && items.length > 0 && (
        <View style={styles.legalBanner}>
          <View style={styles.legalHeader}>
            <Ionicons name="shield-checkmark" size={18} color="#2E7D32" />
            <Text style={styles.legalHeaderText}>BRANSCHSTANDARD & REGLER</Text>
          </View>
          <Text style={styles.legalSubText}>
            Denna kontroll utförs för att säkerställa att anläggningen uppfyller kraven i
            <Text style={{ fontWeight: "800" }}> SS 436 40 00</Text> samt
            <Text style={{ fontWeight: "800" }}> ELSÄK-FS 2008:1</Text>.
          </Text>
        </View>
      )}

      {editMode && (
        <View style={styles.adminBanner}>
          <TouchableOpacity style={styles.addSectionBtn} onPress={addNewSection}>
            <Ionicons name="add-circle" size={20} color="#FFF" />
            <Text style={styles.addSectionText}>NY KATEGORI</Text>
          </TouchableOpacity>
        </View>
      )}

      {sections.map((secName, index) => (
        <View key={`section-${index}`} style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            {editMode ? (
              <View style={styles.sectionEditRow}>
                <TextInput
                  style={styles.sectionEditInput}
                  value={secName}
                  onChangeText={(txt) =>
                    setItems(items.map((it) => (it.section === secName ? { ...it, section: txt } : it)))
                  }
                  onBlur={() => persistData({ inspectionItems: items })}
                />
                <TouchableOpacity onPress={() => removeSection(secName)} style={styles.removeSectionBtn}>
                  <Ionicons name="trash" size={18} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.sectionHeader}>{secName.toUpperCase()}</Text>
            )}
          </View>

          {items
            .filter((it) => it.section === secName)
            .map((item) => (
              <View key={item.id} style={[styles.card, editMode && styles.cardEdit]}>
                <View style={styles.checkRow}>
                  <View style={styles.checkContent}>
                    {editMode ? (
                      <View>
                        <TextInput
                          style={styles.editInput}
                          value={item.label}
                          onChangeText={(txt) =>
                            setItems(items.map((it) => (it.id === item.id ? { ...it, label: txt } : it)))
                          }
                          onBlur={() => persistData({ inspectionItems: items })}
                        />
                        <TextInput
                          style={[styles.editInput, styles.editInputDesc]}
                          value={item.desc}
                          placeholder="Hänvisning (t.ex. SS 436 40 00)"
                          onChangeText={(txt) =>
                            setItems(items.map((it) => (it.id === item.id ? { ...it, desc: txt } : it)))
                          }
                          onBlur={() => persistData({ inspectionItems: items })}
                          placeholderTextColor="#BBB"
                        />
                      </View>
                    ) : (
                      <View>
                        <Text style={styles.checkText}>{item.label}</Text>
                        {item.desc ? <Text style={styles.listDesc}>{item.desc}</Text> : null}
                      </View>
                    )}
                  </View>
                  {!editMode ? (
                    <View style={styles.choiceContainer}>
                      <TouchableOpacity
                        onPress={() => setStatus(item.id, "na")}
                        style={[styles.choiceBtn, checks[item.id] === "na" && styles.choiceNA]}
                      >
                        <Ionicons name="close" size={18} color={checks[item.id] === "na" ? "#fff" : "#DDD"} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setStatus(item.id, "checked")}
                        style={[styles.choiceBtn, checks[item.id] === "checked" && styles.choiceOK]}
                      >
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color={checks[item.id] === "checked" ? "#fff" : "#DDD"}
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.removeItemBtn}>
                      <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}

          {editMode && (
            <TouchableOpacity style={styles.addItemBtn} onPress={() => addNewItem(secName)}>
              <Ionicons name="add" size={18} color="#FFB300" />
              <Text style={styles.addItemText}>Lägg till punkt</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      <View style={styles.notesContainer}>
        <Text style={styles.notesTitle}>ÖVRIGA ANTECKNINGAR</Text>
        <TextInput
          style={styles.noteInput}
          multiline
          value={generalNotes}
          onChangeText={setGeneralNotes}
          onBlur={() => persistData({ inspectionNotes: generalNotes })}
          placeholderTextColor="#BBB"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  legalBanner: {
    margin: 20,
    padding: 15,
    backgroundColor: "#E8F5E9",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  legalHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  legalHeaderText: { fontSize: 11, fontWeight: "900", color: "#2E7D32", letterSpacing: 0.5 },
  legalSubText: { fontSize: 11, color: "#444", lineHeight: 16 },
  adminBanner: {
    backgroundColor: "#FFFDF0",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#FFB300",
  },
  addSectionBtn: {
    backgroundColor: "#FFB300",
    padding: 18,
    borderRadius: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  addSectionText: { color: "#FFF", fontWeight: "900", marginLeft: 8, fontSize: 13 },
  sectionContainer: { marginBottom: 25, paddingHorizontal: 20 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionEditRow: { flexDirection: "row", flex: 1, alignItems: "center" },
  sectionHeader: { fontSize: 11, fontWeight: "900", color: "#BBB", letterSpacing: 1 },
  sectionEditInput: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFB300",
    fontWeight: "800",
  },
  removeSectionBtn: { marginLeft: 10, padding: 10 },
  card: { backgroundColor: "#FFF", borderRadius: 20, padding: 18, marginBottom: 12, elevation: 2 },
  cardEdit: { borderColor: "#FFB300", backgroundColor: "#FFFDF0", borderWidth: 1 },
  checkRow: { flexDirection: "row", alignItems: "center" },
  checkContent: { flex: 1 },
  checkText: { fontSize: 15, fontWeight: "800", color: "#1C1C1E" },
  listDesc: { fontSize: 11, color: "#8E8E93", marginTop: 4, fontWeight: "500", fontStyle: "italic" },
  choiceContainer: { flexDirection: "row", backgroundColor: "#F5F5F7", borderRadius: 12, padding: 4 },
  choiceBtn: { width: 45, height: 40, justifyContent: "center", alignItems: "center", borderRadius: 10 },
  choiceOK: { backgroundColor: "#34C759" },
  choiceNA: { backgroundColor: "#8E8E93" },
  editInput: { borderBottomWidth: 1, borderColor: "#EEE", padding: 10, fontSize: 15, fontWeight: "700", marginBottom: 5 },
  editInputDesc: { fontSize: 12, color: "#666", borderBottomWidth: 0 },
  removeItemBtn: { padding: 5 },
  addItemBtn: { padding: 15, alignItems: "center", flexDirection: "row", justifyContent: "center" },
  addItemText: { color: "#FFB300", fontWeight: "800", marginLeft: 6, fontSize: 13 },
  notesContainer: { padding: 20 },
  notesTitle: { fontSize: 11, fontWeight: "900", color: "#BBB", marginBottom: 12, letterSpacing: 1 },
  noteInput: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    height: 130,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#EEE",
    fontSize: 14,
    fontWeight: "600",
  },
});
