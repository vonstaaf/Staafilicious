import React, { useState, useEffect, useContext } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, StatusBar, Modal, Alert, ActivityIndicator 
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from '../components/AppHeader';
import { WorkaholicTheme } from '../theme';
import { ProjectsContext } from '../context/ProjectsContext';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function CableScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { projects } = useContext(ProjectsContext);
  
  const [phases, setPhases] = useState(1);
  const [fuse, setFuse] = useState(10);
  const [area, setArea] = useState(1.5);
  const [length, setLength] = useState(10);
  const [char, setChar] = useState('C');
  const [env, setEnv] = useState('open'); 
  const [cableType, setCableType] = useState('EXQ');
  
  const [result, setResult] = useState({ status: 'ok', msg: '', vDrop: 0 });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const FUSES = [6, 10, 13, 16, 20, 25, 32, 40, 50, 63];
  const AREAS = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50];
  const CABLE_TYPES = [
    { id: 'EXQ', temp: 90 }, { id: 'EXLQ', temp: 90 }, { id: 'EQLQ', temp: 90 },
    { id: 'FQ', temp: 70 }, { id: 'N1XV', temp: 90 }, { id: 'ACEFLEX', temp: 90 }, { id: 'FXQJ', temp: 90 },
  ];

  useEffect(() => { calculate(); }, [phases, fuse, area, length, char, env, cableType]);

  const calculate = () => {
    const rho = 0.018; 
    const tempFactor = 1.2; 
    const isPEX = CABLE_TYPES.find(c => c.id === cableType)?.temp === 90;

    const currentLimits = {
      1.5: { wall: isPEX ? 15 : 13.5,  open: isPEX ? 22 : 19.5 },
      2.5: { wall: isPEX ? 20 : 18.5,  open: isPEX ? 30 : 26 },
      4:   { wall: isPEX ? 27 : 24,    open: isPEX ? 40 : 35 },
      6:   { wall: isPEX ? 34 : 31,    open: isPEX ? 51 : 46 },
      10:  { wall: isPEX ? 47 : 42,    open: isPEX ? 69 : 63 },
      16:  { wall: isPEX ? 62 : 56,    open: isPEX ? 91 : 85 },
      25:  { wall: isPEX ? 82 : 74,    open: isPEX ? 119 : 112 },
      35:  { wall: isPEX ? 101 : 92,   open: isPEX ? 146 : 138 },
      50:  { wall: isPEX ? 122 : 111,  open: isPEX ? 175 : 168 }
    };

    const Iz = currentLimits[area][env];
    const fuseStandardMax = { 1.5: 13, 2.5: 16, 4: 20, 6: 25, 10: 35, 16: 63 };

    if (fuse > fuseStandardMax[area]) {
      setResult({ status: 'danger', msg: `EJ TILLÅTET!\n${area}mm² bör ej avsäkras med ${fuse}A enligt svensk standard.`, vDrop: '-' });
      return;
    }

    if (fuse > Iz) {
      setResult({ status: 'danger', msg: `VARNING: BRANDRISK!\n${cableType} tål max ${Iz}A vid detta förläggningssätt.`, vDrop: '-' });
      return;
    }

    const triggerFactor = char === 'B' ? 5 : 10;
    const maxZ = 230 / (triggerFactor * fuse);
    let cableRes = phases === 1 ? (2 * length * rho * tempFactor) / area : (length * rho * tempFactor) / area;
    let vDropPercent = phases === 1 ? ((2 * length * fuse * rho) / area / 230) * 100 : ((Math.sqrt(3) * length * fuse * rho) / area / 400) * 100;

    if (cableRes > maxZ) {
      setResult({ status: 'danger', msg: `UTLÖSNINGSVILLKOR EJ UPPFYLLT!\nKabeln är för lång för att säkringen ska lösa ut snabbt.`, vDrop: vDropPercent.toFixed(1) });
    } else if (vDropPercent > 4) {
      setResult({ status: 'warning', msg: `HÖGT SPÄNNINGSFALL (${vDropPercent.toFixed(1)}%)\nÖverskrider SS 436 40 00 krav på max 4%.`, vDrop: vDropPercent.toFixed(1) });
    } else {
      const is13Aon15 = area === 1.5 && fuse === 13;
      setResult({ 
        status: is13Aon15 ? 'warning' : 'ok', 
        msg: is13Aon15 
          ? 'GODKÄND (13A på 1.5mm²)\nKräver låg förimpedans och god kylning.' 
          : 'GODKÄND INSTALLATION\nDimensionerad enligt SS 436 40 00.', 
        vDrop: vDropPercent.toFixed(1) 
      });
    }
  };

  const saveToProject = async (project) => {
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'projects', project.id, 'protocols'), {
        type: 'Kabelberäkning', kabel: cableType, fuse: `${fuse}A ${char}`, area: `${area}mm²`, langd: `${length}m`, vDrop: `${result.vDrop}%`, timestamp: serverTimestamp(),
      });
      Alert.alert("Sparat!", `Arkiverad i projektet: ${project.name}`);
      setIsModalVisible(false);
    } catch (e) { Alert.alert("Fel", "Kunde inte spara."); }
    finally { setIsSaving(false); }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AppHeader title="KABELGUIDEN PRO" subTitle="Fast installation AC" navigation={navigation} />

      {/* 1. FAST TOP-DEL (Resultat & Längd) */}
      <View style={styles.topFixedSection}>
        <View style={[styles.resultCard, { borderColor: getStatusColor(result.status) }]}>
          <Text style={[styles.resultMsg, { color: result.status === 'danger' ? '#FF3B30' : '#1C1C1E' }]}>{result.msg}</Text>
          <View style={styles.resultStats}>
            <Text style={styles.statLabel}>SPÄNNINGSFALL: <Text style={styles.statValue}>{result.vDrop}%</Text></Text>
            <Text style={styles.statLabel}>GRÄNS: <Text style={styles.statValue}>4%</Text></Text>
          </View>
        </View>

        <View style={styles.lengthControlBox}>
          <View style={styles.lengthRow}>
            <TextInput style={styles.lengthInput} keyboardType="numeric" value={String(length)} onChangeText={t => setLength(parseInt(t) || 0)} maxLength={3} />
            <Text style={styles.meterLabel}>meter</Text>
          </View>
          <Slider style={{width: '90%', height: 40, alignSelf: 'center'}} minimumValue={1} maximumValue={100} step={1} value={length} onValueChange={setLength} minimumTrackTintColor={WorkaholicTheme.colors.primary} thumbTintColor={WorkaholicTheme.colors.primary} />
        </View>
      </View>

      {/* 2. RULLBAR DEL (Övriga val) */}
      <ScrollView 
        style={styles.mainWrapper} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.label}>SÄKRINGSSTORLEK</Text>
          <View style={styles.grid}>{FUSES.map(f => <Btn key={f} label={`${f}A`} active={fuse === f} onPress={() => setFuse(f)} />)}</View>

          <Text style={styles.label}>KABELAREA (mm²)</Text>
          <View style={styles.grid}>{AREAS.map(a => <Btn key={a} label={a} active={area === a} onPress={() => setArea(a)} />)}</View>

          <Text style={styles.label}>KABELTYP</Text>
          <View style={styles.grid}>
            {CABLE_TYPES.map(c => (
              <TouchableOpacity key={c.id} style={[styles.smallBtn, cableType === c.id && styles.btnActive]} onPress={() => setCableType(c.id)}>
                <Text style={[styles.smallBtnText, cableType === c.id && styles.btnTextActive]}>{c.id}</Text>
                <Text style={[styles.tempText, cableType === c.id && {color: '#EEE'}]}>{c.temp}°C</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1.2 }}><Text style={styles.label}>SYSTEM</Text>
              <View style={styles.toggleRow}>
                <ToggleBtn label="230V" active={phases === 1} onPress={() => setPhases(1)} />
                <ToggleBtn label="400V" active={phases === 3} onPress={() => setPhases(3)} />
              </View>
            </View>
            <View style={{ flex: 0.8, marginLeft: 15 }}><Text style={styles.label}>KARAKTÄR</Text>
              <View style={styles.toggleRow}>
                <ToggleBtn label="B" active={char === 'B'} onPress={() => setChar('B')} />
                <ToggleBtn label="C" active={char === 'C'} onPress={() => setChar('C')} />
              </View>
            </View>
          </View>

          <Text style={styles.label}>MILJÖ / FÖRLÄGGNING</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity style={[styles.envBtn, env === 'wall' && styles.envBtnActive]} onPress={() => setEnv('wall')}>
              <Ionicons name="home" size={18} color={env === 'wall' ? "#FFF" : "#666"} />
              <Text style={[styles.envBtnText, env === 'wall' && styles.envBtnTextActive]}>I VÄGG</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.envBtn, env === 'open' && styles.envBtnActive]} onPress={() => setEnv('open')}>
              <Ionicons name="reorder-four" size={18} color={env === 'open' ? "#FFF" : "#666"} />
              <Text style={[styles.envBtnText, env === 'open' && styles.envBtnTextActive]}>UTANPÅ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* 3. SKYDDAD BOTTENYTA (Sticky Footer) */}
      <View style={[styles.stickyFooter, { paddingBottom: insets.bottom + 15 }]}>
        <TouchableOpacity 
          style={[styles.mainActionBtn, result.status === 'danger' && styles.btnDisabled]} 
          onPress={() => setIsModalVisible(true)}
          disabled={result.status === 'danger'}
        >
          <Ionicons name="shield-checkmark" size={20} color="#FFF" />
          <Text style={styles.mainActionText}>ARKIVERA BERÄKNING</Text>
        </TouchableOpacity>
      </View>

      {/* PROJEKTMODAL */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.modalTitle}>Välj projekt</Text>
            <ScrollView>{projects.map(p => (
              <TouchableOpacity key={p.id} style={styles.projectItem} onPress={() => saveToProject(p)}>
                <Text style={styles.projectItemText}>{p.name}</Text>
                <Ionicons name="chevron-forward" size={18} color="#CCC" />
              </TouchableOpacity>
            ))}
            </ScrollView>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsModalVisible(false)}>
              <Text style={styles.cancelText}>AVBRYT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// HJÄLPKOMPONENTER
