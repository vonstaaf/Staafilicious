import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WorkaholicTheme } from "../theme";
import AppHeader from "../components/AppHeader";
import { auth, db } from "../firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";

// --- SKARPA MALLAR BASERADE PÅ DIN UPPLADDADE DOKUMENTATION (EIO/IN) ---
// Optimerade texter för att rymma allt på en PDF-sida

const TNC_TEMPLATE = [
  { id: 'tnc_1', section: '1. Okulär kontroll', label: 'Kablage & Isolering', desc: 'Ingen klämrisk mot plåt/skarpa kanter. Isolering oskadad.' },
  { id: 'tnc_2', section: '1. Okulär kontroll', label: 'PEN / N / PE anslutning', desc: 'Ljusblå till N, G/G till PE. (Undantag N-ledare via JFB).' },
  { id: 'tnc_3', section: '1. Okulär kontroll', label: 'Avskalning & Area', desc: 'Korrekt avskalning. Area matchar överströmsskydd.' },
  { id: 'tnc_4', section: '1. Okulär kontroll', label: 'Dokumentation & Märkning', desc: 'Gruppförteckning/schema finns. Centralmärkning utförd.' },
  { id: 'tnc_5', section: '1. Okulär kontroll', label: 'Jordfelsbrytare Info', desc: 'Instruktion + skiss för JFB-skydd finns uppsatt.' },
  { id: 'tnc_6', section: '1. Okulär kontroll', label: 'Moment & IP-klass', desc: 'Momentdraget. Kapsling tät (min IP20/IP21).' },
  { id: 'tnc_m1', section: '2. Mätning (Löst)', label: 'Kontinuitet & Utjämning', desc: 'Skyddsutjämning OK (vatten, avlopp, vent etc).' },
  { id: 'tnc_m2', section: '2. Mätning (Löst)', label: 'Isolationsmätning', desc: 'Minst 0.5 MΩ vid 500V mellan faser/jord.' },
  { id: 'tnc_s1', section: '3. Kontroll (Satt)', label: 'Huvudbrytare & JFB-test', desc: 'Funktionstest av brytare och JFB via testknapp.' },
  { id: 'tnc_s2', section: '3. Kontroll (Satt)', label: 'JFB Utlösningstid/ström', desc: 'Uppmätt tid (max 300ms) och ström (mA).' },
  { id: 'tnc_s3', section: '3. Kontroll (Satt)', label: 'Spänningskontroll 230V', desc: 'Uttag har 230V. Fas/Nolla ej förväxlade (ej 400V).' },
  { id: 'tnc_s4', section: '3. Kontroll (Satt)', label: 'Fasföljd & Rotation', desc: 'Rätt rotationsriktning på 3-fas utrustning.' },
  { id: 'tnc_s5', section: '3. Kontroll (Satt)', label: 'Förimpedans (Zför)', desc: 'Notera uppmätt eller beräknat värde.' },
];

const TNS_TEMPLATE = [
  { id: 'tns_1', section: '1. Okulär kontroll', label: 'Kablage & Isolering', desc: 'Ingen klämrisk mot plåt/skarpa kanter. Isolering oskadad.' },
  { id: 'tns_2', section: '1. Okulär kontroll', label: 'Separation N & PE', desc: 'Blå till N, G/G till PE. Ingen bygling i central.' },
  { id: 'tns_3', section: '1. Okulär kontroll', label: 'Avskalning & Area', desc: 'Korrekt avskalning. Area matchar överströmsskydd.' },
  { id: 'tns_4', section: '1. Okulär kontroll', label: 'Dokumentation & Märkning', desc: 'Gruppförteckning/schema finns. Centralmärkning utförd.' },
  { id: 'tns_5', section: '1. Okulär kontroll', label: 'Jordfelsbrytare Info', desc: 'Instruktion + skiss för JFB-skydd finns uppsatt.' },
  { id: 'tns_6', section: '1. Okulär kontroll', label: 'Moment & IP-klass', desc: 'Momentdraget. Kapsling tät (min IP20/IP21).' },
  { id: 'tns_m1', section: '2. Mätning (Löst)', label: 'Kontinuitet & Utjämning', desc: 'Skyddsutjämning OK (vatten, avlopp, vent etc).' },
  { id: 'tns_m2', section: '2. Mätning (Löst)', label: 'N-PE Separationstest', desc: 'Ingen kontakt N-PE (mäts med frånslagen JFB).' },
  { id: 'tns_m3', section: '2. Mätning (Löst)', label: 'Isolationsmätning', desc: 'Minst 0.5 MΩ vid 500V mellan faser/jord.' },
  { id: 'tns_s1', section: '3. Kontroll (Satt)', label: 'Huvudbrytare & JFB-test', desc: 'Funktionstest av brytare och JFB via testknapp.' },
  { id: 'tns_s2', section: '3. Kontroll (Satt)', label: 'JFB Utlösningstid/ström', desc: 'Uppmätt tid (max 300ms) och ström (mA).' },
  { id: 'tns_s3', section: '3. Kontroll (Satt)', label: 'Spänningskontroll 230V', desc: 'Uttag har 230V. Fas/Nolla ej förväxlade (ej 400V).' },
  { id: 'tns_s4', section: '3. Kontroll (Satt)', label: 'Fasföljd & Rotation', desc: 'Rätt rotationsriktning på 3-fas utrustning.' },
  { id: 'tns_s5', section: '3. Kontroll (Satt)', label: 'Förimpedans (Zför)', desc: 'Notera uppmätt eller beräknat värde.' },
];

