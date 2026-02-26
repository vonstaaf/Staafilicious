import { ref, get, update } from "firebase/database"; 
import { getAuth } from "firebase/auth";
import { rtdb } from "../firebaseConfig"; 

// --- MINNES-CACHE ---
let cachedProducts = null;
let isFetching = false;

/**
 * SAMMANFOGAD & OPTIMERAD SÖKNING:
 * Nu med Turbo-prestanda och robust pris-lookup.
 */
export const searchProducts = async (searchQuery, wholesalerId = 'local', userDiscounts = null) => {
  if (!searchQuery || searchQuery.length < 2) return [];
  
  const term = searchQuery.toLowerCase().trim();
  const auth = getAuth();
  const user = auth.currentUser;

  try {
    // 1. Spärr: Om vi redan hämtar data, vänta istället för att starta ny hämtning
    if (!cachedProducts && isFetching) {
      await new Promise(res => setTimeout(res, 800));
      return searchProducts(searchQuery, wholesalerId, userDiscounts);
    }

    // 2. Hämta och bygg cache (endast vid första sökningen)
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
      
      // Snabb-loop för att bygga sökindex
      for (const key in data) {
        const item = data[key];
        let art = String(item.artNr || item.articleNumber || "-");
        
        // 08-fix (artiklar som börjar på noll men tappat den i db)
        if (art.length === 5 && art.startsWith('8')) art = "0" + art;

        // 🛠 FLEXIBEL PRIS-LOOKUP: Letar efter alla vanliga fältnamn (pris, brutto, price etc)
        const rawPrice = item.price || item.pris || item.brutto || item.purchasePrice || 0;
        const safePrice = typeof rawPrice === 'string' 
          ? parseFloat(rawPrice.replace(',', '.')) 
          : parseFloat(rawPrice);

        tempArray.push({
          ...item,
          dbKey: key,
          label: item.label || item.name || item.beskrivning || "Namn saknas",
          artNr: art, 
          originalPrice: isNaN(safePrice) ? 0 : safePrice,
          rabattkod: String(item.rabattkod || item.rg || item.rK || "").trim(),
          // Blixtsnabb söksträng
          _s: (art + " " + (item.label || item.name || "")).toLowerCase()
        });
      }

      cachedProducts = tempArray;
      isFetching = false;
      console.log(`✅ Cache redo: ${cachedProducts.length} artiklar.`);
    }

    // 3. ⚡ BLIXTSNABB FILTRERING
    // Vi filtrerar först ut alla som matchar, utan att räkna priser än
    let matches = [];
    for (let i = 0; i < cachedProducts.length; i++) {
      if (cachedProducts[i]._s.includes(term)) {
        matches.push(cachedProducts[i]);
        if (matches.length > 100) break; // Avbryt tidigt för prestanda
      }
    }

    // 4. ✂️ SLICE FÖRE MAP (Detta gör det "sjukt snabbt")
    // Vi räknar bara rabatter på de 40 artiklar som faktiskt visas.
    const limitedResults = matches.slice(0, 40);

    // 5. 🛠 APPLICERA RABATTER
    const myAgreements = (wholesalerId !== 'local' && userDiscounts) ? userDiscounts[wholesalerId] : null;

    return limitedResults.map(item => {
      let discountPercent = 0;
      let discountLabel = "Generell rabatt";

      if (wholesalerId !== 'local' && user && myAgreements) {
        // Kolla efter exakt träff i dina 15 000 rabattgrupper
        const agreement = myAgreements[item.rabattkod];
        if (agreement) {
          const pVal = agreement.p || agreement.percent || 0;
          discountPercent = parseFloat(pVal);
          discountLabel = agreement.l || agreement.label || item.rabattkod;
        } else {
          // Fallback: Generella rabattsatser per grossist
          if (wholesalerId === 'rexel') discountPercent = 0.15;
          if (wholesalerId === 'solar') discountPercent = 0.10;
          if (wholesalerId === 'ahlsell') discountPercent = 0.08;
        }
      }

      const brutto = item.originalPrice || 0;
      const netto = brutto * (1 - discountPercent);

      return {
        ...item,
        price: netto.toFixed(2), // Netto-priset som visas i listan
        bruttoPrice: brutto.toFixed(2),
        discountPercent: (discountPercent * 100).toFixed(0),
        discountLabel: discountLabel,
        wholesalerName: wholesalerId.charAt(0).toUpperCase() + wholesalerId.slice(1),
        isWholesalerPrice: wholesalerId !== 'local'
      };
    });

  } catch (error) {
    isFetching = false;
    console.error("❌ Sökfel:", error);
    return [];
  }
};

/**
 * REPARATIONSFUNKTION:
 */
export const repairDatabaseArtNumbers = async () => {
  const db = rtdb; 
  const productsRef = ref(db, 'products');

  try {
    const snapshot = await get(productsRef);
    if (!snapshot.exists()) return { success: false };

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
      cachedProducts = null;
      return { success: true, count };
    }
    return { success: true, count: 0 };
  } catch (error) {
    console.error("❌ Reparationsfel:", error);
    throw error;
  }
};