/**
 * Grossister och rabattgrupper per yrke.
 * professions: vilka yrken som ska se denna grossist (el, vvs, bygg).
 */

/** Alternativ A: separata kollektioner per bransch/grossist. El = oförändrat; VVS/Bygg = nya kollektionsnamn. */
export const WHOLESALERS = [
  // El (befintligt – price_list_rexel, price_list_ahlsell, …)
  { id: "rexel", name: "Rexel", icon: "flash-outline", professions: ["el"] },
  { id: "solar", name: "Solar", icon: "sunny-outline", professions: ["el"] },
  { id: "ahlsell", name: "Ahlsell", icon: "construct-outline", professions: ["el"] },
  { id: "elektroskandia", name: "E-skandia", icon: "bulb-outline", professions: ["el"] },
  // VVS (price_list_dahl, price_list_ahlsell_vvs, price_list_lundagrossisten, price_list_solar_vvs)
  { id: "dahl", name: "Dahl", icon: "water-outline", professions: ["vvs"] },
  { id: "ahlsell_vvs", name: "Ahlsell VVS", icon: "construct-outline", professions: ["vvs"] },
  { id: "lundagrossisten", name: "Lundagrossisten", icon: "business-outline", professions: ["vvs"] },
  { id: "solar_vvs", name: "Solar VVS", icon: "sunny-outline", professions: ["vvs"] },
  // Bygg (price_list_beijer, price_list_optimera, price_list_derome, price_list_xlbygg)
  { id: "beijer", name: "Beijer Byggmaterial", icon: "hammer-outline", professions: ["bygg"] },
  { id: "optimera", name: "Optimera", icon: "storefront-outline", professions: ["bygg"] },
  { id: "derome", name: "Derome", icon: "business-outline", professions: ["bygg"] },
  { id: "xlbygg", name: "XL-Bygg", icon: "resize-outline", professions: ["bygg"] },
];

export const ALL_WHOLESALERS = WHOLESALERS;

/** Rabattgrupper per yrke – används i rabattbrev-modalen och produktpriser. */
export const DISCOUNT_GROUPS_BY_PROFESSION = {
  el: [
    { id: "kabel", label: "Kabel & Ledning" },
    { id: "installation", label: "Installationsmaterial" },
    { id: "belysning", label: "Belysning" },
    { id: "central", label: "Central & Norm" },
    { id: "ovrigt", label: "Övrigt / Standard" },
  ],
  vvs: [
    { id: "ror", label: "Rör & Fittingar" },
    { id: "golvvarme", label: "Golvvärme" },
    { id: "armaturer", label: "Armaturer & Toalett" },
    { id: "pumpar", label: "Pumpar & Värme" },
    { id: "ovrigt", label: "Övrigt / Standard" },
  ],
  bygg: [
    { id: "material", label: "Byggmaterial" },
    { id: "verktyg", label: "Verktyg" },
    { id: "tak", label: "Tak & Fasad" },
    { id: "ovrigt", label: "Övrigt / Standard" },
  ],
};

function parseSingleProfessionToKey(p) {
  const s = p.trim().toLowerCase();
  if (s === "el") return "el";
  if (s.includes("rör") || s.includes("vvs")) return "vvs";
  if (s.includes("bygg")) return "bygg";
  return null;
}

/**
 * Normaliserar yrke till nyckel: el, vvs eller bygg (enstaka yrke).
 * @param {string} profession - från users.profession
 * @returns {'el'|'vvs'|'bygg'|null}
 */
export function getProfessionKey(profession) {
  const keys = getProfessionKeys(profession);
  return keys[0] || null;
}

/**
 * Stöd för flera yrken (t.ex. "El, VVS" eller "El, Rör, Bygg").
 * Returnerar alla matchande nycklar så att rabattbrev och grossister inte försvinner vid yrkesbyte.
 * @param {string} profession - från users.profession, kan vara "El", "El, VVS", "Rör, Bygg" osv.
 * @returns {Array<'el'|'vvs'|'bygg'>}
 */
export function getProfessionKeys(profession) {
  const raw = (profession || "").trim();
  if (!raw) return [];
  const parts = raw.split(/[,;]+/).map((p) => p.trim()).filter(Boolean);
  const keys = [];
  const seen = new Set();
  for (const part of parts) {
    const key = parseSingleProfessionToKey(part);
    if (key && !seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }
  if (keys.length > 0) return keys;
  const single = parseSingleProfessionToKey(raw);
  return single ? [single] : [];
}

/**
 * Grossister som ska visas – för alla användarens yrken (union).
 * Vid flera yrken (t.ex. El, VVS) visas alla tillhörande grossister så att rabattbrev finns kvar.
 * @param {string} profession
 * @returns {Array<{id, name, icon, professions}>}
 */
export function getWholesalersForProfession(profession) {
  const keys = getProfessionKeys(profession);
  if (keys.length === 0) return [];
  return WHOLESALERS.filter((ws) => ws.professions.some((p) => keys.includes(p)));
}

/**
 * Prioriterar användarens egna grossistval.
 * Om listan är tom/ogiltig faller vi tillbaka till professionens standard.
 * @param {string} profession
 * @param {string[]} preferredWholesalerIds
 */
export function resolveWholesalersForUser(profession, preferredWholesalerIds) {
  if (Array.isArray(preferredWholesalerIds) && preferredWholesalerIds.length > 0) {
    const byId = new Map(WHOLESALERS.map((w) => [w.id, w]));
    const picked = preferredWholesalerIds
      .map((id) => byId.get(String(id)))
      .filter(Boolean);
    if (picked.length > 0) return picked;
  }
  return getWholesalersForProfession(profession);
}

/**
 * Rabattgrupper för användarens yrke(n) – vid flera yrken slås grupperna ihop (union på id).
 * @param {string} profession
 * @returns {Array<{id, label}>}
 */
export function getDiscountGroupsForProfession(profession) {
  const keys = getProfessionKeys(profession);
  if (keys.length === 0) return DISCOUNT_GROUPS_BY_PROFESSION.el;
  const seen = new Set();
  const result = [];
  for (const key of keys) {
    const groups = DISCOUNT_GROUPS_BY_PROFESSION[key] || [];
    for (const g of groups) {
      if (!seen.has(g.id)) {
        seen.add(g.id);
        result.push(g);
      }
    }
  }
  return result.length > 0 ? result : DISCOUNT_GROUPS_BY_PROFESSION.el;
}
