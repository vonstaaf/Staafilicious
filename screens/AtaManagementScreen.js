import React, { useContext, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProjectsContext } from "../context/ProjectsContext";
import { CompanyContext } from "../context/CompanyContext";
import AppHeader from "../components/AppHeader";
import { WorkaholicTheme } from "../theme";
import { handleAtaPdf } from "../utils/pdfActions";

const TYPE_OPTIONS = ["Tillägg", "Ändring", "Avgående"];
const STATUS_OPTIONS = ["Väntar på godkännande", "Godkänd", "Avvisad"];

function normalizeDate(dateInput) {
  if (!dateInput) return new Date().toISOString();
  const parsed = new Date(dateInput);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return new Date().toISOString();
}

function formatDate(dateInput) {
  const d = new Date(dateInput || Date.now());
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("sv-SE");
}

function parseNumber(input) {
  const raw = String(input || "").replace(",", ".").trim();
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function formatCurrency(value) {
  return `${Number(value || 0).toFixed(2).replace(".", ",")} kr`;
}

function statusColor(status) {
  if (status === "Godkänd") return "#34C759";
  if (status === "Avvisad") return "#FF3B30";
  return "#FFCC00";
}

export default function AtaManagementScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { selectedProject, projects, updateProject } = useContext(ProjectsContext);
  const { company } = useContext(CompanyContext) || {};

  const routeProjectId = route?.params?.project?.id || null;
  const activeProject = useMemo(() => {
    if (!routeProjectId) return selectedProject || null;
    return projects.find((p) => p.id === routeProjectId) || selectedProject || null;
  }, [projects, routeProjectId, selectedProject]);

  const atas = useMemo(() => {
    const list = Array.isArray(activeProject?.atas) ? activeProject.atas : [];
    return [...list].sort((a, b) => new Date(b?.datum || 0).getTime() - new Date(a?.datum || 0).getTime());
  }, [activeProject?.atas]);

  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ataType, setAtaType] = useState(TYPE_OPTIONS[0]);
  const [hours, setHours] = useState("");
  const [materialCost, setMaterialCost] = useState("");
  const [dateText, setDateText] = useState("");

  const closeModal = () => {
    setModalVisible(false);
    setTitle("");
    setDescription("");
    setAtaType(TYPE_OPTIONS[0]);
    setHours("");
    setMaterialCost("");
    setDateText("");
  };

  const saveAta = async () => {
    if (!activeProject?.id) return;
    if (!title.trim()) {
      Alert.alert("Titel saknas", "Ange en titel for ATA-lappen.");
      return;
    }
    const nextAta = {
      id: String(Date.now()),
      titel: title.trim(),
      beskrivning: description.trim(),
      typ: ataType,
      timmar: parseNumber(hours),
      materialKostnad: parseNumber(materialCost),
      datum: normalizeDate(dateText),
      status: "Väntar på godkännande",
    };
    const existing = Array.isArray(activeProject.atas) ? activeProject.atas : [];
    try {
      await updateProject(activeProject.id, { atas: [nextAta, ...existing] });
      closeModal();
      Alert.alert("Sparat", "ATA-lappen ar sparad.");
    } catch (e) {
      Alert.alert("Fel", "Kunde inte spara ATA-lappen.");
    }
  };

  const updateAtaStatus = async (ataId, nextStatus) => {
    if (!activeProject?.id) return;
    const existing = Array.isArray(activeProject.atas) ? activeProject.atas : [];
    const updated = existing.map((item) => (item.id === ataId ? { ...item, status: nextStatus } : item));
    try {
      await updateProject(activeProject.id, { atas: updated });
    } catch (e) {
      Alert.alert("Fel", "Kunde inte uppdatera status.");
    }
  };

  const shareAta = async (ata) => {
    if (!activeProject) return;
    try {
      await handleAtaPdf(activeProject, ata, company || {});
    } catch (e) {
      Alert.alert("Fel", "Kunde inte skapa ATA-PDF.");
    }
  };

  const renderAtaCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleWrap}>
          <Text style={styles.cardTitle}>{item.titel || "Namnlos ATA"}</Text>
          <Text style={styles.cardMeta}>
            {item.typ || "-"} • {formatDate(item.datum)}
          </Text>
        </View>
        <View style={[styles.statusTag, { backgroundColor: statusColor(item.status) + "20" }]}>
          <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{item.status || "-"}</Text>
        </View>
      </View>

      <Text style={styles.description}>{item.beskrivning || "Ingen beskrivning angiven."}</Text>

      <View style={styles.kpiRow}>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>TIMMAR</Text>
          <Text style={styles.kpiValue}>{Number(item.timmar || 0)} h</Text>
        </View>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>MATERIAL</Text>
          <Text style={styles.kpiValue}>{formatCurrency(item.materialKostnad)}</Text>
        </View>
      </View>

      <View style={styles.statusButtons}>
        {STATUS_OPTIONS.map((status) => {
          const active = item.status === status;
          return (
            <TouchableOpacity
              key={`${item.id}-${status}`}
              style={[styles.statusBtn, active && { backgroundColor: statusColor(status) + "20" }]}
              onPress={() => updateAtaStatus(item.id, status)}
            >
              <Text style={[styles.statusBtnText, active && { color: statusColor(status) }]}>{status}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.shareBtn} onPress={() => shareAta(item)}>
        <Ionicons name="share-social-outline" size={18} color="#FFF" />
        <Text style={styles.shareBtnText}>DELA PDF</Text>
      </TouchableOpacity>
    </View>
  );

  if (!activeProject?.id) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Kunde inte hitta aktivt projekt.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <AppHeader title="ATA-HANTERING" subTitle={(activeProject.name || "").toUpperCase()} navigation={navigation} />

      <FlatList
        data={atas}
        keyExtractor={(item) => item.id}
        renderItem={renderAtaCard}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 130 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={46} color="#CCC" />
            <Text style={styles.emptyText}>Inga ATA-lappar skapade an.</Text>
          </View>
        }
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 15 }]}>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add-circle-outline" size={20} color="#FFF" />
          <Text style={styles.addBtnText}>NY ATA-LAPP</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>SKAPA ATA</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Titel</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="t.ex. Flytt av central"
                placeholderTextColor="#BBB"
              />

              <Text style={styles.label}>Beskrivning</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                multiline
                placeholder="Beskriv arbete och bakgrund..."
                placeholderTextColor="#BBB"
              />

              <Text style={styles.label}>Typ</Text>
              <View style={styles.typeRow}>
                {TYPE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.typeBtn, ataType === opt && styles.typeBtnActive]}
                    onPress={() => setAtaType(opt)}
                  >
                    <Text style={[styles.typeBtnText, ataType === opt && styles.typeBtnTextActive]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.inputRow}>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Timmar</Text>
                  <TextInput
                    style={styles.input}
                    value={hours}
                    onChangeText={setHours}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#BBB"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Materialkostnad</Text>
                  <TextInput
                    style={styles.input}
                    value={materialCost}
                    onChangeText={setMaterialCost}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#BBB"
                  />
                </View>
              </View>

              <Text style={styles.label}>Datum (YYYY-MM-DD, valfritt)</Text>
              <TextInput
                style={styles.input}
                value={dateText}
                onChangeText={setDateText}
                placeholder={new Date().toISOString().slice(0, 10)}
                placeholderTextColor="#BBB"
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                <Text style={styles.cancelBtnText}>AVBRYT</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveAta}>
                <Text style={styles.saveBtnText}>SPARA ATA</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyState: { alignItems: "center", paddingVertical: 70 },
  emptyText: { color: "#999", fontWeight: "700", marginTop: 12 },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  titleWrap: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "900", color: "#1C1C1E" },
  cardMeta: { marginTop: 3, color: "#777", fontWeight: "700", fontSize: 11 },
  statusTag: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start" },
  statusText: { fontSize: 10, fontWeight: "900" },
  description: { color: "#555", fontSize: 13, lineHeight: 18, marginTop: 12, marginBottom: 12 },

  kpiRow: { flexDirection: "row", gap: 10 },
  kpiBox: { flex: 1, backgroundColor: "#F8F9FB", borderRadius: 12, padding: 10 },
  kpiLabel: { fontSize: 9, fontWeight: "900", color: "#999", marginBottom: 4 },
  kpiValue: { fontSize: 13, fontWeight: "800", color: "#1C1C1E" },

  statusButtons: { flexDirection: "row", gap: 8, marginTop: 12 },
  statusBtn: { flex: 1, backgroundColor: "#F3F4F6", borderRadius: 10, paddingVertical: 8, alignItems: "center" },
  statusBtnText: { fontSize: 10, fontWeight: "800", color: "#666" },

  shareBtn: {
    marginTop: 12,
    backgroundColor: "#1C1C1E",
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 11,
  },
  shareBtnText: { color: "#FFF", fontWeight: "900", fontSize: 12, letterSpacing: 0.5 },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 15,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#EEE",
  },
  addBtn: {
    backgroundColor: WorkaholicTheme.colors.primary,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  addBtnText: { color: "#FFF", fontWeight: "900", letterSpacing: 0.6 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: "88%",
  },
  modalTitle: { textAlign: "center", fontWeight: "900", fontSize: 14, color: "#1C1C1E", marginBottom: 16 },
  label: { fontSize: 10, color: "#999", fontWeight: "900", marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: "#F5F5F7",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: "#1C1C1E",
    fontWeight: "700",
  },
  textArea: { minHeight: 90, textAlignVertical: "top" },
  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: "#F3F4F6", alignItems: "center" },
  typeBtnActive: { backgroundColor: WorkaholicTheme.colors.primary + "20" },
  typeBtnText: { fontSize: 11, fontWeight: "800", color: "#666" },
  typeBtnTextActive: { color: WorkaholicTheme.colors.primary },

  inputRow: { flexDirection: "row", gap: 10 },
  halfInput: { flex: 1 },

  modalActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center", backgroundColor: "#F3F4F6" },
  saveBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center", backgroundColor: "#1C1C1E" },
  cancelBtnText: { color: "#666", fontWeight: "900", fontSize: 12 },
  saveBtnText: { color: "#FFF", fontWeight: "900", fontSize: 12 },
});
