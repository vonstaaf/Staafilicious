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
  serverTimestamp 
} from "firebase/firestore";

export const ProjectsContext = createContext();

export const ProjectsProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProjectState] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Ladda senast valda projekt från minnet
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

  // 2. Realtidslyssnare mot Firebase
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
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

      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const projectsData = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          kostnader: doc.data().kostnader || [],
          products: doc.data().products || []
        }));
        
        setProjects(projectsData);

        // Synka det valda projektet om datan i Firebase ändras (t.ex. nytt namn eller nya produkter)
        setSelectedProjectState(prev => {
          if (!prev) return null;
          const updated = projectsData.find(p => p.id === prev.id);
          return updated || null;
        });

        setLoading(false);
      }, (error) => {
        console.error("Firestore Error:", error);
        setLoading(false);
      });

      return () => unsubscribeSnapshot();
    });

    return () => unsubscribeAuth();
  }, []);

  // Hjälpfunktion för att tvätta namnet (Versaler + Trimma mellanslag)
  const cleanProjectName = (name) => name.toUpperCase().replace(/[^A-ZÅÄÖ0-9\s]/g, "").trim();

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
    if (!auth.currentUser) return;
    
    // Säkra formatet: Stora bokstäver och inga specialtecken
    const formattedName = cleanProjectName(name);
    const formattedCode = code.toUpperCase().trim();

    const newProjectData = {
      name: formattedName,
      code: formattedCode,
      owner: auth.currentUser.uid,
      members: [auth.currentUser.uid],
      kostnader: [],
      products: [],
      createdAt: serverTimestamp(),
    };

    try {
      // Vi lägger bara till i Firebase. onSnapshot-lyssnaren ovan kommer 
      // att uppdatera listan automatiskt.
      const docRef = await addDoc(collection(db, "groups"), newProjectData);
      return docRef;
    } catch (e) {
      console.error("Error creating project:", e);
      throw e;
    }
  };

  const importProject = async (code) => {
    if (!auth.currentUser) return;
    const formattedCode = code.toUpperCase().trim();
    
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
      // Här sätter vi valet manuellt eftersom vi vill "hoppa in" i projektet direkt
      await setSelectedProject({ id: docSnap.id, ...data });
    } else {
      throw new Error("Koden är ogiltig");
    }
  };

  const updateProjectData = async (projectId, updateObject) => {
    try {
      const ref = doc(db, "groups", projectId);
      await updateDoc(ref, updateObject);
    } catch (e) {
      console.error("Context: Error updating data", e);
      throw e;
    }
  };

  const renameProject = async (id, newName) => {
    const formattedName = cleanProjectName(newName);
    await updateDoc(doc(db, "groups", id), { name: formattedName });
  };

  const deleteProject = async (id) => {
    try {
      await deleteDoc(doc(db, "groups", id));
      if (selectedProject?.id === id) {
        await setSelectedProject(null);
      }
    } catch (e) {
      console.error("Context: Error deleting project", e);
    }
  };

  return (
    <ProjectsContext.Provider value={{ 
      projects, 
      selectedProject, 
      setSelectedProject, 
      createProject, 
      importProject, 
      renameProject, 
      deleteProject, 
      updateProjectData, 
      loading 
    }}>
      {children}
    </ProjectsContext.Provider>
  );
};