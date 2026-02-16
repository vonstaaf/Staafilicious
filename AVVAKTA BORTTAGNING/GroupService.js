import { db } from "./firebaseConfig";
import { doc, setDoc, getDocs, collection, onSnapshot } from "firebase/firestore";

/**
 * Hjälpfunktion för att säkerställa att Projektnamn alltid börjar med stor bokstav.
 */
const formatProjectName = (name) => {
  if (!name) return "";
  return name.charAt(0).toUpperCase() + name.slice(1);
};

// Spara ett Projekt (tidigare grupp)
export const saveProject = async (project) => {
  if (!project.id) throw new Error("Projektet saknar ID");

  // Säkerställ att namnet följer regeln om stor bokstav
  const formattedProject = {
    ...project,
    name: formatProjectName(project.name),
    updatedAt: new Date().toISOString(), // Bra för sortering senare
  };

  const projectRef = doc(db, "projects", formattedProject.id);
  await setDoc(projectRef, formattedProject);
};

// Hämta alla Projekt (engångsladdning)
export const loadProjects = async () => {
  const querySnapshot = await getDocs(collection(db, "projects"));
  return querySnapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  }));
};

// Realtidslyssning för Projekt
export const subscribeProjects = (callback) => {
  return onSnapshot(collection(db, "projects"), snapshot => {
    const projects = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
    // Sortera projekten alfabetiskt så de visas snyggt
    const sortedProjects = projects.sort((a, b) => a.name.localeCompare(b.name));
    callback(sortedProjects);
  });
};