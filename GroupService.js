// groupsService.js
import { db } from "./firebaseConfig";
import { doc, setDoc, getDocs, collection, onSnapshot } from "firebase/firestore";

// Spara en grupp
export const saveGroup = async (group) => {
  const groupRef = doc(db, "groups", group.id); // id kan vara t.ex. uuid
  await setDoc(groupRef, group);
};

// Hämta alla grupper (engångsladdning)
export const loadGroups = async () => {
  const querySnapshot = await getDocs(collection(db, "groups"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Realtidslyssning (uppdateras direkt när grupper ändras)
export const subscribeGroups = (callback) => {
  return onSnapshot(collection(db, "groups"), snapshot => {
    const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(groups);
  });
};