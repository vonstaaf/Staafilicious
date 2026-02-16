// ProjectsContext.js
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

export const ProjectsContext = createContext();

export const ProjectsProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProjectState] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Ladda senast valda projekt från AsyncStorage
  useEffect(() => {
    const loadSavedProject = async () => {
      try {
        const saved = await AsyncStorage.getItem("lastSelectedProject");
        if (saved) {
          setSelectedProjectState(JSON.parse(saved));
        }
      } catch (e) {
        console.error("Context: AsyncStorage error", e);
      }
    };
    loadSavedProject();
  }, []);

  // 2. Auth-lyssnare + realtime listener för projekt
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user || null);

      if (!user) {
        setProjects([]);
        setSelectedProjectState(null);
        setLoading(false);
        return;
      }

      const q = query(
        collection(db, "groups"),
        where("members", "array-contains", user.uid)
      );

      const unsubscribeSnapshot = onSnapshot(
        q,
        (snapshot) => {
          const projectsData = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            kostnader: d.data().kostnader || [],
            products: d.data().products || []
          }));

          setProjects(projectsData);

          // Synka det valda projektet om datan i Firestore ändras
          setSelectedProjectState((prev) => {
            if (!prev) return null;
            const updated = projectsData.find((p) => p.id === prev.id);
            return updated || null;
          });

          setLoading(false);
        },
        (error) => {
          console.error("Firestore Error:", error);
          setLoading(false);
        }
      );

      return () => unsubscribeSnapshot();
    });

    return () => unsubscribeAuth();
  }, []);

  // Hjälpfunktion för att tvätta namnet (Versaler + Trimma mellanslag)
  const cleanProjectName = (name = "") =>
    name.toString().toUpperCase().replace(/[^A-ZÅÄÖ0-9\s]/g, "").trim();

  const setSelectedProject = async (project) => {
    try {
      setSelectedProjectState(project);
      if (project) {
        await AsyncStorage.setItem("lastSelectedProject", JSON.stringify(project));
      } else {
        await AsyncStorage.removeItem("lastSelectedProject");
      }
    } catch (e) {
      console.error("Context: Error saving project choice", e);
    }
  };

  const createProject = async (name, code) => {
    if (!auth.currentUser) throw new Error("Ingen inloggad användare");
    const formattedName = cleanProjectName(name);
    const formattedCode = (code || "").toString().toUpperCase().trim();

    const newProjectData = {
      name: formattedName,
      code: formattedCode,
      owner: auth.currentUser.uid,
      members: [auth.currentUser.uid],
      kostnader: [],
      products: [],
      createdAt: serverTimestamp()
    };

    try {
      const docRef = await addDoc(collection(db, "groups"), newProjectData);
      const created = { id: docRef.id, ...newProjectData };
      // Lokalt uppdatera state så UI reagerar snabbare (onSnapshot kommer också uppdatera)
      setProjects((prev) => [created, ...prev]);
      return created;
    } catch (e) {
      console.error("Error creating project:", e);
      throw e;
    }
  };

  const importProject = async (code) => {
    if (!auth.currentUser) throw new Error("Ingen inloggad användare");
    const formattedCode = (code || "").toString().toUpperCase().trim();

    const q = query(collection(db, "groups"), where("code", "==", formattedCode));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data();
      if (!data.members.includes(auth.currentUser.uid)) {
        await updateDoc(doc(db, "groups", docSnap.id), {
          members: [...data.members, auth.currentUser.uid]
        });
      }
      const project = { id: docSnap.id, ...data };
      await setSelectedProject(project);
      return project;
    } else {
      throw new Error("Koden är ogiltig");
    }
  };

  // updateProject: uppdaterar ett projekt i Firestore och i lokal state, returnerar uppdaterat projekt
  const updateProject = async (projectId, updates) => {
    if (!projectId) throw new Error("Missing projectId");
    try {
      const ref = doc(db, "groups", projectId);

      // Hämta aktuell data från Firestore för att slå ihop (om behövs)
      const snap = await getDoc(ref);
      const currentData = snap.exists() ? snap.data() : {};

      const merged = { ...currentData, ...updates };

      // Uppdatera i Firestore (bara fälten i updates)
      await updateDoc(ref, updates);

      // Uppdatera lokal state (projects array)
      setProjects((prev) => {
        const idx = prev.findIndex((p) => p.id === projectId);
        if (idx === -1) {
          return [...prev, { id: projectId, ...merged }];
        } else {
          const copy = [...prev];
          copy[idx] = { id: projectId, ...merged };
          return copy;
        }
      });

      // Uppdatera selectedProject om det är samma
      setSelectedProjectState((prev) => {
        if (prev && prev.id === projectId) {
          return { id: projectId, ...merged };
        }
        return prev;
      });

      return { id: projectId, ...merged };
    } catch (e) {
      console.error("updateProject error:", e);
      throw e;
    }
  };

  const updateProjectData = async (projectId, updateObject) => {
    // Behåll för bakåtkompatibilitet (samma som updateProject men enklare namn)
    return updateProject(projectId, updateObject);
  };

  const renameProject = async (id, newName) => {
    const formattedName = cleanProjectName(newName);
    try {
      await updateDoc(doc(db, "groups", id), { name: formattedName });
      // Lokalt uppdatera state
      setProjects((prev) => prev.map(p => p.id === id ? { ...p, name: formattedName } : p));
      setSelectedProjectState((prev) => prev && prev.id === id ? { ...prev, name: formattedName } : prev);
    } catch (e) {
      console.error("Context: Error renaming project", e);
      throw e;
    }
  };

  const deleteProject = async (id) => {
    try {
      await deleteDoc(doc(db, "groups", id));
      setProjects((prev) => prev.filter(p => p.id !== id));
      if (selectedProject?.id === id) {
        await setSelectedProject(null);
      }
    } catch (e) {
      console.error("Context: Error deleting project", e);
      throw e;
    }
  };

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        selectedProject,
        setSelectedProject,
        createProject,
        importProject,
        renameProject,
        deleteProject,
        updateProject,
        updateProjectData,
        currentUser,
        loading
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
};