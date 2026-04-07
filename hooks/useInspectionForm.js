import { useState, useEffect, useRef, useCallback, useContext } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ScreenOrientation from "expo-screen-orientation";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { capitalizeFirst } from "../utils/stringHelpers";
import { rotateSignatureForPortrait } from "../utils/signatureHelpers";
import { handleInspectionPdf } from "../utils/pdfActions";
import { CompanyContext } from "../context/CompanyContext";
import { getDefaultItemsForElTemplateType } from "../constants/elInspectionDefaults";

/** Platt lista i checklist-ordning (bakåtkompatibilitet för PDF) */
function flattenImagesByItemsOrder(itemList, byItem) {
  const out = [];
  for (const it of itemList || []) {
    const arr = (byItem && byItem[it.id]) || [];
    out.push(...arr);
  }
  return out;
}

/**
 * Hook för egenkontroll-formuläret. Hanterar state, persistence och signering.
 */
export function useInspectionForm(project, routeParams, updateProject, templates, navigation) {
  const { company: companyFromTenant } = useContext(CompanyContext) || {};
  const isSavingRef = useRef(false);
  /** Undvik dubbel auto-öppning (t.ex. React Strict Mode) och spårar senaste projekt som fick picker. */
  const templatePickerAutoOpenedForProjectId = useRef(null);

  const [items, setItems] = useState([]);
  const [checks, setChecks] = useState({});
  const [rowComments, setRowComments] = useState({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [nameClarification, setNameClarification] = useState("");
  /** { [itemId: string]: string[] } — foton per checklistpunkt (EL Allmän/Golvvärme) */
  const [imagesByItemId, setImagesByItemId] = useState({});
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

  const migrateLegacyImagesToByItem = (legacyArr, itemList) => {
    if (!Array.isArray(legacyArr) || legacyArr.length === 0 || !itemList?.length) return {};
    return { [itemList[0].id]: [...legacyArr] };
  };

  useEffect(() => {
    if (routeParams?.customTemplate) {
      setItems(routeParams.customTemplate);
      setInspectionSubtitle(routeParams.customTitle || "");
      setIsTypeModalVisible(false);
    } else if (routeParams?.editMode && routeParams?.existingData) {
      const data = routeParams.existingData;
      const itemList = data.items || [];
      setEditingHistoryId(data.id);
      setItems(itemList);
      setChecks(data.checks || {});
      setRowComments(data.rowComments || {});
      setGeneralNotes(data.notes || "");
      setNameClarification(data.signedBy || "");
      if (data.imagesByItem && typeof data.imagesByItem === "object" && !Array.isArray(data.imagesByItem)) {
        setImagesByItemId(data.imagesByItem);
      } else {
        setImagesByItemId(migrateLegacyImagesToByItem(data.images, itemList));
      }
      setInspectionSubtitle(data.description || "");
      setIsTypeModalVisible(false);
    } else if (project) {
      const rawItems = project.inspectionItems;
      const itemList = Array.isArray(rawItems) ? rawItems : [];
      setItems(itemList);
      setChecks(project.currentInspections || {});
      setRowComments(project.currentInspectionRowComments || {});
      setGeneralNotes(project.currentInspectionNotes || "");
      setNameClarification(project.nameClarification || "");
      const byItem = project.currentImagesByItem;
      if (byItem && typeof byItem === "object" && !Array.isArray(byItem)) {
        setImagesByItemId(byItem);
      } else {
        setImagesByItemId(migrateLegacyImagesToByItem(project.currentImages, itemList));
      }

      const hasTemplate = itemList.length > 0;
      const hasChecks = Object.keys(project.currentInspections || {}).length > 0;
      const shouldOfferPicker =
        !routeParams?.editMode &&
        !routeParams?.customTemplate &&
        !hasTemplate &&
        !hasChecks &&
        project.id;

      if (shouldOfferPicker && templatePickerAutoOpenedForProjectId.current !== project.id) {
        templatePickerAutoOpenedForProjectId.current = project.id;
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
          currentImagesByItem: updatedFields.imagesByItemId ?? imagesByItemId,
          currentImages: [],
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
      imagesByItemId,
      isProcessing,
      editingHistoryId,
      updateProject,
    ]
  );

  const selectTemplate = useCallback(
    async (type) => {
      let selectedItems = Array.isArray(templates[type]) && templates[type].length > 0 ? templates[type] : [];
      if (!selectedItems.length) {
        selectedItems = getDefaultItemsForElTemplateType(type);
      }
      const title = type === "general" ? "Allmän kontroll" : "Golvvärme";

      setItems(selectedItems);
      setInspectionSubtitle(title);
      setIsTypeModalVisible(false);
      setCurrentIndex(0);
      setImagesByItemId({});

      if (project?.id) {
        await updateProject(project.id, {
          inspectionItems: selectedItems,
          currentInspections: {},
          currentInspectionRowComments: {},
          currentInspectionNotes: "",
          currentImagesByItem: {},
          currentImages: [],
          nameClarification: "",
        });
      }
    },
    [templates, project?.id, updateProject]
  );

  const takePhoto = useCallback(async () => {
    const item = items[currentIndex];
    if (!item) return;
    const existing = imagesByItemId[item.id] || [];
    if (existing.length >= 6) {
      Alert.alert("Gräns nådd", "Max 6 bilder per punkt.");
      return;
    }
    const r = await ImagePicker.launchCameraAsync({ quality: 0.3 });
    if (!r.canceled) {
      const nextForItem = [...existing, r.assets[0].uri];
      const nextMap = { ...imagesByItemId, [item.id]: nextForItem };
      setImagesByItemId(nextMap);
      persistData({ imagesByItemId: nextMap });
    }
  }, [items, currentIndex, imagesByItemId, persistData]);

  const removePhotoForItem = useCallback(
    (itemId, imageIndex) => {
      const arr = [...(imagesByItemId[itemId] || [])];
      arr.splice(imageIndex, 1);
      const next = { ...imagesByItemId, [itemId]: arr };
      setImagesByItemId(next);
      persistData({ imagesByItemId: next });
    },
    [imagesByItemId, persistData]
  );

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
            imagesByItem: imagesByItemId,
            images: flattenImagesByItemsOrder(items, imagesByItemId),
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
                  currentImagesByItem: {},
                  currentImages: [],
                  nameClarification: "",
                  inspectionItems: [],
                }),
          });

          setIsNameEntryModalVisible(false);
          navigation.goBack();

          const mergedCompanyForPdf = {
            ...companyData,
            ...(companyFromTenant && {
              companyName: companyFromTenant.companyName ?? companyData?.companyName,
              companyLogoUrl: companyFromTenant.companyLogoUrl ?? companyData?.companyLogoUrl,
              logoUrl: companyFromTenant.logoUrl ?? companyFromTenant.companyLogoUrl ?? companyData?.logoUrl,
            }),
          };

          setTimeout(() => {
            Alert.alert("Sparat!", "Egenkontrollen har arkiverats. Vill du skapa PDF nu?", [
              { text: "Nej", style: "cancel" },
              { text: "Ja", onPress: () => handleInspectionPdf(project, entryData, mergedCompanyForPdf) },
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
      imagesByItemId,
      nameClarification,
      companyData,
      companyFromTenant,
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
    imagesByItemId,
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
    removePhotoForItem,
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
