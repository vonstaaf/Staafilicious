import React from "react";
import { View, Text, TextInput, Modal, TouchableOpacity, StyleSheet } from "react-native";
import { WorkaholicTheme } from "../../theme";

export default function NameEntryModal({
  visible,
  inspectionSubtitle,
  setInspectionSubtitle,
  nameClarification,
  setNameClarification,
  onCancel,
  onConfirm,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.namingCard}>
          <Text style={styles.namingTitle}>Slutför Protokoll</Text>
          <TextInput
            style={styles.namingInput}
            value={inspectionSubtitle}
            onChangeText={setInspectionSubtitle}
            placeholder="Protokollets namn"
            autoFocus
            placeholderTextColor="#BBB"
          />
          <TextInput
            style={[styles.namingInput, { marginTop: 15 }]}
            value={nameClarification}
            onChangeText={setNameClarification}
            placeholder="Ditt namn"
            placeholderTextColor="#BBB"
          />
          <View style={styles.namingActions}>
            <TouchableOpacity style={styles.namingCancel} onPress={onCancel}>
              <Text style={styles.namingCancelText}>Tillbaka</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.namingConfirm} onPress={onConfirm}>
              <Text style={styles.namingConfirmText}>Gå till signering</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 25 },
  namingCard: { backgroundColor: "#FFF", borderRadius: 30, padding: 30, elevation: 15 },
  namingTitle: { fontSize: 20, fontWeight: "900", marginBottom: 25, textAlign: "center", color: "#1C1C1E" },
  namingInput: { backgroundColor: "#F5F5F7", padding: 18, borderRadius: 18, fontSize: 15, fontWeight: "700", color: "#333" },
  namingActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 30, gap: 15 },
  namingCancel: { flex: 1, padding: 15, alignItems: "center" },
  namingConfirm: { flex: 2, backgroundColor: WorkaholicTheme.colors.primary, padding: 15, borderRadius: 15, alignItems: "center" },
  namingCancelText: { color: "#8E8E93", fontWeight: "800" },
  namingConfirmText: { color: "#FFF", fontWeight: "900" },
});
