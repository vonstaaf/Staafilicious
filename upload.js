const admin = require("firebase-admin");
const fs = require("fs");

// 1. Gå till Firebase Console -> Projektinställningar -> Service Accounts
// 2. Klicka på "Generate new private key". 
// 3. Spara filen i din mapp och döp om den till 'serviceAccountKey.json'

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://staafilicious-default-rtdb.europe-west1.firebasedatabase.app"
});

const db = admin.database();
const ref = db.ref("products");

const products = JSON.parse(fs.readFileSync("produkter.json", "utf8"));
const total = Object.keys(products).length;
let count = 0;

async function upload() {
  console.log(`Startar uppladdning av ${total} produkter...`);
  
  // Vi delar upp det i bitar om 500 produkter åt gången för att inte överbelasta
  const keys = Object.keys(products);
  for (let i = 0; i < keys.length; i += 500) {
    const chunk = {};
    keys.slice(i, i + 500).forEach(key => {
      chunk[key] = products[key];
    });
    
    await ref.update(chunk);
    count += Object.keys(chunk).length;
    console.log(`Framsteg: ${count} / ${total} produkter uppladdade.`);
  }
  
  console.log("KLART! Alla produkter ligger nu i Firebase.");
  process.exit();
}

upload().catch(console.error);