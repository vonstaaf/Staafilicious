import React, { createContext, useState, useEffect, useMemo, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db, auth } from "../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  setDoc,
  doc,
  deleteDoc,
  getDocs,
  getDoc,
  serverTimestamp
} from "firebase/firestore";

import { sendPushNotification } from "../utils/pushService";
import { formatProjectName } from "../utils/stringHelpers";

export const ProjectsContext = createContext();

export const ProjectsProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProjectState] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companyData, setCompanyData] = useState(null);
  
  // 🔑 MATERIAL & RABATTER
  const [allProducts, setAllProducts] = useState([]);
  const [discountAgreements, setDiscountAgreements] = useState({});

  // 🔑 Mallar per yrke: El (general, heating), VVS (vvs), Bygg (bygg)
  const [templates, setTemplates] = useState({ general: [], heating: [], vvs: [], bygg: [] });
  // Behåller denna för bakåtkompatibilitet med createProject-logiken
  const inspectionTemplate = useMemo(() => templates.general, [templates]);

  const generateProjectCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const notifyCollaborators = async (projectId, title, body) => {
    try {
      const projectRef = doc(db, "groups", projectId);
      const projectSnap = await getDoc(projectRef);
      if (!projectSnap.exists()) return;
      const { members, name } = projectSnap.data();

      for (const memberId of members) {
        if (memberId !== auth.currentUser?.uid) {
          const userRef = doc(db, "users", memberId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists() && userSnap.data().pushToken) {
            await sendPushNotification(userSnap.data().pushToken, title || name, body);
          }
        }
      }
    } catch (error) {
      console.error("Notis-fel:", error);
    }
  };

  useEffect(() => {
    const loadSavedProject = async () => {
      try {
        const saved = await AsyncStorage.getItem("lastSelectedProject");
        if (saved) setSelectedProjectState(JSON.parse(saved));
      } catch (e) { console.error(e); }
    };
    loadSavedProject();
  }, []);

  useEffect(() => {
    let unsubscribeSnapshot = null;
    let unsubscribeProducts = null; 
    let unsubscribeDiscounts = null;
    let unsubscribeTemplates = null; 

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user || null);
      if (!user) {
        setProjects([]);
        setSelectedProjectState(null);
        setCompanyData(null);
        setAllProducts([]);
        setDiscountAgreements({});
        setTemplates({ general: [], heating: [] });
        setLoading(false);
        if (unsubscribeSnapshot) unsubscribeSnapshot();
        if (unsubscribeProducts) unsubscribeProducts();
        if (unsubscribeDiscounts) unsubscribeDiscounts();
        if (unsubscribeTemplates) unsubscribeTemplates();
        return;
      }

      // 1. Hämta företagsdata
      const userRef = doc(db, "users", user.uid);
      getDoc(userRef).then((snap) => {
         if(snap.exists()) {
           setCompanyData(snap.data());
           if(snap.data().logoUrl) {
             AsyncStorage.setItem('@company_logo', snap.data().logoUrl);
           }
         }
      });

      // 2. Lyssna på projekt
      const q = query(collection(db, "groups"), where("members", "array-contains", user.uid));
      unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const projectsData = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          status: d.data().status || "active",
          kostnader: d.data().kostnader || [],
          products: d.data().products || []
        }));
        
        const sorted = projectsData.sort((a, b) => {
            if (a.status === 'archived' && b.status !== 'archived') return 1;
            if (a.status !== 'archived' && b.status === 'archived') return -1;
            return (a.name || "").localeCompare(b.name || "");
        });

        setProjects(sorted);
        
        setSelectedProjectState((prev) => {
          if (!prev) return null;
          const updated = projectsData.find((p) => p.id === prev.id);
          return updated || null;
        });
        setLoading(false);
      });

      // 3. Lyssna på det globala materialregistret
      const productsQuery = query(collection(db, "products"));
      unsubscribeProducts = onSnapshot(productsQuery, (snap) => {
        const pData = snap.docs.map(d => ({
          id: d.id,
          ...d.data()
        }));
        setAllProducts(pData);
      }, (err) => {
        console.error("Fel vid materialsynk:", err);
      });

      // 4. Lyssna på Rabattbrev
      const discountRef = doc(db, "userDiscounts", user.uid);
      unsubscribeDiscounts = onSnapshot(discountRef, (snap) => {
        if (snap.exists()) {
          const rawData = snap.data().data;
          if (typeof rawData === 'string') {
            try {
              const parsed = JSON.parse(rawData);
              setDiscountAgreements(parsed);
            } catch (e) {
              console.error("Kunde inte tolka rabattdata:", e);
            }
          } else if (snap.data().agreements) {
            setDiscountAgreements(snap.data().agreements);
          }
        }
      });

      // 🔑 5. Lyssna på Master-mallar (Kollektion för flera typer)
      const templatesRef = collection(db, "users", user.uid, "templates");
      unsubscribeTemplates = onSnapshot(templatesRef, (snap) => {
        const tData = { general: [], heating: [], vvs: [], bygg: [] };
        snap.forEach(docSnap => {
          if (['general', 'heating', 'vvs', 'bygg'].includes(docSnap.id)) {
            tData[docSnap.id] = docSnap.data().items || [];
          }
        });
        setTemplates(tData);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      if (unsubscribeProducts) unsubscribeProducts();
      if (unsubscribeDiscounts) unsubscribeDiscounts();
      if (unsubscribeTemplates) unsubscribeTemplates();
    };
  }, []);

  const setSelectedProject = async (project) => {
    setSelectedProjectState(project);
    if (project) {
      await AsyncStorage.setItem("lastSelectedProject", JSON.stringify(project));
    } else {
      await AsyncStorage.removeItem("lastSelectedProject");
    }
  };

  // 🔑 UPPDATERAD OCH SÄKRAD: Hanterar både (typ, rader) och (rader)
  const saveInspectionTemplate = async (type, items) => {
    if (!currentUser) return;
    
    // Om 'type' är en array är det gamla anropet: saveInspectionTemplate(items)
    // Då sätter vi typen till 'general' och flyttar datan.
    let finalType = typeof type === 'string' ? type : 'general';
    let finalItems = Array.isArray(type) ? type : items;

    try {
      // finalType är nu garanterat en sträng, vilket stoppar .split-felet
      const templateRef = doc(db, "users", currentUser.uid, "templates", finalType);
      await setDoc(templateRef, { 
        items: finalItems || [], 
        updatedAt: serverTimestamp() 
      });
    } catch (error) {
      console.error("Kunde inte spara mall:", error);
      throw error;
    }
  };

  const createProject = async (name, code) => {
    if (!auth.currentUser) throw new Error("Ingen användare");
    
    const formattedName = formatProjectName(name);
    const codeToUse = code ? code.toString().toUpperCase().trim() : generateProjectCode();

    const newProjectData = {
      name: formattedName,
      code: codeToUse,
      owner: auth.currentUser.uid,
      members: [auth.currentUser.uid],
      status: "active",
      kostnader: [],
      products: [],
      /** Tom tills montören väljer Allmän/Golvvärme i egenkontroll (undviker att mallvalet hoppas över). */
      inspectionItems: [],
      createdAt: new Date().toISOString(),
      ...(companyData?.companyId ? { companyId: companyData.companyId } : {}),
    };
    
    const docRef = await addDoc(collection(db, "groups"), newProjectData);
    const createdProject = { id: docRef.id, ...newProjectData };
    await setSelectedProject(createdProject);

    return createdProject;
  };

  const importProject = async (code) => {
    const formattedCode = (code || "").toString().toUpperCase().trim();
    const q = query(collection(db, "groups"), where("code", "==", formattedCode));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data();
      if (!data.members.includes(auth.currentUser.uid)) {
        await updateDoc(doc(db, "groups", docSnap.id), { members: [...data.members, auth.currentUser.uid] });
        notifyCollaborators(docSnap.id, "Ny medlem!", `${auth.currentUser.email} har gått med i projektet ${data.name}`);
      }
      const project = { id: docSnap.id, ...data };
      await setSelectedProject(project);
    } else {
      throw new Error("Ogiltig kod");
    }
  };

  const updateProject = async (projectId, updates) => {
    const finalUpdates = { ...updates };
    if (updates.name) finalUpdates.name = formatProjectName(updates.name);
    if (updates.code) finalUpdates.code = updates.code.toString().toUpperCase().replace(/[^a-zA-Z0-9]/g, "");

    const ref = doc(db, "groups", projectId);
    await updateDoc(ref, finalUpdates);

    if (selectedProject && selectedProject.id === projectId) {
        setSelectedProjectState(prev => ({ ...prev, ...finalUpdates }));
    }
    
    notifyCollaborators(projectId, "Projekt uppdaterat", "En kollega har gjort ändringar i projektet.");
  };

  const deleteProject = async (id) => {
    await deleteDoc(doc(db, "groups", id));
    if (selectedProject?.id === id) await setSelectedProject(null);
  };

  const archiveProject = async (projectId) => {
    await updateDoc(doc(db, "groups", projectId), { status: "archived", archivedAt: new Date().toISOString() });
    if (selectedProject?.id === projectId) await setSelectedProject(null);
  };

  const restoreProject = async (projectId) => {
    await updateDoc(doc(db, "groups", projectId), { status: "active", archivedAt: null });
  };

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        selectedProject,
        setSelectedProject,
        createProject,
        addProject: createProject,
        importProject,
        updateProject,
        deleteProject,
        archiveProject,
        restoreProject,
        loading,
        companyData,
        saveInspectionTemplate,
        allProducts,
        discountAgreements,
        templates, 
        inspectionTemplate 
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
};

/**
 * Samma värde som useContext(ProjectsContext) — används av AiWorkOrderScreen m.fl.
 * Projekt hämtas via Firestore där användaren är medlem (members array-contains uid),
 * inte baserat på admin-roll.
 */
export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (ctx == null) {
    throw new Error("useProjects måste användas inom ProjectsProvider.");
  }
  return ctx;
}