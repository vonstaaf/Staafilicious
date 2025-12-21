import React, { createContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db, auth } from "../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth"; // ✅ Importera denna!
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  getDocs 
} from "firebase/firestore";

export const GroupsContext = createContext();

export const GroupsProvider = ({ children }) => {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroupState] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Ladda sparad grupp från AsyncStorage
  useEffect(() => {
    const loadSavedGroup = async () => {
      try {
        const saved = await AsyncStorage.getItem("lastSelectedGroup");
        if (saved) setSelectedGroupState(JSON.parse(saved));
      } catch (e) {
        console.error("Context: AsyncStorage error", e);
      }
    };
    loadSavedGroup();
  }, []);

  // 2. Hantera Firebase-lyssnare och Inloggningsstatus
  useEffect(() => {
    // Vi lyssnar på inloggningsstatus för att veta NÄR vi ska starta Firestore-lyssnaren
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setGroups([]);
        setLoading(false);
        return;
      }

      // Starta Firestore-lyssnaren när vi har en säker användare
      const q = query(
        collection(db, "groups"),
        where("members", "array-contains", user.uid)
      );

      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const groupsData = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          kostnader: doc.data().kostnader || [] 
        }));
        
        setGroups(groupsData);

        // Synka vald grupp
        setSelectedGroupState(prev => {
          if (!prev) return null;
          const updated = groupsData.find(g => g.id === prev.id);
          return updated || null;
        });

        setLoading(false); // ✅ Nu körs denna garanterat
      }, (error) => {
        console.error("Firestore Error:", error);
        setLoading(false);
      });

      return () => unsubscribeSnapshot();
    });

    return () => unsubscribeAuth();
  }, []);

  // --- LOGIKFUNKTIONER ---

  const setSelectedGroup = async (group) => {
    try {
      setSelectedGroupState(group);
      if (group) {
        await AsyncStorage.setItem("lastSelectedGroup", JSON.stringify(group));
      } else {
        await AsyncStorage.removeItem("lastSelectedGroup");
      }
    } catch (e) {
      console.error("Context: Error saving group choice", e);
    }
  };

  const createGroup = async (name, code) => {
    if (!auth.currentUser) return;
    return await addDoc(collection(db, "groups"), {
      name,
      code,
      owner: auth.currentUser.uid,
      members: [auth.currentUser.uid],
      kostnader: [],
      createdAt: new Date(),
    });
  };

  const importGroup = async (code) => {
    if (!auth.currentUser) return;
    const q = query(collection(db, "groups"), where("code", "==", code));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const groupDoc = querySnapshot.docs[0];
      const data = groupDoc.data();
      if (!data.members.includes(auth.currentUser.uid)) {
        await updateDoc(doc(db, "groups", groupDoc.id), {
          members: [...data.members, auth.currentUser.uid]
        });
      }
    } else {
      throw new Error("Koden är ogiltig");
    }
  };

  const updateKostnader = async (groupId, updatedKostnader) => {
    try {
      const groupRef = doc(db, "groups", groupId);
      await updateDoc(groupRef, { kostnader: updatedKostnader });
    } catch (e) {
      console.error("Context: Error updating costs", e);
      throw e;
    }
  };

  const calculateTotal = useCallback((kostnader) => {
    if (!kostnader || !Array.isArray(kostnader)) return 0;
    return kostnader.reduce((acc, item) => {
      const arbete = (Number(item.timmar) || 0) * (Number(item.timpris) || 0);
      const bilar = Number(item.antalBilar) || 1;
      const bilTotal = (Number(item.bilkostnad) || 0) * bilar;
      return acc + arbete + bilTotal;
    }, 0);
  }, []);

  const renameGroup = async (id, newName) => {
    await updateDoc(doc(db, "groups", id), { name: newName });
  };

  const deleteGroup = async (id) => {
    await deleteDoc(doc(db, "groups", id));
    if (selectedGroup?.id === id) {
      setSelectedGroup(null);
    }
  };

  return (
    <GroupsContext.Provider value={{ 
      groups, 
      selectedGroup, 
      setSelectedGroup, 
      createGroup, 
      importGroup, 
      renameGroup, 
      deleteGroup, 
      updateKostnader, 
      calculateTotal, 
      loading 
    }}>
      {children}
    </GroupsContext.Provider>
  );
};