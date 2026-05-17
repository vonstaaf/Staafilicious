import React, { useContext, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppHeader from "../components/AppHeader";
import { ProjectsContext } from "../context/ProjectsContext";
import { CompanyContext } from "../context/CompanyContext";
import { WorkaholicTheme } from "../theme";
import { handleConstructionLogPdf } from "../utils/pdfActions";

function normalizeDate(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

export default function ConstructionLogScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { selectedProject, projects, updateProject } = useContext(ProjectsContext);
  const { company } = useContext(CompanyContext) || {};

  const routeProjectId = route?.params?.project?.id || null;
  const activeProject = useMemo(() => {
    if (!routeProjectId) return selectedProject || null;
    return projects.find((p) => p.id === routeProjectId) || selectedProject || null;
  }, [projects, routeProjectId, selectedProject]);

  const [dateText, setDateText] = useState(new Date().toISOString().slice(0, 10));
  const [workDone, setWorkDone] = useState("");
  const [staff, setStaff] = useState("");
  const [notes, setNotes] = useState("");

  const logs = useMemo(() => {
    const list = Array.isArray(activeProject?.dailyLogs) ? activeProject.dailyLogs : [];
    return [...list].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [activeProject?.dailyLogs]);

  const saveLog = async () => {
    if (!activeProject?.id) return;
    if (!workDone.trim()) {
      Alert.alert("Uppgift saknas", "Ange utfört arbete innan du sparar.");
      return;
    }
    const payload = {
      id: String(Date.now()),
      date: normalizeDate(dateText),
      workDone: workDone.trim(),
      staff: staff.trim(),
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };
    const existing = Array.isArray(activeProject.dailyLogs) ? activeProject.dailyLogs : [];
    const nextLogs = [payload, ...existing].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    try {
      await updateProject(activeProject.id, { dailyLogs: nextLogs });
      setWorkDone("");
      setStaff("");
      setNotes("");
      Alert.alert("Sparat", "Byggdagboken är uppdaterad.");
    } catch (e) {
      Alert.alert("Fel", "Kunde inte spara dagboksanteckningen.");
    }
  };

  const exportAllLogs = async () => {
    if (!activeProject) return;
    try {
      await handleConstructionLogPdf(activeProject, logs, company || {}, { mode: "all" });
    } catch (e) {
      Alert.alert("Fel", "Kunde inte exportera byggdagboken.");
    }
  };

  const exportSingleLog = async (entry) => {
    if (!activeProject) return;
    try {
      await handleConstructionLogPdf(activeProject, [entry], company || {}, { mode: "single", singleDate: entry.date });
    } catch (e) {
      Alert.alert("Fel", "Kunde inte exportera anteckningen.");
    }
  };

  if (!activeProject?.id) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Inget aktivt projekt hittades.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <AppHeader title="BYGGDAGBOK" subTitle={(activeProject.name || "").toUpperCase()} navigation={navigation} />

      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 140 }}
        ListHeaderComponent={
          <View style={styles.formCard}>
            <Text style={styles.sectionLabel}>NY DAGBOKSANTECKNING</Text>
            <TextInput
              style={styles.input}
              value={dateText}
              onChangeText={setDateText}
              placeholder="Datum (YYYY-MM-DD)"
              placeholderTextColor="#AAA"
            />
            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              value={workDone}
              onChangeText={setWorkDone}
              placeholder="Utfört arbete"
              placeholderTextColor="#AAA"
            />
            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              value={staff}
              onChangeText={setStaff}
              placeholder="Närvarande personal"
              placeholderTextColor="#AAA"
            />
            <TextInput
              style={[styles.input, styles.textArea, { marginTop: 10 }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Väder, hinder eller avvikelser"
              placeholderTextColor="#AAA"
              multiline
            />

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.saveBtn} onPress={saveLog}>
                <Ionicons name="save-outline" size={18} color="#FFF" />
                <Text style={styles.saveBtnText}>SPARA LOGG</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exportAllBtn} onPress={exportAllLogs} disabled={logs.length === 0}>
                <Ionicons name="share-outline" size={18} color="#FFF" />
                <Text style={styles.saveBtnText}>EXPORTERA DAGBOK</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={40} color="#CCC" />
            <Text style={styles.emptyText}>Inga dagboksanteckningar än.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardDate}>{new Date(item.date || Date.now()).toLocaleDateString("sv-SE")}</Text>
            <Text style={styles.cardTitle}>Utfört arbete</Text>
            <Text style={styles.cardText}>{item.workDone || "-"}</Text>

            <Text style={[styles.cardTitle, { marginTop: 8 }]}>Närvarande personal</Text>
            <Text style={styles.cardText}>{item.staff || "-"}</Text>

            <Text style={[styles.cardTitle, { marginTop: 8 }]}>Väder, hinder eller avvikelser</Text>
            <Text style={styles.cardText}>{item.notes || "-"}</Text>

            <TouchableOpacity style={styles.exportEntryBtn} onPress={() => exportSingleLog(item)}>
              <Ionicons name="document-text-outline" size={17} color="#FFF" />
              <Text style={styles.exportEntryBtnText}>EXPORTERA DENNA DAG</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyText: { marginTop: 10, color: "#999", fontWeight: "700" },

  formCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  sectionLabel: { color: "#AAA", fontSize: 10, fontWeight: "900", letterSpacing: 1, marginBottom: 10 },
  input: {
    backgroundColor: "#F5F5F7",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: "#1C1C1E",
    fontWeight: "700",
  },
  textArea: { minHeight: 88, textAlignVertical: "top" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  saveBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#1C1C1E",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    gap: 7,
  },
  exportAllBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: WorkaholicTheme.colors.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    gap: 7,
  },
  saveBtnText: { color: "#FFF", fontWeight: "900", fontSize: 11 },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  cardDate: { color: WorkaholicTheme.colors.primary, fontWeight: "900", fontSize: 12, marginBottom: 8 },
  cardTitle: { fontSize: 10, fontWeight: "900", color: "#888", letterSpacing: 0.6 },
  cardText: { marginTop: 4, color: "#1C1C1E", fontSize: 13, fontWeight: "600", lineHeight: 18 },
  exportEntryBtn: {
    marginTop: 12,
    backgroundColor: "#1C1C1E",
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
  },
  exportEntryBtnText: { color: "#FFF", fontWeight: "900", fontSize: 11 },
});
