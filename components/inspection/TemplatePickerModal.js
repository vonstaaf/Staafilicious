import React from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WorkaholicTheme } from "../../theme";

export default function TemplatePickerModal({ visible, onSelectTemplate, onCancel }) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.namingCard}>
          <Text style={styles.namingTitle}>Välj typ av kontroll</Text>
          <Text style={styles.infoText}>Vilken master-mall vill du använda för detta projekt?</Text>

          <TouchableOpacity style={styles.templatePickerBtn} onPress={() => onSelectTemplate("general")}>
            <View style={styles.templateIcon}>
              <Ionicons name="document-text" size={24} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.templateTitle}>Allmän kontroll</Text>
              <Text style={styles.templateSub}>Standardpunkter enligt SS 436 40 00</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.templatePickerBtn, { marginTop: 15 }]} onPress={() => onSelectTemplate("heating")}>
            <View style={[styles.templateIcon, { backgroundColor: "#FF9500" }]}>
              <Ionicons name="flame" size={24} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.templateTitle}>Golvvärme</Text>
              <Text style={styles.templateSub}>Specifik kontroll för värmekablar</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnText}>AVBRYT</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 25 },
  namingCard: { backgroundColor: "#FFF", borderRadius: 30, padding: 30, elevation: 15 },
  namingTitle: { fontSize: 20, fontWeight: "900", marginBottom: 25, textAlign: "center", color: "#1C1C1E" },
  infoText: { fontSize: 13, color: "#8E8E93", textAlign: "center", marginBottom: 25, fontWeight: "600" },
  templatePickerBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8F9FB", padding: 15, borderRadius: 18, borderWidth: 1, borderColor: "#EEE" },
  templateIcon: { width: 45, height: 45, backgroundColor: WorkaholicTheme.colors.primary, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 15 },
  templateTitle: { fontSize: 15, fontWeight: "900", color: "#1C1C1E" },
  templateSub: { fontSize: 11, color: "#8E8E93", fontWeight: "600" },
  cancelBtn: { marginTop: 30, padding: 10, alignItems: "center" },
  cancelBtnText: { color: "#8E8E93", fontWeight: "800" },
});
