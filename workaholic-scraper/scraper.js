const axios = require('axios');
const cheerio = require('cheerio');

async function testEnummersok(eNumber) {
  const url = `https://www.e-nummersok.se/search?q=${eNumber}`;
  console.log(`🔎 Testar E-nummersök för: ${eNumber}...`);

  try {
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 5000
    });
    const $ = cheerio.load(data);
    
    // De använder oftast en bild med klassen 'img-responsive' eller inuti 'product-card'
    const img = $('.product-card img').attr('src') || $('.product-image img').attr('src');
    const brand = $('.brand-name').first().text().trim() || $('.manufacturer').first().text().trim();

    console.log("\n--- TRÄFF! ---");
    console.log(`Bild: ${img ? 'https://www.e-nummersok.se' + img : 'INGEN'}`);
    console.log(`Märke: ${brand || 'INGET'}`);

  } catch (e) {
    console.log("Fel:", e.message);
  }
}

testEnummersok('1820296');