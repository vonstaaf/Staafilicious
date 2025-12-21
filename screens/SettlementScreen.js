import React, { useContext } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  Share, 
  Alert, 
  TouchableOpacity, 
  Platform 
} from "react-native";
import { GroupsContext } from "../context/GroupsContext";
import Button from "../components/Button";
import { WorkaholicTheme } from "../theme";
import { Ionicons } from "@expo/vector-icons";

export default function SettlementScreen() {
  // Hämta funktioner från Context
  const { selectedGroup, calculateTotal, updateKostnader } = useContext(GroupsContext);

  // Om ingen grupp är vald
  if (!selectedGroup) {
    return (
      <View style={styles.centered}>
        <Ionicons name="document-text-outline" size={64} color="#ccc" />
        <Text style={styles.emptyText}>Välj ett projekt på hemskärmen</Text>
      </View>
    );
  }

  const kostnader = selectedGroup.kostnader || [];
  
  // Beräkningar för sammanfattningen
  const totalTimmar = kostnader.reduce((acc, curr) => acc + (Number(curr.timmar) || 0), 0);
  const totalArbete = kostnader.reduce((acc, curr) => acc + (Number(curr.timmar) * Number(curr.timpris) || 0), 0);
  const totalUtlagg = kostnader.reduce((acc, curr) => acc + (Number(curr.bilkostnad) || 0), 0);
  const totalSumma = totalArbete + totalUtlagg;

  const handleExport = () => {
    if (kostnader.length === 0) {
      Alert.alert("Tom logg", "Det finns inget att exportera.");
      return;
    }

    const message = `
📊 SAMMANSTÄLLNING: ${selectedGroup.name}
----------------------------------
Totalt arbete: ${totalArbete} kr (${totalTimmar} h)
Bil/Övrigt: ${totalUtlagg} kr
TOTALT ATT FAKTURERA: ${totalSumma} kr

SPECIFIKATION:
${kostnader.map(item => `- ${item.datum}: ${item.info} (${item.timmar}h)`).join("\n")}
    `;

    Share.share({ message, title: `Rapport: ${selectedGroup.name}` });
  };

  const handleReset = () => {
    Alert.alert(
      "Nollställ projekt?",
      "Detta raderar all historik i loggen permanent. Har du exporterat rapporten?",
      [
        { text: "Avbryt", style: "cancel" },
        { 
          text: "Ja, nollställ", 
          style: "destructive", 
          onPress: async () => {
            try {
              await updateKostnader(selectedGroup.id, []);
            } catch (e) {
              Alert.alert("Fel", "Kunde inte nollställa loggen.");
            }
          } 
        }
      ]
    );
  };

  // Header-komponenten (Kortet längst upp)
  const renderHeader = () => (
    <View style={{ marginBottom: 20 }}>
      <View style={styles.mainCard}>
        <Text style={styles.groupName}>{selectedGroup.name}</Text>
        <Text style={styles.totalAmount}>{totalSumma.toLocaleString('sv-SE')} kr</Text>
        <Text style={styles.totalLabel}>Totalbelopp att fakturera</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalTimmar}h</Text>
            <Text style={styles.statLabel}>Tid</Text>
          </View>
          <View style={[styles.statItem, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }]}>
            <Text style={styles.statValue}>{totalArbete.toLocaleString('sv-SE')} kr</Text>
            <Text style={styles.statLabel}>Arbete</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalUtlagg.toLocaleString('sv-SE')} kr</Text>
            <Text style={styles.statLabel}>Utlägg</Text>
          </View>
        </View>
      </View>
      <Text style={styles.sectionTitle}>DETALJERAD SPECIFIKATION</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={kostnader}
        ListHeaderComponent={renderHeader}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => {
          const radSumma = (Number(item.timmar) * Number(item.timpris)) + (Number(item.bilkostnad) || 0);
          return (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowDate}>{item.datum}</Text>
                <Text style={styles.rowInfo}>{item.info}</Text>
                <Text style={styles.rowSubText}>{item.timmar}h × {item.timpris} kr/h</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.rowPrice}>{radSumma.toLocaleString('sv-SE')} kr</Text>
                {item.bilkostnad > 0 && <Text style={{ fontSize: 10, color: '#666' }}>+ bil</Text>}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyText}>Inga poster registrerade.</Text>}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {/* Flytande knappar i botten */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
          <Ionicons name="trash-outline" size={24} color="#FF3B30" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 15 }}>
          <Button title="Exportera rapport" type="primary" onPress={handleExport} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7', paddingHorizontal: 15 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mainCard: {
    backgroundColor: WorkaholicTheme.colors.primary,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginTop: 15,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  groupName: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  totalAmount: { color: '#fff', fontSize: 32, fontWeight: '800', marginVertical: 4 },
  totalLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 15 },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 15 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 15, fontWeight: '700' },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#8E8E93', marginTop: 25, marginBottom: 10 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowDate: { fontSize: 10, color: '#8E8E93' },
  rowInfo: { fontSize: 15, fontWeight: '600', color: '#000' },
  rowSubText: { fontSize: 12, color: '#8E8E93' },
  rowPrice: { fontSize: 16, fontWeight: '700', color: WorkaholicTheme.colors.primary },
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingBottom: Platform.OS === 'ios' ? 35 : 20
  },
  resetBtn: {
    width: 50, height: 50,
    borderRadius: 12,
    backgroundColor: '#FFF1F0',
    justifyContent: 'center', alignItems: 'center'
  },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#8E8E93' }
});