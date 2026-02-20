import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, ActivityIndicator, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { WorkaholicTheme } from '../theme';
import AppHeader from '../components/AppHeader';

export default function ProjectDetailsScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  // Säkra upp att project faktiskt finns innan vi renderar något
  const { project } = route.params || {}; 
  
  const [protocols, setProtocols] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- SKYDD OM PROJEKT SAKNAS ---
  if (!project?.id) {
    return (
      <View style={styles.centered}>
        <Text>Kunde inte ladda projektdata.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.addBtn}>
          <Text style={styles.addBtnText}>GÅ TILLBAKA</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Lyssna på sparade beräkningar/protokoll i realtid
  useEffect(() => {
    try {
      const q = query(
        collection(db, 'projects', project.id, 'protocols'),
        orderBy('timestamp', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProtocols(data);
        setLoading(false);
      }, (error) => {
        console.error("Firestore error:", error);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      setLoading(false);
      console.log("Effect error:", err);
    }
  }, [project.id]);

  const handleDelete = (id) => {
    Alert.alert("Radera?", "Vill du ta bort denna beräkning?", [
      { text: "Avbryt" },
      { text: "Radera", style: "destructive", onPress: () => deleteDoc(doc(db, 'projects', project.id, 'protocols', id)) }
    ]);
  };

  const renderProtocolItem = ({ item }) => {
    // Felsäkrad logik för typ-koll
    const itemType = item.type || "";
    const isCalculation = itemType.toLowerCase().includes('kabel');
    
    // Felsäkrad datum-hantering
    const dateDisplay = item.timestamp?.toDate 
      ? item.timestamp.toDate().toLocaleDateString('sv-SE') 
      : "Inget datum";

    return (
      <View style={styles.card}>
        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.typeTag}>
              <Ionicons name={isCalculation ? "flash" : "document-text"} size={12} color={WorkaholicTheme.colors.primary} />
              <Text style={styles.typeTagText}>{itemType.toUpperCase() || "OKÄND"}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ padding: 5 }}>
              <Ionicons name="trash-outline" size={18} color="#FF3B30" />
            </TouchableOpacity>
          </View>

          <Text style={styles.cardTitle}>{item.kabel || "Namnlös"} {item.area || ""}</Text>
          
          <View style={styles.detailsGrid}>
            <Detail label="SÄKRING" value={item.fuse || "-"} />
            <Detail label="LÄNGD" value={item.langd ? `${item.langd}m` : "-"} />
            <Detail label="FALL" value={item.vDrop ? `${item.vDrop}%` : "-"} />
            <Detail label="MILJÖ" value={item.miljo || "-"} />
          </View>
          
          <Text style={styles.dateText}>{dateDisplay}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      <AppHeader 
        title="DOKUMENTATION" 
        subTitle={project.name.toUpperCase()} 
        navigation={navigation} 
      />

      <View style={styles.statsBar}>
        <StatBox label="BERÄKNINGAR" value={protocols.length} icon="calculator" />
        <View style={styles.vDivider} />
        <StatBox label="PRODUKTER" value={project.products?.length || 0} icon="list" />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={WorkaholicTheme.colors.primary} />
          <Text style={{ marginTop: 10, color: '#999', fontWeight: '700' }}>LADDAR UNDERLAG...</Text>
        </View>
      ) : (
        <FlatList
          data={protocols}
          keyExtractor={(item) => item.id}
          renderItem={renderProtocolItem}
          contentContainerStyle={[styles.listContainer, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="document-attach-outline" size={40} color="#CCC" />
              </View>
              <Text style={styles.emptyText}>Inga sparade beräkningar än.</Text>
              <TouchableOpacity 
                style={styles.addBtn} 
                onPress={() => navigation.navigate('CableGuide')}
              >
                <Text style={styles.addBtnText}>GÅ TILL KABELGUIDEN</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* FLYTANDE FOOTER */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 15 }]}>
        <TouchableOpacity 
          style={[styles.exportBtn, protocols.length === 0 && { opacity: 0.5 }]}
          onPress={() => protocols.length > 0 ? Alert.alert("PDF", "Genererar tekniskt underlag...") : null}
          disabled={protocols.length === 0}
        >
          <Ionicons name="share-outline" size={20} color="#FFF" />
          <Text style={styles.exportBtnText}>EXPORTERA TEKNISKT UNDERLAG</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// HJÄLPKOMPONENTER (Definierade utanför för prestanda)
const Detail = ({ label, value }) => (
  <View style={styles.detailItem}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const StatBox = ({ label, value, icon }) => (
  <View style={styles.statBox}>
    <View style={styles.statIconCircle}>
      <Ionicons name={icon} size={14} color={WorkaholicTheme.colors.primary} />
    </View>
    <View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  </View>
);

const getStatusColor = (s) => s === 'danger' ? '#FF3B30' : s === 'warning' ? '#FFCC00' : '#34C759';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 20 },
  
  statsBar: { 
    flexDirection: 'row', 
    backgroundColor: '#FFF', 
    margin: 20, 
    borderRadius: 20, 
    padding: 15, 
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  vDivider: { width: 1, height: 30, backgroundColor: '#F0F0F0' },
  statBox: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statIconCircle: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#F0F0FF', justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '900', color: '#1C1C1E' },
  statLabel: { fontSize: 9, color: '#999', fontWeight: 'bold' },
  
  card: { 
    backgroundColor: '#FFF', 
    borderRadius: 22, 
    marginBottom: 15, 
    flexDirection: 'row', 
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10
  },
  statusIndicator: { width: 6 },
  cardContent: { flex: 1, padding: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  typeTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F7FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 6 },
  typeTagText: { fontSize: 9, fontWeight: '900', color: WorkaholicTheme.colors.primary, letterSpacing: 0.5 },
  cardTitle: { fontSize: 18, fontWeight: '900', color: '#1C1C1E', marginBottom: 15 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 },
  detailItem: { minWidth: '45%' },
  detailLabel: { fontSize: 9, color: '#AAA', fontWeight: '900', marginBottom: 2, letterSpacing: 0.5 },
  detailValue: { fontSize: 14, fontWeight: '700', color: '#444' },
  dateText: { fontSize: 10, color: '#CCC', marginTop: 15, textAlign: 'right', fontWeight: '900' },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', padding: 15, borderTopWidth: 1, borderTopColor: '#EEE' },
  exportBtn: { backgroundColor: '#1C1C1E', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 18, gap: 10 },
  exportBtnText: { color: '#FFF', fontWeight: '900', fontSize: 13, letterSpacing: 1 },

  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 2 },
  emptyText: { color: '#999', fontWeight: '700', fontSize: 14 },
  addBtn: { marginTop: 15, backgroundColor: WorkaholicTheme.colors.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  addBtnText: { color: '#FFF', fontWeight: '800', fontSize: 12 }
});