const ToggleBtn = ({ label, active, onPress }) => (
  <TouchableOpacity style={[styles.phaseBtn, active && styles.phaseBtnActive, {flex: 1}]} onPress={onPress}>
    <Text style={[styles.phaseBtnText, active && styles.phaseBtnTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const Btn = ({ label, active, onPress }) => (
  <TouchableOpacity style={[styles.btn, active && styles.btnActive]} onPress={onPress}>
    <Text style={[styles.btnText, active && styles.btnTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const getStatusColor = (s) => s === 'danger' ? '#FF3B30' : s === 'warning' ? '#FFCC00' : '#34C759';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  
  // Topp-del som inte rör sig
  topFixedSection: { backgroundColor: '#F2F4F7', zIndex: 10, borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
  resultCard: { backgroundColor: '#FFF', margin: 15, marginBottom: 10, padding: 18, borderRadius: 20, borderLeftWidth: 8, elevation: 4 },
  resultMsg: { fontSize: 15, fontWeight: '900', lineHeight: 20, marginBottom: 10 },
  resultStats: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 8 },
  statLabel: { fontSize: 10, color: '#999', fontWeight: 'bold' },
  statValue: { color: '#333', fontSize: 12, fontWeight: 'bold' },
  lengthControlBox: { paddingBottom: 10 },
  lengthRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' },
  lengthInput: { fontSize: 40, fontWeight: '900', color: '#1C1C1E', textAlign: 'center', minWidth: 80 },
  meterLabel: { fontSize: 16, fontWeight: '600', color: '#8E8E93', marginLeft: 8 },

  // Rullbar del
  mainWrapper: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  content: { paddingHorizontal: 20 },

  // Botten-del som är fast (Sticky)
  stickyFooter: { 
    backgroundColor: '#FFF', 
    padding: 15, 
    borderTopWidth: 1, 
    borderTopColor: '#EEE',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20
  },
  mainActionBtn: { 
    backgroundColor: WorkaholicTheme.colors.primary, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 16, 
    borderRadius: 15,
    gap: 10
  },
  mainActionText: { color: '#FFF', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  btnDisabled: { backgroundColor: '#CCC' },

  label: { fontSize: 10, fontWeight: '900', color: '#8E8E93', marginBottom: 8, marginTop: 15, letterSpacing: 1 },
  toggleRow: { flexDirection: 'row', gap: 8 },
  row: { flexDirection: 'row' },
  phaseBtn: { padding: 12, backgroundColor: '#FFF', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#DDD' },
  phaseBtnActive: { backgroundColor: '#1C1C1E', borderColor: '#1C1C1E' },
  phaseBtnText: { fontSize: 11, fontWeight: 'bold', color: '#666' },
  phaseBtnTextActive: { color: '#FFF' },
  envBtn: { flex: 1, padding: 12, backgroundColor: '#FFF', borderRadius: 15, alignItems: 'center', borderWidth: 1.5, borderColor: '#DDD' },
  envBtnActive: { backgroundColor: '#333', borderColor: '#333' },
  envBtnText: { fontSize: 10, fontWeight: '900', color: '#333', marginTop: 4 },
  envBtnTextActive: { color: '#FFF' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  btn: { paddingVertical: 10, paddingHorizontal: 10, backgroundColor: '#FFF', borderRadius: 11, borderWidth: 1.5, borderColor: '#DDD', minWidth: 55, alignItems: 'center' },
  smallBtn: { paddingVertical: 8, paddingHorizontal: 8, backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1.5, borderColor: '#DDD', minWidth: 70, alignItems: 'center' },
  smallBtnText: { fontSize: 11, fontWeight: '800', color: '#333' },
  tempText: { fontSize: 8, color: '#AAA', fontWeight: 'bold' },
  btnActive: { backgroundColor: WorkaholicTheme.colors.primary, borderColor: WorkaholicTheme.colors.primary },
  btnText: { fontSize: 14, fontWeight: '800', color: '#333' },
  btnTextActive: { color: '#FFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 25, padding: 25, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '900', color: WorkaholicTheme.colors.primary, marginBottom: 15 },
  projectItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  projectItemText: { fontSize: 16, fontWeight: '600', color: '#333' },
  cancelBtn: { marginTop: 15, padding: 10, alignItems: 'center' },
  cancelText: { fontWeight: '900', color: '#FF3B30', fontSize: 14 }
});