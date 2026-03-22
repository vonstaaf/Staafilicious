const admin = require('firebase-admin');
const fs = require('fs');
const readline = require('readline');

// Byt ut mot sökvägen till din egen service account-nyckel om den ligger någon annanstans
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

// --- TURBO 2.0 INSTÄLLNINGAR ---
const START_FROM_LINE = 0; 
const BATCH_SIZE = 500; 
const MAX_CONCURRENT_BATCHES = 20; 
// ----------------------------

async function uploadPrices() {
  // Använd originalfilen direkt!
  const filePath = './Rexel-GN.txt';
  
  // 🔑 HÄR ÄR MAGIN: 'latin1' gör att Node.js förstår Rexels Å, Ä, Ö automatiskt!
  const fileStream = fs.createReadStream(filePath, { encoding: 'latin1' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let currentLine = 0;
  let totalImported = 0;
  let currentBatch = db.batch();
  let countInBatch = 0;
  let activePromises = new Set(); 

  console.log(`🚀 TURBO 2.0: Startar uppladdning till 'price_list_rexel'...`);
  const startTime = Date.now();

  for await (const line of rl) {
    currentLine++;
    if (currentLine < START_FROM_LINE) continue;
    if (!line.trim()) continue;

    const col = line.split(';');
    if (col.length >= 5) {
      const rawArtNum = col[0].trim();
      
      // Letar upp exakt 7 siffror i rad för att få ett rent E-nummer. 
      const eNumMatch = rawArtNum.match(/\b\d{7}\b/);
      const documentId = eNumMatch ? eNumMatch[0] : rawArtNum.replace(/\//g, '-');
      
      const price = parseFloat(col[4].replace(',', '.').trim());

      if (documentId && !isNaN(price)) {
        // 🔑 ÄNDRAT: Vi sparar i 'price_list_rexel' så att det matchar appen
        const docRef = db.collection('price_list_rexel').doc(documentId);
        
        currentBatch.set(docRef, {
          articleNumber: documentId, // E-nummer
          name: col[1].trim(),       // Nu kommer namnet in med perfekta ÅÄÖ!
          unit: col[2].trim(),
          discountGroup: col[3].trim(),
          purchasePrice: price,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true }); 

        countInBatch++;
        totalImported++;

        if (countInBatch === BATCH_SIZE) {
          const batchToCommit = currentBatch;
          const promise = batchToCommit.commit().then(() => {
            activePromises.delete(promise);
            const elapsed = (Date.now() - startTime) / 1000;
            const speed = Math.round(totalImported / elapsed);
            console.log(`⚡ ${totalImported} artiklar klara (${speed} st/sek)`);
          }).catch(err => {
            console.error("❌ Batch misslyckades:", err);
            activePromises.delete(promise); 
          });

          activePromises.add(promise);
          
          if (activePromises.size >= MAX_CONCURRENT_BATCHES) {
            await Promise.race(activePromises);
          }

          currentBatch = db.batch();
          countInBatch = 0;
        }
      }
    }
  }

  if (countInBatch > 0) {
    await currentBatch.commit();
  }
  
  await Promise.all(activePromises);

  const finalTime = (Date.now() - startTime) / 1000;
  console.log(`\n--- ALLT KLART PÅ ${Math.round(finalTime)} SEKUNDER! ---`);
  process.exit();
}

uploadPrices().catch(console.error);