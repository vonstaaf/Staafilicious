import React, { useContext, useEffect, useState, useMemo, useCallback } from "react";
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
  ScrollView
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ProjectsContext } from "../context/ProjectsContext";
import { searchProducts } from "../utils/productSearch";
import AppHeader from "../components/AppHeader";
import { WorkaholicTheme } from "../theme";

// --- HJÄLPFUNKTIONER ---
const formatNumber = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "0,00";
  return Number(n).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const decimalOnly = (text) => {
  let cleaned = text.replace(",", ".");
  cleaned = cleaned.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) cleaned = parts[0] + "." + parts.slice(1).join("");
  return cleaned;
};

const WHOLESALERS = [
  { id: 'local', name: 'Lager', icon: 'cube-outline' },
  { id: 'rexel', name: 'Rexel', icon: 'flash-outline' },
  { id: 'solar', name: 'Solar', icon: 'sunny-outline' },
  { id: 'ahlsell', name: 'Ahlsell', icon: 'construct-outline' },
  { id: 'elektroskandia', name: 'E-skandia', icon: 'bulb-outline' }
];

// 🔑 MEMOISERAD HEADER
const ProductsHeader = React.memo(({ 
  sumTotalOut, 
  productCount, 
  newRow, 
  setNewRow, 
  saveProduct, 
  editingIndex, 
  setEditingIndex, 
  setIsModalVisible,
  initialRowState
}) => {

  // 🔑 FIX FÖR ATT TEXT INTE SKA FÖRSVINNA VID RADERING
  const handleNameChange = (v) => {
    const formatted = v.length > 0 ? v.charAt(0).toUpperCase() + v.slice(1) : v;
    setNewRow(s => ({ ...s, name: formatted }));
  };

  return (
    <>
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryLabel}>TOTALT (EXKL. MOMS)</Text>
            <Text style={styles.summaryValue}>{formatNumber(sumTotalOut)} kr</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{productCount} ARTIKLAR</Text>
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
            // 🔑 Använder fixade funktionen
            onChangeText={handleNameChange}
            style={styles.inputMain}
            placeholderTextColor="#BBB"
            autoCapitalize="sentences"
            blurOnSubmit={false}
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
  );
});

