# Förslag: Datamodell för El + VVS + Bygg (master-data och rabattbrev)

## 1. Nuvarande struktur (oförändrad som grund)

### 1.1 Firestore – artikel-/prislistdata (El)

| Resurs | Beskrivning |
|--------|-------------|
| **Kollektion** | `price_list_{wholesalerId}` |
| **Exempel** | `price_list_rexel`, `price_list_ahlsell`, `price_list_solar`, `price_list_elektroskandia` |
| **Document ID** | E-nummer (7 siffror) eller unikt artikel-id |
| **Fält (befintliga)** | `articleNumber`, `name`, `unit`, `discountGroup`, `purchasePrice`, `updatedAt`, (valfritt: `imageUrl`, `brand`) |

Sökning i appen sker via `orderBy('articleNumber')` eller `orderBy('name')` – denna logik ska **inte** ändras för dessa kollektioner.

### 1.2 Firestore – rabattbrev (userDiscounts)

| Resurs | Beskrivning |
|--------|-------------|
| **Kollektion** | `userDiscounts` |
| **Document** | `userDiscounts/{userId}` |
| **Fält** | `data` (JSON-sträng) eller `agreements` (objekt) |

**Struktur `agreements` (så som appen använder det idag):**

```txt
{
  "rexel":    { "kabel": { "p": "0.42", "l": "Kabel & Ledning" }, "1234567": { "p": "0.10", "l": "Artikelrabatt" }, ... },
  "ahlsell":  { "installation": { "p": "0.35", "l": "..." }, ... },
  ...
}
```

- Första nivån: **wholesalerId** (rexel, ahlsell, …).
- Andra nivån: **rabattgrupp-id** (kabel, installation, …) eller **artikelidentifierare** (E-nummer för artikelrabatt).
- Värde: `{ p: "0.42", l: "Kort etikett" }` (p = andel 0–1, l = label).

Kalkylmotorn använder: `userDiscounts[selectedWholesaler][articleNumber]` (artikelrabatt) eller `userDiscounts[selectedWholesaler][discountGroup]` (grupprabatt). Denna struktur ska **inte** tas bort eller skrivas över för El.

### 1.3 Kalkylmotor (productSearch.js)

- Indata: `searchQuery`, `selectedWholesaler`, `userDiscounts`.
- Kollektion: `price_list_${selectedWholesaler}` (eller `articles` för `'local'`).
- Sökning: prefix på `articleNumber` (siffror) eller `name` (versaler).
- Rabatt: först `agreements[artNum]`, sedan `agreements[data.discountGroup]`, sedan fallback.

Ingen av dessa delar behöver ändras för att El ska fortsätta fungera som idag.

---

## 2. Utökning: bransch på master-data (artiklar)

Idén är att **lägga till** bransch/identifierare på dokumentnivå, inte byta namn på befintliga fält. Då kan samma kalkyl- och rabattlogik anpassas per bransch utan att El-logiken bryts.

### 2.1 Bransch-typer

| Bransch | Primär identifierare | Grossister (enligt uppdrag) |
|---------|---------------------|-----------------------------|
| **el**  | E-nummer (articleNumber) | Rexel, Solar, E-skandia, Ahlsell (El) – befintligt |
| **vvs** | RSK-nummer              | Dahl, Ahlsell, Lundagrossisten, Solar |
| **bygg**| EAN / GTIN / artikelnummer | Beijer Byggmaterial, Optimera, Derome, XL-Bygg |

### 2.2 Föreslagen utökning av artikel-dokument

**Befintliga fält (oförändrade för El):**

- `articleNumber` – fortsatt E-nummer för El.
- `name`, `unit`, `discountGroup`, `purchasePrice`, `updatedAt`, …

**Nya fält (valfria, för att stödja flera branscher i samma eller separata kollektioner):**

| Fält | Typ | Beskrivning |
|------|-----|-------------|
| **industry** | string | `"el"` \| `"vvs"` \| `"bygg"`. Vilken bransch artikeln tillhör. |
| **rskNumber** | string | (VVS) RSK-nummer. Kan användas som primär söknyckel i VVS-kollektioner. |
| **ean** | string | (Bygg) EAN/GTIN. Kan användas för sökning i Bygg. |
| **supplierArticleNo** | string | (Bygg) Leverantörens eget artikelnummer. |

**Rekommendation:**