export default function ProtocolsHubScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { project } = route.params || {}; // Hämta projektet
  const [profession, setProfession] = useState(""); 
  const [loading, setLoading] = useState(true);

  // 1. LYSSNA LIVE PÅ DATABASEN
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfession(data.profession || "");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. LOGIK FÖR ATT VISA RÄTT KNAPPAR
  const current = profession ? profession.toLowerCase() : "";
  const isElektriker = current.includes("el"); 
  const isSnickare = current.includes("snickare") || current.includes("bygg");
  const isRormokare = current.includes("rör") || current.includes("vvs");

  // Funktion för att starta ett protokoll med en specifik mall
  const startProtocol = (title, templateItems) => {
    navigation.navigate("InspectionScreen", {
      customTitle: title,
      customTemplate: templateItems,
      isNewProtocol: true,
      project // Skicka med projektet
    });
  };

  const ProtocolCard = ({ title, sub, icon, color, onPress, disabled }) => (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: WorkaholicTheme.colors.surface, opacity: disabled ? 0.6 : 1 }]} 
      onPress={disabled ? () => Alert.alert("Info", "Denna funktion är inte tillgänglig än.") : onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconBox, { backgroundColor: color }]}>
        <Ionicons name={icon} size={28} color="#FFF" />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={WorkaholicTheme.colors.textSecondary} />
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator color={WorkaholicTheme.colors.primary} /></View>;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <AppHeader 
        title="KONTROLLER" 
        subTitle={project?.name || "Välj protokoll"} 
        navigation={navigation} 
      />
      
      <ScrollView 
        contentContainerStyle={{ 
          padding: WorkaholicTheme.spacing.medium,
          paddingBottom: insets.bottom + 20 
        }}
      >
        <Text style={styles.sectionLabel}>TILLGÄNGLIGA KONTROLLER</Text>
        
        {/* --- ALLA SER DETTA --- */}
        <ProtocolCard 
          title="EGENKONTROLL" 
          sub="Digital kontroll & foton" 
          icon="checkmark-done-circle" 
          color={WorkaholicTheme.colors.success} 
          onPress={() => navigation.navigate("InspectionScreen", { project })} 
        />

        {/* --- KONTROLL FÖR ELEKTRIKER --- */}
        {isElektriker && (
          <>
            <ProtocolCard 
              title="GRUPPSCHEMA" 
              sub="Skapa förteckning" 
              icon="grid" 
              color={WorkaholicTheme.colors.primary} 
              onPress={() => navigation.navigate("GroupSchedule", { project })} 
            />
            
            <ProtocolCard 
              title="TN-C PROTOKOLL" 
              sub="4-ledarsystem (PEN)" 
              icon="flash" 
              color="#FFB300" 
              onPress={() => startProtocol("TN-C PROTOKOLL", TNC_TEMPLATE)} 
            />
            
            <ProtocolCard 
              title="TN-S PROTOKOLL" 
              sub="5-ledarsystem (Separat PE/N)" 
              icon="git-network" 
              color="#FFB300" 
              onPress={() => startProtocol("TN-S PROTOKOLL", TNS_TEMPLATE)} 
            />

            <View style={styles.divider} />

            <ProtocolCard 
              title="KABELGUIDEN" 
              sub="Dimensionering & spänningsfall" 
              icon="calculator" 
              color="#607D8B" 
              onPress={() => navigation.navigate("CableGuide", { project })} 
            />
          </>
        )}

        {/* --- KONTROLL FÖR SNICKARE --- */}
        {isSnickare && (
          <ProtocolCard title="KVALITETSDOKUMENT" sub="Specifikt för Snickare" icon="hammer" color="#FF5722" disabled={true} />
        )}

        {/* --- KONTROLL FÖR RÖRMOKARE --- */}
        {isRormokare && (
          <ProtocolCard title="SÄKER VATTEN" sub="Specifikt för VVS" icon="water" color="#03A9F4" disabled={true} />
        )}

        <View style={styles.divider} />
        
        <ProtocolCard 
          title="ARKIV" 
          sub="Tidigare historik" 
          icon="archive" 
          color={WorkaholicTheme.colors.textSecondary} 
          onPress={() => navigation.navigate("InspectionHistory", { project })} 
        />
        
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WorkaholicTheme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionLabel: { fontSize: 10, fontWeight: "900", color: "#999", letterSpacing: 1.5, marginBottom: 15, marginTop: 5 },
  card: { 
    padding: 16, 
    borderRadius: WorkaholicTheme.borderRadius.medium, 
    marginBottom: 12, 
    flexDirection: "row", 
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  iconBox: { width: 50, height: 50, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 15 },
  cardContent: { flex: 1 },
  cardTitle: { ...WorkaholicTheme.typography.subtitle },
  cardSub: { ...WorkaholicTheme.typography.body, fontSize: 12, marginTop: 2 },
  divider: { height: 1, backgroundColor: "#EEE", marginVertical: 10 }
});