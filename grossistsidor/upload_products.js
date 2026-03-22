const admin = require("firebase-admin");
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

// 1. DIN FIREBASE ADMIN-NYCKEL (Samma som förut)
const serviceAccount = require("./staafilicious-firebase-adminsdk-fbsvc-2b4a7921fc.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://staafilicious-default-rtdb.europe-west1.firebasedatabase.app"
});

const db = admin.database();

// Filnamnen som de heter på din dator
const FILES_TO_PROCESS = [
  { filename: "EL_Excel.xlsx", category: "el" },
  { filename: "VA & VVS_Excel.xlsx", category: "vvs" },
  { filename: "Bygg_Excel.xlsx", category: "bygg" },
  { filename: "Isolering_Excel.xlsx", category: "isolering" },
  { filename: "Kyla_Excel.xlsx", category: "kyla" },
  { filename: "Plåt_Excel.xlsx", category: "plat" },
  { filename: "Retail_Excel.xlsx", category: "retail" },
  { filename: "Ventilation_Excel.xlsx", category: "ventilation" },
  { filename: "Verktyg_Excel.xlsx", category: "verktyg" }
];

async function processFile(fileConfig) {
  const filePath = path.join(__dirname, fileConfig.filename);
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Hittar inte: ${fileConfig.filename}`);
    return;
  }

  console.log(`\n⏳ Öppnar Excel-fil: ${fileConfig.filename}...`);
  
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Konverterar arket till en lista med objekt
    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log(`📊 Hittade ${data.length} rader i filen. Börjar ladda upp...`);
    
    let successCount = 0;
    let batchData = {};
    let batchCounter = 0;

    for (const row of data) {
      // Vi hämtar värden baserat på kolumnnamnen i Ahlsells Excel
      const artNr = String(row['Artikelnr'] || "").replace(/[^0-9A-Za-z]/g, '');
      const price = parseFloat(row['GNP']) || 0;

      if (!artNr || price === 0) continue;

      const item = {
        id: artNr,
        price: price,
        discountGroup: String(row['Materialklass'] || "Övrigt"),
        unit: String(row['Enhet'] || "ST"),
        name: String(row['Benämning'] || "Saknar benämning"),
        category: fileConfig.category,
        wholesaler: "ahlsell"
      };

      batchData[item.id] = item;
      successCount++;
      batchCounter++;

      // Skicka upp i klumpar om 2000 åt gången
      if (batchCounter >= 2000) {
        await db.ref('allProducts').update(batchData);
        process.stdout.write(`\rSkickat ${successCount} artiklar till Firebase...`);
        batchData = {};
        batchCounter = 0;
      }
    }

    // Skicka sista biten
    if (Object.keys(batchData).length > 0) {
      await db.ref('allProducts').update(batchData);
    }

    console.log(`\n✅ Klar! Totalt ${successCount} artiklar uppladdade från ${fileConfig.filename}.`);
  } catch (err) {
    console.error(`❌ Fel vid bearbetning av ${fileConfig.filename}:`, err.message);
  }
}

async function run() {
  console.log("🧹 Rensar databasen...");
  await db.ref('allProducts').remove();
  
  for (const file of FILES_TO_PROCESS) {
    await processFile(file);
  }
  
  console.log("\n🎉 ALLT ÄR KLART! Nu finns hela sortimentet i din Firebase.");
  process.exit();
}

run();