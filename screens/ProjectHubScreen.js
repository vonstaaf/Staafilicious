import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WorkaholicTheme } from '../theme';
import AppHeader from '../components/AppHeader';
import { capitalizeFirst } from '../utils/stringHelpers';

export default function ProjectHubScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { project } = route.params || {}; // Projektet skickas med hit

  // --- SKYDD OM INGET PROJEKT ÄR VALT ---
  if (!project) {
    return (
      <View style={[styles.centeredContainer, { paddingTop: insets.top }]}>
        <Ionicons name="folder-open-outline" size={80} color="#CCC" />
        <Text style={styles.noProjectText}>INGET PROJEKT VALT</Text>
        <Text style={styles.noProjectSub}>
          Gå tillbaka och välj ett projekt i listan för att öppna navet.
        </Text>
        <TouchableOpacity 
          style={styles.goBackBtn} 
          onPress={() => navigation.navigate("MainTabs")} // 🔑 Ändrat från Home till MainTabs
        >
          <Text style={styles.goBackBtnText}>GÅ TILL PROJEKTLISTAN</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formattedProjectName = capitalizeFirst(project.name);

  const TILES = [
    {
      id: 'aiWorkOrder',
      title: 'AI ARBETSORDER',
      sub: 'Fritext → tid & material',
      icon: 'sparkles-outline',
      color: '#AF52DE',
      screen: 'AiWorkOrder'
    },
    {
      id: 'finance',
      title: 'EKONOMI & MATERIAL',
      sub: 'Produkter, utlägg & tid',
      icon: 'cash-outline',
      color: '#34C759',
      screen: 'FinanceMaterialHub'
    },
    {
      id: 'controls',
      title: 'KONTROLLER',
      sub: 'Egenkontroll & checklistor',
      icon: 'shield-checkmark-outline',
      color: '#5856D6',
      screen: 'ProtocolsHub' 
    },
    {
      id: 'docs',
      title: 'UNDERLAG',
      sub: 'Beräkningar & dokumentation',
      icon: 'document-text-outline',
      color: '#FF9500',
      screen: 'ProjectDetails' 
    }
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <AppHeader 
        title="PROJEKTNAV" 
        subTitle={formattedProjectName} 
        navigation={navigation} 
      />

      <ScrollView 
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>VÄLJ KATEGORI</Text>
        
        <View style={styles.grid}>
          {TILES.map((tile) => (
            <TouchableOpacity 
              key={tile.id} 
              style={styles.tile} 
              onPress={() => navigation.navigate(tile.screen, { project })}
            >
              <View style={[styles.iconCircle, { backgroundColor: tile.color + '15' }]}>
                <Ionicons name={tile.icon} size={35} color={tile.color} />
              </View>
              <View style={styles.tileTextContainer}>
                <Text style={styles.tileTitle}>{tile.title}</Text>
                <Text style={styles.tileSubText}>{tile.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.projectInfoCard}>
           <Text style={styles.infoLabel}>PROJEKTINFO</Text>
           <Text style={styles.infoText}>KOD: {project.code}</Text>
           <Text style={styles.infoText}>
             SKAPAT: {project.createdAt ? new Date(project.createdAt).toLocaleDateString('sv-SE') : "Okänt"}
           </Text>
        </View>
      </ScrollView>

      {/* SKYDDAD BOTTENYTA MED HEMKNAPP */}
      <View style={[styles.stickyFooter, { paddingBottom: insets.bottom + 15 }]}>
        <TouchableOpacity 
          style={styles.homeBtn} 
          onPress={() => navigation.navigate('MainTabs')} // 🔑 Ändrat från Home till MainTabs
        >
          <Ionicons name="home" size={22} color="#FFF" />
          <Text style={styles.homeBtnText}>TILL STARTSIDAN</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  centeredContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#F8F9FB', 
    padding: 30 
  },
  noProjectText: { 
    fontSize: 20, 
    fontWeight: '900', 
    color: '#1C1C1E', 
    marginTop: 20 
  },
  noProjectSub: { 
    fontSize: 14, 
    color: '#8E8E93', 
    textAlign: 'center', 
    marginTop: 10, 
    lineHeight: 20 
  },
  goBackBtn: {
    marginTop: 25,
    backgroundColor: WorkaholicTheme.colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    elevation: 2
  },
  goBackBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  sectionLabel: { fontSize: 10, fontWeight: "900", color: "#999", letterSpacing: 1.5, marginBottom: 20 },
  grid: { gap: 15 },
  tile: { 
    backgroundColor: '#FFF', 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 22, 
    borderRadius: 25, 
    elevation: 3,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10
  },
  iconCircle: { width: 65, height: 65, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 18 },
  tileTextContainer: { flex: 1 },
  tileTitle: { fontSize: 15, fontWeight: '900', color: '#1C1C1E', letterSpacing: 0.5 },
  tileSubText: { fontSize: 11, color: '#8E8E93', marginTop: 4, fontWeight: '600' },
  
  projectInfoCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 22, marginTop: 30, borderWidth: 1, borderColor: '#EEE' },
  infoLabel: { fontSize: 9, fontWeight: '900', color: '#CCC', marginBottom: 10 },
  infoText: { fontSize: 12, color: '#666', fontWeight: 'bold', marginBottom: 5 },

  stickyFooter: { 
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', padding: 15, borderTopWidth: 1, borderTopColor: '#EEE'
  },
  homeBtn: { 
    backgroundColor: '#1C1C1E', flexDirection: 'row', alignItems: 'center', 
    justifyContent: 'center', padding: 16, borderRadius: 15, gap: 10 
  },
  homeBtnText: { color: '#FFF', fontWeight: '900', fontSize: 14, letterSpacing: 1 }
});