import React, { useContext, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProjectsContext } from "../context/ProjectsContext";
import { WorkaholicTheme } from "../theme";
import AppHeader from "../components/AppHeader";

// Hjälpfunktion för att formatera valuta
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

export default function SettlementScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { selectedProject } = useContext(ProjectsContext);
  const project = route.params?.project || selectedProject;

  // --- EKONOMISKA BERÄKNINGAR ---
  const totals = useMemo(() => {
    if (!project) return { materialIn: 0, materialOut: 0, costs: 0, totalOut: 0, profit: 0, margin: 0 };

    // 1. Material (Inköp vs Utpris)
    const matIn = project.products?.reduce((acc, p) => acc + (Number(p.purchasePrice || 0) * Number(p.quantity || 0)), 0) || 0;
    const matOut = project.products?.reduce((acc, p) => acc + (Number(p.unitPriceOutExclVat || 0) * Number(p.quantity || 0)), 0) || 0;

    // 2. Övriga kostnader (Arbete, Mil, Utlägg från KostnaderScreen)
    const costTotal = project.kostnader?.reduce((acc, c) => acc + (Number(c.total || 0)), 0) || 0;

    const totalOut = matOut + costTotal;
    const profit = totalOut - matIn; // Enkel vinstberäkning (Fakturerat - Inköp Material)
    const margin = totalOut > 0 ? (profit / totalOut) * 100 : 0;

    return {
      materialIn: matIn,
      materialOut: matOut,
      costs: costTotal,
      totalOut: totalOut,
      profit: profit,
      margin: margin
    };
  }, [project]);

  if (!project) return null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      <AppHeader 
        title="PROJEKTSUMMERING" 
        subTitle={project.name.toUpperCase()} 
        navigation={navigation} 
      />

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* HUVUDKORT - VINST & MARGINAL */}
        <View style={styles.mainCard}>
          <View style={styles.mainRow}>
            <View>
              <Text style={styles.mainLabel}>BERÄKNAD VINST</Text>
              <Text style={styles.mainValue}>{formatCurrency(totals.profit)}</Text>
            </View>
            <View style={styles.marginBadge}>
              <Text style={styles.marginText}>{totals.margin.toFixed(1)}%</Text>
              <Text style={styles.marginLabelSmall}>MARGINAL</Text>
            </View>
          </View>
          <View style={styles.dividerLight} />
          <Text style={styles.mainSubText}>Baserat på inköpspriser och fakturerbart underlag.</Text>
        </View>

        <Text style={styles.sectionTitle}>EKONOMISK SPECIFIKATION</Text>

        {/* MATERIAL-KORT */}
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <Ionicons name="cart-outline" size={20} color={WorkaholicTheme.colors.primary} />
            <Text style={styles.detailTitle}>MATERIAL & ARTIKLAR</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Faktureras kund:</Text>
            <Text style={styles.value}>{formatCurrency(totals.materialOut)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Inköpskostnad:</Text>
            <Text style={[styles.value, { color: '#E53935' }]}>- {formatCurrency(totals.materialIn)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.labelBold}>Materialvinst:</Text>
            <Text style={styles.valueBold}>{formatCurrency(totals.materialOut - totals.materialIn)}</Text>
          </View>
        </View>

        {/* KOSTNADS-KORT (Tid & Mil) */}
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <Ionicons name="time-outline" size={20} color="#34C759" />
            <Text style={styles.detailTitle}>ARBETE, MIL & UTlägg</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Totalt att fakturera:</Text>
            <Text style={styles.value}>{formatCurrency(totals.costs)}</Text>
          </View>
          <Text style={styles.hintText}>Inkluderar alla rader från kostnadsloggen.</Text>
        </View>

        {/* TOTAL-KORT */}
        <View style={[styles.detailCard, { backgroundColor: '#1C1C1E' }]}>
          <View style={styles.row}>
            <Text style={[styles.label, { color: '#AAA' }]}>TOTALT ATT FAKTURERA (EXKL. MOMS)</Text>
          </View>
          <Text style={styles.totalValueLarge}>{formatCurrency(totals.totalOut)}</Text>
        </View>

      </ScrollView>

      {/* FOOTER MED EXPORT */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 15 }]}>
        <TouchableOpacity 
          style={styles.exportBtn}
          onPress={() => Alert.alert("PDF", "Genererar ekonomisk sammanställning...")}
        >
          <Ionicons name="document-text-outline" size={20} color="#FFF" />
          <Text style={styles.exportBtnText}>EXPORTERA SLUTRAPPORT (PDF)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  scrollContent: { padding: 20 },
  
  // Huvudkort
  mainCard: { backgroundColor: WorkaholicTheme.colors.primary, padding: 25, borderRadius: 30, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  mainRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mainLabel: { fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5 },
  mainValue: { fontSize: 32, fontWeight: '900', color: '#FFF', marginTop: 5 },
  marginBadge: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 12, borderRadius: 15, alignItems: 'center', minWidth: 80 },
  marginText: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  marginLabelSmall: { color: 'rgba(255,255,255,0.6)', fontSize: 8, fontWeight: '900', marginTop: 2 },
  dividerLight: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 20 },
  mainSubText: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },

  sectionTitle: { fontSize: 12, fontWeight: '900', color: '#8E8E93', marginTop: 30, marginBottom: 15, marginLeft: 5, letterSpacing: 1 },

  // Detaljkort
  detailCard: { backgroundColor: '#FFF', borderRadius: 22, padding: 20, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  detailTitle: { fontSize: 12, fontWeight: '900', color: '#1C1C1E', letterSpacing: 0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: { fontSize: 13, color: '#8E8E93', fontWeight: '600' },
  labelBold: { fontSize: 14, color: '#1C1C1E', fontWeight: '800' },
  value: { fontSize: 14, color: '#1C1C1E', fontWeight: '700' },
  valueBold: { fontSize: 16, color: '#34C759', fontWeight: '900' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 10 },
  hintText: { fontSize: 10, color: '#BBB', marginTop: 5, fontWeight: '500' },
  totalValueLarge: { fontSize: 28, fontWeight: '900', color: '#FFF', marginTop: 10 },

  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', padding: 15, borderTopWidth: 1, borderTopColor: '#EEE' },
  exportBtn: { backgroundColor: '#1C1C1E', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 18, gap: 10 },
  exportBtnText: { color: '#FFF', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 }
});