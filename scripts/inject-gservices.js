const fs = require('fs');
const path = require('path');

const content = process.env.GOOGLE_SERVICES_JSON;
if (!content) {
  console.error('GOOGLE_SERVICES_JSON saknas');
  process.exit(1);
}

const outFile = path.join(__dirname, '..', 'android', 'app', 'google-services.json');
fs.writeFileSync(outFile, content, { encoding: 'utf8' });
console.log(`Skrev google-services.json till: ${outFile}`);