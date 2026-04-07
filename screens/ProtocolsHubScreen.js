import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { WorkaholicTheme } from "../theme";
import AppHeader from "../components/AppHeader";
import { auth, db } from "../firebaseConfig";
import { formatProjectName } from "../utils/stringHelpers";
import { getProfessionKeys } from "../constants/wholesalers";
import { BYGG_EGENKONTROLL_ITEMS } from "../constants/byggChecklist";
import { doc, onSnapshot } from "firebase/firestore";
import { CompanyContext } from "../context/CompanyContext";
import { ProjectsContext } from "../context/ProjectsContext";
import { generateAndShareSakerVattenIntyg } from "../utils/pdfActions";

// --- SKARPA MALLAR BASERADE PÅ DIN UPPLADDADE DOKUMENTATION (EIO/IN) ---
// Uppdaterade med 'unit' för att automatiskt trigga mätvärdesfälten i InspectionScreen

const TNC_TEMPLATE = [
  { id: 'tnc_1', section: '1. Okulär kontroll', label: 'Kablage & Isolering', desc: 'Ingen klämrisk mot plåt/skarpa kanter. Isolering oskadad.', unit: '' },
  { id: 'tnc_2', section: '1. Okulär kontroll', label: 'PEN / N / PE anslutning', desc: 'Ljusblå till N, G/G till PE. (Undantag N-ledare via JFB).', unit: '' },
  { id: 'tnc_3', section: '1. Okulär kontroll', label: 'Avskalning & Area', desc: 'Korrekt avskalning. Area matchar överströmsskydd.', unit: '' },
  { id: 'tnc_4', section: '1. Okulär kontroll', label: 'Dokumentation & Märkning', desc: 'Projektförteckning/schema finns. Centralmärkning utförd.', unit: '' },
  { id: 'tnc_5', section: '1. Okulär kontroll', label: 'Jordfelsbrytare Info', desc: 'Instruktion + skiss för JFB-skydd finns uppsatt.', unit: '' },
  { id: 'tnc_6', section: '1. Okulär kontroll', label: 'Moment & IP-klass', desc: 'Momentdraget. Kapsling tät (min IP20/IP21).', unit: '' },
  { id: 'tnc_m1', section: '2. Mätning (Löst)', label: 'Kontinuitet & Utjämning', desc: 'Skyddsutjämning OK (vatten, avlopp, vent etc).', unit: '' },
  { id: 'tnc_m2', section: '2. Mätning (Löst)', label: 'Isolationsmätning', desc: 'Minst 0.5 MΩ vid 500V mellan faser/jord.', unit: 'MegaOhm' },
  { id: 'tnc_s1', section: '3. Kontroll (Satt)', label: 'Huvudbrytare & JFB-test', desc: 'Funktionstest av brytare och JFB via testknapp.', unit: '' },
  { id: 'tnc_s2', section: '3. Kontroll (Satt)', label: 'JFB Utlösningstid/ström', desc: 'Uppmätt tid (max 300ms) och ström (mA).', unit: 'mA' },
  { id: 'tnc_s3', section: '3. Kontroll (Satt)', label: 'Spänningskontroll 230V', desc: 'Uttag har 230V. Fas/Nolla ej förväxlade (ej 400V).', unit: '' },
  { id: 'tnc_s4', section: '3. Kontroll (Satt)', label: 'Fasföljd & Rotation', desc: 'Rätt rotationsriktning på 3-fas utrustning.', unit: '' },
  { id: 'tnc_s5', section: '3. Kontroll (Satt)', label: 'Förimpedans (Zför)', desc: 'Notera uppmätt eller beräknat värde.', unit: 'Ohm' },
];

