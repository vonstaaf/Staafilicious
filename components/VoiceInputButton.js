import React, { useState, useRef, useCallback } from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WorkaholicTheme } from "../theme";

let SpeechRecognition = null;
try {
  SpeechRecognition = require("expo-speech-recognition").default;
} catch (_) {}

function VoiceInputButtonInner({ onResult, disabled, style }) {
  const [listening, setListening] = useState(false);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const stopListening = useCallback(() => {
    try {
      SpeechRecognition.stop();
    } catch (_) {}
    setListening(false);
  }, []);

  SpeechRecognition.useSpeechRecognitionEvent("result", (event) => {
    const transcript = event?.results?.[0]?.transcript ?? event?.transcript ?? "";
    const text = (typeof transcript === "string" ? transcript : "").trim();
    if (text) {
      onResultRef.current?.(text);
      stopListening();
    }
  });
  SpeechRecognition.useSpeechRecognitionEvent("end", () => setListening(false));

  const handlePress = useCallback(async () => {
    if (disabled || listening) return;
    try {
      const perm = await SpeechRecognition.requestPermissionsAsync?.();
      const granted = perm?.granted ?? perm?.status === "granted";
      if (!granted) {
        Alert.alert("Mikrofon", "Aktivera mikrofon för röstinmatning.");
        return;
      }
      setListening(true);
      await SpeechRecognition.start?.({ lang: "sv-SE", interimResults: true });
      setTimeout(stopListening, 12000);
    } catch (e) {
      setListening(false);
      Alert.alert(
        "Röst",
        e?.message?.includes("not available") || e?.code === "UNSUPPORTED"
          ? "Röst kräver development build (ej Expo Go). Använd tangentbordet."
          : (e?.message || "Kunde inte starta taligenkänning.")
      );
    }
  }, [disabled, listening, stopListening]);

  return (
    <TouchableOpacity
      style={[styles.btn, style, listening && styles.btnActive]}
      onPress={handlePress}
      disabled={disabled}
    >
      {listening ? (
        <ActivityIndicator size="small" color={WorkaholicTheme.colors.primary} />
      ) : (
        <Ionicons name="mic" size={22} color={WorkaholicTheme.colors.primary} />
      )}
      <Text style={styles.label}>{listening ? "Lyssnar…" : "Tala in"}</Text>
    </TouchableOpacity>
  );
}

/**
 * Röst-till-text: visar knapp som startar taligenkänning och skickar text till onResult.
 * Renderas inte om expo-speech-recognition saknas (t.ex. inte installerat eller Expo Go).
 */
export default function VoiceInputButton(props) {
  if (!SpeechRecognition?.useSpeechRecognitionEvent) return null;
  return <VoiceInputButtonInner {...props} />;
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: WorkaholicTheme.colors.primary,
    backgroundColor: "#FFF",
  },
  btnActive: { backgroundColor: "#F0E6FF" },
  label: { fontSize: 12, fontWeight: "700", color: WorkaholicTheme.colors.primary },
});
