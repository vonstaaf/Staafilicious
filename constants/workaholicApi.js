/**
 * Bas-URL till workaholic-web (Next.js). Alla API-anrop (AI, log-error, sync-image) går via denna.
 *
 * Prioritet:
 * 1. EXPO_PUBLIC_WORKAHOLIC_API_URL — explicit API-bas (rekommenderat för lokal dev)
 * 2. EXPO_PUBLIC_APP_URL / NEXT_PUBLIC_APP_URL — om du delar samma variabel som webben
 * 3. expo.extra.webUrl från app.json (säker fallback utan .env)
 * 4. https://workaholic-web.vercel.app
 *
 * Lokal utveckling: EXPO_PUBLIC_WORKAHOLIC_API_URL=http://192.168.x.x:3000
 */
import Constants from "expo-constants";

const DEFAULT_BASE = "https://workaholic-web.vercel.app";

function trimBase(s) {
  if (s == null || typeof s !== "string") return "";
  const t = s.trim().replace(/\/$/, "");
  return t;
}

function readProcessEnvBases() {
  if (typeof process === "undefined" || !process.env) return "";
  const candidates = [
    process.env.EXPO_PUBLIC_WORKAHOLIC_API_URL,
    process.env.EXPO_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ];
  for (const v of candidates) {
    const t = trimBase(v);
    if (t) return t;
  }
  return "";
}

function readExtraWebUrl() {
  const extra =
    Constants.expoConfig?.extra ??
    Constants.manifest?.extra ??
    Constants.manifest2?.extra;
  const webUrl = extra?.webUrl;
  return trimBase(webUrl);
}

const fromEnv = readProcessEnvBases();
const fromExtra = readExtraWebUrl();

/** Slutlig bas-URL (samma värde används av logger.js och AI-anrop). */
export const WORKAHOLIC_API_BASE = fromEnv || fromExtra || DEFAULT_BASE;

export function workaholicApiUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${WORKAHOLIC_API_BASE}${p}`;
}
