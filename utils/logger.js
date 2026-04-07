/**
 * Enkel loggning för appen. logError skickar fel till workaholic-web (Black Box).
 */

import { Platform } from "react-native";
import Constants from "expo-constants";
import { auth } from "../firebaseConfig";
import { workaholicApiUrl, WORKAHOLIC_API_BASE } from "../constants/workaholicApi";

const PREFIX = "[Workaholic]";

export const logger = {
  log(...args) {
    console.log(PREFIX, ...args);
  },
  info(...args) {
    console.info(PREFIX, ...args);
  },
  warn(...args) {
    console.warn(PREFIX, ...args);
  },
  error(message, error = null) {
    if (error) {
      console.error(PREFIX, message, error?.stack ?? error);
    } else {
      console.error(PREFIX, message);
    }
  },
};

function getDeviceInfo() {
  const nativeAppVersion = Constants.expoConfig?.version ?? Constants.manifest?.version ?? "";
  const nativeBuildVersion = Constants.expoConfig?.android?.versionCode ?? Constants.manifest?.android?.versionCode ?? "";
  return {
    os: Platform.OS,
    osVersion: Platform.Version,
    appVersion: nativeAppVersion,
    buildVersion: String(nativeBuildVersion || ""),
  };
}

/**
 * Skickar fel till workaholic-web: POST {WORKAHOLIC_API_BASE}/api/log-error
 * (produktion: https://workaholic-web.vercel.app/api/log-error om inget annat är satt).
 *
 * @param {Error|string} error
 * @param {Object} [context] - t.ex. { screen: "InspectionScreen", action: "save" }
 * @returns {Promise<string|null>} errorId
 */
export async function logError(error, context = {}) {
  const message = error instanceof Error ? error.message : String(error ?? "Okänt fel");
  const stack = error instanceof Error ? error.stack : null;
  const user = auth.currentUser;
  if (!user) {
    logger.error(message, error);
    return null;
  }

  const url = workaholicApiUrl("/api/log-error");

  try {
    const token = await user.getIdToken();
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message,
        stack: stack || undefined,
        context: { ...context, source: "mobile", apiBase: WORKAHOLIC_API_BASE },
        deviceInfo: getDeviceInfo(),
      }),
    });
    const text = await res.text();
    let data = {};
    try {
      if (text && text.trim()) {
        data = JSON.parse(text);
      }
    } catch (parseErr) {
      logger.warn(
        "log-error: ogiltig JSON i svar",
        { status: res.status, preview: text?.slice?.(0, 120), base: WORKAHOLIC_API_BASE }
      );
      return null;
    }
    if (res.ok && data.errorId) {
      logger.info("Fel loggat:", data.errorId);
      return data.errorId;
    }
    logger.warn("log-error misslyckades", { status: res.status, base: WORKAHOLIC_API_BASE });
  } catch (e) {
    logger.warn("Kunde inte skicka fel till server:", e?.message, WORKAHOLIC_API_BASE);
  }
  return null;
}

export default logger;
