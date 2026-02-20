import React, { createContext, useState, useEffect } from "react";
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
  setDoc, // 🔑 Tillagd för att spara mallar
  doc,
  deleteDoc,
  getDocs,
  getDoc,
  serverTimestamp
} from "firebase/firestore";

// Import för notis-tjänsten
import { sendPushNotification } from "../utils/pushService";

export const ProjectsContext = createContext();

export const ProjectsProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProjectState] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companyData, setCompanyData] = useState(null); // 🔑 Ny state för företagsdata (loggan)

  // HJÄLPFUNKTION: GENERERA ALFANUMERISK KOD
  const generateProjectCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // HJÄLPFUNKTION: NOTIFIERA KOLLEGOR
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
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user || null);
      if (!user) {
        setProjects([]);
        setSelectedProjectState(null);
        setCompanyData(null);
        setLoading(false);
        return;
      }

      // 🔑 1. Hämta företagsdata (för loggan i PDF:er)
      const userRef = doc(db, "users", user.uid);
      getDoc(userRef).then((snap) => {
         if(snap.exists()) {
           setCompanyData(snap.data());
           // Spara loggan lokalt för säkerhets skull
           if(snap.data().logoUrl) {
              AsyncStorage.setItem('@company_logo', snap.data().logoUrl);
           }
         }
      });

      // 2. Lyssna på projekt
      const q = query(collection(db, "groups"), where("members", "array-contains", user.uid));
      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const projectsData = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          status: d.data().status || "active",
          kostnader: d.data().kostnader || [],
          products: d.data().products || []
        }));
        
        // Sortering
        const sorted = projectsData.sort((a, b) => {
            // Aktiva först, arkiverade sist
            if (a.status === 'archived' && b.status !== 'archived') return 1;
            if (a.status !== 'archived' && b.status === 'archived') return -1;
            // Sen bokstavsordning på namn
            return (a.name || "").localeCompare(b.name || "");
        });

        setProjects(sorted);
        
        // Uppdatera valt projekt om det ändrats i bakgrunden
        setSelectedProjectState((prev) => {
          if (!prev) return null;
          const updated = projectsData.find((p) => p.id === prev.id);
          return updated || null;
        });
        setLoading(false);
      });
      return () => unsubscribeSnapshot();
    });
    return () => unsubscribeAuth();
  }, []);

  const cleanProjectName = (name = "") => {
    if (!name) return "";
    const trimmed = name.toString().trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  };

  const setSelectedProject = async (project) => {
    setSelectedProjectState(project);
    if (project) {
      await AsyncStorage.setItem("lastSelectedProject", JSON.stringify(project));
    } else {
      await AsyncStorage.removeItem("lastSelectedProject");
    }
  };

  // --- NY FUNKTION: SPARA MALL FÖR EGENKONTROLL ---
  // Denna anropas från InspectionScreen för att spara nuvarande lista som global mall
  const saveInspectionTemplate = async (items) => {
    if (!currentUser) return;
    try {
      // Vi sparar mallen under användarens profil i en sub-collection 'settings'
      const templateRef = doc(db, "users", currentUser.uid, "settings", "inspectionTemplate");
      await setDoc(templateRef, { items: items, updatedAt: serverTimestamp() });
      console.log("✅ Mall för egenkontroll sparad!");
    } catch (error) {
      console.error("Kunde inte spara mall:", error);
      throw error;
    }
  };

  // UPPDATERAD: Skapar projekt OCH hämtar mallen
  const createProject = async (name, code) => {
    if (!auth.currentUser) throw new Error("Ingen användare");
    
    const formattedName = cleanProjectName(name);
    // Om kod skickas med används den, annars genereras en ny
    const codeToUse = code ? code.toString().toUpperCase().trim() : generateProjectCode();
    
    // 1. Försök hämta användarens sparade mall (kategorier/punkter)
    let templateToUse = [];
    try {
      // Vi kollar på den nya platsen för mallar
      const templateRef = doc(db, "users", auth.currentUser.uid, "settings", "inspectionTemplate");
      const templateSnap = await getDoc(templateRef);
      
      if (templateSnap.exists()) {
        templateToUse = templateSnap.data().items || [];
        console.log("📥 Hämtade sparad mall för egenkontroll.");
      } else {
         // Fallback: Kolla om det fanns en gammal mall på user-dokumentet (bakåtkompatibilitet)
         const userRef = doc(db, "users", auth.currentUser.uid);
         const userSnap = await getDoc(userRef);
         if (userSnap.exists() && userSnap.data().defaultInspectionTemplate) {
            templateToUse = userSnap.data().defaultInspectionTemplate;
         }
      }
    } catch (err) {
      console.log("Kunde inte hämta standardmall:", err);
    }

    // 2. Skapa projektdata med mallen inkluderad i 'inspectionItems'
    const newProjectData = {
      name: formattedName,
      code: codeToUse,
      owner: auth.currentUser.uid,
      members: [auth.currentUser.uid],
      status: "active",
      kostnader: [],
      products: [],
      inspectionItems: templateToUse, // 🔑 Här laddas din sparade mall in direkt!
      createdAt: new Date().toISOString() // Använder ISO string för enklare sortering i appen
    };
    
    const docRef = await addDoc(collection(db, "groups"), newProjectData);
    const createdProject = { id: docRef.id, ...newProjectData };
    
    // Sätt det nya projektet som valt direkt
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
    if (updates.name) finalUpdates.name = cleanProjectName(updates.name);
    if (updates.code) finalUpdates.code = updates.code.toString().toUpperCase().replace(/[^a-zA-Z0-9]/g, "");

    const ref = doc(db, "groups", projectId);
    await updateDoc(ref, finalUpdates);
    
    // Uppdatera lokalt state direkt om det är valt projekt
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
        addProject: createProject, // Alias för kompatibilitet
        importProject,
        updateProject,
        deleteProject,
        archiveProject,
        restoreProject,
        loading,
        companyData, // 🔑 Exponerar företagsdata (logga)
        saveInspectionTemplate // 🔑 Ny funktion
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
};