- **El:** Behåll nuvarande kollektioner och dokument **utan** `industry` (eller sätt `industry: "el"` vid nästa import). Sök och rabatt fortsatt på `articleNumber` + `discountGroup`.
- **VVS:** Nya kollektioner `price_list_dahl`, `price_list_lundagrossisten` osv. Dokument med t.ex. `industry: "vvs"`, `rskNumber` som primär identifierare och `articleNumber` antingen = RSK eller ett internt id. Sökning kan göras på `rskNumber` (eller `articleNumber` om ni normerar RSK dit).
- **Bygg:** Nya kollektioner `price_list_beijer`, `price_list_optimera` osv. Dokument med `industry: "bygg"`, `ean` och/eller `supplierArticleNo`, och `articleNumber` = det som används som dokument-id eller söknyckel.

Det viktiga är att **sökning och rabattuppslag i kalkylmotorn alltid använder samma fältnamn** (`articleNumber`, `discountGroup`) i den logik som läser dokumentet; bransch-specifika fält (RSK, EAN) kan användas vid import och vid behov för extra sökvägar, men behöver inte ändra den generiska flödeslogiken.

---

## 3. Kollektionsstrategi (master-data)

Två sätt att organisera, utan att röra befintlig El-data:

### Alternativ A: Bransch-specifika kollektioner (rekommenderat)

- **El (oförändrat):**  
  `price_list_rexel`, `price_list_ahlsell`, `price_list_solar`, `price_list_elektroskandia`  
  Dokument: som idag (E-nummer, `articleNumber`, `discountGroup`, …).

- **VVS:**  
  `price_list_dahl`, `price_list_ahlsell_vvs`, `price_list_lundagrossisten`, `price_list_solar_vvs`  
  (eller ni väljer att Ahlsell/Solar delar kollektion med El och filtrerar på `industry: "vvs"` – se nedan.)

- **Bygg:**  
  `price_list_beijer`, `price_list_optimera`, `price_list_derome`, `price_list_xlbygg`  
  Dokument med `industry: "bygg"`, `articleNumber` = EAN eller leverantörens art.nr, `discountGroup` enligt era Bygg-rabattgrupper.

Fördel: tydlig separation, enkelt att sätta index och säkerhetsregler per bransch. El-kollektionerna behöver inte få nya fält om ni inte vill.

### Alternativ B: Gemensam kollektion per grossist med `industry`

- Samma kollektion t.ex. `price_list_ahlsell` för både El- och VVS-artiklar.
- Varje dokument har `industry: "el"` eller `industry: "vvs"`.
- Document ID måste vara unikt över båda (t.ex. prefix `el_1234567` vs `vvs_RSK123`).

Fördel: färre kollektioner. Nackdel: samma grossist måste hantera två id-namespaces; sök och index måste filtrera på `industry`.

**Rekommendation:** Alternativ A – separata kollektioner per bransch/grossist-kombination, så att El-kollektionerna kan ligga kvar exakt som idag.

---

## 4. Rabattbrev (userDiscounts) – utökning utan att skriva över El

Befintlig struktur är **per grossist** och **per grupp/artikel**. Det behöver ni behålla.

### 4.1 Oförändrat för El

- `agreements["rexel"]`, `agreements["ahlsell"]`, … med nycklar = E-nummer eller rabattgrupp-id (kabel, installation, …).
- Ingen ändring i hur dessa nycklar eller värden sparas.

### 4.2 Utökning för VVS och Bygg

- **Samma dokument** `userDiscounts/{userId}`.
- **Samma struktur** `agreements[wholesalerId] = { [gruppId eller artikelId]: { p, l } }`.
- Nya grossist-nycklar för VVS/Bygg, t.ex.:
  - `dahl`, `lundagrossisten`, `ahlsell_vvs`, `solar_vvs` (om ni har separata kollektioner),
  - och för Bygg: `beijer`, `optimera`, `derome`, `xlbygg`.

Rabattgrupper för VVS/Bygg (ror, golvvarme, material, verktyg, …) mappar ni redan i appen till grupp-id som ni vill. Dessa id:n används som nycklar under respektive `agreements[wholesalerId]`, precis som idag för El. Då slipper ni ändra strukturen på `userDiscounts` – ni lägger bara till fler grossister och fler grupp-id:n.

**Viktigt:** Kalkylmotorn ska fortsatt använda `userDiscounts[selectedWholesaler][articleNumber]` och `userDiscounts[selectedWholesaler][discountGroup]`. För VVS blir då `articleNumber` (eller motsvarande fält) = RSK; för Bygg = EAN eller leverantörens artikelnummer. Alltså: samma nyckelkoncept, olika bransch-specifika värden.

---

## 5. Sammanfattning – datamodell på dokumentnivå

### 5.1 Artikel-dokument (master-data)

**El (befintligt, oförändrat):**

```txt
price_list_rexel / {documentId}
  articleNumber: "1234567"     // E-nummer
  name: "Kabel XYZ"
  unit: "m"
  discountGroup: "kabel"
  purchasePrice: 12.50
  updatedAt: <timestamp>
  // industry: "el"  (valfritt tillägg)
```