const TNS_TEMPLATE = [
  { id: 'tns_1', section: '1. Okulär kontroll', label: 'Kablage & Isolering', desc: 'Ingen klämrisk mot plåt/skarpa kanter. Isolering oskadad.', unit: '' },
  { id: 'tns_2', section: '1. Okulär kontroll', label: 'Separation N & PE', desc: 'Blå till N, G/G till PE. Ingen bygling i central.', unit: '' },
  { id: 'tns_3', section: '1. Okulär kontroll', label: 'Avskalning & Area', desc: 'Korrekt avskalning. Area matchar överströmsskydd.', unit: '' },
  { id: 'tns_4', section: '1. Okulär kontroll', label: 'Dokumentation & Märkning', desc: 'Projektförteckning/schema finns. Centralmärkning utförd.', unit: '' },
  { id: 'tns_5', section: '1. Okulär kontroll', label: 'Jordfelsbrytare Info', desc: 'Instruktion + skiss för JFB-skydd finns uppsatt.', unit: '' },
  { id: 'tns_6', section: '1. Okulär kontroll', label: 'Moment & IP-klass', desc: 'Momentdraget. Kapsling tät (min IP20/IP21).', unit: '' },
  { id: 'tns_m1', section: '2. Mätning (Löst)', label: 'Kontinuitet & Utjämning', desc: 'Skyddsutjämning OK (vatten, avlopp, vent etc).', unit: '' },
  { id: 'tns_m2', section: '2. Mätning (Löst)', label: 'N-PE Separationstest', desc: 'Ingen kontakt N-PE (mäts med frånslagen JFB).', unit: '' },
  { id: 'tns_m3', section: '2. Mätning (Löst)', label: 'Isolationsmätning', desc: 'Minst 0.5 MΩ vid 500V mellan faser/jord.', unit: 'MegaOhm' },
  { id: 'tns_s1', section: '3. Kontroll (Satt)', label: 'Huvudbrytare & JFB-test', desc: 'Funktionstest av brytare och JFB via testknapp.', unit: '' },
  { id: 'tns_s2', section: '3. Kontroll (Satt)', label: 'JFB Utlösningstid/ström', desc: 'Uppmätt tid (max 300ms) och ström (mA).', unit: 'mA' },
  { id: 'tns_s3', section: '3. Kontroll (Satt)', label: 'Spänningskontroll 230V', desc: 'Uttag har 230V. Fas/Nolla ej förväxlade (ej 400V).', unit: '' },
  { id: 'tns_s4', section: '3. Kontroll (Satt)', label: 'Fasföljd & Rotation', desc: 'Rätt rotationsriktning på 3-fas utrustning.', unit: '' },
  { id: 'tns_s5', section: '3. Kontroll (Satt)', label: 'Förimpedans (Zför)', desc: 'Notera uppmätt eller beräknat värde.', unit: 'Ohm' },
];

