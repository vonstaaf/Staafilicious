import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Alert,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
  Modal,
  SafeAreaView
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ProjectsContext } from "../context/ProjectsContext";

// 🔑 Sökfunktionen mot grossister & lokal cache
import { searchProducts } from "../utils/productSearch";

import InfoBox from "../components/InfoBox";
import Button from "../components/Button";
import { WorkaholicTheme } from "../theme";

// --- HJÄLPFUNKTIONER ---
const formatNumber = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "0,00";
  return Number(n).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const capitalizeFirst = (text) => {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const decimalOnly = (text) => {
  let cleaned = text.replace(",", ".");
  cleaned = cleaned.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) cleaned = parts[0] + "." + parts.slice(1).join("");
  return cleaned;
};

// 🔑 Grossistlista
const WHOLESALERS = [
  { id: 'local', name: 'Lokal DB', icon: 'server' },
  { id: 'rexel', name: 'Rexel', icon: 'flash' },
  { id: 'solar', name: 'Solar', icon: 'sunny' },
  { id: 'ahlsell', name: 'Ahlsell', icon: 'construct' },
  { id: 'elektroskandia', name: 'E-skandia', icon: 'bulb' }
];

export default function ProductsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { selectedProject, updateProject } = useContext(ProjectsContext);
  const [products, setProducts] = useState([]);
  const [selectedWholesaler, setSelectedWholesaler] = useState('local');
  
  const initialRowState = {
    name: "",
    articleNumber: "",
    purchasePrice: "",
    markup: "25", 
    quantity: "1",
  };

  const [newRow, setNewRow] = useState(initialRowState);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState("");
  const [modalResults, setModalResults] = useState([]);
  const [selectedInModal, setSelectedInModal] = useState([]);

  useEffect(() => {
    if (selectedProject?.products) {
      setProducts(selectedProject.products);
    } else {
      setProducts([]);
    }
  }, [selectedProject]);

  // --- 🔑 DEBOUNCING EFFEKT (100ms) ---
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isModalVisible) {
        performModalSearch(modalSearchQuery);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [modalSearchQuery, selectedWholesaler]);

  if (!selectedProject) {
    return (
      <View style={[styles.centeredContainer, { paddingTop: insets.top }]}>
        <Ionicons name="briefcase-outline" size={80} color="#CCC" />
        <Text style={styles.noProjectText}>INGET PROJEKT VALT</Text>
        <TouchableOpacity 
          style={styles.goBackBtn} 
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.goBackBtnText}>GÅ TILL PROJEKTLISTAN</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const performModalSearch = async (text) => {
    if (text.length < 2) {
      setModalResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchProducts(text, selectedWholesaler);
      setModalResults(results);
    } catch (e) { 
      console.log("Sökfel:", e); 
    } finally { 
      setIsSearching(false); 
    }
  };

  const addModalItemsToProject = async () => {
    const newItems = selectedInModal.map(item => {
      const price = parseFloat(item.price || item.originalPrice || item.purchasePrice) || 0;
      const markup = 25;
      return {
        name: item.label || item.name || "Okänd",
        articleNumber: item.artNr || item.articleNumber || "-",
        purchasePrice: price,
        markup: markup,
        quantity: 1,
        unitPriceOutExclVat: price * (1 + markup / 100),
      };
    });

    const updated = [...newItems, ...products];
    await updateProject(selectedProject.id, { products: updated });
    setIsModalVisible(false);
    setSelectedInModal([]);
    setModalResults([]);
    setModalSearchQuery("");
  };

  const saveProduct = async () => {
    if (!newRow.name.trim()) return;

    const p = parseFloat(newRow.purchasePrice) || 0;
    const m = parseFloat(newRow.markup) || 0;
    const q = parseFloat(newRow.quantity) || 0;

    const newItem = {
      name: capitalizeFirst(newRow.name.trim()),
      articleNumber: newRow.articleNumber.trim() || "-",
      purchasePrice: p,
      markup: m,
      quantity: q,
      unitPriceOutExclVat: p * (1 + m / 100),
    };

    let updated = editingIndex !== null ? [...products] : [newItem, ...products];
    if (editingIndex !== null) updated[editingIndex] = newItem;

    try {
      await updateProject(selectedProject.id, { products: updated });
      setNewRow(initialRowState);
      setEditingIndex(null);
      Keyboard.dismiss();
    } catch (e) {
      Alert.alert("Fel", "Kunde inte spara.");
    }
  };

  const formattedProjectName = selectedProject ? capitalizeFirst(selectedProject.name) : "";
  const sumTotalOut = products.reduce((acc, it) => acc + (it.unitPriceOutExclVat * it.quantity), 0);

  return (
    <View style={{ flex: 1, backgroundColor: WorkaholicTheme.colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex: 1}}>
        <FlatList
          data={products}
          keyExtractor={(_, i) => i.toString()}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 15, paddingBottom: insets.bottom + 20 }}
          ListHeaderComponent={
            <>
              <InfoBox 
                title={`Projekt: ${formattedProjectName}`} 
                items={[`Antal rader: ${products.length} st`, `Total ut (exkl. moms): ${formatNumber(sumTotalOut)} kr`]} 
              />
              <View style={styles.card}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
                   <Text style={styles.cardTitle}>{editingIndex !== null ? "REDIGERA RAD" : "LÄGG TILL MATERIAL"}</Text>
                   <TouchableOpacity onPress={() => setIsModalVisible(true)} style={styles.modalTrigger}>
                      <Ionicons name="search" size={14} color={WorkaholicTheme.colors.primary} />
                      <Text style={styles.modalTriggerText}>MATERIALÖSÖK</Text>
                   </TouchableOpacity>
                </View>
                
                {/* --- 🔑 RAD 1 MED ETIKETTER --- */}
                <View style={styles.inputRow}>
                  <View style={{ flex: 2 }}>
                    <Text style={styles.miniLabel}>PRODUKTNAMN</Text>
                    <TextInput
                      placeholder="Beskrivning..."
                      value={newRow.name}
                      onChangeText={(v) => setNewRow(s => ({ ...s, name: v }))}
                      style={styles.input}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.miniLabel}>ARTIKELNUMMER</Text>
                    <TextInput
                      placeholder="Art.nr"
                      value={newRow.articleNumber}
                      onChangeText={(v) => setNewRow(s => ({ ...s, articleNumber: v }))}
                      style={styles.input}
                    />
                  </View>
                </View>

                {/* --- 🔑 RAD 2 MED ETIKETTER --- */}
                <View style={styles.inputRow}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.miniLabel}>ANTAL</Text>
                    <TextInput keyboardType="decimal-pad" value={newRow.quantity} onChangeText={v => setNewRow(s => ({...s, quantity: decimalOnly(v)}))} style={styles.input} />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.miniLabel}>INKÖP</Text>
                    <TextInput keyboardType="decimal-pad" value={newRow.purchasePrice} onChangeText={v => setNewRow(s => ({...s, purchasePrice: decimalOnly(v)}))} style={styles.input} />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.miniLabel}>PÅSLAG %</Text>
                    <TextInput keyboardType="decimal-pad" value={newRow.markup} onChangeText={v => setNewRow(s => ({...s, markup: decimalOnly(v)}))} style={styles.input} />
                  </View>
                </View>

                <View style={styles.buttonRow}>
                    <View style={{flex: 1}}>
                        <Button title={editingIndex !== null ? "UPPDATERA RAD" : "LÄGG TILL"} type="primary" onPress={saveProduct} />
                    </View>
                    {editingIndex !== null && (
                        <TouchableOpacity style={styles.cancelLink} onPress={() => { setEditingIndex(null); setNewRow(initialRowState); }}>
                            <Text style={styles.cancelText}>Avbryt</Text>
                        </TouchableOpacity>
                    )}
                </View>
              </View>
              <Text style={styles.sectionTitle}>PRODUKTLISTA I PROJEKT</Text>
            </>
          }
          renderItem={({ item, index }) => (
            <View style={styles.itemRow}>
              <View style={{flex: 1}}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemSub}>{item.articleNumber} • {item.markup}% påslag</Text>
              </View>
              <View style={styles.itemRight}>
                 <Text style={styles.itemTotal}>{formatNumber(item.unitPriceOutExclVat * item.quantity)}:-</Text>
                 <Text style={styles.itemSub}>{item.quantity} st</Text>
              </View>
              <View style={styles.actions}>
                 <TouchableOpacity onPress={() => {
                    setNewRow({
                        name: item.name,
                        articleNumber: item.articleNumber === "-" ? "" : item.articleNumber,
                        purchasePrice: String(item.purchasePrice),
                        markup: String(item.markup),
                        quantity: String(item.quantity),
                    });
                    setEditingIndex(index);
                 }} style={styles.actionBtn}>
                    <Ionicons name="pencil" size={16} color={WorkaholicTheme.colors.primary} />
                 </TouchableOpacity>
                 <TouchableOpacity onPress={() => {
                    const updated = products.filter((_, i) => i !== index);
                    updateProject(selectedProject.id, { products: updated });
                 }} style={styles.actionBtn}>
                    <Ionicons name="trash-outline" size={16} color={WorkaholicTheme.colors.error} />
                 </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>Inga artiklar tillagda än.</Text>}
        />
      </KeyboardAvoidingView>

      {/* SÖK MODAL */}
      <Modal visible={isModalVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}><Text style={{color: '#666', fontWeight: 'bold'}}>Stäng</Text></TouchableOpacity>
              <Text style={styles.modalTitle}>Materialsök</Text>
              <View style={{width: 40}} />
            </View>

            <View style={styles.wholesalerRow}>
              {WHOLESALERS.map(ws => (
                <TouchableOpacity 
                  key={ws.id} 
                  onPress={() => setSelectedWholesaler(ws.id)}
                  style={[styles.wsBtn, selectedWholesaler === ws.id && styles.wsBtnActive]}
                >
                  <Ionicons name={ws.icon} size={16} color={selectedWholesaler === ws.id ? "#FFF" : "#666"} />
                  <Text style={[styles.wsBtnText, selectedWholesaler === ws.id && {color: '#FFF'}]}>{ws.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ padding: 15 }}>
              <View style={styles.modalSearchBox}>
                <TextInput 
                  style={styles.modalSearchInput}
                  placeholder={selectedWholesaler === 'local' ? "Sök i eget lager..." : `Sök hos ${capitalizeFirst(selectedWholesaler)}...`}
                  value={modalSearchQuery}
                  onChangeText={setModalSearchQuery}
                  autoFocus
                />
                {isSearching && <ActivityIndicator size="small" color={WorkaholicTheme.colors.primary} />}
              </View>
            </View>

            <FlatList
              data={modalResults}
              keyExtractor={(item, index) => item.dbKey || String(index)}
              renderItem={({ item }) => {
                const itemArt = item.artNr || item.articleNumber;
                const isSelected = selectedInModal.find(x => (x.artNr || x.articleNumber) === itemArt);
                
                return (
                  <TouchableOpacity 
                    style={[styles.modalResultCard, isSelected && styles.modalSelectedCard]} 
                    onPress={() => {
                      if (isSelected) setSelectedInModal(selectedInModal.filter(x => (x.artNr || x.articleNumber) !== itemArt));
                      else setSelectedInModal([...selectedInModal, item]);
                    }}
                  >
                    <View style={{flex: 1}}>
                      <Text style={styles.modalResultLabel}>{item.label || item.name}</Text>
                      <Text style={styles.modalResultSub}>Art.nr: {itemArt}</Text>
                    </View>
                    <View style={styles.modalPriceBox}>
                       <Text style={[styles.modalResultPrice, item.isWholesalerPrice && styles.wholesalerPriceText]}>
                          {item.price}:-
                       </Text>
                       {item.isWholesalerPrice && <Text style={styles.wholesalerLabel}>{item.wholesalerName}</Text>}
                    </View>
                    <Ionicons name={isSelected ? "checkmark-circle" : "add-circle-outline"} size={24} color={isSelected ? "#4CAF50" : "#CCC"} />
                  </TouchableOpacity>
                );
              }}
            />

            <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 10 }]}>
              <Button 
                title={selectedInModal.length > 0 ? `LÄGG TILL ${selectedInModal.length} ARTIKLAR` : "VÄLJ ARTIKLAR"} 
                onPress={addModalItemsToProject} 
                disabled={selectedInModal.length === 0}
              />
            </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FB', padding: 30 },
  noProjectText: { fontSize: 20, fontWeight: '900', color: '#1C1C1E', marginTop: 20 },
  goBackBtn: { marginTop: 25, backgroundColor: WorkaholicTheme.colors.primary, paddingVertical: 15, paddingHorizontal: 30, borderRadius: 12 },
  goBackBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  card: { backgroundColor: "#fff", borderRadius: 15, padding: 15, marginBottom: 15, elevation: 2 },
  cardTitle: { fontSize: 11, fontWeight: "900", color: WorkaholicTheme.colors.primary },
  modalTrigger: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F0F7FF', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8 },
  modalTriggerText: { fontSize: 10, fontWeight: '800', color: WorkaholicTheme.colors.primary },
  inputRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  inputGroup: { flex: 1 },
  miniLabel: { fontSize: 9, color: "#999", marginBottom: 4, fontWeight: '800' },
  input: { borderWidth: 1, borderColor: "#EEE", borderRadius: 10, padding: 10, backgroundColor: "#F9F9F9", fontSize: 13, fontWeight: '600', color: '#333' },
  buttonRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  cancelLink: { marginLeft: 15, padding: 10 },
  cancelText: { color: '#666', fontWeight: '600', fontSize: 14 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#8E8E93', marginBottom: 10, paddingHorizontal: 5 },
  itemRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 15, borderRadius: 12, marginBottom: 8, elevation: 1 },
  itemName: { fontWeight: "700", fontSize: 14, color: '#1C1C1E' },
  itemSub: { fontSize: 11, color: "#999" },
  itemRight: { alignItems: 'flex-end', marginRight: 15 },
  itemTotal: { fontWeight: "800", fontSize: 14, color: '#1C1C1E' },
  actions: { flexDirection: 'row', gap: 5 },
  actionBtn: { padding: 8, backgroundColor: '#F8F8F8', borderRadius: 8 },
  emptyText: { textAlign: 'center', marginTop: 30, color: '#999', fontWeight: '600' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderColor: '#EEE' },
  modalTitle: { fontSize: 16, fontWeight: 'bold' },
  wholesalerRow: { flexDirection: 'row', padding: 10, gap: 5, justifyContent: 'center' },
  wsBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 8, borderRadius: 10, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#EEE' },
  wsBtnActive: { backgroundColor: WorkaholicTheme.colors.primary, borderColor: WorkaholicTheme.colors.primary },
  wsBtnText: { fontSize: 11, fontWeight: 'bold', color: '#666' },
  modalSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: 15, flex: 1 },
  modalSearchInput: { flex: 1, padding: 15, fontSize: 16, fontWeight: '600' },
  modalResultCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderColor: '#F0F0F0' },
  modalSelectedCard: { borderColor: WorkaholicTheme.colors.primary, backgroundColor: '#F0F7FF' },
  modalResultLabel: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  modalResultSub: { fontSize: 12, color: '#666' },
  modalPriceBox: { alignItems: 'flex-end', marginRight: 15 },
  modalResultPrice: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  wholesalerPriceText: { color: WorkaholicTheme.colors.success || '#4CAF50' },
  wholesalerLabel: { fontSize: 9, fontWeight: '800', color: '#AAA', textTransform: 'uppercase' },
  modalFooter: { padding: 20, borderTopWidth: 1, borderColor: '#EEE' }
});