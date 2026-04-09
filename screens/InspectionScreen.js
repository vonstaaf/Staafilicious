import React, { useContext, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  StatusBar,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ScreenOrientation from "expo-screen-orientation";
import { ProjectsContext } from "../context/ProjectsContext";
import { CompanyContext } from "../context/CompanyContext";
import { WorkaholicTheme } from "../theme";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../components/AppHeader";
import { capitalizeFirst } from "../utils/stringHelpers";
import { useInspectionForm } from "../hooks/useInspectionForm";
import TemplatePickerModal from "../components/inspection/TemplatePickerModal";
import NameEntryModal from "../components/inspection/NameEntryModal";
import SignModal from "../components/inspection/SignModal";
import InspectionSectionList from "../components/inspection/InspectionSectionList";
import { validateMeasurement, saveMeasurement } from "../utils/measurementValidation";

const getUnitSymbol = (unit) => {
  switch (unit) {
    case "MegaOhm": return "MΩ";
    case "Ohm": return "Ω";
    case "Meter": return "m";
    case "mA": return "mA";
    case "kA": return "kA";
    default: return unit;
  }
};

const InspectionStoryItem = React.memo(
  ({
    item,
    checks,
    setStatus,
    rowComments,
    setRowComments,
    images,
    takePhoto,
    onRemovePhoto,
    onMeasurementBlur,
    persistData,
  }) => {
    const latestValueRef = React.useRef("");
    const handleCommentChange = (t) => {
      latestValueRef.current = t;
      setRowComments((prev) => ({ ...prev, [item.id]: t }));
    };
    const handleBlur = () => {
      const mergedComments = {
        ...rowComments,
        [item.id]: latestValueRef.current ?? rowComments[item.id] ?? "",
      };
      if (typeof persistData === "function") {
        persistData({ inspectionRowComments: mergedComments });
      }
      const valueStr = (latestValueRef.current || rowComments[item.id] || "").trim();
      if (item.unit && valueStr && onMeasurementBlur) onMeasurementBlur(item, valueStr);
    };
    const unitSymbol = getUnitSymbol(item.unit);

    return (
      <ScrollView contentContainerStyle={styles.storyContent} keyboardShouldPersistTaps="handled">
        <View style={styles.storyCard}>
          <Text style={styles.storySection}>{item.section}</Text>
          <Text style={styles.storyLabel}>{item.label}</Text>

          {item.desc ? (
            <View style={styles.descBox}>
              <Ionicons name="information-circle" size={18} color={WorkaholicTheme.colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.descTitle}>HÄNVISNING / REGLER:</Text>
                <Text style={styles.storyDesc}>{item.desc}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.storyActions}>
            <TouchableOpacity
              style={[styles.storyBtn, checks[item.id] === "checked" && styles.storyBtnOk]}
              onPress={() => setStatus(item.id, "checked")}
            >
              <Ionicons name="checkmark-circle" size={30} color={checks[item.id] === "checked" ? "#FFF" : "#DDD"} />
              <Text style={[styles.storyBtnText, checks[item.id] === "checked" && { color: "#FFF" }]}>OK</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.storyBtn, checks[item.id] === "na" && styles.storyBtnNa]}
              onPress={() => setStatus(item.id, "na")}
            >
              <Ionicons name="remove-circle" size={30} color={checks[item.id] === "na" ? "#FFF" : "#DDD"} />
              <Text style={[styles.storyBtnText, checks[item.id] === "na" && { color: "#FFF" }]}>N/A</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.storyBtn, checks[item.id] === "fail" && styles.storyBtnFail]}
              onPress={() => setStatus(item.id, "fail")}
            >
              <Ionicons name="alert-circle" size={30} color={checks[item.id] === "fail" ? "#FFF" : "#DDD"} />
              <Text style={[styles.storyBtnText, checks[item.id] === "fail" && { color: "#FFF" }]}>FEL</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.storyComment}
              placeholder={item.unit ? `Ange värde i ${unitSymbol}...` : "Mätvärden eller noteringar..."}
              multiline
              value={rowComments[item.id] || ""}
              onChangeText={handleCommentChange}
              onBlur={handleBlur}
              placeholderTextColor="#BBB"
            />
            {item.unit ? (
              <View style={styles.unitBadge}>
                <Text style={styles.unitBadgeText}>{unitSymbol}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.miniGallery}>
          <Text style={styles.miniGalleryLabel}>Foton för denna punkt</Text>
          <View style={styles.miniGalleryRow}>
            {images.map((uri, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => onRemovePhoto(idx)}
              >
                <Image source={{ uri }} style={styles.miniThumb} />
                <View style={styles.miniRemove}>
                  <Ionicons name="close" size={10} color="#fff" />
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.miniAdd} onPress={takePhoto}>
              <Ionicons name="camera" size={24} color="#CCC" />
              <Text style={styles.miniAddText}>FOTO</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }
);