export default function ProtocolsHubScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { project } = route.params || {};
  const { companyId } = React.useContext(CompanyContext);
  const { companyData } = React.useContext(ProjectsContext);
  const [profession, setProfession] = useState("");
  const [loading, setLoading] = useState(true);
  const [generatingIntyg, setGeneratingIntyg] = useState(false);

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

  // 2. LOGIK FÖR ATT VISA RÄTT KNAPPAR (stöd för flera yrken: "El, VVS" osv.)
  const professionKeys = getProfessionKeys(profession);
  const isEl = professionKeys.includes("el");
  const isBygg = professionKeys.includes("bygg");
  const isRormokare = professionKeys.includes("vvs");
  const current = profession ? profession.toLowerCase() : "";

  // Funktion för att starta ett protokoll med en specifik mall
  const startProtocol = (title, templateItems) => {
    navigation.navigate("InspectionScreen", {
      customTitle: title,
      customTemplate: templateItems,
      isNewProtocol: true,
      project 
    });
  };

  const ProtocolCard = ({ title, sub, icon, color, onPress, disabled }) => (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: theme.colors.surface, opacity: disabled ? 0.6 : 1 }]} 
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
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View>;

  // Formatera projektnamnet med stor begynnelsebokstav ifall det saknas
  const projectName = formatProjectName(project?.name, "Välj protokoll");

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <AppHeader 
        title="KONTROLLER" 
        subTitle={projectName} 
        navigation={navigation} 
      />
      
      <ScrollView 
        contentContainerStyle={{ 
          padding: theme.spacing.medium,
          paddingBottom: insets.bottom + 20 
        }}
      >
        <Text style={styles.sectionLabel}>TILLGÄNGLIGA KONTROLLER</Text>
        
        {/* --- EL: Allmän / Golvvärme egenkontroll --- */}
        {isEl && (
          <ProtocolCard 
            title="EGENKONTROLL" 
            sub="Allmän eller Golvvärme-mall & foton" 
            icon="checkmark-done-circle" 
            color={theme.colors.success} 
            onPress={() => navigation.navigate("InspectionScreen", { project })} 
          />
        )}

        {/* --- KONTROLL FÖR El --- */}
        {isEl && (
          <>
            <ProtocolCard 
              title="PROJEKTSCHEMA" 
              sub="Skapa förteckning" 
              icon="grid" 
              color={theme.colors.primary} 
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

        {/* --- KONTROLL FÖR Bygg (Snickeri & Stomme, AMA/BKR/GVK) --- */}
        {isBygg && (
          <ProtocolCard
            title="KVALITETSDOKUMENT BYGG"
            sub="Stomme, klimatskärm, våtrum, brand/ljud, slutfinish – AMA/BKR/GVK"
            icon="hammer"
            color="#FF5722"
            onPress={() => startProtocol("KVALITETSDOKUMENT BYGG", BYGG_EGENKONTROLL_ITEMS)}
          />
        )}

        {/* --- VVS / Rör (visas endast för användare med VVS/rör som yrke) --- */}
        {isRormokare && (
          <>
            <ProtocolCard
              title="SMART EGENKONTROLL"
              sub="VVS-checklista med fotostöd & geotagging"
              icon="checkmark-done-circle"
              color="#03A9F4"
              onPress={() => navigation.navigate("SmartEgenkontroll", { project })}
            />
            <ProtocolCard
              title="TRYCKPROVNING"
              sub="Tryck- och täthetsprov, signatur"
              icon="water"
              color="#03A9F4"
              onPress={() => navigation.navigate("PressureTest", { project })}
            />

            <ProtocolCard
              title="SKANNA PRODUKT (EAN)"
              sub="Streckkoder på blandare, värmepumpar – bygg DU-instruktion"
              icon="barcode"
              color="#607D8B"
              onPress={() => navigation.navigate("BarcodeScan", { project })}
            />
            <ProtocolCard
              title="RELATIONSRITNING"
              sub="Ladda upp planritning och rita in var rören hamnade"
              icon="git-branch"
              color="#795548"
              onPress={() => navigation.navigate("Relationsritning", { project })}
            />
            <ProtocolCard
              title="SÄKER VATTEN-INTYG"
              sub={generatingIntyg ? "Skapar PDF..." : "PDF-intyg från egenkontroll & tryckprov"}
              icon="document-text"
              color="#0277BD"
              onPress={async () => {
                if (generatingIntyg) return;
                if (!companyId || !project?.id) {
                  Alert.alert("Fel", "Projekt eller företag saknas.");
                  return;
                }
                setGeneratingIntyg(true);
                try {
                  await generateAndShareSakerVattenIntyg(companyId, project.id, project, companyData);
                } catch (e) {
                  Alert.alert(
                    "Kunde inte skapa intyg",
                    e?.message || "Kontrollera att du gjort en Smart egenkontroll för detta projekt."
                  );
                } finally {
                  setGeneratingIntyg(false);
                }
              }}
              disabled={generatingIntyg}
            />
          </>
        )}

        {/* Avvikelse (Varningen) – för El, Bygg och VVS */}
        {(isEl || isBygg || isRormokare) && (
          <ProtocolCard
            title="AVVIKELSE (VARNINGEN)"
            sub="Dokumentera när annan yrkesgrupp hindrar branschreglerna – juridiskt skydd"
            icon="warning"
            color="#FF9800"
            onPress={() => navigation.navigate("Varning", { project })}
          />
        )}

        <View style={styles.divider} />
        
        <ProtocolCard 
          title="ARKIV" 
          sub="Tidigare historik" 
          icon="archive" 
          color={theme.colors.textSecondary} 
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