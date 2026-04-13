import React, { useRef } from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SignatureScreen from "react-native-signature-canvas";
import { WorkaholicTheme } from "../../theme";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const SIGNATURE_HEIGHT = Math.min(220, Math.max(200, Math.min(screenHeight, screenWidth) * 0.32));

const WEB_STYLE = `
  body, html { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; }
  .m-signature-pad { width: 100%; height: 100%; box-shadow: none; border: none; }
  .m-signature-pad--body { border: none; width: 100%; height: 100%; }
  .m-signature-pad--footer { display: none; }
  canvas { touch-action: none; width: 100% !important; height: 100% !important; }
`;

export default function SignModal({ visible, onClose, onSignature, onEmpty, title = "Signera kontroll", buttonText = "SLUTFÖR & ARKIVERA" }) {
  const signatureRef = useRef();

  const handleEmpty = () => {
    if (typeof onEmpty === "function") {
      onEmpty();
      return;
    }
    Alert.alert("Signatur saknas", "Rita med fingret innan du bekräftar.");
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close-circle" size={32} color="#1C1C1E" />
          </TouchableOpacity>
        </View>
        <View style={[styles.canvasWrap, { height: SIGNATURE_HEIGHT }]}>
          <SignatureScreen
            ref={signatureRef}
            onOK={onSignature}
            onEmpty={handleEmpty}
            descriptionText="Signera här"
            autoClear={false}
            imageType="image/png"
            penColor="#000000"
            backgroundColor="rgba(255,255,255,1)"
            style={styles.canvas}
            webStyle={WEB_STYLE}
          />
        </View>
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => signatureRef.current?.readSignature()}
          >
            <Text style={styles.btnText}>{buttonText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", padding: 25, alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#EEE" },
  modalTitle: { fontSize: 18, fontWeight: "900", color: "#1C1C1E" },
  canvasWrap: { width: "100%", backgroundColor: "#FFF" },
  canvas: { flex: 1, width: "100%", height: "100%" },
  footer: { padding: 20, paddingBottom: 40 },
  primaryBtn: { backgroundColor: WorkaholicTheme.colors.primary, padding: 18, borderRadius: 20, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "900", fontSize: 15, letterSpacing: 0.5 },
});
