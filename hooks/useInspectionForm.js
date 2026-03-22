import { useState, useEffect, useRef, useCallback } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ScreenOrientation from "expo-screen-orientation";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { capitalizeFirst } from "../utils/stringHelpers";
import { rotateSignatureForPortrait } from "../utils/signatureHelpers";
import { handleInspectionPdf } from "../utils/pdfActions";

/**
 * Hook för egenkontroll-formuläret. Hanterar state, persistence och signering.
 */
export function useInspectionForm(project, routeParams, updateProject, templates, navigation) {
  const isSavingRef = useRef(false);

  const [items, setItems] = useState([]);
  const [checks, setChecks] = useState({});
  const [rowComments, setRowComments] = useState({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [nameClarification, setNameClarification] = useState("");
  const [images, setImages] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSignModalVisible, setIsSignModalVisible] = useState(false);
  const [isNameEntryModalVisible, setIsNameEntryModalVisible] = useState(false);
  const [isTypeModalVisible, setIsTypeModalVisible] = useState(false);
  const [inspectionSubtitle, setInspectionSubtitle] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingHistoryId, setEditingHistoryId] = useState(null);
  const [companyData, setCompanyData] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) setCompanyData(docSnap.data());
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (routeParams?.customTemplate) {
      setItems(routeParams.customTemplate);
      setInspectionSubtitle(routeParams.customTitle || "");
    } else if (routeParams?.editMode && routeParams?.existingData) {
      const data = routeParams.existingData;
      setEditingHistoryId(data.id);
      setItems(data.items || []);
      setChecks(data.checks || {});
      setRowComments(data.rowComments || {});
      setGeneralNotes(data.notes || "");
      setNameClarification(data.signedBy || "");
      setImages(data.images || []);
      setInspectionSubtitle(data.description || "");
    } else if (project) {
      setItems(project.inspectionItems || []);
      setChecks(project.currentInspections || {});
      setRowComments(project.currentInspectionRowComments || {});
      setGeneralNotes(project.currentInspectionNotes || "");
      setNameClarification(project.nameClarification || "");
      setImages(project.currentImages || []);

      const hasStarted = Object.keys(project.currentInspections || {}).length > 0;
      if (!routeParams?.editMode && !hasStarted && !routeParams?.customTemplate) {
        setIsTypeModalVisible(true);
      }
    }
  }, [project, routeParams]);

  const persistData = useCallback(
    async (updatedFields = {}) => {
      if (routeParams?.customTemplate || !project?.id || isSavingRef.current || editingHistoryId || isProcessing)
        return;

      isSavingRef.current = true;
      try {
        await updateProject(project.id, {
          currentInspections: updatedFields.inspections ?? checks,
          currentInspectionRowComments: updatedFields.inspectionRowComments ?? rowComments,
          currentInspectionNotes: updatedFields.inspectionNotes ?? generalNotes,
          inspectionItems: updatedFields.inspectionItems ?? items,
          nameClarification: updatedFields.nameClarification ?? nameClarification,
          currentImages: updatedFields.images ?? images,
          ...updatedFields,
        });
      } catch (err) {
        console.log("Autosave error:", err);
      } finally {
        isSavingRef.current = false;
      }
    },
    [
      project,
      routeParams?.customTemplate,
      checks,
      rowComments,
      generalNotes,
      items,
      nameClarification,
      images,
      isProcessing,
      editingHistoryId,
      updateProject,
    ]
  );

  const selectTemplate = useCallback(
    async (type) => {
      const selectedItems = templates[type] || [];
      const title = type === "general" ? "Allmän kontroll" : "Golvvärme";

      setItems(selectedItems);
      setInspectionSubtitle(title);
      setIsTypeModalVisible(false);
      setCurrentIndex(0);

      if (project?.id) {
        await updateProject(project.id, {
          inspectionItems: selectedItems,
          currentInspections: {},
          currentInspectionRowComments: {},
          currentInspectionNotes: "",
          currentImages: [],
          nameClarification: "",
        });
      }
    },
    [templates, project?.id, updateProject]
  );

  const takePhoto = useCallback(async () => {
    if (images.length >= 6) {
      Alert.alert("Gräns nådd", "Max 6 bilder.");
      return;
    }
    const r = await ImagePicker.launchCameraAsync({ quality: 0.3 });
    if (!r.canceled) {
      const n = [...images, r.assets[0].uri];
      setImages(n);
      persistData({ images: n });
    }
  }, [images, persistData]);

  const isLastStep = currentIndex === items.length - 1;

  const setStatus = useCallback(
    (id, s) => {
      const n = checks[id] === s ? null : s;
      const newChecks = { ...checks, [id]: n };
      setChecks(newChecks);
      persistData({ inspections: newChecks });

      if (!editMode && (s === "checked" || s === "na") && currentIndex < items.length - 1) {
        setTimeout(() => setCurrentIndex((prev) => prev + 1), 250);
      }
    },
    [checks, editMode, currentIndex, items.length, persistData]
  );

  const handleSignature = useCallback(
    async (sig) => {
      if (items.length === 0 || !project) return;
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      setIsSignModalVisible(false);

      setTimeout(async () => {
        setIsProcessing(true);
        try {
          let fullSig = sig.startsWith("data:") ? sig : "data:image/png;base64," + sig;
          try {
            fullSig = await rotateSignatureForPortrait(fullSig);
          } catch {
            // behåll original om rotation misslyckas
          }
          const entryData = {
            id: editingHistoryId || Date.now(),
            date: editingHistoryId ? routeParams.existingData.date : new Date().toISOString(),
            description: inspectionSubtitle || capitalizeFirst(project.name),
            checks,
            rowComments,
            notes: generalNotes,
            images,
            signature: fullSig,
            signedBy: nameClarification || "Installatör",
            items,
          };

          const updatedHistory =
            editingHistoryId
              ? (project.inspectionHistory || []).map((item) =>
                  item.id === editingHistoryId ? entryData : item
                )
              : [entryData, ...(project.inspectionHistory || [])];

          await updateProject(project.id, {
            inspectionHistory: updatedHistory,
            ...(editingHistoryId || routeParams?.customTemplate
              ? {}
              : {
                  currentInspections: {},
                  currentInspectionRowComments: {},
                  currentInspectionNotes: "",
                  currentImages: [],
                  nameClarification: "",
                  inspectionItems: [],
                }),
          });

          setIsNameEntryModalVisible(false);
          navigation.goBack();

          setTimeout(() => {
            Alert.alert("Sparat!", "Egenkontrollen har arkiverats. Vill du skapa PDF nu?", [
              { text: "Nej", style: "cancel" },
              { text: "Ja", onPress: () => handleInspectionPdf(project, entryData, companyData) },
            ]);
          }, 500);
        } catch (e) {
          Alert.alert("Fel", "Kunde inte spara.");
        } finally {
          setIsProcessing(false);
        }
      }, 400);
    },
    [
      items,
      project,
      editingHistoryId,
      routeParams,
      inspectionSubtitle,
      checks,
      rowComments,
      generalNotes,
      images,
      nameClarification,
      companyData,
      updateProject,
      navigation,
    ]
  );

  const addNewSection = useCallback(() => {
    const n = [...items, { id: "s" + Date.now(), label: "Ny punkt", section: "Ny Kategori", desc: "", unit: "" }];
    setItems(n);
    persistData({ inspectionItems: n });
  }, [items, persistData]);

  const removeSection = useCallback(
    (sec) => {
      const n = items.filter((i) => i.section !== sec);
      setItems(n);
      persistData({ inspectionItems: n });
    },
    [items, persistData]
  );

  const addNewItem = useCallback(
    (sec) => {
      const n = [...items, { id: "i" + Date.now(), label: "Ny punkt", section: sec, desc: "", unit: "" }];
      setItems(n);
      persistData({ inspectionItems: n });
    },
    [items, persistData]
  );

  const removeItem = useCallback(
    (id) => {
      const n = items.filter((i) => i.id !== id);
      setItems(n);
      persistData({ inspectionItems: n });
    },
    [items, persistData]
  );

  const currentItem = items[currentIndex];
  const progress = items.length > 0 ? (currentIndex + 1) / items.length : 0;
  const sections = Array.from(new Set(items.map((i) => i.section)));

  return {
    items,
    setItems,
    checks,
    rowComments,
    setRowComments,
    generalNotes,
    setGeneralNotes,
    nameClarification,
    setNameClarification,
    images,
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
    companyData,
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
    handleNext: () => {
      if (currentIndex === items.length - 1) setIsNameEntryModalVisible(true);
      else setCurrentIndex((prev) => prev + 1);
    },
    handlePrev: () => {
      if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
    },
  };
}
