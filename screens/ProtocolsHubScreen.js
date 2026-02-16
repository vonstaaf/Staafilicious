import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WorkaholicTheme } from "../theme";
import { auth, db } from "../firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";

export default function ProtocolsHubScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [profession, setProfession] = useState(""); 
  const [loading, setLoading] = useState(true);

  // 1. LYSSNA LIVE PÅ DATABASEN
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Lyssnar på ändringar i realtid
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

  // Matchar "Elektriker", "el", "El" osv.
  const isElektriker = current.includes("el"); 
  const isSnickare = current.includes("snickare") || current.includes("bygg");
  const isRormokare = current.includes("rör") || current.includes("vvs");

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
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      <ScrollView 
        contentContainerStyle={{ 
          padding: WorkaholicTheme.spacing.medium,
          paddingTop: insets.top - 40, 
          paddingBottom: insets.bottom + 20 
        }}
      >
        <Text style={[styles.headerTitle, { color: WorkaholicTheme.colors.primary }]}>KONTROLLER</Text>
        
        {/* --- ALLA SER DETTA --- */}
        <ProtocolCard 
          title="EGENKONTROLL" 
          sub="Digital kontroll & foton" 
          icon="checkmark-done-circle" 
          color={WorkaholicTheme.colors.success} 
          onPress={() => navigation.navigate("InspectionScreen")} 
        />

        {/* --- KONTROLL FÖR ELEKTRIKER --- */}
        {isElektriker && (
          <>
            <ProtocolCard 
              title="GRUPPSCHEMA" 
              sub="Skapa förteckning" 
              icon="grid" 
              color={WorkaholicTheme.colors.primary} 
              onPress={() => navigation.navigate("GroupSchedule")} 
            />
            <ProtocolCard 
              title="TN-C KONTROLL" 
              sub="Jordningsprotokoll" 
              icon="flash" 
              color="#FFB300" 
              disabled={true} 
            />
            <ProtocolCard 
              title="TN-S KONTROLL" 
              sub="5-ledarsystem" 
              icon="git-network" 
              color="#FFB300" 
              disabled={true} 
            />
          </>
        )}

        {/* --- KONTROLL FÖR SNICKARE --- */}
        {isSnickare && (
          <ProtocolCard 
            title="ANDRA VAL / MALLAR" 
            sub="Specifikt för Snickare" 
            icon="hammer" 
            color="#FF5722" 
            disabled={true} 
          />
        )}

        {/* --- KONTROLL FÖR RÖRMOKARE --- */}
        {isRormokare && (
          <ProtocolCard 
            title="ANDRA VAL / MALLAR" 
            sub="Specifikt för VVS" 
            icon="water" 
            color="#03A9F4" 
            disabled={true} 
          />
        )}

        <View style={styles.divider} />
        
        {/* --- ALLA SER DETTA --- */}
        <ProtocolCard 
          title="ARKIV" 
          sub="Tidigare historik" 
          icon="archive" 
          color={WorkaholicTheme.colors.textSecondary} 
          onPress={() => navigation.navigate("InspectionHistory")} 
        />
        
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WorkaholicTheme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...WorkaholicTheme.typography.title, marginVertical: 15 },
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