**VVS (nytt):**

```txt
price_list_dahl / {documentId}   // documentId = RSK eller eget id
  industry: "vvs"
  articleNumber: "RSK12345"     // eller samma som rskNumber; används för sök + rabattuppslag
  rskNumber: "RSK12345"
  name: "Rör 22mm"
  unit: "m"
  discountGroup: "ror"
  purchasePrice: 45.00
  updatedAt: <timestamp>
```

**Bygg (nytt):**

```txt
price_list_beijer / {documentId}
  industry: "bygg"
  articleNumber: "7312345678901"  // EAN eller leverantörens nummer; används för sök + rabatt
  ean: "7312345678901"
  supplierArticleNo: "ART-123"
  name: "Platta X"
  unit: "st"
  discountGroup: "material"
  purchasePrice: 89.00
  updatedAt: <timestamp>
```

Därmed kan kalkylmotorn överallt fortsätta använda `articleNumber` och `discountGroup`; El behöver inte få `industry`, `rskNumber` eller `ean` om ni inte vill.

### 5.2 userDiscounts (oförändrad struktur, fler grossister)

```txt
userDiscounts / {userId}
  data: "{ \"rexel\": { \"kabel\": { \"p\": \"0.42\", \"l\": \"...\" }, ... }, \"dahl\": { \"ror\": { \"p\": \"0.30\", \"l\": \"...\" }, ... }, \"beijer\": { \"material\": { \"p\": \"0.25\", \"l\": \"...\" } } }"
  // eller agreements: { rexel: {...}, dahl: {...}, beijer: {...} }
```

- El: `rexel`, `ahlsell`, `solar`, `elektroskandia` – som idag.
- VVS: `dahl`, `lundagrossisten`, (ev. `ahlsell` om ni delar med El eller `ahlsell_vvs` om separat).
- Bygg: `beijer`, `optimera`, `derome`, `xlbygg`.

---

## 6. Ändringar i appen (högnivå, ingen kod ännu)

1. **Kalkylmotor (productSearch.js)**  
   - Behåll nuvarande logik för El (samma kollektionsnamn, samma `orderBy('articleNumber')` / `orderBy('name')`, samma rabattuppslag).  
   - Utöka med: beroende på `selectedWholesaler` (eller en bransch-parameter) välja rätt kollektion och vid behov rätt sökfält (t.ex. för Bygg sök på `ean` eller `articleNumber`).  
   - Rabatt: fortsatt `userDiscounts[selectedWholesaler][articleNumber]` och `[discountGroup]` – inget behov av att ändra nyckelstrukturen.

2. **Grossistlista (wholesalers.js)**  
   - Redan uppdelat på yrke (el, vvs, bygg). Lägg till de nya grossisterna (Dahl, Lundagrossisten, Beijer, Optimera, Derome, XL-Bygg) med rätt `professions` och samma `id` som används i kollektionsnamn och i `agreements`.

3. **Rabattgrupper**  
   - Ni har redan VVS/Bygg-grupper i `DISCOUNT_GROUPS_BY_PROFESSION`. Se till att `discountGroup` i VVS/Bygg-prislistor använder samma id:n (ror, golvvarme, material, …) så att rabattbrev kopplar rätt.

4. **Projektprodukter (project.products)**  
   - Kan fortsatt vara en array med objekt som har t.ex. `articleNumber`, `name`, `purchasePrice`, `quantity`, …  
   - Valfritt: lägg till `industry` eller `wholesalerId` på varje rad så att ni i UI och rapporter kan skilja El-/VVS-/Bygg-rader.

---

## 7. Säkerställande av att El inte påverkas

- **Kollektioner:** Låt `price_list_rexel`, `price_list_ahlsell`, `price_list_solar`, `price_list_elektroskandia` vara oförändrade; inga nya obligatoriska fält på befintliga dokument.
- **userDiscounts:** Lägg endast till nya nycklar (`dahl`, `beijer`, …); ändra inte struktur eller innehåll för `rexel`, `ahlsell`, `solar`, `elektroskandia`.
- **Kalkylmotor:** El-fallet ska använda exakt samma väg som idag (samma kollektion, samma sökfält, samma rabattlogik). VVS/Bygg ska hanteras i separata grenar (annan kollektion, ev. annat sökfält), inte genom att byta beteende för befintliga grossist-id:n.

När denna datamodell är godkänd kan nästa steg vara att konkretisera kollektionsnamn för VVS/Bygg, namn på nya fält i importer och eventuella Firestore-index, samt exakt hur `searchProducts` ska välja kollektion och sökfält utifrån `selectedWholesaler` / bransch.
