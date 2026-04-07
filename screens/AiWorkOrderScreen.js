import React, { useState, useCallback, useContext, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import AppHeader from "../components/AppHeader";
import AiWorkOrderVoiceButton from "../components/AiWorkOrderVoiceButton";
import AiWorkOrderErrorBoundary from "../components/AiWorkOrderErrorBoundary";
import { useTheme, useProfession } from "../context/ThemeContext";
import { CompanyContext } from "../context/CompanyContext";
import { useProjects } from "../context/ProjectsContext";
import { workaholicApiUrl } from "../constants/workaholicApi";
import { capitalizeFirst } from "../utils/stringHelpers";
import { parseAiWorkOrderPayload } from "../utils/aiWorkOrderParse";
import { logError } from "../utils/logger";

function getTodayDateSv() {
  return new Date().toLocaleDateString("sv-SE");
}

/** Första positiva talet från kandidater (Firestore kan lagra sträng/nummer). */
function firstPositiveNumber(...candidates) {
  for (const v of candidates) {
    if (v === undefined || v === null) continue;
    const n =
      typeof v === "number"
        ? v
        : parseFloat(String(v).replace(",", ".").trim());
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return null;
}

/**
 * Samma beräkning som KostnaderScreen.saveEntry:
 * baseTotal = timmar×timpris + bilar×bilkostnad, total = base × (1 + påslag%).
 */
function computeKostnadRowTotal(hours, hourPrice, cars, carCost, markupPercent) {
  const h = Math.max(0, Number(hours) || 0);
  const hp = Math.max(0, Number(hourPrice) || 0);
  const b = Math.max(0, Number(cars) || 0);
  const bc = Math.max(0, Number(carCost) || 0);
  const m = Math.max(0, Number(markupPercent) || 0);
  const baseTotal = h * hp + b * bc;
  return baseTotal * (1 + m / 100);
}

/** Timpris: företag först, sedan användare (users/{uid}). */
function resolveDefaultHourPrice(company, userData) {
  return firstPositiveNumber(
    company?.defaultHourPrice,
    company?.defaultHourlyRate,
    userData?.defaultHourPrice,
    userData?.defaultHourlyRate
  );
}

/** Påslag material % — samma tänk som ProductsScreen (default 25 om inget satt). Tillåter 0%. */
function resolveDefaultMaterialMarkupPercent(company, userData) {
  const candidates = [
    company?.defaultMaterialMarkup,
    company?.materialMarkupPercent,
    userData?.defaultMaterialMarkup,
    userData?.materialMarkupPercent,
  ];
  for (const v of candidates) {
    if (v === undefined || v === null) continue;
    const n =
      typeof v === "number"
        ? v
        : parseFloat(String(v).replace(",", ".").trim());
    if (!Number.isNaN(n) && n >= 0) return n;
  }
  return 25;
}

/** Samma fält som KostnaderScreen sparar (timmar → kostnadslogg). */
function buildKostnadRowFromAi({
  timeReported,
  rawText,
  notes,
  hourPrice,
  hasHourPrice,
}) {
  const h = Math.max(0, Number(timeReported) || 0);
  const hp = Math.max(0, Number(hourPrice) || 0);
  let desc = `AI-arbetsorder: ${capitalizeFirst((rawText || "").trim()).slice(0, 140)}${(rawText || "").length > 140 ? "…" : ""}`;
  const noteSuffix = notes && String(notes).trim() ? ` (${String(notes).trim().slice(0, 80)})` : "";
  if (!hasHourPrice && h > 0) {
    desc += " (OBS: Inget timpris satt i inställningar)";
  }
  const cars = 0;
  const carCost = 0;
  const markupPercent = 0;
  const total = computeKostnadRowTotal(h, hp, cars, carCost, markupPercent);
  return {
    date: getTodayDateSv(),
    description: `${desc}${noteSuffix}`,
    hours: h,
    hourPrice: hp,
    cars,
    carCost,
    markup: markupPercent,
    total,
  };
}

/** Samma form som ProductsScreen (material i projektet). */
function buildProductRowFromAi(m, materialMarkupPercent) {
  const q = Math.max(0.001, Number(m.quantity) || 1);
  const nameBase = (m.designation && String(m.designation).trim()) || "Artikel";
  const unit = m.unit && String(m.unit).trim() ? String(m.unit).trim() : "";
  const name = unit ? `${nameBase} (${unit})` : nameBase;
  const art = m.eNumber && String(m.eNumber).trim() ? String(m.eNumber).trim() : "-";
  const p = 0;
  const mPct = Math.max(0, Number(materialMarkupPercent) || 0);
  return {
    name,
    articleNumber: art,
    purchasePrice: p,
    markup: mPct,
    quantity: q,
    unitPriceOutExclVat: p * (1 + mPct / 100),
    imageUrl: null,
    brand: null,
  };
}

/** Läser HTTP-svar som JSON; korrupt body kastar kontrollerat (fångas i analyze). */
async function safeReadResponseJson(res) {
  const text = await res.text();
  if (!text || !text.trim()) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch (parseErr) {
    const err = new Error("Kunde inte tolka serverns svar (ogiltig JSON).");
    err.cause = parseErr;
    throw err;
  }
}

export default function AiWorkOrderScreen({ navigation, route }) {
  const theme = useTheme();
  const profession = useProfession();
  const { company } = useContext(CompanyContext);
  const { project: routeProject } = route.params || {};
  const { selectedProject, updateProject } = useProjects();

  const project =
    selectedProject?.id === routeProject?.id ? selectedProject : routeProject;

  const [rawText, setRawText] = useState("");
  const rawTextRef = useRef("");
  /** Endast ref-synk — ingen AI/anrop här, så setResult från analys kan inte starta en ny loop. */
  useEffect(() => {
    rawTextRef.current = rawText;
  }, [rawText]);

  const [analyzeBusy, setAnalyzeBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const analyzeSeqRef = useRef(0);
  /** Synkron spärr mot dubbeltryck innan React hunnit sätta analyzeBusy. */
  const analyzeInFlightRef = useRef(false);

  const analyze = useCallback(
    async (overrideText) => {
      const text = (overrideText ?? rawTextRef.current).trim();
      if (!text) {
        Alert.alert("Tom text", "Skriv en kort beskrivning av arbetet först.");
        return;
      }
      const user = auth.currentUser;
      if (!user) {
        setError("Du måste vara inloggad för att använda AI-analys.");
        return;
      }

      if (analyzeInFlightRef.current) {
        return;
      }
      analyzeInFlightRef.current = true;

      const seq = ++analyzeSeqRef.current;
      setAnalyzeBusy(true);
      setError(null);
      setResult(null);

      try {
        const idToken = await user.getIdToken(true);
        const res = await fetch(workaholicApiUrl("/api/ai/work-order"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            text,
            ...(profession ? { profession } : {}),
          }),
        });

        const data = await safeReadResponseJson(res);

        if (seq !== analyzeSeqRef.current) {
          return;
        }

        if (!res.ok) {
          const msg =
            res.status === 401
              ? "Sessionen har gått ut. Logga ut och in igen."
              : data.error || data.details || `HTTP ${res.status}`;
          throw new Error(msg);
        }
        if (!data.ok) {
          throw new Error(data.error || "Okänt svar från servern");
        }

        let parsed;
        try {
          parsed = parseAiWorkOrderPayload(data);
        } catch (parseErr) {
          await logError(parseErr, {
            screen: "AiWorkOrderScreen",
            action: "parse_ai_response",
            payloadKeys: data && typeof data === "object" ? Object.keys(data) : [],
          });
          throw new Error(
            "Vi kunde inte tolka AI-svaret. Försök igen eller skriv om texten."
          );
        }

        setResult({
          timeReported: parsed.timeReported,
          materials: parsed.materials,
          notes: parsed.notes,
        });
      } catch (e) {
        if (seq !== analyzeSeqRef.current) {
          return;
        }
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        await logError(e instanceof Error ? e : new Error(String(e)), {
          screen: "AiWorkOrderScreen",
          action: "analyze",
        });
      } finally {
        analyzeInFlightRef.current = false;
        if (seq === analyzeSeqRef.current) {
          setAnalyzeBusy(false);
        }
      }
    },
    [profession]
  );

  const analyzeRef = useRef(analyze);
  analyzeRef.current = analyze;

  const handleSpeechEnd = useCallback((finalText) => {
    if (finalText?.trim()) {
      const t = finalText.trim();
      setRawText(t);
      rawTextRef.current = t;
      analyzeRef.current(t);
    }
  }, []);

  const saveToProject = useCallback(async () => {
    if (!project?.id || !result) return;

    const hours = Number(result.timeReported) || 0;
    const matsRaw = Array.isArray(result.materials) ? result.materials : [];
    const mats = matsRaw.filter((m) => (Number(m.quantity) || 0) > 0);
    if (hours <= 0 && mats.length === 0) {
      Alert.alert(
        "Inget att spara",
        "Det finns varken tid eller material i förslaget. Analysera igen eller skriv mer i fritextfältet."
      );
      return;
    }

    setSaveBusy(true);
    try {
      let userData = null;
      if (auth.currentUser?.uid) {
        const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userSnap.exists()) userData = userSnap.data();
      }

      const hourPriceResolved = resolveDefaultHourPrice(company, userData) ?? 0;
      const hasHourPrice = hourPriceResolved > 0;
      const materialMarkupPct =
        resolveDefaultMaterialMarkupPercent(company, userData);

      const effective =
        selectedProject?.id === project.id ? selectedProject : project;
      const prevKost = Array.isArray(effective.kostnader)
        ? [...effective.kostnader]
        : [];
      const prevProducts = Array.isArray(effective.products)
        ? [...effective.products]
        : [];
      const prevAi = Array.isArray(effective.aiWorkOrderEntries)
        ? [...effective.aiWorkOrderEntries]
        : [];

      const updates = {};

      if (hours > 0) {
        const timeRow = buildKostnadRowFromAi({
          timeReported: hours,
          rawText: rawText.trim(),
          notes: result.notes,
          hourPrice: hourPriceResolved,
          hasHourPrice,
        });
        updates.kostnader = [timeRow, ...prevKost];
      }

      if (mats.length > 0) {
        const newRows = mats.map((m) =>
          buildProductRowFromAi(m, materialMarkupPct)
        );
        updates.products = [...newRows, ...prevProducts];
      }

      const auditEntry = {
        id: `aiwo_${Date.now()}`,
        savedAt: new Date().toISOString(),
        rawText: rawText.trim(),
        timeReported: hours,
        materials: matsRaw,
        notes: result.notes || "",
        savedByUid: auth.currentUser?.uid || null,
        defaultHourPriceUsed: hourPriceResolved,
        defaultMaterialMarkupUsed: materialMarkupPct,
      };
      updates.aiWorkOrderEntries = [...prevAi, auditEntry];

      await updateProject(project.id, updates);

      Alert.alert(
        "Sparat",
        "Tid finns i kostnadsloggen och material i materiallistan (Ekonomi & material).",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await logError(e instanceof Error ? e : new Error(String(e)), {
        screen: "AiWorkOrderScreen",
        action: "save_to_project",
      });
      Alert.alert(
        "Kunde inte spara",
        `${msg}\n\nFörsök igen om en stund.`,
        [{ text: "OK" }]
      );
    } finally {
      setSaveBusy(false);
    }
  }, [
    project,
    result,
    rawText,
    selectedProject,
    updateProject,
    navigation,
    company,
  ]);

  if (!project) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>Inget projekt valt.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.link, { color: theme.colors.primary }]}>
            Tillbaka
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const primary = theme.colors.primary;
  const busy = analyzeBusy || saveBusy;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <View style={styles.flex}>
        <AppHeader
          title="AI arbetsorder"
          subTitle={capitalizeFirst(project.name)}
          navigation={navigation}
        />

        <AiWorkOrderErrorBoundary
          onRetry={() => {
            setError(null);
            setResult(null);
          }}
        >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.hint}>
            Beskriv vad du gjort i fritext — vi tolkar tid och material för detta{" "}
            <Text style={{ fontWeight: "800" }}>projekt</Text>. Tryck på
            mikrofonen för att prata in.
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.textArea}
              multiline
              textAlignVertical="top"
              placeholder="T.ex. Jag har dragit 50 meter FK-kabel och monterat två dubbeluttag, tog cirka två timmar."
              placeholderTextColor="#8E8E93"
              value={rawText}
              onChangeText={setRawText}
              editable={!busy}
            />
            <View style={styles.voiceButtonWrap}>
              <AiWorkOrderVoiceButton
                onTranscript={setRawText}
                onSpeechEnd={handleSpeechEnd}
                disabled={busy}
                primaryColor={primary}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.analyzeBtn, { backgroundColor: primary }]}
            onPress={() => analyze()}
            disabled={busy}
            activeOpacity={0.85}
          >
            {analyzeBusy ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.analyzeBtnText}>Analysera med AI</Text>
            )}
          </TouchableOpacity>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>Något gick fel</Text>
              <Text style={styles.errorBody}>{error}</Text>
            </View>
          ) : null}

          {result ? (
            <View style={styles.results}>
              <Text style={styles.resultsTitle}>Förslag</Text>

              <View style={styles.card}>
                <Text style={styles.cardLabel}>Tid</Text>
                <Text style={styles.cardValue}>
                  {typeof result.timeReported === "number"
                    ? `${result.timeReported} h`
                    : "—"}
                </Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardLabel}>Material</Text>
                {result.materials.length === 0 ? (
                  <Text style={styles.cardMuted}>Inga material identifierade</Text>
                ) : (
                  result.materials.map((m, i) => (
                    <View
                      key={i}
                      style={[styles.matRow, i > 0 && styles.matRowBorder]}
                    >
                      <Text style={styles.matTitle}>
                        {m.designation || "—"}
                        {m.eNumber ? ` · ${m.eNumber}` : ""}
                      </Text>
                      <Text style={styles.matQty}>
                        {m.quantity}
                        {m.unit ? ` ${m.unit}` : ""}
                      </Text>
                    </View>
                  ))
                )}
              </View>

              {result.notes ? (
                <View style={[styles.card, styles.notesCard]}>
                  <Text style={styles.cardLabel}>Kommentar</Text>
                  <Text style={styles.cardMuted}>{result.notes}</Text>
                </View>
              ) : null}

              <Text style={styles.saveHint}>
                Sparat hamnar i kostnadsloggen (tid) och materiallistan (artiklar) för
                projektet.
              </Text>

              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  saveBusy && styles.saveBtnDisabled,
                ]}
                onPress={saveToProject}
                disabled={busy}
                activeOpacity={0.9}
              >
                {saveBusy ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color="#FFF"
                      style={styles.saveIcon}
                    />
                    <Text style={styles.saveBtnText}>Spara till projektet</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
        </AiWorkOrderErrorBoundary>

        {analyzeBusy ? (
          <View
            style={styles.aiBlockingOverlay}
            pointerEvents="auto"
            accessibilityViewIsModal
            accessibilityLabel="Analyserar med AI"
          >
            <View style={styles.aiOverlayCard}>
              <ActivityIndicator size="large" color="#FFF" />
              <Text style={styles.aiOverlayTitle}>Analyserar med AI</Text>
              <Text style={styles.aiOverlayHint}>Vänta lite…</Text>
            </View>
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#F8F9FB" },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  hint: {
    fontSize: 14,
    color: "#636366",
    lineHeight: 20,
    marginBottom: 14,
  },
  aiBlockingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    elevation: 24,
  },
  aiOverlayCard: {
    backgroundColor: "rgba(28,28,30,0.95)",
    paddingVertical: 28,
    paddingHorizontal: 32,
    borderRadius: 18,
    alignItems: "center",
    minWidth: 260,
    maxWidth: "88%",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
  },
  aiOverlayTitle: {
    marginTop: 16,
    fontSize: 17,
    fontWeight: "800",
    color: "#FFF",
  },
  aiOverlayHint: {
    marginTop: 6,
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 16,
  },
  textArea: {
    flex: 1,
    minHeight: 160,
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: "#1C1C1E",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  voiceButtonWrap: {
    paddingTop: 8,
  },
  analyzeBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  analyzeBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
  },
  errorBox: {
    marginTop: 16,
    padding: 14,
    backgroundColor: "#FFEBEE",
    borderRadius: 12,
  },
  errorTitle: { fontWeight: "700", color: "#C62828", marginBottom: 4 },
  errorBody: { color: "#B71C1C", fontSize: 14 },
  results: { marginTop: 28 },
  resultsTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#8E8E93",
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  notesCard: { backgroundColor: "#F9FAFB" },
  cardLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#8E8E93",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  cardValue: { fontSize: 22, fontWeight: "800", color: "#1C1C1E" },
  cardMuted: { fontSize: 14, color: "#636366", lineHeight: 20 },
  matRow: { paddingVertical: 10 },
  matRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E5EA",
  },
  matTitle: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  matQty: { fontSize: 14, color: "#636366", marginTop: 2 },
  saveHint: {
    fontSize: 12,
    color: "#8E8E93",
    marginBottom: 10,
    lineHeight: 18,
  },
  saveBtn: {
    marginTop: 4,
    backgroundColor: "#34C759",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  saveBtnDisabled: { opacity: 0.85 },
  saveIcon: { marginRight: 8 },
  saveBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  missing: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  missingText: { fontSize: 16, color: "#636366", marginBottom: 12 },
  link: { fontSize: 16, fontWeight: "700" },
});
