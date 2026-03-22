/**
 * Gemensamma stränghanteringsfunktioner
 */

/** Stor bokstav på första tecknet. Null-säkert, returnerar "" för tom/falsy. */
export const capitalizeFirst = (text) => {
  if (!text) return "";
  const s = String(text);
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Trim + stor bokstav. Används för projektnamn, benämningar m.m. */
export const formatProjectName = (name, fallback = "") => {
  if (!name) return fallback;
  const trimmed = String(name).trim();
  return trimmed ? capitalizeFirst(trimmed) : fallback;
};

/** Företagsinitialer (max 2 tecken) för placeholder/logotyp-cirkel. */
export const getCompanyInitials = (name) => {
  if (!name || typeof name !== "string") return "";
  const s = String(name).trim();
  if (!s) return "";
  return s.slice(0, 2).toUpperCase();
};
