// context/BadgeContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { collection, onSnapshot } from "firebase/firestore";

const BadgeContext = createContext();

export function BadgeProvider({ children }) {
  const [KostnadsCount, setKostnadsCount] = useState(0);
  const [productsCount, setProductsCount] = useState(0);
  const [notificationsCount, setNotificationsCount] = useState(0);

  useEffect(() => {
    const unsubKostnads = onSnapshot(collection(db, "Kostnads"), (snapshot) => {
      const pending = snapshot.docs.filter(doc => doc.data().status === "pending");
      setKostnadsCount(pending.length);
    });

    const unsubProducts = onSnapshot(collection(db, "products"), (snapshot) => {
      const newItems = snapshot.docs.filter(doc => doc.data().isNew === true);
      setProductsCount(newItems.length);
    });

    const unsubNotifications = onSnapshot(collection(db, "notifications"), (snapshot) => {
      const unread = snapshot.docs.filter(doc => doc.data().read === false);
      setNotificationsCount(unread.length);
    });

    return () => {
      unsubKostnads();
      unsubProducts();
      unsubNotifications();
    };
  }, []);

  return (
    <BadgeContext.Provider value={{ KostnadsCount, productsCount, notificationsCount }}>
      {children}
    </BadgeContext.Provider>
  );
}

export const useBadges = () => useContext(BadgeContext);