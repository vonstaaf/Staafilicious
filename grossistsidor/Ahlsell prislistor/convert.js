const fs = require('fs');
const xlsx = require('xlsx');

const files = [
  'EL_Excel.xlsx',
  'Isolering_Excel.xlsx',
  'Kyla_Excel.xlsx',
  'Plåt_Excel.xlsx',
  'Retail_Excel.xlsx',
  'VA & VVS_Excel.xlsx',
  'Ventilation_Excel.xlsx',
  'Verktyg_Excel.xlsx',
  'Bygg_Excel.xlsx'
];

console.log("🔄 Startar konvertering från Excel till CSV...");

files.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`⏳ Läser ${file}...`);
    // Läs Excel-filen
    const workbook = xlsx.readFile(file);
    const sheetName = workbook.SheetNames[0]; // Ta första fliken
    
    // Konvertera till CSV
    const csvData = xlsx.utils.sheet_to_csv(workbook.Sheets[sheetName]);
    
    // Skapa det nya namnet (Byt ut .xlsx mot .csv)
    const newName = file.replace('.xlsx', '.csv');
    
    // Spara den nya filen
    fs.writeFileSync(newName, csvData, 'utf8');
    console.log(`✅ Klar! Skapade ${newName}`);
  } else {
    console.log(`⚠️ Hittade inte filen: ${file}`);
  }
});

console.log("\n🎉 Alla filer är konverterade och redo för uppladdning!");