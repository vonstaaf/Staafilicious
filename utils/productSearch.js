import { ref, get, update } from "firebase/database"; 
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { rtdb } from "../firebaseConfig"; 

// --- MINNES-CACHE ---
let cachedProducts = null;
let isFetching = false; // 🔑 Spärr för att förhindra "race conditions"

/**
 * Hjälpfunktion för att tvätta strängar (Fuzzy search).
 */
const normalize = (text) => {
  if (!text) return "";
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9åäö]/g, ""); 
};

/**
 * REPARATIONSFUNKTION:
 * Lagar permanent nollorna i Firebase för 08-artiklar.
 */
export const repairDatabaseArtNumbers = async () => {
  const db = rtdb; 
  const productsRef = ref(db, 'products');

  try {
    console.log("🛠 Startar reparation av artikelnummer i Firebase...");
    const snapshot = await get(productsRef);
    if (!snapshot.exists()) return { success: false, message: "Ingen data hittades" };

    const data = snapshot.val();
    const updates = {};
    let count = 0;

    Object.keys(data).forEach(key => {
      let art = String(data[key].artNr || "");
      if (art.length === 5 && art.startsWith('8')) {
        updates[`/products/${key}/artNr`] = "0" + art;
        count++;
      }
    });

    if (count > 0) {
      await update(ref(db), updates);
      cachedProducts = null; // Töm cachen
      console.log(`✅ Reparation klar! ${count} st artiklar uppdaterade.`);
      return { success: true, count };
    }
    return { success: true, count: 0 };
  } catch (error) {
    console.error("❌ Reparationsfel:", error);
    throw error;
  }
};

/**
 * SAMMANFOGAD & OPTIMERAD SÖKNING:
 */
export const searchProducts = async (searchQuery, wholesalerId = 'local') => {
  if (!searchQuery || searchQuery.length < 2) return [];
  
  const term = searchQuery.toLowerCase().trim();
  const auth = getAuth();
  const user = auth.currentUser;

  try {
    // 1. 🛑 Spärr: Om vi redan håller på att hämta, vänta istället för att starta en ny
    if (!cachedProducts && isFetching) {
      console.log("⏳ Väntar på att pågående hämtning ska bli klar...");
      await new Promise(res => setTimeout(res, 800));
      return searchProducts(searchQuery, wholesalerId);
    }

    // 2. Hämta och bygg cache (endast en gång)
    if (!cachedProducts) {
      isFetching = true;
      console.log("🔍 Firebase: Hämtar produktkatalogen (184k rader)...");
      const productsRef = ref(rtdb, 'products');
      const snapshot = await get(productsRef);
      
      if (!snapshot.exists()) {
        cachedProducts = [];
        isFetching = false;
        return [];
      }

      const data = snapshot.val();
      const tempArray = [];
      
      // 🚀 Optimerad loop för enorma datamängder
      for (const key in data) {
        const item = data[key];
        let art = String(item.artNr || item.articleNumber || "-");
        
        // 08-fix direkt vid cache-bygget
        if (art.length === 5 && art.startsWith('8')) art = "0" + art;

        // 🛠 KROCKKUDDE: Säkra att priset blir ett giltigt nummer även om det saknas i db
        const rawPrice = item.price || item.purchasePrice || 0;
        const safePrice = parseFloat(String(rawPrice).replace(',', '.'));

        tempArray.push({
          ...item,
          dbKey: key,
          label: item.label || item.name || "Namn saknas",
          artNr: art, 
          originalPrice: isNaN(safePrice) ? 0 : safePrice,
          // ⚡ SUPER-INDEX: En sammanslagen sträng för blixtsnabb sökning
          _s: (art + " " + (item.label || item.name || "")).toLowerCase()
        });
      }

      cachedProducts = tempArray;
      isFetching = false;
      console.log(`✅ Cache redo: ${cachedProducts.length} artiklar.`);
    }

    // 3. ⚡ Blixtsnabb sökning (Vi söker nu bara i ETT fält istället för tre)
    // console.log(`🔎 Söker efter "${term}"...`); // Avkommentera för att debugga
    let baseResults = cachedProducts.filter(item => item._s.includes(term));

    // 4. Applicera grossist-priser
    if (wholesalerId !== 'local' && user) {
      baseResults = baseResults.map(item => {
        let factor = 1.0;
        if (wholesalerId === 'rexel') factor = 0.85;
        if (wholesalerId === 'solar') factor = 0.90;
        if (wholesalerId === 'ahlsell') factor = 0.92;
        
        // 🛠 KROCKKUDDE: Säkrar att originalPrice finns
        const basePrice = item.originalPrice || 0;
        
        return {
          ...item,
          price: (basePrice * factor).toFixed(2),
          wholesalerName: wholesalerId.charAt(0).toUpperCase() + wholesalerId.slice(1),
          isWholesalerPrice: true
        };
      });
    } else {
      baseResults = baseResults.map(item => ({
        ...item,
        price: (item.originalPrice || 0).toFixed(2),
        isWholesalerPrice: false
      }));
    }

    // 5. Sortering och begränsning (Slice till 40 för bättre UI-flyt)
    const sorted = baseResults.sort((a, b) => {
      const aStarts = a._s.startsWith(term);
      const bStarts = b._s.startsWith(term);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return 0;
    });

    return sorted.slice(0, 40);

  } catch (error) {
    isFetching = false;
    console.error("❌ Sökfel:", error);
    return [];
  }
};