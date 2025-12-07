const fs = require('fs');
const path = require('path');

const content = process.env.GOOGLE_SERVICES_JSON;
if (!content) {
  console.warn('⚠️ GOOGLE_SERVICES_JSON saknas – hoppar över lokalt.');
  process.exit(0); // avsluta utan fel
}

const outDir = path.join(__dirname, '..', 'android', 'app');
const outFile = path.join(outDir, 'google-services.json');

// se till att katalogen finns
fs.mkdirSync(outDir, { recursive: true });

// skriv filen
fs.writeFileSync(outFile, content, { encoding: 'utf8' });
console.log(`✅ Skrev google-services.json till: ${outFile}`);