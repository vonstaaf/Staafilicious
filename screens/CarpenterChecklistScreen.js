import React, { useContext, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  FlatList,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppHeader from "../components/AppHeader";
import { ProjectsContext } from "../context/ProjectsContext";
import { CompanyContext } from "../context/CompanyContext";
import { WorkaholicTheme } from "../theme";
import { handleChecklistPdf } from "../utils/pdfActions";

const CHECKLIST_TEMPLATES = [
  {
    id: "fonster",
    name: "Fönstermontering",
    items: [
      "Drevning utförd",
      "Infästning enligt anvisning",
      "Nivåkontroll klar",
      "Fuktspärr tätad",
      "Invändig/utvändig fog verifierad",
    ],
  },
  {
    id: "barande",
    name: "Bärande konstruktion",
    items: [
      "Dimensioner verifierade mot ritning",
      "Infästning och beslag kontrollerade",
      "Lod- och vinkelkontroll utförd",
      "Avväxling/stämpning dokumenterad",
      "Säkerhetskrav uppfyllda",
    ],
  },
  {
    id: "vatrum",
    name: "Våtrumsregling",
    items: [
      "Regelavstånd enligt systemkrav",
      "Kortling för inredning monterad",
      "Tätskiktsunderlag kontrollerat",
      "Genomföringar markerade",
      "Fuktkritiska ytor förstärkta",
    ],
  },
];

function toDate(value) {
  const d = new Date(value || Date.now());
  if (Number.isNaN(d.getTime())) return new Date();
  return d;
}

export default function CarpenterChecklistScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { selectedProject, projects, updateProject } = useContext(ProjectsContext);
  const { company } = useContext(CompanyContext) || {};

  const routeProjectId = route?.params?.project?.id || null;
  const activeProject = useMemo(() => {
    if (!routeProjectId) return selectedProject || null;
    return projects.find((p) => p.id === routeProjectId) || selectedProject || null;
  }, [projects, routeProjectId, selectedProject]);

  const [selectedTemplateId, setSelectedTemplateId] = useState(CHECKLIST_TEMPLATES[0].id);
  const [checkedMap, setCheckedMap] = useState({});
  const [signature, setSignature] = useState("");
  const [dateText, setDateText] = useState(new Date().toISOString().slice(0, 10));

  const selectedTemplate = useMemo(
    () => CHECKLIST_TEMPLATES.find((t) => t.id === selectedTemplateId) || CHECKLIST_TEMPLATES[0],
    [selectedTemplateId]
  );

  const savedChecklists = useMemo(() => {
    const list = Array.isArray(activeProject?.checklists) ? activeProject.checklists : [];
    return [...list].sort((a, b) => toDate(b.date) - toDate(a.date));
  }, [activeProject?.checklists]);

  const toggleItem = (itemLabel) => {
    setCheckedMap((prev) => ({ ...prev, [itemLabel]: !prev[itemLabel] }));
  };

  const saveChecklist = async () => {
    if (!activeProject?.id) return;
    if (!signature.trim()) {
      Alert.alert("Signatur saknas", "Ange signatur innan du sparar.");
      return;
    }
    const dateIso = new Date(dateText || Date.now()).toISOString();
    const payload = {
      id: String(Date.now()),
      templateId: selectedTemplate.id,
      templateName: selectedTemplate.name,
      checks: selectedTemplate.items.map((label) => ({ label, checked: Boolean(checkedMap[label]) })),
      date: dateIso,
      signature: signature.trim(),
    };
    const existing = Array.isArray(activeProject.checklists) ? activeProject.checklists : [];
    try {
      await updateProject(activeProject.id, { checklists: [payload, ...existing] });
      setCheckedMap({});
      setSignature("");
      Alert.alert("Sparat", "Egenkontrollen är sparad.");
    } catch (e) {
      Alert.alert("Fel", "Kunde inte spara checklistan.");
    }
  };

  const exportChecklist = async (checklist) => {
    if (!activeProject) return;
    try {
      await handleChecklistPdf(activeProject, checklist, company || {});
    } catch (e) {
      Alert.alert("Fel", "Kunde inte skapa PDF.");
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
      <AppHeader title="EGENKONTROLLER" subTitle={(activeProject.name || "").toUpperCase()} navigation={navigation} />

      <FlatList
        data={savedChecklists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 130 }}
        ListHeaderComponent={
          <View style={styles.formCard}>
            <Text style={styles.sectionLabel}>VÄLJ MALL</Text>
            <View style={styles.templateRow}>
              {CHECKLIST_TEMPLATES.map((template) => (
                <TouchableOpacity
                  key={template.id}
                  style={[styles.templateBtn, selectedTemplateId === template.id && styles.templateBtnActive]}
                  onPress={() => {
                    setSelectedTemplateId(template.id);
                    setCheckedMap({});
                  }}
                >
                  <Text style={[styles.templateBtnText, selectedTemplateId === template.id && styles.templateBtnTextActive]}>
                    {template.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>KONTROLLPUNKTER</Text>
            {selectedTemplate.items.map((item) => {
              const checked = Boolean(checkedMap[item]);
              return (
                <TouchableOpacity key={item} style={styles.checkRow} onPress={() => toggleItem(item)}>
                  <Ionicons
                    name={checked ? "checkbox" : "square-outline"}
                    size={22}
                    color={checked ? WorkaholicTheme.colors.primary : "#999"}
                  />
                  <Text style={styles.checkLabel}>{item}</Text>
                </TouchableOpacity>
              );
            })}

            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>SIGNERING</Text>
            <TextInput
              style={styles.input}
              placeholder="Signatur (namn)"
              placeholderTextColor="#AAA"
              value={signature}
              onChangeText={setSignature}
            />
            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              placeholder="Datum (YYYY-MM-DD)"
              placeholderTextColor="#AAA"
              value={dateText}
              onChangeText={setDateText}
            />

            <TouchableOpacity style={styles.saveBtn} onPress={saveChecklist}>
              <Ionicons name="save-outline" size={18} color="#FFF" />
              <Text style={styles.saveBtnText}>SPARA EGENKONTROLL</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="clipboard-outline" size={40} color="#CCC" />
            <Text style={styles.emptyText}>Inga sparade egenkontroller än.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.templateName || "Checklista"}</Text>
            <Text style={styles.cardMeta}>
              {toDate(item.date).toLocaleDateString("sv-SE")} • Sign: {item.signature || "-"}
            </Text>
            {(item.checks || []).map((check) => (
              <Text key={check.label} style={styles.cardCheck}>
                {check.checked ? "✓" : "○"} {check.label}
              </Text>
            ))}
            <TouchableOpacity style={styles.exportBtn} onPress={() => exportChecklist(item)}>
              <Ionicons name="share-outline" size={18} color="#FFF" />
              <Text style={styles.exportBtnText}>DELA PDF</Text>
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
  emptyState: { paddingVertical: 30, alignItems: "center" },
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
  sectionLabel: { color: "#AAA", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  templateRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  templateBtn: { backgroundColor: "#F3F4F6", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  templateBtnActive: { backgroundColor: WorkaholicTheme.colors.primary + "25" },
  templateBtnText: { fontSize: 11, fontWeight: "800", color: "#666" },
  templateBtnTextActive: { color: WorkaholicTheme.colors.primary },

  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9 },
  checkLabel: { flex: 1, color: "#333", fontWeight: "700", fontSize: 13 },
  input: {
    backgroundColor: "#F5F5F7",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: "#1C1C1E",
    fontWeight: "700",
  },
  saveBtn: {
    marginTop: 12,
    backgroundColor: "#1C1C1E",
    borderRadius: 12,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  saveBtnText: { color: "#FFF", fontWeight: "900", fontSize: 12 },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  cardTitle: { fontSize: 15, fontWeight: "900", color: "#1C1C1E" },
  cardMeta: { marginTop: 4, marginBottom: 8, color: "#888", fontSize: 11, fontWeight: "700" },
  cardCheck: { color: "#444", marginBottom: 4, fontSize: 12 },
  exportBtn: {
    marginTop: 8,
    backgroundColor: WorkaholicTheme.colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  exportBtnText: { color: "#FFF", fontWeight: "900", fontSize: 12 },
});
