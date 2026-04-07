/**
 * Standardmallar för EL egenkontroll när användarens Firestore-mall (users/.../templates) saknas.
 * IDs måste vara stabila så checklistan och foton kan kopplas till rätt rad.
 */

export const EL_INSPECTION_GENERAL_DEFAULT = [
  {
    id: "el_gen_1",
    section: "ALLMÄNT",
    label: "Kontroll förläggning",
    unit: "",
    desc: "Visuell kontroll enligt SS 436 40 00, kap 6.",
  },
  {
    id: "el_gen_2",
    section: "ALLMÄNT",
    label: "Fastsättn. apparter o dyl.",
    unit: "",
    desc: "Kontroll av kapslingsklass och montage enligt tillverkarens anvisning.",
  },
  {
    id: "el_gen_3",
    section: "ALLMÄNT",
    label: "Håltagningar, tätning",
    unit: "",
    desc: "Brandtätning och genomföringar enligt BBR Kap 5.",
  },
  {
    id: "el_gen_4",
    section: "ALLMÄNT",
    label: "Funktionskontroll",
    unit: "",
    desc: "Provning av funktioner (t.ex. JFB) enligt ELSÄK-FS 2008:1.",
  },
  {
    id: "el_gen_5",
    section: "ALLMÄNT",
    label: "Böjradie",
    unit: "",
    desc: "Kontroll mot kabeltillverkarens minimikrav.",
  },
  {
    id: "el_gen_6",
    section: "ALLMÄNT",
    label: "Kontrollera anslutningar",
    unit: "",
    desc: "Efterdragning och kontaktpressning.",
  },
  {
    id: "el_gen_7",
    section: "ALLMÄNT",
    label: "Märkning",
    unit: "",
    desc: "Krav på identifiering enligt SS 436 40 00, avsnitt 514.",
  },
  {
    id: "el_gen_8",
    section: "ALLMÄNT",
    label: "Isolationsprovning",
    unit: "MegaOhm",
    desc: "Mätning utförd med 500V DC (Krav >1,0 MΩ) enligt SS 6.4.3.3.",
  },
  {
    id: "el_gen_9",
    section: "ALLMÄNT",
    label: "Kontinuitetsprovning",
    unit: "Ohm",
    desc: "Verifiering av skyddsledare enligt SS 6.4.3.2.",
  },
  {
    id: "el_gen_10",
    section: "ALLMÄNT",
    label: "Bärande väggar",
    unit: "",
    desc: "Verifiering att ingen otillåten försvagning skett enligt BBR.",
  },
  {
    id: "el_gen_11",
    section: "ALLMÄNT",
    label: "Brandskydd",
    unit: "",
    desc: "Återställning av brandceller enligt Boverkets byggregler.",
  },
];

/** Golvvärme: isolationsmätning, resistans m.m. */
export const EL_INSPECTION_HEATING_DEFAULT = [
  {
    id: "el_heat_1",
    section: "GOLVVÄRME",
    label: "Längd / area",
    unit: "Meter",
    desc: "Verifiering mot ritning/projektering.",
  },
  {
    id: "el_heat_2",
    section: "GOLVVÄRME",
    label: "Fotodokumentation",
    unit: "",
    desc: "Krav för garantibevis och framtida felsökning.",
  },
  {
    id: "el_heat_3",
    section: "GOLVVÄRME",
    label: "R före förläggning",
    unit: "Ohm",
    desc: "Resistansmätning enligt tillverkarens tabell.",
  },
  {
    id: "el_heat_4",
    section: "GOLVVÄRME",
    label: "Riso före förläggning",
    unit: "MegaOhm",
    desc: "Isolationsmätning enligt tillverkarens anvisning.",
  },
  {
    id: "el_heat_5",
    section: "GOLVVÄRME",
    label: "R efter förläggning",
    unit: "Ohm",
    desc: "Kontroll efter utläggning (innan spackling/fix).",
  },
  {
    id: "el_heat_6",
    section: "GOLVVÄRME",
    label: "Riso efter förläggning",
    unit: "MegaOhm",
    desc: "Kontroll efter utläggning (innan spackling/fix).",
  },
  {
    id: "el_heat_7",
    section: "GOLVVÄRME",
    label: "R före inkoppling",
    unit: "Ohm",
    desc: "Slutgiltig kontroll efter färdigt golv.",
  },
  {
    id: "el_heat_8",
    section: "GOLVVÄRME",
    label: "Riso före inkoppling",
    unit: "MegaOhm",
    desc: "Slutgiltig kontroll efter färdigt golv.",
  },
];

export function getDefaultItemsForElTemplateType(type) {
  if (type === "heating") return [...EL_INSPECTION_HEATING_DEFAULT];
  return [...EL_INSPECTION_GENERAL_DEFAULT];
}
