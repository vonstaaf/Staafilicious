/**
 * Branschstandard: Egenkontroller för Bygg (Snickeri & Stomme).
 * Referenser: AMA Hus, BKR, GVK, BBR.
 * unit: används för mätvärden (t.ex. % för fuktkvot); requiresPhoto = foto rekommenderas/krav.
 */
export const BYGG_EGENKONTROLL_ITEMS = [
  // --- 1. Grund- och Stommontage ---
  {
    id: "bygg_1",
    section: "1. Grund- och Stommontage",
    label: "Mottagningskontroll (Material)",
    desc: "Kontroll av levererat virke: sorteringsklass C24/C14. Fuktkvot vid ankomst dokumenterad.",
    unit: "",
    requiresPhoto: true,
  },
  {
    id: "bygg_2",
    section: "1. Grund- och Stommontage",
    label: "Fuktmätningsprotokoll",
    desc: "Fuktkvot <18% för inbyggnad, <15% för limning/målning. Dokumentation enligt AMA Hus.",
    unit: "%",
  },
  {
    id: "bygg_3",
    section: "1. Grund- och Stommontage",
    label: "Syllmontage",
    desc: "Syllisolering (kapillärbrytande skikt) och förankring i plattan (expanderbult/syllskruv) kontrollerade.",
    unit: "",
    requiresPhoto: true,
  },
  {
    id: "bygg_4",
    section: "1. Grund- och Stommontage",
    label: "Avvägning (Tolerans)",
    desc: "Lod och våg enligt AMA Hus, t.ex. ±2 mm på 2 m. Egenkontroll utförd.",
    unit: "mm",
  },
  {
    id: "bygg_5",
    section: "1. Grund- och Stommontage",
    label: "K-ritnings efterlevnad",
    desc: "Dimensioner på bärande balkar (limträ/stål) och pelare verifierade mot ritning.",
    unit: "",
  },
  // --- 2. Klimatskärm & Isolering ---
  {
    id: "bygg_6",
    section: "2. Klimatskärm & Isolering",
    label: "Ångspärr (Lufttäthet)",
    desc: "Åldersbeständig plast tejpad i alla skarvar med godkänd systemtejp. Minst 200 mm överlapp. BBR.",
    unit: "",
    requiresPhoto: true,
  },
  {
    id: "bygg_7",
    section: "2. Klimatskärm & Isolering",
    label: "Vindavledare",
    desc: "Luftspalt vid takfot kontrollerad så att ventilation sker korrekt bakom isolering.",
    unit: "",
  },
  {
    id: "bygg_8",
    section: "2. Klimatskärm & Isolering",
    label: "Isolering",
    desc: "Isolerskivor sluter tätt utan glipor (konvektion) och är inte komprimerade (U-värde).",
    unit: "",
  },
  {
    id: "bygg_9",
    section: "2. Klimatskärm & Isolering",
    label: "Genomföringar",
    desc: "Tätning av rör och el-dosor med manschetter genom ångspärren.",
    unit: "",
  },
  // --- 3. Våtrumsförberedelse ---
  {
    id: "bygg_10",
    section: "3. Våtrumsförberedelse",
    label: "Regelavstånd (CC-mått)",
    desc: "Väggreglar på CC 300 mm eller 450 mm enligt vald skivkonstruktion. BKR/GVK.",
    unit: "mm",
  },
  {
    id: "bygg_11",
    section: "3. Våtrumsförberedelse",
    label: "Kortlingar för infästning",
    desc: "Extra reglar/kortlingar/plywood monterade för: kommod, tvättställ, duschväggar, armaturer, toalett (vägghängd), grab bars.",
    unit: "",
    requiresPhoto: true,
  },
  {
    id: "bygg_12",
    section: "3. Våtrumsförberedelse",
    label: "Skivmontage våtrum",
    desc: "Skivor monterade med föreskrivet fogavstånd. Skruvskallar har inte punkterat ytan på våtrumsskivan.",
    unit: "",
  },
  // --- 4. Brand- och Ljudtätning ---
  {
    id: "bygg_13",
    section: "4. Brand- och Ljudtätning",
    label: "Brandcellsgränser",
    desc: "Brandstopp (stenull/brandfog) monterat i anslutningar mellan lägenheter eller mot garage. EI30/EI60.",
    unit: "",
    requiresPhoto: true,
  },
  {
    id: "bygg_14",
    section: "4. Brand- och Ljudtätning",
    label: "Ljudisolering",
    desc: "Syllisolering och elastiska fogar används för att bryta ljudbryggor mellan rum. BBR.",
    unit: "",
  },
  {
    id: "bygg_15",
    section: "4. Brand- och Ljudtätning",
    label: "Dörrmontage (brand/ljud)",
    desc: "Brand- och ljudklassade dörrar korrekt drevade med mineralull och fogade.",
    unit: "",
  },
  // --- 5. Slutfinish och Besiktning ---
  {
    id: "bygg_16",
    section: "5. Slutfinish och Besiktning",
    label: "Målarnära ytor",
    desc: "Gipsning, hörnskydd och att skruvskallar är korrekt försänkta.",
    unit: "",
  },
  {
    id: "bygg_17",
    section: "5. Slutfinish och Besiktning",
    label: "Listning och omfattningar",
    desc: "Geringar och passform vid dörrar/fönster kontrollerade.",
    unit: "",
  },
  {
    id: "bygg_18",
    section: "5. Slutfinish och Besiktning",
    label: "Funktionskontroll",
    desc: "Fönster och dörrar går att öppna/stänga/låsa utan hinder efter att huset satt sig.",
    unit: "",
  },
];