export default function InspectionScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { projects, selectedProject, updateProject, templates } = useContext(ProjectsContext);

  const projectId = route.params?.project?.id || selectedProject?.id;
  const project = useMemo(
    () => projects.find((p) => p.id === projectId) || selectedProject,
    [projects, projectId, selectedProject]
  );

  const form = useInspectionForm(project, route.params, updateProject, templates, navigation);

  const {
    items,
    setItems,
    checks,
    rowComments,
    setRowComments,
    generalNotes,
    setGeneralNotes,
    nameClarification,
    setNameClarification,
    imagesByItemId,
    removePhotoForItem,
    editMode,
    setEditMode,
    currentIndex,
    setCurrentIndex,
    isSignModalVisible,
    setIsSignModalVisible,
    isNameEntryModalVisible,
    setIsNameEntryModalVisible,
    isTypeModalVisible,
    setIsTypeModalVisible,
    inspectionSubtitle,
    setInspectionSubtitle,
    isProcessing,
    editingHistoryId,
    persistData,
    selectTemplate,
    takePhoto,
    setStatus,
    handleSignature,
    addNewSection,
    removeSection,
    addNewItem,
    removeItem,
    currentItem,
    isLastStep,
    progress,
    sections,
    handleNext,
    handlePrev,
  } = form;

  const { companyId } = useContext(CompanyContext);

  const onMeasurementBlur = useCallback(
    async (item, valueStr) => {
      const result = validateMeasurement(valueStr, item);
      if (!result.valid) {
        Alert.alert("Gränsvärde enligt byggregler", result.message);
        return;
      }
      const num = parseFloat(String(valueStr).replace(",", ".").trim());
      if (!Number.isNaN(num) && companyId && project?.id) {
        try {
          await saveMeasurement(companyId, project.id, item, num);
        } catch (e) {
          console.warn("Kunde inte spara mätvärde:", e);
        }
      }
    },
    [companyId, project?.id]
  );

  if (!project) return null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <AppHeader
        title={editingHistoryId ? "ÄNDRA ARKIV" : inspectionSubtitle || "EGENKONTROLL"}
        subTitle={capitalizeFirst(project.name)}
        navigation={navigation}
        rightIcon="archive-outline"
        onRightPress={() => navigation.navigate("InspectionHistory", { project })}
      />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardView}>
        <View style={styles.topBar}>
          {!editMode && items.length > 0 && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
            </View>
          )}
          <TouchableOpacity
            onPress={() => setEditMode(!editMode)}
            style={[styles.modeToggle, editMode && styles.modeToggleActive]}
          >
            <Ionicons name={editMode ? "checkmark-circle" : "settings-outline"} size={16} color={editMode ? "#FFF" : WorkaholicTheme.colors.primary} />
            <Text style={[styles.modeText, editMode && { color: "#FFF" }]}>{editMode ? "KLAR" : "ÄNDRA"}</Text>
          </TouchableOpacity>
          {!editMode && !editingHistoryId && (
            <TouchableOpacity onPress={() => setIsTypeModalVisible(true)} style={styles.swapBtn}>
              <Ionicons name="swap-horizontal" size={20} color={WorkaholicTheme.colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {!editMode && currentItem ? (
          <InspectionStoryItem
            item={currentItem}
            checks={checks}
            setStatus={setStatus}
            rowComments={rowComments}
            setRowComments={setRowComments}
            images={imagesByItemId[currentItem.id] || []}
            takePhoto={takePhoto}
            onRemovePhoto={(idx) => removePhotoForItem(currentItem.id, idx)}
            onMeasurementBlur={onMeasurementBlur}
            persistData={persistData}
          />
        ) : (
          <InspectionSectionList
            items={items}
            setItems={setItems}
            sections={sections}
            editMode={editMode}
            checks={checks}
            setStatus={setStatus}
            persistData={persistData}
            addNewSection={addNewSection}
            removeSection={removeSection}
            addNewItem={addNewItem}
            removeItem={removeItem}
            generalNotes={generalNotes}
            setGeneralNotes={setGeneralNotes}
            contentPaddingBottom={insets.bottom + 100}
          />
        )}

        {!editMode && (
          <View style={[styles.stickyFooter, { paddingBottom: insets.bottom + 15 }]}>
            {currentItem ? (
              <View style={styles.navRow}>
                <TouchableOpacity
                  onPress={handlePrev}
                  disabled={currentIndex === 0}
                  style={[styles.navBtn, currentIndex === 0 && { opacity: 0.3 }]}
                >
                  <Ionicons name="arrow-back" size={20} color="#1C1C1E" />
                  <Text style={styles.navText}>BAKÅT</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleNext}
                  style={[styles.navBtn, { backgroundColor: WorkaholicTheme.colors.primary }]}
                >
                  <Text style={[styles.navText, { color: "#FFF" }]}>{isLastStep ? "SLUTFÖR" : "NÄSTA"}</Text>
                  <Ionicons name={isLastStep ? "checkmark" : "arrow-forward"} size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            ) : items.length > 0 ? (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => setIsNameEntryModalVisible(true)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="pencil-sharp" size={20} color="#fff" />
                    <Text style={styles.btnText}> SIGNERA & SPARA</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setIsTypeModalVisible(true)}>
                <Ionicons name="list-outline" size={20} color="#fff" />
                <Text style={styles.btnText}> VÄLJ MALL</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      <TemplatePickerModal
        visible={isTypeModalVisible}
        onSelectTemplate={selectTemplate}
        onCancel={() => setIsTypeModalVisible(false)}
      />

      <NameEntryModal
        visible={isNameEntryModalVisible}
        inspectionSubtitle={inspectionSubtitle}
        setInspectionSubtitle={setInspectionSubtitle}
        nameClarification={nameClarification}
        setNameClarification={setNameClarification}
        onCancel={() => setIsNameEntryModalVisible(false)}
        onConfirm={async () => {
          setIsNameEntryModalVisible(false);
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
          setIsSignModalVisible(true);
        }}
      />

      <SignModal
        visible={isSignModalVisible}
        onClose={async () => {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
          setIsSignModalVisible(false);
        }}
        onSignature={handleSignature}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  keyboardView: { flex: 1 },
  topBar: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 10, flexDirection: "row", alignItems: "center" },
  progressContainer: { flex: 1, height: 6, backgroundColor: "#EEE", borderRadius: 3, marginRight: 15, overflow: "hidden" },
  progressBar: { height: "100%", backgroundColor: WorkaholicTheme.colors.primary },
  modeToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
  },
  modeToggleActive: { backgroundColor: WorkaholicTheme.colors.primary },
  modeText: { fontSize: 10, fontWeight: "900", marginLeft: 6, color: WorkaholicTheme.colors.primary, letterSpacing: 0.5 },
  swapBtn: { marginLeft: 10, padding: 5 },
  storyContent: { padding: 20, flexGrow: 1, justifyContent: "center" },
  storyCard: { backgroundColor: "#FFF", borderRadius: 25, padding: 25, elevation: 4 },
  storySection: { fontSize: 10, fontWeight: "900", color: "#BBB", textTransform: "uppercase", marginBottom: 8, letterSpacing: 1.2 },
  storyLabel: { fontSize: 22, fontWeight: "900", color: "#1C1C1E", marginBottom: 15 },
  descBox: {
    flexDirection: "row",
    backgroundColor: "#F0F7FF",
    padding: 15,
    borderRadius: 15,
    marginBottom: 25,
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: WorkaholicTheme.colors.primary,
  },
  descTitle: { fontSize: 9, fontWeight: "900", color: WorkaholicTheme.colors.primary, marginBottom: 2 },
  storyDesc: { fontSize: 13, color: "#444", lineHeight: 18, fontWeight: "600" },
  storyActions: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginBottom: 25 },
  storyBtn: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 18,
    backgroundColor: "#F8F9FB",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEE",
  },
  storyBtnOk: { backgroundColor: "#34C759", borderColor: "#34C759" },
  storyBtnNa: { backgroundColor: "#8E8E93", borderColor: "#8E8E93" },
  storyBtnFail: { backgroundColor: "#FF3B30", borderColor: "#FF3B30" },
  storyBtnText: { fontSize: 10, fontWeight: "900", marginTop: 10, color: "#AAA" },
  storyComment: {
    backgroundColor: "#F5F5F7",
    padding: 18,
    borderRadius: 18,
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: "top",
    fontWeight: "600",
    color: "#333",
  },
  inputWrapper: { position: "relative" },
  unitBadge: { position: "absolute", right: 15, top: 15, backgroundColor: "#E5E5EA", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  unitBadgeText: { fontSize: 12, fontWeight: "900", color: "#8E8E93" },
  miniGallery: { marginTop: 24 },
  miniGalleryLabel: { fontSize: 11, fontWeight: "800", color: "#888", marginBottom: 10, textAlign: "center" },
  miniGalleryRow: { flexDirection: "row", gap: 12, flexWrap: "wrap", justifyContent: "center" },
  miniThumb: { width: 70, height: 70, borderRadius: 15 },
  miniAdd: {
    width: 70,
    height: 70,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#EEE",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  miniAddText: { fontSize: 9, color: "#AAA", fontWeight: "900", marginTop: 2 },
  miniRemove: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#FF3B30",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  navRow: { flexDirection: "row", justifyContent: "space-between", gap: 15 },
  navBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#FFF",
    elevation: 2,
    gap: 10,
    justifyContent: "center",
  },
  navText: { fontWeight: "900", fontSize: 13, color: "#1C1C1E", letterSpacing: 0.5 },
  primaryBtn: {
    backgroundColor: WorkaholicTheme.colors.primary,
    padding: 18,
    borderRadius: 20,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    elevation: 3,
  },
  btnText: { color: "#fff", fontWeight: "900", fontSize: 15, letterSpacing: 0.5 },
  stickyFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
  },
});
