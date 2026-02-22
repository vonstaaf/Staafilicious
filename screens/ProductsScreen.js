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
  SafeAreaView,
  StatusBar,
  ScrollView // 🔑 HÄR ÄR DEN SAKNADE IMPORTEN!
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ProjectsContext } from "../context/ProjectsContext";

// 🔑 Sökfunktionen mot grossister & lokal cache
import { searchProducts } from "../utils/productSearch";

import AppHeader from "../components/AppHeader";
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
  { id: 'local', name: 'Lager', icon: 'cube-outline' },
  { id: 'rexel', name: 'Rexel', icon: 'flash-outline' },
  { id: 'solar', name: 'Solar', icon: 'sunny-outline' },
  { id: 'ahlsell', name: 'Ahlsell', icon: 'construct-outline' },
  { id: 'elektroskandia', name: 'E-skandia', icon: 'bulb-outline' }
];

export default function ProductsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { selectedProject, updateProject } = useContext(ProjectsContext);
  
  // 1. HÄMTA PROJEKT
  const project = route.params?.project || selectedProject;

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

  // 🛠 KROCKKUDDE 1: Säkrar att products alltid är en array
  useEffect(() => {
    if (project?.products && Array.isArray(project.products)) {
      setProducts(project.products);
    } else {
      setProducts([]);
    }
  }, [project]);

  // --- 🔑 DEBOUNCING EFFEKT (100ms) ---
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isModalVisible) {
        performModalSearch(modalSearchQuery);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [modalSearchQuery, selectedWholesaler]);

  if (!project) {
    return (
      <View style={[styles.centeredContainer, { paddingTop: insets.top }]}>
        <Ionicons name="folder-open-outline" size={80} color="#CCC" />
        <Text style={styles.noProjectText}>INGET PROJEKT VALT</Text>
        <TouchableOpacity 
          style={styles.goBackBtn} 
          onPress={() => navigation.navigate("MainTabs")}
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

    // 🛠 KROCKKUDDE 2: Säkrar upp att project.products används ifall lokala listan släpar
    const currentProducts = project?.products || [];
    const updated = [...newItems, ...currentProducts];
    
    await updateProject(project.id, { products: updated });
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

    // 🛠 KROCKKUDDE 3: Säkrar upp listan vid manuellt tillägg
    const currentProducts = project?.products || [];
    let updated = editingIndex !== null ? [...currentProducts] : [newItem, ...currentProducts];
    if (editingIndex !== null) updated[editingIndex] = newItem;

    try {
      await updateProject(project.id, { products: updated });
      setNewRow(initialRowState);
      setEditingIndex(null);
      Keyboard.dismiss();
    } catch (e) {
      Alert.alert("Fel", "Kunde inte spara.");
    }
  };

  // 🛠 KROCKKUDDE 4: Säkrar matten så att reduce inte kraschar om värden saknas
  const sumTotalOut = (products || []).reduce((acc, it) => {
    return acc + (Number(it.unitPriceOutExclVat || 0) * Number(it.quantity || 0));
  }, 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      <AppHeader 
        title="PRODUKTER & MATERIAL" 
        subTitle={capitalizeFirst(project.name)} 
        navigation={navigation} 
      />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex: 1}}>
        <FlatList
          data={products || []}
          keyExtractor={(_, i) => i.toString()}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100 }}
          ListHeaderComponent={
            <>
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <View>
                    <Text style={styles.summaryLabel}>TOTALT (EXKL. MOMS)</Text>
                    <Text style={styles.summaryValue}>{formatNumber(sumTotalOut)} kr</Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{(products || []).length} ARTIKLAR</Text>
                  </View>
                </View>
              </View>

              <View style={styles.inputCard}>
                <View style={styles.cardHeader}>
                   <Text style={styles.sectionLabel}>{editingIndex !== null ? "REDIGERA ARTIKEL" : "SNABB-LÄGG TILL"}</Text>
                   <TouchableOpacity onPress={() => setIsModalVisible(true)} style={styles.searchLink}>
                      <Ionicons name="search" size={14} color={WorkaholicTheme.colors.primary} />
                      <Text style={styles.searchLinkText}>MATERIALSÖK</Text>
                   </TouchableOpacity>
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.miniLabel}>BENÄMNING</Text>
                  <TextInput
                    placeholder="T.ex. Eljo Trend Trapp"
                    value={newRow.name}
                    onChangeText={(v) => setNewRow(s => ({ ...s, name: v }))}
                    style={styles.inputMain}
                    placeholderTextColor="#BBB"
                  />
                </View>

                <View style={styles.inputRow}>
                  <View style={{ flex: 1.5 }}>
                    <Text style={styles.miniLabel}>ART.NR</Text>
                    <TextInput
                      placeholder="E-nummer..."
                      value={newRow.articleNumber}
                      onChangeText={(v) => setNewRow(s => ({ ...s, articleNumber: v }))}
                      style={styles.input}
                      placeholderTextColor="#BBB"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.miniLabel}>ANTAL</Text>
                    <TextInput 
                        keyboardType="decimal-pad" 
                        value={newRow.quantity} 
                        onChangeText={v => setNewRow(s => ({...s, quantity: decimalOnly(v)}))} 
                        style={styles.input} 
                    />
                  </View>
                </View>

                <View style={styles.inputRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.miniLabel}>INKÖP (ST)</Text>
                    <TextInput keyboardType="decimal-pad" value={newRow.purchasePrice} onChangeText={v => setNewRow(s => ({...s, purchasePrice: decimalOnly(v)}))} style={styles.input} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.miniLabel}>PÅSLAG %</Text>
                    <TextInput keyboardType="decimal-pad" value={newRow.markup} onChangeText={v => setNewRow(s => ({...s, markup: decimalOnly(v)}))} style={styles.input} />
                  </View>
                </View>

                <View style={styles.buttonRow}>
                    <TouchableOpacity 
                        style={[styles.mainAddBtn, editingIndex !== null && { backgroundColor: '#FFB300' }]} 
                        onPress={saveProduct}
                    >
                        <Text style={styles.mainAddBtnText}>
                            {editingIndex !== null ? "UPPDATERA RAD" : "LÄGG TILL I LISTA"}
                        </Text>
                    </TouchableOpacity>
                    
                    {editingIndex !== null && (
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditingIndex(null); setNewRow(initialRowState); }}>
                            <Text style={styles.cancelBtnText}>Avbryt</Text>
                        </TouchableOpacity>
                    )}
                </View>
              </View>

              <Text style={styles.listTitle}>MATERIALFÖRTECKNING</Text>
            </>
          }
          renderItem={({ item, index }) => (
            <View style={styles.productCard}>
              <View style={styles.productMain}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.productSub}>{item.articleNumber} • {item.markup}% påslag</Text>
                </View>
                <View style={styles.productPriceArea}>
                  {/* 🛠 KROCKKUDDE 5: Undviker NaN om databasen saknar format */}
                  <Text style={styles.productTotal}>{formatNumber(Number(item.unitPriceOutExclVat || 0) * Number(item.quantity || 0))}:-</Text>
                  <Text style={styles.productQty}>{item.quantity} st</Text>
                </View>
              </View>
              <View style={styles.productActions}>
                 <TouchableOpacity onPress={() => {
                    setNewRow({
                        name: item.name,
                        articleNumber: item.articleNumber === "-" ? "" : item.articleNumber,
                        purchasePrice: String(item.purchasePrice || 0),
                        markup: String(item.markup || 0),
                        quantity: String(item.quantity || 0),
                    });
                    setEditingIndex(index);
                 }} style={styles.actionBtn}>
                    <Ionicons name="pencil" size={16} color={WorkaholicTheme.colors.primary} />
                    <Text style={styles.actionBtnText}>Ändra</Text>
                 </TouchableOpacity>
                 <View style={styles.vDivider} />
                 <TouchableOpacity onPress={() => {
                    const currentProducts = project?.products || [];
                    const updated = currentProducts.filter((_, i) => i !== index);
                    updateProject(project.id, { products: updated });
                 }} style={styles.actionBtn}>
                    <Ionicons name="trash-outline" size={16} color={WorkaholicTheme.colors.error} />
                    <Text style={[styles.actionBtnText, {color: WorkaholicTheme.colors.error}]}>Ta bort</Text>
                 </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Ionicons name="basket-outline" size={50} color="#DDD" />
                <Text style={styles.emptyText}>Inga artiklar tillagda än.</Text>
            </View>
          }
        />
      </KeyboardAvoidingView>

      {/* MATERIALSÖK MODAL */}
      <Modal visible={isModalVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FB' }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#1C1C1E" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Materialsök</Text>
              <View style={{width: 40}} />
            </View>

            <View style={styles.wholesalerContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wholesalerScroll}>
                {WHOLESALERS.map(ws => (
                  <TouchableOpacity 
                    key={ws.id} 
                    onPress={() => setSelectedWholesaler(ws.id)}
                    style={[styles.wsPill, selectedWholesaler === ws.id && styles.wsPillActive]}
                  >
                    <Ionicons name={ws.icon} size={14} color={selectedWholesaler === ws.id ? "#FFF" : "#666"} />
                    <Text style={[styles.wsPillText, selectedWholesaler === ws.id && {color: '#FFF'}]}>{ws.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.modalSearchArea}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color="#AAA" style={{marginLeft: 15}} />
                <TextInput 
                  style={styles.modalSearchInput}
                  placeholder={`Sök hos ${selectedWholesaler === 'local' ? 'Lager' : capitalizeFirst(selectedWholesaler)}...`}
                  value={modalSearchQuery}
                  onChangeText={setModalSearchQuery}
                  autoFocus
                  placeholderTextColor="#AAA"
                />
                {isSearching && <ActivityIndicator size="small" color={WorkaholicTheme.colors.primary} style={{marginRight: 15}} />}
              </View>
            </View>

            <FlatList
              data={modalResults || []}
              keyExtractor={(item, index) => item.dbKey || String(index)}
              contentContainerStyle={{ padding: 15 }}
              renderItem={({ item }) => {
                const itemArt = item.artNr || item.articleNumber;
                const isSelected = selectedInModal.find(x => (x.artNr || x.articleNumber) === itemArt);
                
                return (
                  <TouchableOpacity 
                    style={[styles.resultCard, isSelected && styles.resultCardSelected]} 
                    onPress={() => {
                      if (isSelected) setSelectedInModal(selectedInModal.filter(x => (x.artNr || x.articleNumber) !== itemArt));
                      else setSelectedInModal([...selectedInModal, item]);
                    }}
                  >
                    <View style={{flex: 1}}>
                      <Text style={styles.resultName}>{item.label || item.name}</Text>
                      <Text style={styles.resultArt}>Art.nr: {itemArt}</Text>
                    </View>
                    <View style={styles.resultPriceBox}>
                       <Text style={[styles.resultPrice, item.isWholesalerPrice && styles.wholesalerPriceText]}>
                          {item.price}:-
                       </Text>
                       {item.isWholesalerPrice && <Text style={styles.wsLabel}>{item.wholesalerName}</Text>}
                    </View>
                    <Ionicons 
                        name={isSelected ? "checkmark-circle" : "add-circle-outline"} 
                        size={26} 
                        color={isSelected ? "#34C759" : "#DDD"} 
                    />
                  </TouchableOpacity>
                );
              }}
            />

            <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 15 }]}>
              <TouchableOpacity 
                style={[styles.addSelectedBtn, selectedInModal.length === 0 && { backgroundColor: '#EEE' }]}
                onPress={addModalItemsToProject} 
                disabled={selectedInModal.length === 0}
              >
                <Text style={[styles.addSelectedText, selectedInModal.length === 0 && { color: '#AAA' }]}>
                    {selectedInModal.length > 0 ? `LÄGG TILL ${selectedInModal.length} ARTIKLAR` : "VÄLJ ARTIKLAR"}
                </Text>
              </TouchableOpacity>
            </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FB', padding: 30 },
  noProjectText: { fontSize: 18, fontWeight: '900', color: '#1C1C1E', marginTop: 20 },
  goBackBtn: { marginTop: 25, backgroundColor: WorkaholicTheme.colors.primary, paddingVertical: 15, paddingHorizontal: 30, borderRadius: 12 },
  goBackBtnText: { color: '#FFF', fontWeight: '800' },

  summaryCard: { backgroundColor: WorkaholicTheme.colors.primary, padding: 20, borderRadius: 25, marginBottom: 20, elevation: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  summaryValue: { fontSize: 24, fontWeight: '900', color: '#FFF', marginTop: 4 },
  badge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '900' },

  inputCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 25, marginBottom: 25, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionLabel: { fontSize: 10, fontWeight: "900", color: "#CCC", letterSpacing: 1 },
  searchLink: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F0F7FF', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10 },
  searchLinkText: { fontSize: 10, fontWeight: '900', color: WorkaholicTheme.colors.primary },
  
  inputGroup: { marginBottom: 15 },
  inputRow: { flexDirection: "row", gap: 12, marginBottom: 15 },
  miniLabel: { fontSize: 9, color: "#AAA", marginBottom: 6, fontWeight: '900', letterSpacing: 0.5 },
  inputMain: { backgroundColor: '#F5F5F7', borderRadius: 12, padding: 15, fontSize: 15, fontWeight: '700', color: '#1C1C1E' },
  input: { backgroundColor: '#F5F5F7', borderRadius: 12, padding: 12, fontSize: 14, fontWeight: '700', color: '#1C1C1E' },
  
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 5 },
  mainAddBtn: { flex: 1, backgroundColor: WorkaholicTheme.colors.primary, padding: 16, borderRadius: 15, alignItems: 'center' },
  mainAddBtnText: { color: '#FFF', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
  cancelBtn: { padding: 15 },
  cancelBtnText: { color: '#8E8E93', fontWeight: '800', fontSize: 13 },

  listTitle: { fontSize: 13, fontWeight: '900', color: '#8E8E93', marginBottom: 15, marginLeft: 5, letterSpacing: 1 },
  productCard: { backgroundColor: '#FFF', borderRadius: 20, marginBottom: 12, elevation: 2, overflow: 'hidden', borderWidth: 1, borderColor: '#F0F0F0' },
  productMain: { flexDirection: 'row', padding: 18, alignItems: 'center' },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '800', color: '#1C1C1E' },
  productSub: { fontSize: 11, color: '#AAA', marginTop: 4, fontWeight: '600' },
  productPriceArea: { alignItems: 'flex-end', marginLeft: 10 },
  productTotal: { fontSize: 16, fontWeight: '900', color: '#1C1C1E' },
  productQty: { fontSize: 11, color: WorkaholicTheme.colors.primary, fontWeight: '800', marginTop: 2 },
  
  productActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F8F8F8', backgroundColor: '#FAFAFA' },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, gap: 6 },
  actionBtnText: { fontSize: 12, fontWeight: '800', color: WorkaholicTheme.colors.primary },
  vDivider: { width: 1, backgroundColor: '#EEE' },

  emptyContainer: { alignItems: 'center', marginTop: 40, opacity: 0.5 },
  emptyText: { marginTop: 10, color: '#999', fontWeight: '700', fontSize: 14 },

  // Modal styles
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalCloseBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F7', justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#1C1C1E' },
  wholesalerContainer: { backgroundColor: '#FFF', paddingVertical: 10 },
  wholesalerScroll: { paddingHorizontal: 15, gap: 8 },
  wsPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, backgroundColor: '#F0F0F2', borderWidth: 1, borderColor: '#EEE' },
  wsPillActive: { backgroundColor: '#1C1C1E', borderColor: '#1C1C1E' },
  wsPillText: { fontSize: 11, fontWeight: '800', color: '#666' },
  modalSearchArea: { padding: 15, backgroundColor: '#FFF' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F7', borderRadius: 15 },
  modalSearchInput: { flex: 1, padding: 15, fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
  resultCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 18, borderRadius: 18, marginBottom: 10, elevation: 1 },
  resultCardSelected: { backgroundColor: '#F0F7FF', borderWidth: 1, borderColor: WorkaholicTheme.colors.primary },
  resultName: { fontSize: 14, fontWeight: '800', color: '#333', marginBottom: 4 },
  resultArt: { fontSize: 11, color: '#999', fontWeight: '600' },
  resultPriceBox: { alignItems: 'flex-end', marginRight: 15 },
  resultPrice: { fontSize: 15, fontWeight: '900', color: '#1C1C1E' },
  wsLabel: { fontSize: 8, fontWeight: '900', color: '#BBB', textTransform: 'uppercase', marginTop: 2 },
  modalFooter: { padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEE' },
  addSelectedBtn: { backgroundColor: WorkaholicTheme.colors.primary, padding: 18, borderRadius: 18, alignItems: 'center' },
  addSelectedText: { color: '#FFF', fontWeight: '900', fontSize: 14, letterSpacing: 1 }
});