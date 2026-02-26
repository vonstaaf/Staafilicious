import React, { useState, useContext, useEffect } from "react";
import { 
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, 
  Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ProjectsContext } from "../context/ProjectsContext";
import { WorkaholicTheme } from "../theme";
import AppHeader from "../components/AppHeader";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Definierar enhetsalternativen för mätvärden inklusive strömstyrka
const UNIT_OPTIONS = [
  { label: 'Ingen', value: '' },
  { label: 'm', value: 'Meter' },
  { label: 'MΩ', value: 'MegaOhm' },
  { label: 'Ω', value: 'Ohm' },
  { label: 'mA', value: 'mA' },
  { label: 'kA', value: 'kA' }
];

export default function InspectionTemplateScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { inspectionTemplate, saveInspectionTemplate } = useContext(ProjectsContext);
  
  const [items, setItems] = useState([]);
  const [newItemLabel, setNewItemLabel] = useState("");
  const [loading, setLoading] = useState(false);

  // Synka lokal state med Master-mallen från Context
  useEffect(() => {
    if (inspectionTemplate) {
      setItems(inspectionTemplate);
    }
  }, [inspectionTemplate]);

  const addItem = () => {
    const trimmed = newItemLabel.trim();
    if (trimmed.length < 2) return;
    
    // Skapa objektet enligt strukturen i InspectionScreen
    const updated = [
      ...items, 
      { 
        id: "i" + Date.now().toString(), 
        label: trimmed,
        section: "ALLMÄNT",
        desc: "",
        unit: "", 
        checked: false 
      }
    ];
    
    setItems(updated);
    setNewItemLabel("");
    Keyboard.dismiss();
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(it => it.id === id ? { ...it, [field]: value } : it));
  };

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await saveInspectionTemplate(items);
      Alert.alert(
        "Mallen sparad!", 
        "Dina standardpunkter och enheter (inkl. mA/kA) används nu för alla nya projekt."
      );
      navigation.goBack();
    } catch (e) {
      Alert.alert("Fel", "Kunde inte spara mallen till Firebase.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="MALL" subTitle="Master-egenkontroll" navigation={navigation} />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        <View style={styles.inputSection}>
          <Text style={styles.infoText}>
            Bygg din standardlista. Vald enhet skapar automatiskt rätt mätvärdesfält i kontrollen.
          </Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Ny kontrollpunkt..."
              value={newItemLabel}
              onChangeText={setNewItemLabel}
              placeholderTextColor="#AAA"
              onSubmitEditing={addItem}
            />
            <TouchableOpacity 
              style={[styles.addBtn, !newItemLabel.trim() && { opacity: 0.5 }]} 
              onPress={addItem}
              disabled={!newItemLabel.trim()}
            >
              <Ionicons name="add" size={28} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={items}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: 150 }]}
          renderItem={({ item }) => (
            <View style={styles.itemRow}>
              <View style={styles.rowTop}>
                <Ionicons name="reorder-three" size={20} color="#CCC" style={{marginRight: 10}} />
                <TextInput 
                  style={styles.labelInput}
                  value={item.label}
                  onChangeText={(v) => updateItem(item.id, 'label', v)}
                  placeholder="Benämning"
                />
                <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={18} color={WorkaholicTheme.colors.error} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.rowBottom}>
                <View style={styles.subInputWrapper}>
                  <Text style={styles.miniLabel}>KATEGORI</Text>
                  <TextInput 
                    style={styles.subInput}
                    value={item.section}
                    onChangeText={(v) => updateItem(item.id, 'section', v)}
                    autoCapitalize="characters"
                  />
                </View>
                <View style={[styles.subInputWrapper, { flex: 2 }]}>
                  <Text style={styles.miniLabel}>ENHET FÖR MÄTVÄRDE</Text>
                  <View style={styles.unitPicker}>
                    {UNIT_OPTIONS.map(opt => (
                      <TouchableOpacity 
                        key={opt.value} 
                        style={[styles.unitPill, item.unit === opt.value && styles.unitPillActive]}
                        onPress={() => updateItem(item.id, 'unit', opt.value)}
                      >
                        <Text style={[styles.unitPillText, item.unit === opt.value && {color: '#FFF'}]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={{marginTop: 15}}>
                <Text style={styles.miniLabel}>INSTRUKTION / BESKRIVNING</Text>
                <TextInput 
                  style={styles.subInput}
                  value={item.desc}
                  onChangeText={(v) => updateItem(item.id, 'desc', v)}
                  placeholder="T.ex. krav på mätvärde eller metod..."
                />
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="clipboard-outline" size={50} color="#EEE" />
              <Text style={styles.emptyText}>Inga punkter i din master-mall.</Text>
            </View>
          }
        />

        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity 
            style={[styles.saveBtn, loading && { opacity: 0.7 }]} 
            onPress={handleSave} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveBtnText}>SPARA MASTER-MALL</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  inputSection: { padding: 20, backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#EEE", elevation: 2 },
  infoText: { fontSize: 13, color: "#8E8E93", marginBottom: 15, lineHeight: 18, fontWeight: "500" },
  inputRow: { flexDirection: "row", gap: 10 },
  input: { flex: 1, backgroundColor: "#F2F2F7", borderRadius: 12, padding: 15, fontSize: 16, fontWeight: "600", color: "#1C1C1E" },
  addBtn: { backgroundColor: WorkaholicTheme.colors.primary, width: 50, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  list: { padding: 15 },
  itemRow: { 
    backgroundColor: "#FFF", 
    padding: 15, 
    borderRadius: 22, 
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    elevation: 1 
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  labelInput: { flex: 1, fontSize: 15, fontWeight: "800", color: "#1C1C1E", borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingVertical: 5 },
  rowBottom: { flexDirection: 'row', gap: 12 },
  subInputWrapper: { flex: 1 },
  miniLabel: { fontSize: 8, fontWeight: '900', color: '#BBB', marginBottom: 4, letterSpacing: 0.5 },
  subInput: { fontSize: 12, fontWeight: '700', color: '#666', backgroundColor: '#F8F9FB', padding: 8, borderRadius: 8 },
  unitPicker: { flexDirection: 'row', gap: 4, marginTop: 2, flexWrap: 'wrap' },
  unitPill: { backgroundColor: '#F0F0F2', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#EEE', minWidth: 38, alignItems: 'center', marginBottom: 4 },
  unitPillActive: { backgroundColor: WorkaholicTheme.colors.primary, borderColor: WorkaholicTheme.colors.primary },
  unitPillText: { fontSize: 9, fontWeight: '900', color: '#666' },
  deleteBtn: { padding: 8, marginLeft: 5 },
  emptyContainer: { alignItems: "center", marginTop: 50 },
  emptyText: { marginTop: 10, color: "#CCC", fontWeight: "600" },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: "#FFF", borderTopWidth: 1, borderTopColor: "#EEE" },
  saveBtn: { backgroundColor: WorkaholicTheme.colors.primary, padding: 18, borderRadius: 16, alignItems: "center", elevation: 5 },
  saveBtnText: { color: "#FFF", fontWeight: "900", fontSize: 14, letterSpacing: 1 }
});