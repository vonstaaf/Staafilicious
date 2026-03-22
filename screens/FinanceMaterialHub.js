import React, { useContext, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProjectsContext } from '../context/ProjectsContext';
import { WorkaholicTheme } from '../theme';
import AppHeader from '../components/AppHeader';
import { formatProjectName } from '../utils/stringHelpers';

export default function FinanceMaterialHub({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { projects, selectedProject } = useContext(ProjectsContext);
  const projectId = route.params?.project?.id || selectedProject?.id;
  const project = useMemo(
    () => projects.find((p) => p.id === projectId) || selectedProject || route.params?.project,
    [projects, projectId, selectedProject, route.params?.project]
  );

  const TILES = [
    {
      id: 'products',
      title: 'MATERIAL',
      sub: 'Materiallista & Artiklar',
      icon: 'list-outline',
      color: '#007AFF',
      screen: 'ProductList' // 🔑 SYNKAD: Matchar MainStack
    },
    {
      id: 'costs',
      title: 'KOSTNADER & TID',
      sub: 'Arvode, Mil & Utlägg',
      icon: 'cash-outline',
      color: '#34C759',
      screen: 'CostTracking' // 🔑 SYNKAD: Matchar MainStack
    },
    {
      id: 'summary',
      title: 'PROJEKTSUMMERING',
      sub: 'Visa total vinst/marginal',
      icon: 'pie-chart-outline',
      color: '#FF9500',
      screen: 'Settlement' // 🔑 SYNKAD: Matchar MainStack
    }
  ];

  return (
    <View style={styles.container}>
      {/* Ändrat till dark-content för att passa vit bakgrund */}
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      <AppHeader 
        title="EKONOMI & MATERIAL" 
        subTitle={formatProjectName(project?.name, "PROJEKT")} 
        navigation={navigation} 
      />

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 50 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>HANTERA PROJEKTEKONOMI</Text>
        
        <View style={styles.grid}>
          {TILES.map((tile) => (
            <TouchableOpacity 
              key={tile.id} 
              style={styles.tile} 
              onPress={() => navigation.navigate(tile.screen, { project })}
              activeOpacity={0.8}
            >
              <View style={[styles.iconCircle, { backgroundColor: tile.color + '15' }]}>
                <Ionicons name={tile.icon} size={30} color={tile.color} />
              </View>
              <View style={styles.tileTextContainer}>
                <Text style={styles.tileTitle}>{tile.title}</Text>
                <Text style={styles.tileSubText}>{tile.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CCC" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoBox}>
          <View style={styles.infoIconCircle}>
            <Ionicons name="information-circle" size={20} color={WorkaholicTheme.colors.primary} />
          </View>
          <Text style={styles.infoText}>
            Här samlas allt underlag för fakturering. Produkter och kostnader hämtas direkt till din slutrapport.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  scrollContent: { padding: 20 },
  sectionLabel: { 
    fontSize: 10, 
    fontWeight: "900", 
    color: "#999", 
    letterSpacing: 1.5, 
    marginBottom: 20,
    marginLeft: 5 
  },
  grid: { gap: 15 },
  tile: { 
    backgroundColor: '#FFF', 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 18, 
    borderRadius: 22, 
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10
  },
  iconCircle: { 
    width: 55, 
    height: 55, 
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 15 
  },
  tileTextContainer: { flex: 1 },
  tileTitle: { 
    fontSize: 15, 
    fontWeight: '900', 
    color: '#1C1C1E', 
    letterSpacing: 0.3 
  },
  tileSubText: { 
    fontSize: 11, 
    color: '#8E8E93', 
    marginTop: 4, 
    fontWeight: '600' 
  },
  infoBox: { 
    flexDirection: 'row', 
    backgroundColor: '#FFF', 
    padding: 20, 
    borderRadius: 22, 
    marginTop: 30, 
    alignItems: 'center', 
    gap: 15, 
    borderWidth: 1, 
    borderColor: '#EEE' 
  },
  infoIconCircle: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: '#F0F0FF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  infoText: { 
    flex: 1, 
    fontSize: 12, 
    color: '#666', 
    lineHeight: 18,
    fontWeight: '500'
  }
});