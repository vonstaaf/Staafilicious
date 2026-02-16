const fs = require('fs');
const readline = require('readline');
const XLSX = require('xlsx');

const outputStream = fs.createWriteStream('produkter.json');

async function mergeAndConvert() {
  outputStream.write('{\n');
  let isFirst = true;

  // --- DEL 1: LÄS CSV-FILEN ---
  console.log('Bearbetar Produktlista.csv...');
  const csvStream = fs.createReadStream('Produktlista.csv', { encoding: 'latin1' });
  const rl = readline.createInterface({ input: csvStream, terminal: false });

  for await (const line of rl) {
    const columns = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    if (!columns || columns[0].includes("Artikelnr")) continue;

    const artNr = columns[0].replace(/"/g, "").trim();
    const label = columns[1] ? columns[1].replace(/"/g, "").trim() : "";
    let multiple = columns[2] ? columns[2].replace(/"/g, "").trim() : "1";
    if (multiple === "0") multiple = "1";

    if (!isFirst) outputStream.write(',\n');
    outputStream.write(`  "${artNr}": ${JSON.stringify({ artNr, label, multiple })}`);
    isFirst = false;
  }

  // --- DEL 2: LÄS EXCEL-FILEN (.xlsx) ---
  console.log('Bearbetar Excel-filen...');
  // Ersätt 'NyLista.xlsx' med det exakta namnet på din nya fil
  const workbook = XLSX.readFile('NyLista.xlsx'); 
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Konverterar excel-rader till ett format vi kan jobba med
  const data = XLSX.utils.sheet_to_json(worksheet);

  for (const row of data) {
    // Här antar jag att kolumnerna heter 'Artikelnr' och 'Benämning' i Excel
    // Om de heter något annat, t.ex. 'Art.nr', ändra namnen här under:
    const artNr = String(row['Artikelnr'] || row['Art.nr'] || '').trim();
    const label = String(row['Benämning'] || row['Namn'] || '').trim();
    const multiple = "1"; // Standardvärde eftersom det saknades

    if (!artNr) continue;

    if (!isFirst) outputStream.write(',\n');
    outputStream.write(`  "${artNr}": ${JSON.stringify({ artNr, label, multiple })}`);
    isFirst = false;
  }

  outputStream.write('\n}');
  outputStream.end();
  console.log('KLART! Sammanfogad produkter.json har skapats.');
}

mergeAndConvert();