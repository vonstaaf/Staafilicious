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
        setLoading(false);
        return;
      }

      const q = query(collection(db, "groups"), where("members", "array-contains", user.uid));
      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const projectsData = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          status: d.data().status || "active",
          kostnader: d.data().kostnader || [],
          products: d.data().products || []
        }));
        const sorted = projectsData.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setProjects(sorted);
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

  // UPPDATERAD: Hämtar nu användarens standardmall vid skapande
  const createProject = async (name, code) => {
    if (!auth.currentUser) throw new Error("Ingen användare");
    const formattedName = cleanProjectName(name);
    const codeToUse = code ? code.toString().toUpperCase().trim() : generateProjectCode();
    
    // 1. Försök hämta användarens sparade mall (kategorier/punkter)
    let templateToUse = [];
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.defaultInspectionTemplate) {
          templateToUse = userData.defaultInspectionTemplate;
        }
      }
    } catch (err) {
      console.log("Kunde inte hämta standardmall:", err);
    }

    // 2. Skapa projektdata med mallen inkluderad
    const newProjectData = {
      name: formattedName,
      code: codeToUse,
      owner: auth.currentUser.uid,
      members: [auth.currentUser.uid],
      status: "active",
      kostnader: [],
      products: [],
      inspectionTemplate: templateToUse, // Här läggs din sparade mall in
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, "groups"), newProjectData);
    return { id: docRef.id, ...newProjectData };
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
        loading
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
};