import React, { useContext, useEffect, useState, useMemo } from "react";
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
  ScrollView,
  Image
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { ProjectsContext } from "../context/ProjectsContext";
import { capitalizeFirst } from "../utils/stringHelpers";
import { searchProducts } from "../utils/productSearch";
import { getWholesalersForProfession } from "../constants/wholesalers";
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


/**
 * 🖼 SAFE IMAGE KOMPONENT
 * Hanterar 404-fel för de 134 000 "gissade" länkarna.
 * Om bilden inte finns laddas placeholder-ikonen istället.
 */
const SafeImage = ({ uri, style, placeholderStyle, iconSize = 28 }) => {
  const [error, setError] = useState(false);

  if (!uri || error) {
    return (
      <View style={[styles.productImagePlaceholder, placeholderStyle]}>
        <Ionicons name="cube-outline" size={iconSize} color="#CCC" />
      </View>
    );
  }

  return (
    <Image 
      source={{ uri }} 
      style={style} 
      onError={() => setError(true)}
    />
  );
};

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

  const handleNameChange = (v) => {
    setNewRow(s => ({ ...s, name: capitalizeFirst(v) || v }));
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
  
  const { projects, selectedProject, updateProject, discountAgreements } = useContext(ProjectsContext);
  
  const projectId = route.params?.project?.id || selectedProject?.id;
  const project = useMemo(() => {
    return projects.find(p => p.id === projectId) || selectedProject;
  }, [projects, projectId, selectedProject]);

  const initialRowState = {
    name: "",
    articleNumber: "",
    purchasePrice: "",
    markup: "25", 
    quantity: "1",
    imageUrl: null,
    brand: null
  };

  const [newRow, setNewRow] = useState(initialRowState);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [zoomImage, setZoomImage] = useState(null); 
  
  const [profession, setProfession] = useState("");
  const visibleWholesalers = useMemo(() => getWholesalersForProfession(profession), [profession]);
  const firstWholesalerId = visibleWholesalers[0]?.id;
  const [selectedWholesaler, setSelectedWholesaler] = useState("rexel");

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists() && snap.data().profession != null) {
          setProfession(snap.data().profession);
        }
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (firstWholesalerId && !visibleWholesalers.some((ws) => ws.id === selectedWholesaler)) {
      setSelectedWholesaler(firstWholesalerId);
    }
  }, [firstWholesalerId, visibleWholesalers, selectedWholesaler]);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState("");
  const [modalResults, setModalResults] = useState([]);
  /** Valda artiklar med antal: [{ item, quantity }, ...] */
  const [selectedInModal, setSelectedInModal] = useState([]);

  const currentProducts = useMemo(() => project?.products || [], [project]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isModalVisible) {
        performModalSearch(modalSearchQuery);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [modalSearchQuery, selectedWholesaler, isModalVisible]);

  const performModalSearch = async (text) => {
    if (text.length < 2) {
      setModalResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const upperCaseText = text.toUpperCase();
      const results = await searchProducts(upperCaseText, selectedWholesaler, discountAgreements);
      setModalResults(results);
    } catch (e) { 
      console.log("Sökfel:", e); 
    } finally { 
      setIsSearching(false); 
    }
  };

  const addModalItemsToProject = async () => {
    if (selectedInModal.length === 0) return;

    const newItems = selectedInModal.map(({ item, quantity }) => {
      const price = parseFloat(item.price || item.purchasePrice || 0);
      const q = Math.max(0.001, parseFloat(quantity) || 1);
      const markup = 25;
      return {
        name: item.label || item.name || "Okänd",
        articleNumber: item.artNr || item.articleNumber || "-",
        purchasePrice: price,
        markup: markup,
        quantity: q,
        unitPriceOutExclVat: price * (1 + markup / 100),
        imageUrl: item.imageUrl || null,
        brand: item.brand || null,
      };
    });

    const updated = [...newItems, ...currentProducts];

    await updateProject(project.id, { products: updated });
    setIsModalVisible(false);
    setSelectedInModal([]);
    setModalResults([]);
    setModalSearchQuery("");
  };

  const getSelectedQuantity = (item) => {
    const art = item.artNr || item.articleNumber || item.id;
    const entry = selectedInModal.find((x) => (x.item.artNr || x.item.articleNumber || x.item.id) === art);
    return entry ? entry.quantity : 0;
  };

  const setSelectedQuantity = (item, quantity) => {
    const art = item.artNr || item.articleNumber || item.id;
    const parsed = parseFloat(quantity);
    const q = isNaN(parsed) || parsed < 0 ? 1 : Math.max(0.001, parsed);
    setSelectedInModal((prev) => {
      const existing = prev.findIndex((x) => (x.item.artNr || x.item.articleNumber || x.item.id) === art);
      if (existing === -1) return prev;
      const next = [...prev];
      next[existing] = { ...next[existing], quantity: q };
      return next;
    });
  };

  const toggleModalSelection = (item) => {
    const art = item.artNr || item.articleNumber || item.id;
    const isSelected = selectedInModal.some((x) => (x.item.artNr || x.item.articleNumber || x.item.id) === art);
    if (isSelected) {
      setSelectedInModal((prev) => prev.filter((x) => (x.item.artNr || x.item.articleNumber || x.item.id) !== art));
    } else {
      setSelectedInModal((prev) => [...prev, { item, quantity: 1 }]);
    }
  };

  const saveProduct = async () => {
    const nameTrim = newRow.name.trim();
    const artTrim = newRow.articleNumber.trim();
    if (!nameTrim && !artTrim) {
      Alert.alert("Väntar", "Ange minst benämning eller art.nr / E-nummer.");
      return;
    }

    const p = parseFloat(newRow.purchasePrice) || 0;
    const m = parseFloat(newRow.markup) || 0;
    const q = parseFloat(newRow.quantity) || 1;

    const newItem = {
      name: nameTrim || artTrim,
      articleNumber: artTrim || "-",
      purchasePrice: p,
      markup: m,
      quantity: q,
      unitPriceOutExclVat: p * (1 + m / 100),
      imageUrl: newRow.imageUrl || null,
      brand: newRow.brand || null
    };

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

  const deleteProduct = (index) => {
    const itemToDelete = currentProducts[index];
    Alert.alert(
      "Ta bort artikel",
      `Vill du ta bort "${itemToDelete.name}"?`,
      [
        { text: "Avbryt", style: "cancel" },
        { 
          text: "Ta bort", 
          style: "destructive", 
          onPress: async () => {
            const updated = currentProducts.filter((_, i) => i !== index);
            try {
              await updateProject(project.id, { products: updated });
            } catch (e) {
              Alert.alert("Fel", "Kunde inte radera artikeln.");
            }
          } 
        }
      ]
    );
  };

  const sumTotalOut = useMemo(() => {
    return currentProducts.reduce((acc, it) => acc + (Number(it.unitPriceOutExclVat || 0) * Number(it.quantity || 0)), 0);
  }, [currentProducts]);

  if (!project) return null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <AppHeader title="MATERIAL" subTitle={project.name} navigation={navigation} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex: 1}}>
        <FlatList
          data={currentProducts}
          keyExtractor={(_, i) => i.toString()}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100 }}
          ListHeaderComponent={
            <ProductsHeader 
              sumTotalOut={sumTotalOut}
              productCount={currentProducts.length}
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
                
                <TouchableOpacity 
                  disabled={!item.imageUrl}
                  onPress={() => setZoomImage(item.imageUrl)}
                >
                  <SafeImage 
                    uri={item.imageUrl} 
                    style={styles.productImage} 
                  />
                </TouchableOpacity>

                <View style={styles.productInfo}>
                  {item.brand && <Text style={styles.brandTag}>{item.brand.toUpperCase()}</Text>}
                  <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
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
                        imageUrl: item.imageUrl || null,
                        brand: item.brand || null
                    });
                    setEditingIndex(index);
                 }} style={styles.actionBtn}>
                    <Ionicons name="pencil" size={16} color={WorkaholicTheme.colors.primary} />
                    <Text style={styles.actionBtnText}>Ändra</Text>
                 </TouchableOpacity>
                 <View style={styles.vDivider} />
                 <TouchableOpacity onPress={() => deleteProduct(index)} style={styles.actionBtn}>
                    <Ionicons name="trash-outline" size={16} color={WorkaholicTheme.colors.error} />
                    <Text style={[styles.actionBtnText, {color: WorkaholicTheme.colors.error}]}>Ta bort</Text>
                 </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </KeyboardAvoidingView>

      <Modal visible={!!zoomImage} transparent={true} animationType="fade">
        <TouchableOpacity 
          style={styles.zoomOverlay} 
          activeOpacity={1} 
          onPress={() => setZoomImage(null)}
        >
          <View style={styles.zoomContainer}>
            <Image source={{ uri: zoomImage }} style={styles.zoomImage} />
            <TouchableOpacity style={styles.closeZoom} onPress={() => setZoomImage(null)}>
              <Ionicons name="close-circle" size={40} color="#FFF" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={isModalVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FB' }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#1C1C1E" />
              </TouchableOpacity>
              
              <Text style={styles.modalTitle}>Materialsök</Text>
              
              <View style={{ width: 40 }} /> 
            </View>

            <View style={styles.wholesalerContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wholesalerScroll}>
                {(visibleWholesalers.length === 0 ? [{ id: "rexel", name: "Rexel", icon: "flash-outline" }] : visibleWholesalers).map(ws => (
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
                  placeholder={`Sök hos ${capitalizeFirst(selectedWholesaler)}...`}
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
                const isSelected = selectedInModal.some((x) => (x.item.artNr || x.item.articleNumber || x.item.id) === itemArt);
                const qty = getSelectedQuantity(item);
                const hasDiscount = item.discountPercent && parseFloat(item.discountPercent) > 0;

                return (
                  <TouchableOpacity
                    style={[styles.resultCard, isSelected && styles.resultCardSelected]}
                    onPress={() => toggleModalSelection(item)}
                    activeOpacity={0.8}
                  >
                    <TouchableOpacity
                      disabled={!item.imageUrl}
                      onPress={() => setZoomImage(item.imageUrl)}
                    >
                      <SafeImage
                        uri={item.imageUrl}
                        style={styles.resultImage}
                        placeholderStyle={{ width: 55, height: 55 }}
                        iconSize={20}
                      />
                    </TouchableOpacity>

                    <View style={{ flex: 1 }}>
                      {item.brand && <Text style={styles.resultBrand}>{item.brand}</Text>}
                      <Text style={styles.resultName}>{item.label || item.name}</Text>
                      <View style={styles.resultMetaRow}>
                        <Text style={styles.resultArt}>Art.nr: {itemArt}</Text>
                        {hasDiscount && (
                          <View style={styles.discountBadge}>
                            <Text style={styles.discountBadgeText}>-{item.discountPercent}%</Text>
                          </View>
                        )}
                      </View>
                      {isSelected && (
                        <View style={styles.quantityRow}>
                          <Text style={styles.quantityLabel}>Antal:</Text>
                          <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => setSelectedQuantity(item, (parseFloat(qty) || 1) - 1)}
                          >
                            <Ionicons name="remove" size={16} color={WorkaholicTheme.colors.primary} />
                          </TouchableOpacity>
                          <TextInput
                            style={styles.qtyInput}
                            value={String(qty)}
                            keyboardType="decimal-pad"
                            onChangeText={(v) => setSelectedQuantity(item, v)}
                          />
                          <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => setSelectedQuantity(item, (parseFloat(qty) || 0) + 1)}
                          >
                            <Ionicons name="add" size={16} color={WorkaholicTheme.colors.primary} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>

                    <View style={styles.resultPriceBox}>
                      <Text style={styles.resultPrice}>{formatNumber(item.price)}:-</Text>
                      <Text style={styles.resultVatInfo}>exkl. moms</Text>
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
                style={[styles.addSelectedBtn, selectedInModal.length === 0 && { backgroundColor: "#EEE" }]}
                onPress={addModalItemsToProject}
                disabled={selectedInModal.length === 0}
              >
                <Text style={[styles.addSelectedText, selectedInModal.length === 0 && { color: "#AAA" }]}>
                  LÄGG TILL {selectedInModal.length} RAD{selectedInModal.length !== 1 ? "ER" : ""}
                  {selectedInModal.length > 0 &&
                    ` (${selectedInModal.reduce((sum, { quantity }) => sum + (parseFloat(quantity) || 0), 0)} st)`}
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
  productImage: { width: 75, height: 75, borderRadius: 12, marginRight: 15, backgroundColor: '#FFF', resizeMode: 'contain', borderWidth: 1, borderColor: '#F0F0F0' },
  productImagePlaceholder: { width: 75, height: 75, borderRadius: 12, marginRight: 15, backgroundColor: '#F5F5F7', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#EEE' },
  productInfo: { flex: 1 },
  brandTag: { fontSize: 9, fontWeight: '900', color: WorkaholicTheme.colors.primary, marginBottom: 2 }, 
  productName: { fontSize: 14, fontWeight: '800', color: '#1C1C1E', lineHeight: 18 },
  productSub: { fontSize: 11, color: '#AAA', marginTop: 4, fontWeight: '600' },
  productPriceArea: { alignItems: 'flex-end', marginLeft: 10 },
  productTotal: { fontSize: 16, fontWeight: '900', color: '#1C1C1E' },
  productQty: { fontSize: 11, color: WorkaholicTheme.colors.primary, fontWeight: '800', marginTop: 2 },
  productActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F8F8F8', backgroundColor: '#FAFAFA' },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, gap: 6 },
  actionBtnText: { fontSize: 12, fontWeight: '800', color: WorkaholicTheme.colors.primary },
  vDivider: { width: 1, backgroundColor: '#EEE' },
  resultImage: { width: 55, height: 55, borderRadius: 10, marginRight: 12, backgroundColor: '#FFF', resizeMode: 'contain', borderWidth: 1, borderColor: '#EEE' },
  resultImagePlaceholder: { width: 55, height: 55, borderRadius: 10, marginRight: 12, backgroundColor: '#F5F5F7', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#EEE' },
  zoomOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  zoomContainer: { width: '90%', height: '70%', backgroundColor: '#FFF', borderRadius: 25, overflow: 'hidden', position: 'relative', padding: 20 },
  zoomImage: { flex: 1, width: '100%', height: '100%', resizeMode: 'contain' },
  closeZoom: { position: 'absolute', top: -50, right: 0, left: 0, alignItems: 'center' },
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
  resultBrand: { fontSize: 10, fontWeight: '900', color: '#AAA', marginBottom: 2 },
  resultName: { fontSize: 14, fontWeight: '800', color: '#333', marginBottom: 4 },
  resultMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultArt: { fontSize: 11, color: '#999', fontWeight: '600' },
  discountBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  discountBadgeText: { fontSize: 9, fontWeight: '900', color: '#2E7D32' },
  quantityRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  quantityLabel: { fontSize: 11, fontWeight: '700', color: '#8E8E93' },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F0F0F2', justifyContent: 'center', alignItems: 'center' },
  qtyInput: { width: 48, backgroundColor: '#F5F5F7', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8, fontSize: 13, fontWeight: '800', color: '#1C1C1E', textAlign: 'center' },
  resultPriceBox: { alignItems: 'flex-end', marginRight: 15 },
  resultPrice: { fontSize: 15, fontWeight: '900', color: '#1C1C1E' },
  resultVatInfo: { fontSize: 8, color: '#CCC', fontWeight: '700', marginTop: 1 },
  modalFooter: { padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEE' },
  addSelectedBtn: { backgroundColor: WorkaholicTheme.colors.primary, padding: 18, borderRadius: 18, alignItems: 'center' },
  addSelectedText: { color: '#FFF', fontWeight: '900', fontSize: 14, letterSpacing: 1 }
});