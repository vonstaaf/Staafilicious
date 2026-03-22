/**
 * Bas-URL till workaholic-web (Next.js). För lokal utveckling:
 * EXPO_PUBLIC_WORKAHOLIC_API_URL=http://192.168.x.x:3000
 * (din dators LAN-IP så mobilen når dev-servern)
 */
const fromEnv =
  typeof process !== "undefined" && process.env?.EXPO_PUBLIC_WORKAHOLIC_API_URL
    ? String(process.env.EXPO_PUBLIC_WORKAHOLIC_API_URL).replace(/\/$/, "")
    : "";

export const WORKAHOLIC_API_BASE =
  fromEnv || "https://workaholic-web.vercel.app";

export function workaholicApiUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${WORKAHOLIC_API_BASE}${p}`;
}
