/**
 * Mall för Smart egenkontroll (VVS / Säker Vatten).
 * requiresPhoto: true = användaren måste ta minst ett foto kopplat till denna punkt innan godkänd.
 */
export const VVS_EGENKONTROLL_ITEMS = [
  { id: "vvs_1", section: "1. Rör och genomföringar", label: "Rörgenomföringar", desc: "Genomföringar genom väggar/golv/tak utförda enligt branschregler. Tätning och skydd.", unit: "", requiresPhoto: true },
  { id: "vvs_2", section: "1. Rör och genomföringar", label: "Rörisolering", desc: "Isolering vid behov enligt PBL/BR. Skydd mot frysning där det krävs.", unit: "" },
  { id: "vvs_3", section: "1. Rör och genomföringar", label: "Avstånd och fästning", desc: "Rör fästa enligt dimensioner och last. Ingen spänning eller obehörig belastning.", unit: "" },
  { id: "vvs_4", section: "2. Golvvärme", label: "Slingor och läggning", desc: "Golvvärmeslingor läggna enligt ritning. Avstånd och längd kontrollerade.", unit: "", requiresPhoto: true },
  { id: "vvs_5", section: "2. Golvvärme", label: "Tryck- och täthetsprov", desc: "Prov utfört enligt regler. Protokoll finns (t.ex. tryckprovningsmodul).", unit: "" },
  { id: "vvs_6", section: "2. Golvvärme", label: "Inkapsling / golv", desc: "Slingor skyddade vid pågjutning. Temperatur och torktid iakttagna.", unit: "" },
  { id: "vvs_7", section: "3. Vatten och avlopp", label: "Dricksvatten", desc: "Material och dimensioner enligt PBL. Ingen risk för tillbakaflöde eller förorening.", unit: "" },
  { id: "vvs_8", section: "3. Vatten och avlopp", label: "Avlopp och ventilation", desc: "Fall, ventilation och tätning kontrollerade. Ingen läckage.", unit: "" },
  { id: "vvs_9", section: "3. Vatten och avlopp", label: "Synliga anslutningar", desc: "Anslutningar tillgängliga för inspektion där krävs. Dokumentation.", unit: "", requiresPhoto: true },
  { id: "vvs_10", section: "4. Övrigt", label: "Märkning och dokumentation", desc: "Rör märkta enligt gällande krav. Ritningar/instruktioner tillgängliga.", unit: "" },
];
