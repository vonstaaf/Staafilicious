const admin = require('firebase-admin');
const fs = require('fs');
const readline = require('readline');

// Byt ut mot sökvägen till din egen service account-nyckel
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

// --- TURBO 2.0 INSTÄLLNINGAR ---
const BATCH_SIZE = 500; 
const MAX_CONCURRENT_BATCHES = 20; 
// ----------------------------

// En smart funktion för att dela upp Ahlsells rader där namnen kan innehålla kommatecken
function parseCSVLine(text) {
  let ret = [], keep = false, curr = '';
  for (let i = 0; i < text.length; i++) {
    let c = text[i];
    if (c === '"') { keep = !keep; } 
    else if (c === ',' && !keep) { ret.push(curr.trim()); curr = ''; } 
    else { curr += c; }
  }
  ret.push(curr.trim());
  return ret;
}

async function uploadAhlsell() {
  // Byt ut detta namn mot den Ahlsell-fil du vill köra just nu!
  const filePath = './Bygg_Excel.csv';
  
  // Ahlsell är redan UTF-8, så vi använder standardläsning
  const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let currentLine = 0;
  let totalImported = 0;
  let currentBatch = db.batch();
  let countInBatch = 0;
  let activePromises = new Set(); 

  console.log(`🚀 TURBO: Startar uppladdning till 'price_list_ahlsell'...`);
  const startTime = Date.now();

  for await (const line of rl) {
    currentLine++;
    
    // Hoppa över den första raden (Rubrikerna: Artikelnr, GNP, osv)
    if (currentLine === 1) continue; 
    if (!line.trim()) continue;

    const col = parseCSVLine(line);
    
    // Ahlsell har 10 kolumner
    if (col.length >= 6) {
      const rawArtNum = col[0]; // Artikelnr (T.ex. 0000220)
      
      // Plocka ut rena e-nummer om det finns (7 siffror i rad)
      const eNumMatch = rawArtNum.match(/\b\d{7}\b/);
      const documentId = eNumMatch ? eNumMatch[0] : rawArtNum.replace(/\//g, '-');
      
      // Ahlsell använder punkt för decimaler i vissa filer, kommatecken i andra. Vi hanterar båda.
      const priceString = col[1].replace(',', '.');
      const price = parseFloat(priceString);

      if (documentId && !isNaN(price)) {
        // Vi sparar i 'price_list_ahlsell'
        const docRef = db.collection('price_list_ahlsell').doc(documentId);
        
        currentBatch.set(docRef, {
          articleNumber: documentId,
          name: col[5],            // Benämning ligger på index 5 hos Ahlsell
          unit: col[3],            // Enhet ligger på index 3
          discountGroup: col[2],   // Materialklass/Rabattgrupp ligger på index 2
          purchasePrice: price,    // GNP ligger på index 1
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
  console.log(`\n--- ALLA AHLSELL-ARTIKLAR KLARA PÅ ${Math.round(finalTime)} SEKUNDER! ---`);
  process.exit();
}

uploadAhlsell().catch(console.error);