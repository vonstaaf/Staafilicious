import * as Sentry from "@sentry/react-native";

/**
 * SKICKA PUSH-NOTIS TILL EN SPECIFIK TOKEN
 * Returnerar { ok: boolean, error?: string } så anropare kan hantera fel.
 */
export async function sendPushNotification(expoPushToken, title, body, data = {}) {
  if (!expoPushToken || !expoPushToken.trim()) {
    return { ok: false, error: "Push-token saknas" };
  }

  const message = {
    to: expoPushToken.trim(),
    sound: "default",
    title: title || "Workaholic",
    body: body || "",
    data: data,
  };

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errMsg =
        responseData?.errors?.[0]?.message ||
        responseData?.message ||
        `HTTP ${response.status}`;
      if (__DEV__) console.warn("[pushService] Push misslyckades:", errMsg);
      Sentry.captureMessage(`Push failed: ${errMsg}`, "warning");
      return { ok: false, error: errMsg };
    }

    return { ok: true };
  } catch (err) {
    const message = err?.message || String(err);
    if (__DEV__) console.warn("[pushService] Nätverksfel:", message);
    Sentry.captureException(err);
    return { ok: false, error: message };
  }
}