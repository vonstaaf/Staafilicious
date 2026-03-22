import admin from 'firebase-admin';
import axios from 'axios';
// 'with' används istället för 'assert' i nyare Node.js
import serviceAccount from "./serviceAccountKey.json" with { type: "json" };

// 1. Initiera Firebase
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

// 2. Inställningar
const COLLECTION = 'price_list_rexel';
const BATCH_SIZE = 500; 

async function runSniper() {
    console.log("🚀 STARTAR ELDIREKT SNIPER - KOMPLETT VERSION");

    let stats = { checked: 0, updated: 0, failed: 0, skipped: 0 };
    let consecutiveFailures = 0;
    let lastDoc = null;

    while (true) {
        let query = db.collection(COLLECTION).orderBy('articleNumber').limit(BATCH_SIZE);
        if (lastDoc) query = query.startAfter(lastDoc);

        const snapshot = await query.get();
        if (snapshot.empty) break;

        const docs = snapshot.docs;
        
        // Vi kör i mindre grupper parallellt (10 i taget) för att inte bli bannade
        for (let i = 0; i < docs.length; i += 10) {
            const batch = docs.slice(i, i + 10);
            
            await Promise.all(batch.map(async (doc) => {
                stats.checked++;
                const data = doc.data();
                
                // Rensa E-numret från eventuella mellanslag eller punkter
                const enr = String(data.articleNumber || "").replace(/\D/g, "").trim();
                const currentUrl = data.imageUrl || "";
                const isBroken = !currentUrl || currentUrl.includes('solidm.se') || currentUrl.includes('rexel.se');

                if (isBroken && enr.length >= 7) {
                    // OBS: Detta format kan behöva justeras om Eldirekt ändrat sin struktur!
                    const targetUrl = `https://www.eldirekt.se/images/products/${enr}.jpg`;
                    
                    try {
                        await axios.head(targetUrl, { 
                            timeout: 2500,
                            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' }
                        });
                        
                        await doc.ref.update({ 
                            imageUrl: targetUrl,
                            lastImageSync: admin.firestore.FieldValue.serverTimestamp()
                        });
                        stats.updated++;
                        consecutiveFailures = 0; // Nollställ fel-räknaren vid framgång
                    } catch (e) {
                        stats.failed++;
                        consecutiveFailures++;
                    }
                } else {
                    stats.skipped++;
                }
            }));

            // Rapportera status
            process.stdout.write(`\r📦 Kollat: ${stats.checked} | ✅ Lagat: ${stats.updated} | ❌ Saknas: ${stats.failed}`);

            // 3. SÄKERHETS-STOPP (Om de första 20 försöken misslyckas är URL-formatet fel)
            if (stats.failed > 20 && stats.updated === 0) {
                console.error("\n\n❌ KRITISKT: Inga bilder hittas! URL-formatet är förmodligen fel.");
                console.log(`Testad URL: https://www.eldirekt.se/images/products/[ENUMMER].jpg`);
                process.exit(1); 
            }
        }

        lastDoc = docs[docs.length - 1];
    }

    console.log("\n\n✅ KLART!");
}

runSniper().catch(err => console.error("FEL:", err));