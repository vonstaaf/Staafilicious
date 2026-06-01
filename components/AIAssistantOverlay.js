import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  Animated,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAI } from "../context/AIContext";
import { CompanyContext } from "../context/CompanyContext";
import { useCompanyLicense } from "../hooks/useCompanyLicense";
import { useTheme } from "../context/ThemeContext";

const QUICK_ACTIONS = [
  {
    label: "Skapa projekt från adress",
    message:
      "Jag vill skapa ett nytt projekt utifrån en arbetsplatsadress. Vägled mig — vilken information behöver du?",
  },
  {
    label: "Sammanfatta min byggdagbok",
    message:
      "Sammanfatta relevanta punkter ur min byggdagbok för det aktiva projektet. (Koppling mot dagboksdata kommer när verktyget är klart.)",
  },
  {
    label: "Föreslå material",
    message:
      "Föreslå lämpligt material och tillbehör för det jag håller på med i projektet. Fråga om det som saknas.",
  },
];

export default function AIAssistantOverlay() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { user, needsLicense, loading: companyLoading } = useContext(CompanyContext);
  const { licenseState } = useCompanyLicense();
  const {
    messages,
    isLoading,
    isPanelOpen,
    actionStatus,
    openPanel,
    closePanel,
    sendMessageToAI,
  } = useAI();

  const [draft, setDraft] = useState("");
  const listRef = useRef(null);

  const showFab =
    !companyLoading &&
    user &&
    !needsLicense &&
    licenseState !== "expired" &&
    licenseState !== "trial_expired";

  /**
   * 1 = expanderad (full storlek, vid kanten i normalt läge)
   * 0 = minimerad (krympt, halvt utanför skärmen, sänkt opacity)
   */
  const animationValue = useRef(new Animated.Value(1)).current;
  const minimizeTimerRef = useRef(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const clearMinimizeTimer = useCallback(() => {
    if (minimizeTimerRef.current) {
      clearTimeout(minimizeTimerRef.current);
      minimizeTimerRef.current = null;
    }
  }, []);

  const animateTo = useCallback(
    (toValue, duration) => {
      Animated.timing(animationValue, {
        toValue,
        duration,
        useNativeDriver: true,
      }).start();
    },
    [animationValue]
  );

  const expandFab = useCallback(() => {
    clearMinimizeTimer();
    setIsMinimized(false);
    animateTo(1, 220);
  }, [animateTo, clearMinimizeTimer]);

  const minimizeFab = useCallback(() => {
    setIsMinimized(true);
    animateTo(0, 320);
  }, [animateTo]);

  const scheduleMinimize = useCallback(() => {
    clearMinimizeTimer();
    minimizeTimerRef.current = setTimeout(() => {
      minimizeTimerRef.current = null;
      minimizeFab();
    }, 3000);
  }, [clearMinimizeTimer, minimizeFab]);

  useEffect(() => {
    if (!showFab) {
      clearMinimizeTimer();
      return undefined;
    }
    if (isPanelOpen) {
      // Panelen är öppen: håll FAB:en gömd, ingen timer behövs.
      clearMinimizeTimer();
      return undefined;
    }
    // Mount eller panelen just stängd → visa expanderad, starta timer.
    expandFab();
    scheduleMinimize();
    return clearMinimizeTimer;
  }, [
    showFab,
    isPanelOpen,
    expandFab,
    scheduleMinimize,
    clearMinimizeTimer,
  ]);

  const handleFabPress = useCallback(() => {
    expandFab();
    openPanel();
  }, [expandFab, openPanel]);

  useEffect(() => {
    if (!isPanelOpen || messages.length === 0) return;
    const t = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 80);
    return () => clearTimeout(t);
  }, [messages.length, isPanelOpen, isLoading]);

  const onSend = () => {
    const t = draft.trim();
    if (!t) return;
    setDraft("");
    sendMessageToAI(t);
  };

  const renderMessage = ({ item }) => {
    const mine = item.role === "user";
    return (
      <View
        style={[
          styles.bubbleWrap,
          mine ? styles.bubbleWrapUser : styles.bubbleWrapAssistant,
        ]}
      >
        <View
          style={[
            styles.bubble,
            mine
              ? { backgroundColor: theme.colors.primary }
              : { backgroundColor: "#F2F2F7" },
          ]}
        >
          <Text
            style={[
              styles.bubbleText,
              mine ? { color: "#FFF" } : { color: "#1C1C1E" },
            ]}
          >
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  if (!showFab) {
    return null;
  }

  const fabTranslateX = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [28, 0],
  });
  const fabScale = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1],
  });
  const fabOpacity = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  return (
    <>
      {!isPanelOpen ? (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.fabWrap,
            {
              bottom: 100 + insets.bottom,
              right: 24,
              opacity: fabOpacity,
              transform: [{ translateX: fabTranslateX }, { scale: fabScale }],
            },
          ]}
        >
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={
              isMinimized
                ? "Visa AI-assistent (minimerad)"
                : "Öppna AI-assistent"
            }
            accessibilityState={{ expanded: !isMinimized }}
            activeOpacity={0.92}
            onPress={handleFabPress}
            hitSlop={{ top: 8, bottom: 8, left: 16, right: 8 }}
            style={[
              styles.fab,
              {
                backgroundColor: theme.colors.primary,
                ...(Platform.OS === "android" ? { elevation: 6 } : {}),
              },
            ]}
          >
            <Ionicons name="sparkles" size={26} color="#FFF" />
          </TouchableOpacity>
        </Animated.View>
      ) : null}

      <Modal
        visible={isPanelOpen}
        animationType="slide"
        transparent
        onRequestClose={closePanel}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <Pressable style={styles.backdrop} onPress={closePanel} />
          <View
            style={[
              styles.sheet,
              {
                paddingBottom: Math.max(insets.bottom, 12),
                maxHeight: "92%",
                minHeight: 380,
              },
            ]}
          >
            <View style={styles.sheetGrabRow}>
              <View style={styles.grabber} />
            </View>

            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <View
                  style={[
                    styles.headerIconCircle,
                    { backgroundColor: `${theme.colors.primary}18` },
                  ]}
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={22}
                    color={theme.colors.primary}
                  />
                </View>
                <View>
                  <Text style={styles.sheetTitleInner}>Workaholic AI</Text>
                  <Text style={styles.sheetSubtitle}>Din assistent på plats</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={closePanel}
                style={styles.closeBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={26} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <FlatList
              ref={listRef}
              style={styles.messageList}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyTitle}>Hej!</Text>
                  <Text style={styles.emptyBody}>
                    Ställ en fråga om projekt, material eller dokumentation — eller
                    använd en snabbknapp nedan.
                  </Text>
                </View>
              }
              ListFooterComponent={
                <>
                  {isLoading ? (
                    <View style={styles.typingRow}>
                      <ActivityIndicator color={theme.colors.primary} size="small" />
                      <Text style={styles.typingText}>Assistenten tänker…</Text>
                    </View>
                  ) : null}
                  {actionStatus ? (
                    <View style={styles.actionStatusRow}>
                      <ActivityIndicator
                        color={theme.colors.primary}
                        size="small"
                        style={styles.actionStatusSpinner}
                      />
                      <Text style={[styles.actionStatusText, { color: theme.colors.primary }]}>
                        {actionStatus}
                      </Text>
                    </View>
                  ) : null}
                </>
              }
              onContentSizeChange={() =>
                listRef.current?.scrollToEnd({ animated: true })
              }
            />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.quickScroll}
            >
              {QUICK_ACTIONS.map((qa) => (
                <TouchableOpacity
                  key={qa.label}
                  style={[
                    styles.quickChip,
                    { borderColor: `${theme.colors.primary}40` },
                  ]}
                  onPress={() => sendMessageToAI(qa.message)}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="flash-outline"
                    size={16}
                    color={theme.colors.primary}
                  />
                  <Text
                    style={[styles.quickChipText, { color: theme.colors.primary }]}
                    numberOfLines={1}
                  >
                    {qa.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Skriv en instruktion…"
                placeholderTextColor="#AAA"
                value={draft}
                onChangeText={setDraft}
                multiline
                maxLength={4000}
                editable={!isLoading}
                onSubmitEditing={onSend}
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  { backgroundColor: theme.colors.primary },
                  (!draft.trim() || isLoading) && styles.sendBtnDisabled,
                ]}
                onPress={onSend}
                disabled={!draft.trim() || isLoading}
                activeOpacity={0.9}
              >
                <Ionicons name="arrow-up" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fabWrap: {
    position: "absolute",
    zIndex: 50,
    elevation: 11, // Android: TabBar har elevation 10 — FAB måste vara högre för korrekt rendering och touch-prioritet
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 8,
    flexShrink: 0,
  },
  sheetGrabRow: { alignItems: "center", paddingBottom: 8 },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E5E5EA",
  },
  messageList: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 200,
    maxHeight: 440,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sheetHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  sheetTitleInner: {
    fontSize: 17,
    fontWeight: "900",
    color: "#1C1C1E",
    letterSpacing: -0.3,
  },
  sheetSubtitle: { fontSize: 12, fontWeight: "600", color: "#8E8E93", marginTop: 2 },
  closeBtn: { padding: 4 },
  listContent: {
    paddingBottom: 12,
    flexGrow: 1,
  },
  emptyWrap: { paddingVertical: 28, paddingHorizontal: 8 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#1C1C1E",
    marginBottom: 8,
  },
  emptyBody: { fontSize: 14, color: "#8E8E93", lineHeight: 20, fontWeight: "600" },
  bubbleWrap: { marginBottom: 10, maxWidth: "100%" },
  bubbleWrapUser: { alignItems: "flex-end" },
  bubbleWrapAssistant: { alignItems: "flex-start" },
  bubble: {
    maxWidth: "88%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleText: { fontSize: 15, lineHeight: 21, fontWeight: "600" },
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    marginLeft: 4,
  },
  typingText: { fontSize: 13, color: "#8E8E93", fontWeight: "600" },
  actionStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    marginLeft: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: "#F0F7FF",
    borderRadius: 12,
    alignSelf: "flex-start",
    maxWidth: "90%",
  },
  actionStatusSpinner: { flexShrink: 0 },
  actionStatusText: {
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 1,
  },
  quickScroll: {
    gap: 8,
    paddingBottom: 10,
    paddingTop: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  quickChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: "#FAFAFA",
    marginRight: 8,
    maxWidth: 280,
  },
  quickChipText: { fontSize: 12, fontWeight: "800", flexShrink: 1 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E5EA",
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#F2F2F7",
    borderRadius: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  sendBtnDisabled: { opacity: 0.45 },
});
