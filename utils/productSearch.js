import { collection, query, where, getDocs, limit, orderBy, startAt, endAt } from "firebase/firestore";
import { capitalizeFirst } from "./stringHelpers";
import { ref, get, update } from "firebase/database"; 
import { getAuth } from "firebase/auth";
import { db, rtdb } from "../firebaseConfig"; 

/**
 * 🛠 HJÄLPFUNKTION: Fixar teckenkodning (Å, Ä, Ö)
 * Räddar trasiga tecken (fyrkanter med X) från grossisternas databaser.
 */
const fixEncoding = (str) => {
  if (!str) return "";
  
  let fixed = str;
  
  // 1. Trolla bort "spöktecknet" (fyrkanten) som hamnat direkt efter ett korrekt Å, Ä eller Ö
  fixed = fixed.replace(/([ÅÄÖåäö])[^\x00-\x7FÅÄÖåäö\s\-\.\,\/]/g, '$1');

  // 2. Om tecknet står ensamt och saknar bokstav (t.ex. V[fyrkant]GG)
  return fixed.replace(/[^\x00-\x7FÅÄÖåäö\s\-\.\,\/]/g, (match, offset, fullString) => {
    const prev = fullString.charAt(offset - 1)?.toUpperCase();
    const next = fullString.charAt(offset + 1)?.toUpperCase();
    
    if (prev === 'P' && (next === ' ' || next === 'S')) return 'Å'; // PÅ
    if (prev === 'F' && next === 'R') return 'Å'; // FRÅN
    if (prev === 'V') return 'Ä'; // V_GG -> VÄGG
    if (prev === 'L') return 'Ä'; // REL_ -> RELÄ
    if (prev === 'S' && next === 'S') return 'Ä'; // MÄSSING
    if (prev === 'R' && next === 'R') return 'Ö'; // R_R -> RÖR
    if (prev === 'D' && next === 'S') return 'Ö'; // D_SA -> DOSA
    
    return ''; 
  });
};

export const searchProducts = async (searchQuery, selectedWholesaler = 'rexel', userDiscounts = null) => {
  if (!searchQuery || searchQuery.length < 2) return [];
  
  const term = searchQuery.trim(); 
  const auth = getAuth();
  const user = auth.currentUser;

  // Dynamisk kollektion baserat på vald grossist
  const collectionName = selectedWholesaler === 'local' ? 'articles' : `price_list_${selectedWholesaler}`;

  try {
    const articlesRef = collection(db, collectionName);
    let q;

    const isNumberSearch = /^\d+$/.test(term);

    if (isNumberSearch) {
      // Sök på articleNumber
      q = query(
        articlesRef,
        orderBy('articleNumber'),
        startAt(term),
        endAt(term + '\uf8ff'),
        limit(40)
      );
    } else {
      // Sök på namn (Versaler för att matcha databasen)
      const upperTerm = term.toUpperCase();
      q = query(
        articlesRef,
        orderBy('name'),
        startAt(upperTerm),
        endAt(upperTerm + '\uf8ff'),
        limit(40)
      );
    }

    const querySnapshot = await getDocs(q);
    const results = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const artNum = data.articleNumber || doc.id;
      
      // Tvätta namnet från trasiga tecken
      const fixedName = fixEncoding(data.name || "Namn saknas");

      // --- VIKTIGT: Här bygger vi objektet som skickas till appen ---
      const resultItem = {
        dbKey: doc.id,
        eNumber: artNum,
        label: fixedName, 
        unit: data.unit || "st",
        artNr: artNum,
        imageUrl: data.imageUrl || null, // Hämtar in bilden från prislistan
        brand: data.brand || null,       // Hämtar in varumärket från prislistan
        prices: {} 
      };

      if (data.purchasePrice !== undefined) {
        let discountPercent = 0.15; // Standard fallback
        let discountLabel = `Generell rabatt (${selectedWholesaler})`;
        
        if (user && userDiscounts && userDiscounts[selectedWholesaler]) {
           const agreements = userDiscounts[selectedWholesaler];
           
           const itemSpecific = agreements[artNum];
           const groupSpecific = agreements[data.discountGroup];

           const finalAgreement = itemSpecific || groupSpecific;

           if (finalAgreement) {
             discountPercent = parseFloat(finalAgreement.p || finalAgreement.percent || 0);
             discountLabel = finalAgreement.l || finalAgreement.label || (itemSpecific ? "Artikelrabatt" : data.discountGroup);
           }
        }

        const brutto = parseFloat(data.purchasePrice) || 0;
        const netto = brutto * (1 - discountPercent);

        resultItem.prices[selectedWholesaler] = {
          netPrice: netto.toFixed(2),
          bruttoPrice: brutto.toFixed(2),
          discountPercent: (discountPercent * 100).toFixed(0),
          discountLabel: discountLabel,
          articleNumber: artNum,
          discountGroup: data.discountGroup
        };

        // Bakåtkompatibilitet för UI (ProductsScreen.js)
        resultItem.price = netto.toFixed(2);
        resultItem.bruttoPrice = brutto.toFixed(2);
        resultItem.discountPercent = (discountPercent * 100).toFixed(0);
        resultItem.discountLabel = discountLabel;
        resultItem.wholesalerName = capitalizeFirst(selectedWholesaler);
        resultItem.isWholesalerPrice = true;
      }

      results.push(resultItem);
    });

    return results;

  } catch (error) {
    console.error(`❌ Firestore Sökfel i ${collectionName}:`, error);
    return [];
  }
};

export const repairDatabaseArtNumbers = async () => {
  const productsRef = ref(rtdb, 'products');
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
      await update(ref(rtdb), updates);
      return { success: true, count };
    }
    return { success: true, count: 0 };
  } catch (error) {
    console.error("❌ Reparationsfel:", error);
    throw error;
  }
};