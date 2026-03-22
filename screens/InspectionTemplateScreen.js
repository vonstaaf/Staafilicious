import React, { useState, useContext, useEffect } from "react";
import { 
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, 
  Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { getProfessionKeys } from "../constants/wholesalers";
import { ProjectsContext } from "../context/ProjectsContext";
import { WorkaholicTheme } from "../theme";
import AppHeader from "../components/AppHeader";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_CONFIG = {
  general: { label: "ALLMÄN", sectionName: "ALLMÄNT" },
  heating: { label: "GOLVVÄRME", sectionName: "GOLVVÄRME" },
  vvs: { label: "VVS", sectionName: "VVS" },
  bygg: { label: "BYGG", sectionName: "BYGG" },
};

const UNIT_OPTIONS = [
  { label: 'Ingen', value: '' },
  { label: 'm', value: 'Meter' },
  { label: 'MΩ', value: 'MegaOhm' },
  { label: 'Ω', value: 'Ohm' },
  { label: 'mA', value: 'mA' },
  { label: 'kA', value: 'kA' }
];

// 🔑 SEPARERADE PRESETS FÖR OLIKA MALLTYPER
const PRESETS = {
  general: [
    { label: "Kontroll förläggning", section: "ALLMÄNT", unit: "", desc: "Visuell kontroll enligt SS 436 40 00, kap 6." },
    { label: "Fastsättn. apparter o dyl.", section: "ALLMÄNT", unit: "", desc: "Kontroll av kapslingsklass och montage enligt tillverkarens anvisning." },
    { label: "Håltagningar, tätning", section: "ALLMÄNT", unit: "", desc: "Brandtätning och genomföringar enligt BBR Kap 5." },
    { label: "Funktionskontroll", section: "ALLMÄNT", unit: "", desc: "Provning av funktioner (t.ex. JFB) enligt ELSÄK-FS 2008:1." },
    { label: "Böjradie", section: "ALLMÄNT", unit: "", desc: "Kontroll mot kabeltillverkarens minimikrav." },
    { label: "Kontrollera anslutningar", section: "ALLMÄNT", unit: "", desc: "Efterdragning och kontaktpressning." },
    { label: "Märkning", section: "ALLMÄNT", unit: "", desc: "Krav på identifiering enligt SS 436 40 00, avsnitt 514." },
    { label: "Isolationsprovning", section: "ALLMÄNT", unit: "MegaOhm", desc: "Mätning utförd med 500V DC (Krav >1,0 MΩ) enligt SS 6.4.3.3." },
    { label: "Kontinuitetsprovning", section: "ALLMÄNT", unit: "Ohm", desc: "Verifiering av skyddsledare enligt SS 6.4.3.2." },
    { label: "Bärande väggar", section: "ALLMÄNT", unit: "", desc: "Verifiering att ingen otillåten försvagning skett enligt BBR." },
    { label: "Brandskydd", section: "ALLMÄNT", unit: "", desc: "Återställning av brandceller enligt Boverkets byggregler." },
  ],
  heating: [
    { label: "Längd / area", section: "GOLVVÄRME", unit: "Meter", desc: "Verifiering mot ritning/projektering." },
    { label: "Fotodokumentation", section: "GOLVVÄRME", unit: "", desc: "Krav för garantibevis och framtida felsökning." },
    { label: "R före förläggning", section: "GOLVVÄRME", unit: "Ohm", desc: "Resistansmätning enligt tillverkarens tabell." },
    { label: "Riso före förläggning", section: "GOLVVÄRME", unit: "MegaOhm", desc: "Isolationsmätning enligt tillverkarens anvisning." },
    { label: "R efter förläggning", section: "GOLVVÄRME", unit: "Ohm", desc: "Kontroll efter utläggning (innan spackling/fix)." },
    { label: "Riso efter förläggning", section: "GOLVVÄRME", unit: "MegaOhm", desc: "Kontroll efter utläggning (innan spackling/fix)." },
    { label: "R före inkoppling", section: "GOLVVÄRME", unit: "Ohm", desc: "Slutgiltig kontroll efter färdigt golv." },
    { label: "Riso före inkoppling", section: "GOLVVÄRME", unit: "MegaOhm", desc: "Slutgiltig kontroll efter färdigt golv." },
  ],
  vvs: [
    { label: "Rörgenomföringar", section: "VVS", unit: "", desc: "Genomföringar enligt branschregler. Tätning och skydd." },
    { label: "Rörisolering", section: "VVS", unit: "", desc: "Isolering enligt PBL/BR. Skydd mot frysning." },
    { label: "Golvvärmeslingor", section: "VVS", unit: "", desc: "Läggning och avstånd enligt ritning." },
    { label: "Tryck- och täthetsprov", section: "VVS", unit: "", desc: "Prov enligt regler. Protokoll krävs." },
    { label: "Dricksvatten / avlopp", section: "VVS", unit: "", desc: "Material, dimensioner och ventilation." },
    { label: "Märkning och dokumentation", section: "VVS", unit: "", desc: "Rör märkta. Ritningar tillgängliga." },
  ],
  bygg: [
    { label: "Förberedelse underlag", section: "BYGG", unit: "", desc: "Underlag enligt projektering och BBR." },
    { label: "Förläggning och fästning", section: "BYGG", unit: "", desc: "Kontroll av förläggning och fästningsmoment." },
    { label: "Skydd och tätning", section: "BYGG", unit: "", desc: "Brandskydd och tätning enligt krav." },
    { label: "Dokumentation", section: "BYGG", unit: "", desc: "Fotodokumentation och protokoll." },
  ],
};

const TABS_BY_KEY = { el: ["general", "heating"], vvs: ["vvs"], bygg: ["bygg"] };

function getAllowedTabs(profession) {
  const keys = getProfessionKeys(profession);
  const seen = new Set();
  const tabs = [];
  for (const key of keys) {
    for (const t of TABS_BY_KEY[key] || []) {
      if (!seen.has(t)) {
        seen.add(t);
        tabs.push(t);
      }
    }
  }
  return tabs;
}

export default function InspectionTemplateScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { templates, saveInspectionTemplate } = useContext(ProjectsContext);
  const [profession, setProfession] = useState("");
  const [professionLoaded, setProfessionLoaded] = useState(false);
  const allowedTabs = getAllowedTabs(profession);
  const firstTab = allowedTabs[0];

  const [activeTab, setActiveTab] = useState("general");
  const [items, setItems] = useState([]);
  const [newItemLabel, setNewItemLabel] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!user) {
        setProfessionLoaded(true);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists() && snap.data().profession != null) {
          setProfession(snap.data().profession);
        }
      } catch (e) {
        console.error(e);
      }
      setProfessionLoaded(true);
    };
    load();
  }, []);

  useEffect(() => {
    if (firstTab && !allowedTabs.includes(activeTab)) {
      setActiveTab(firstTab);
    }
  }, [firstTab, allowedTabs, activeTab]);

  useEffect(() => {
    if (templates && templates[activeTab]) {
      setItems(templates[activeTab]);
    } else {
      setItems([]);
    }
  }, [activeTab, templates]);

  const loadStandardTemplate = () => {
    const name = TAB_CONFIG[activeTab]?.label || activeTab;
    const refText = activeTab === "general" || activeTab === "heating"
      ? "ELSÄK-FS, SS 436 40 00 och BBR."
      : "branschregler.";
    Alert.alert(
      `Ladda ${name} standardmall?`,
      `Detta lägger till punkter med referenser till ${refText}`,
      [
        { text: "Avbryt", style: "cancel" },
        {
          onPress: () => {
            const presets = PRESETS[activeTab];
            if (!presets) return;
            const formattedPresets = presets.map((p, index) => ({
              ...p,
              id: "p" + Date.now().toString() + index,
              checked: false
            }));
            setItems([...items, ...formattedPresets]);
          },
          text: "Ja, ladda in"
        }
      ]
    );
  };

  const addItem = () => {
    const trimmed = newItemLabel.trim();
    if (trimmed.length < 2) return;
    const sectionName = TAB_CONFIG[activeTab]?.sectionName || "ALLMÄNT";
    const updated = [
      ...items,
      {
        id: "i" + Date.now().toString(),
        label: trimmed,
        section: sectionName,
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
      await saveInspectionTemplate(activeTab, items);
      const name = TAB_CONFIG[activeTab]?.label || activeTab;
      Alert.alert("Sparat!", `Mallen för ${name} är uppdaterad.`);
    } catch (e) {
      Alert.alert("Fel", "Kunde inte spara.");
    } finally {
      setLoading(false);
    }
  };

  if (!professionLoaded) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={WorkaholicTheme.colors.primary} />
      </View>
    );
  }

  if (allowedTabs.length === 0) {
    return (
      <View style={styles.container}>
        <AppHeader title="MALLAR" subTitle="Master-egenkontroll" navigation={navigation} />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
          <Text style={{ fontSize: 16, color: "#666", textAlign: "center" }}>
            Ingen egenkontroll-mall tillgänglig för ditt yrke. Sätt yrke i profilen (t.ex. EL, Rör, VVS, Bygg).
          </Text>
          <TouchableOpacity style={{ marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: WorkaholicTheme.colors.primary, borderRadius: 12 }} onPress={() => navigation.goBack()}>
            <Text style={{ color: "#FFF", fontWeight: "800" }}>TILLBAKA</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const sectionLabel = TAB_CONFIG[activeTab]?.sectionName || "ALLMÄNT";
  const legalText = activeTab === "general" || activeTab === "heating"
    ? "Standard: SS 436 40 00 & ELSÄK-FS 2008:1"
    : "Mall anpassad efter branschregler för ditt yrke.";

  return (
    <View style={styles.container}>
      <AppHeader title="MALLAR" subTitle="Master-egenkontroll" navigation={navigation} />
      
      <View style={styles.tabBar}>
        {allowedTabs.map((tabKey) => (
          <TouchableOpacity
            key={tabKey}
            style={[styles.tab, activeTab === tabKey && styles.activeTab]}
            onPress={() => setActiveTab(tabKey)}
          >
            <Text style={[styles.tabText, activeTab === tabKey && styles.activeTabText]}>{TAB_CONFIG[tabKey]?.label || tabKey}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        <View style={styles.inputSection}>
          <View style={styles.legalBox}>
            <Ionicons name="shield-checkmark" size={16} color="#2E7D32" />
            <Text style={styles.legalText}>{legalText}</Text>
          </View>

          <View style={styles.presetHeader}>
            <Text style={styles.infoText}>Redigera master-listan för {sectionLabel.toLowerCase()}.</Text>
            {PRESETS[activeTab] && (
              <TouchableOpacity style={styles.presetBtn} onPress={loadStandardTemplate}>
                <Ionicons name="copy-outline" size={14} color={WorkaholicTheme.colors.primary} />
                <Text style={styles.presetBtnText}>LADDA {TAB_CONFIG[activeTab]?.label || activeTab} MALL</Text>
              </TouchableOpacity>
            )}
          </View>

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
                <Text style={styles.miniLabel}>HÄNVISNING / INSTRUKTION</Text>
                <TextInput 
                  style={styles.subInput}
                  value={item.desc}
                  onChangeText={(v) => updateItem(item.id, 'desc', v)}
                  placeholder="Referens till standard..."
                />
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="clipboard-outline" size={50} color="#EEE" />
              <Text style={styles.emptyText}>Ingen mall skapad för denna kategori.</Text>
            </View>
          }
        />

        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity 
            style={[styles.saveBtn, loading && { opacity: 0.7 }]} 
            onPress={handleSave} 
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>SPARA DENNA MALL</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFF', padding: 5, marginHorizontal: 20, marginTop: 15, borderRadius: 12, elevation: 2 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: WorkaholicTheme.colors.primary },
  tabText: { fontSize: 11, fontWeight: '900', color: '#8E8E93', letterSpacing: 0.5 },
  activeTabText: { color: '#FFF' },
  inputSection: { padding: 20, backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#EEE" },
  legalBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', padding: 8, borderRadius: 8, gap: 6, marginBottom: 15 },
  legalText: { fontSize: 11, fontWeight: '700', color: '#2E7D32' },
  presetHeader: { marginBottom: 15 },
  infoText: { fontSize: 12, color: "#8E8E93", marginBottom: 10, fontWeight: "500" },
  presetBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#F0F7FF', padding: 10, borderRadius: 10, gap: 6 },
  presetBtnText: { fontSize: 10, fontWeight: '900', color: WorkaholicTheme.colors.primary },
  inputRow: { flexDirection: "row", gap: 10 },
  input: { flex: 1, backgroundColor: "#F2F2F7", borderRadius: 12, padding: 15, fontSize: 16, fontWeight: "600", color: "#1C1C1E" },
  addBtn: { backgroundColor: WorkaholicTheme.colors.primary, width: 50, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  list: { padding: 15 },
  itemRow: { backgroundColor: "#FFF", padding: 15, borderRadius: 22, marginBottom: 12, borderWidth: 1, borderColor: "#F0F0F0" },
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
  saveBtn: { backgroundColor: WorkaholicTheme.colors.primary, padding: 18, borderRadius: 16, alignItems: "center" },
  saveBtnText: { color: "#FFF", fontWeight: "900", fontSize: 14, letterSpacing: 1 }
});