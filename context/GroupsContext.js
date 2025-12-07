// context/GroupsContext.js
import React, { createContext, useState, useEffect } from "react";
import { db, auth } from "../firebaseConfig";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  getDocs,
} from "firebase/firestore";

const capitalizeFirst = (text) => {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const calculateTotal = (items) =>
  items.reduce(
    (acc, it) =>
      acc +
      (Number(it.purchasePrice) || 0) *
        (1 + (Number(it.markup) || 0) / 100) *
        (1 + (Number(it.vat) || 0) / 100) *
        (Number(it.quantity) || 1),
    0
  );

export const GroupsContext = createContext();

export const GroupsProvider = ({ children }) => {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, "groups"), where("ownerUid", "==", user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const groupsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setGroups(groupsData);

        if (selectedGroup) {
          const updatedSel = groupsData.find((g) => g.id === selectedGroup.id);
          if (updatedSel) setSelectedGroup(updatedSel);
        }
      },
      (error) => {
        console.error("Fel vid hämtning av grupper:", error.message);
      }
    );

    return () => unsubscribe();
  }, [selectedGroup]);

  const createGroup = async (name, code) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      if (!name.trim() || !code.trim()) {
        console.error("Fel: Gruppnamn och kod krävs.");
        return;
      }

      setLoading(true);
      const newGroup = {
        name: capitalizeFirst(name),
        code,
        ownerUid: user.uid,
        products: [],
        kostnader: [], // ✅ rätt namn
      };

      const docRef = await addDoc(collection(db, "groups"), newGroup);
      setGroups((prev) => [...prev, { id: docRef.id, ...newGroup }]);
    } catch (error) {
      console.error("Fel vid skapande av grupp:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const importGroup = async (code) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      if (!code.trim()) {
        console.error("Fel: Gruppkod krävs.");
        return;
      }

      setLoading(true);
      const q = query(collection(db, "groups"), where("code", "==", code));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const importedGroup = snapshot.docs[0];
        setGroups((prev) => [
          ...prev,
          { id: importedGroup.id, ...importedGroup.data() },
        ]);
      } else {
        const imported = {
          name: "Importerad grupp",
          code,
          ownerUid: user.uid,
          products: [],
          kostnader: [], // ✅ rätt namn
        };

        const docRef = await addDoc(collection(db, "groups"), imported);
        setGroups((prev) => [...prev, { id: docRef.id, ...imported }]);
      }
    } catch (error) {
      console.error("Fel vid import av grupp:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const renameGroup = async (id, newName) => {
    try {
      if (!newName.trim()) {
        console.error("Fel: Nytt namn krävs.");
        return;
      }

      setLoading(true);
      const groupRef = doc(db, "groups", id);
      await updateDoc(groupRef, { name: capitalizeFirst(newName) });

      setGroups((prev) =>
        prev.map((g) =>
          g.id === id ? { ...g, name: capitalizeFirst(newName) } : g
        )
      );

      setSelectedGroup((prevSel) =>
        prevSel?.id === id
          ? { ...prevSel, name: capitalizeFirst(newName) }
          : prevSel
      );
    } catch (error) {
      console.error("Fel vid uppdatering av grupp:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteGroup = async (id) => {
    try {
      setLoading(true);
      const groupRef = doc(db, "groups", id);
      await deleteDoc(groupRef);
      setGroups((prev) => prev.filter((g) => g.id !== id));
      setSelectedGroup((prevSel) => (prevSel?.id === id ? null : prevSel));
    } catch (error) {
      console.error("Fel vid borttagning av grupp:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateProducts = async (groupId, products) => {
    try {
      setLoading(true);
      const groupRef = doc(db, "groups", groupId);
      await updateDoc(groupRef, { products });

      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, products } : g))
      );

      setSelectedGroup((prevSel) =>
        prevSel?.id === groupId ? { ...prevSel, products } : prevSel
      );
    } catch (error) {
      console.error("Fel vid uppdatering av produkter:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateKostnader = async (groupId, kostnader) => {
    try {
      setLoading(true);
      const groupRef = doc(db, "groups", groupId);
      await updateDoc(groupRef, { kostnader }); // ✅ rätt namn

      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, kostnader } : g))
      );

      setSelectedGroup((prevSel) =>
        prevSel?.id === groupId ? { ...prevSel, kostnader } : prevSel
      );
    } catch (error) {
      console.error("Fel vid uppdatering av kostnader:", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GroupsContext.Provider
      value={{
        groups,
        selectedGroup,
        setSelectedGroup,
        createGroup,
        importGroup,
        renameGroup,
        deleteGroup,
        updateProducts,
        updateKostnader, // ✅ rätt namn
        calculateTotal,
        loading,
      }}
    >
      {children}
    </GroupsContext.Provider>
  );
};