export default function ProductsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  
  // 🔑 Hämta 'projects' live
  const { projects, selectedProject, updateProject, allProducts } = useContext(ProjectsContext);
  
  // 🔑 Hitta rätt projekt LIVE i listan för att UI ska uppdateras
  const projectId = route.params?.project?.id || selectedProject?.id;
  const project = useMemo(() => {
    return projects.find(p => p.id === projectId) || selectedProject;
  }, [projects, projectId, selectedProject]);

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

  // Uppdatera listan när projektet i Contextet ändras
  useEffect(() => {
    if (project?.products && Array.isArray(project.products)) {
      setProducts(project.products);
    } else {
      setProducts([]);
    }
  }, [project]);

  // Blixtsnabb sökning
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isModalVisible) {
        if (selectedWholesaler === 'local' && allProducts) {
          const filtered = allProducts.filter(p => 
            p.name?.toLowerCase().includes(modalSearchQuery.toLowerCase()) || 
            p.articleNumber?.includes(modalSearchQuery)
          ).slice(0, 50);
          setModalResults(filtered);
        } else {
          performModalSearch(modalSearchQuery);
        }
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [modalSearchQuery, selectedWholesaler, allProducts]);

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
    if (selectedInModal.length === 0) return;
    
    const newItems = selectedInModal.map(item => {
      const price = parseFloat(item.price || item.purchasePrice || 0);
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

    // 🔑 Använd den absoluta live-datan
    const currentProducts = project?.products || [];
    const updated = [...newItems, ...currentProducts];
    
    await updateProject(project.id, { products: updated });
    setIsModalVisible(false);
    setSelectedInModal([]);
    setModalResults([]);
    setModalSearchQuery("");
  };

  const saveProduct = async () => {
    if (!newRow.name.trim()) {
      Alert.alert("Väntar", "Du måste skriva en benämning.");
      return;
    }

    const p = parseFloat(newRow.purchasePrice) || 0;
    const m = parseFloat(newRow.markup) || 0;
    const q = parseFloat(newRow.quantity) || 1;

    const newItem = {
      name: newRow.name.trim(),
      articleNumber: newRow.articleNumber.trim() || "-",
      purchasePrice: p,
      markup: m,
      quantity: q,
      unitPriceOutExclVat: p * (1 + m / 100),
    };

    // 🔑 Använd live-listan från projektet
    const currentProducts = project?.products || [];
    let updated = [...currentProducts];
    
    if (editingIndex !== null) {
      updated[editingIndex] = newItem;
    } else {
      updated = [newItem, ...updated];
    }

    try {
      await updateProject(project.id, { products: updated });
      setNewRow(initialRowState);
      setEditingIndex(null);
      Keyboard.dismiss();
    } catch (e) {
      Alert.alert("Fel", "Kunde inte spara.");
    }
  };

  const sumTotalOut = useMemo(() => {
    return products.reduce((acc, it) => acc + (Number(it.unitPriceOutExclVat || 0) * Number(it.quantity || 0)), 0);
  }, [products]);

  if (!project) return null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <AppHeader title="MATERIAL" subTitle={project.name} navigation={navigation} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex: 1}}>
        <FlatList
          data={products}
          keyExtractor={(_, i) => i.toString()}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100 }}
          ListHeaderComponent={
            <ProductsHeader 
              sumTotalOut={sumTotalOut}
              productCount={products.length}
              newRow={newRow}
              setNewRow={setNewRow}
              saveProduct={saveProduct}
              editingIndex={editingIndex}
              setEditingIndex={setEditingIndex}
              setIsModalVisible={setIsModalVisible}
              initialRowState={initialRowState}
            />
          }
          renderItem={({ item, index }) => (
            <View style={styles.productCard}>
              <View style={styles.productMain}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.productSub}>{item.articleNumber} • {item.markup}% påslag</Text>
                </View>
                <View style={styles.productPriceArea}>
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
                        quantity: String(item.quantity || 1),
                    });
                    setEditingIndex(index);
                 }} style={styles.actionBtn}>
                    <Ionicons name="pencil" size={16} color={WorkaholicTheme.colors.primary} />
                    <Text style={styles.actionBtnText}>Ändra</Text>
                 </TouchableOpacity>
                 <View style={styles.vDivider} />
                 <TouchableOpacity onPress={() => {
                    const updated = products.filter((_, i) => i !== index);
                    updateProject(project.id, { products: updated });
                 }} style={styles.actionBtn}>
                    <Ionicons name="trash-outline" size={16} color={WorkaholicTheme.colors.error} />
                    <Text style={[styles.actionBtnText, {color: WorkaholicTheme.colors.error}]}>Ta bort</Text>
                 </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </KeyboardAvoidingView>

      {/* MATERIALSÖK MODAL - BEHÅLL SOM DEN ÄR */}
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
              data={modalResults}
              keyExtractor={(item, index) => item.id || item.articleNumber || String(index)}
              renderItem={({ item }) => {
                const itemArt = item.artNr || item.articleNumber || item.id;
                const isSelected = selectedInModal.find(x => (x.artNr || x.articleNumber || x.id) === itemArt);
                
                return (
                  <TouchableOpacity 
                    style={[styles.resultCard, isSelected && styles.resultCardSelected]} 
                    onPress={() => {
                      if (isSelected) setSelectedInModal(selectedInModal.filter(x => (x.artNr || x.articleNumber || x.id) !== itemArt));
                      else setSelectedInModal([...selectedInModal, item]);
                    }}
                  >
                    <View style={{flex: 1}}>
                      <Text style={styles.resultName}>{item.label || item.name}</Text>
                      <Text style={styles.resultArt}>Art.nr: {itemArt}</Text>
                    </View>
                    <View style={styles.resultPriceBox}>
                       <Text style={styles.resultPrice}>{item.price || item.purchasePrice || 0}:-</Text>
                    </View>
                    <Ionicons name={isSelected ? "checkmark-circle" : "add-circle-outline"} size={26} color={isSelected ? "#34C759" : "#DDD"} />
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
                    LÄGG TILL {selectedInModal.length} ARTIKLAR
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