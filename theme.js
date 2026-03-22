// theme.js

/** Blandar HEX mot vitt – samma nyans, ljusare steg (0–1). */
function parseHex(hex) {
  const h = String(hex).replace(/^#/, "");
  if (h.length === 6) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    };
  }
  return { r: 37, g: 99, b: 235 }; // FALLBACK_PRIMARY (blå)
}

function lighten(hex, amount) {
  const { r, g, b } = parseHex(hex);
  const w = 255;
  const R = Math.round(r + (w - r) * amount);
  const G = Math.round(g + (w - g) * amount);
  const B = Math.round(b + (w - b) * amount);
  return `#${R.toString(16).padStart(2, "0")}${G.toString(16).padStart(2, "0")}${B.toString(16).padStart(2, "0")}`;
}

/** Primär → ljusare glöd → ännu ljusare sekundär (samma kulör). */
const ACCENT_GLOW_MIX = 0.22;
const ACCENT_SECONDARY_MIX = 0.42;

function accentPalette(primary) {
  return {
    primary,
    primaryGlow: lighten(primary, ACCENT_GLOW_MIX),
    secondary: lighten(primary, ACCENT_SECONDARY_MIX),
  };
}

function shadowPair(primary, glowOpacity = 0.4) {
  const base = {
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 8,
  };
  return {
    glow: {
      shadowColor: primary,
      ...base,
      shadowOpacity: glowOpacity,
    },
    glowSubtle: {
      shadowColor: primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
  };
}

/**
 * Yrkesbaserade primärfärger (samma som workaholic-web src/lib/theme.js).
 * Endast accentfärger byts – bakgrunder (background, surface, text) är neutrala.
 */
const PROFESSION_PRIMARY = {
  el: "#2563EB",
  vvs: "#0891B2",
  bygg: "#EA580C",
};

/** Bas utan ett enskilt yrke i Firestore – samma blå som El (undviker teal/grönton). */
const FALLBACK_PRIMARY = "#2563EB";

const baseAccents = accentPalette(FALLBACK_PRIMARY);
const baseShadows = shadowPair(FALLBACK_PRIMARY, 0.45);

export const WorkaholicTheme = {
  colors: {
    ...baseAccents,
    background: "#FFFFFF", // Bakgrund
    surface: "#F5F5F5", // Cards, paneler
    textPrimary: "#333333", // Vanlig text
    textSecondary: "#666666", // Hjälptext
    error: "#FF5252", // Felmeddelanden
    success: "#4CAF50", // Positiva notifieringar
    warning: "#FFC107", // Varningar
    info: "#2196F3", // Informationsmeddelanden
  },
  spacing: {
    small: 8,
    medium: 16,
    large: 24,
  },
  typography: {
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: "#333333",
    },
    subtitle: {
      fontSize: 18,
      fontWeight: "600",
      color: "#333333",
    },
    body: {
      fontSize: 16,
      fontWeight: "400",
      color: "#666666",
    },
  },
  borderRadius: {
    small: 6,
    medium: 10,
    large: 16,
  },
  shadows: baseShadows,
};

/** Yrkesbaserade färger – endast ett yrke ger yrkesfärg; annars fallback. */
const PROFESSION_THEMES = {
  el: {
    colors: accentPalette(PROFESSION_PRIMARY.el),
    shadows: shadowPair(PROFESSION_PRIMARY.el),
  },
  vvs: {
    colors: accentPalette(PROFESSION_PRIMARY.vvs),
    shadows: shadowPair(PROFESSION_PRIMARY.vvs),
  },
  bygg: {
    colors: accentPalette(PROFESSION_PRIMARY.bygg),
    shadows: shadowPair(PROFESSION_PRIMARY.bygg),
  },
};

/**
 * Returnerar tema-overrides för användarens yrke.
 * Ett yrke (t.ex. ['el']) → yrkets färg. Inget yrke eller flera (t.ex. ['el','vvs']) → standardblå (bas i WorkaholicTheme).
 * @param {Array<string>} professionKeys - t.ex. ['el'], ['vvs'], ['bygg'], ['el','vvs']
 * @returns {Partial<typeof WorkaholicTheme>}
 */
export function getThemeForProfession(professionKeys) {
  if (!Array.isArray(professionKeys) || professionKeys.length !== 1) return {};
  const key = professionKeys[0];
  if (PROFESSION_THEMES[key]) return PROFESSION_THEMES[key];
  return {};
}