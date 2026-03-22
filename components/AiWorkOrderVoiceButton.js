import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  TouchableOpacity,
  StyleSheet,
  View,
  Animated,
  Alert,
  Text,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

let ExpoSpeechRecognitionModule = null;
let useSpeechRecognitionEvent = null;
try {
  const sr = require("expo-speech-recognition");
  ExpoSpeechRecognitionModule = sr.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = sr.useSpeechRecognitionEvent;
} catch (_) {}

/**
 * Större röstknapp för AI-arbetsordern: rund mikrofonsymbol som lyssnar,
 * visar text i realtid och kan trigga auto-analys.
 * Returnerar null om röst inte stöds (Expo Go etc).
 */
function AiWorkOrderVoiceButtonInner({
  onTranscript,
  onListeningChange,
  onSpeechEnd,
  disabled,
  primaryColor = "#2563EB",
  style,
}) {
  const [listening, setListening] = useState(false);
  const [available, setAvailable] = useState(null);
  const confirmedRef = useRef("");
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    try {
      const ok = ExpoSpeechRecognitionModule?.isRecognitionAvailable?.();
      setAvailable(Boolean(ok));
    } catch {
      setAvailable(false);
    }
  }, []);

  useSpeechRecognitionEvent("result", (event) => {
    const results = event?.results || [];
    const first = results[0];
    const transcript = (first?.transcript ?? "").trim();
    if (!transcript) return;

    if (event.isFinal) {
      const newConfirmed =
        confirmedRef.current + (confirmedRef.current ? " " : "") + transcript;
      confirmedRef.current = newConfirmed;
      onTranscript?.(newConfirmed);
    } else {
      const combined =
        confirmedRef.current + (confirmedRef.current ? " " : "") + transcript;
      onTranscript?.(combined);
    }
  });

  useSpeechRecognitionEvent("end", () => {
    const finalText = confirmedRef.current;
    setListening(false);
    onListeningChange?.(false);
    onSpeechEnd?.(finalText);
    confirmedRef.current = "";
  });

  useSpeechRecognitionEvent("error", (event) => {
    setListening(false);
    onListeningChange?.(false);
    confirmedRef.current = "";
    if (event?.error === "not-allowed") {
      Alert.alert("Mikrofon", "Aktivera mikrofon för röstinmatning.");
    } else if (event?.error !== "no-speech" && event?.error !== "aborted") {
      Alert.alert(
        "Röst",
        event?.message ||
          (event?.error === "service-not-allowed" || event?.error === "language-not-supported"
            ? "Röst kräver development build (ej Expo Go). Använd tangentbordet."
            : "Kunde inte starta taligenkänning.")
      );
    }
  });

  useEffect(() => {
    if (listening) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.96,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [listening, pulseAnim]);

  const startListening = useCallback(async () => {
    if (disabled || listening || available === false) return;
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync?.();
      const granted = perm?.granted ?? perm?.status === "granted";
      if (!granted) {
        Alert.alert("Mikrofon", "Aktivera mikrofon för röstinmatning.");
        return;
      }
      confirmedRef.current = "";
      setListening(true);
      onListeningChange?.(true);
      await ExpoSpeechRecognitionModule.start?.({
        lang: "sv-SE",
        interimResults: true,
        continuous: false,
        contextualStrings: [
          "timmar",
          "timme",
          "meter",
          "kabel",
          "uttag",
          "dubbeluttag",
          "FK-kabel",
          "monterat",
          "dragit",
          "material",
          "st",
          "stycken",
        ],
      });
    } catch (e) {
      setListening(false);
      onListeningChange?.(false);
      Alert.alert(
        "Röst",
        e?.message?.includes("not available") || e?.code === "UNSUPPORTED"
          ? "Röst kräver development build (ej Expo Go). Använd tangentbordet."
          : (e?.message || "Kunde inte starta taligenkänning.")
      );
    }
  }, [disabled, listening, available, onListeningChange]);

  const stopListening = useCallback(() => {
    if (!listening) return;
    try {
      ExpoSpeechRecognitionModule.stop?.();
    } catch {}
  }, [listening]);

  const handlePress = useCallback(() => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  }, [listening, startListening, stopListening]);

  if (available === false) return null;

  const btnBg = listening ? "#E53935" : primaryColor;
  const btnStyle = [
    styles.btn,
    { backgroundColor: btnBg },
    disabled && styles.btnDisabled,
    style,
  ];

  return (
    <TouchableOpacity
      style={styles.wrapper}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          btnStyle,
          listening && {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <View style={styles.inner}>
          <Ionicons
            name="mic"
            size={36}
            color="#FFF"
          />
          {listening && (
            <View style={styles.recordingDot} />
          )}
        </View>
      </Animated.View>
      {listening && (
        <View style={styles.label}>
          <View style={styles.labelPulse} />
          <Text style={styles.labelText}>Lyssnar… avslutas automatiskt</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  btn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  inner: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  recordingDot: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFF",
  },
  label: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  labelPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E53935",
  },
  labelText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#636366",
  },
});

export default function AiWorkOrderVoiceButton(props) {
  if (!ExpoSpeechRecognitionModule || !useSpeechRecognitionEvent) {
    return null;
  }
  return <AiWorkOrderVoiceButtonInner {...props} />;
}
