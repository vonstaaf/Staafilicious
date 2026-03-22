import { db } from '../firebaseConfig'; // Går ut ur mappen för att hitta configen
import { writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { WHOLESALER_MAPS } from './wholesalerMaps';

export const runPriceImport = async (fileContent, wholesalerKey) => {
  const config = WHOLESALER_MAPS[wholesalerKey.toLowerCase()];
  const lines = fileContent.split(/\r?\n/);
  const batchSize = 500;
  let totalImported = 0;

  for (let i = 0; i < lines.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = lines.slice(i, i + batchSize);

    chunk.forEach((line) => {
      const col = line.split(config.delimiter);
      if (col.length >= 5) {
        const artNum = col[config.columns.articleNumber]?.trim();
        const rawPrice = col[config.columns.price]?.replace(',', '.'); 
        const price = parseFloat(rawPrice);

        if (artNum && !isNaN(price)) {
          const docRef = doc(db, config.collection, artNum);
          batch.set(docRef, {
            articleNumber: artNum,
            name: col[config.columns.name]?.trim() || "",
            unit: col[config.columns.unit]?.trim() || "",
            discountGroup: col[config.columns.discountGroup]?.trim() || "",
            purchasePrice: price,
            updatedAt: serverTimestamp()
          });
          totalImported++;
        }
      }
    });
    await batch.commit();
  }
  return totalImported;
};