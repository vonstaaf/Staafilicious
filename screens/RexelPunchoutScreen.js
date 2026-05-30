import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { WebView } from "react-native-webview";
import { auth } from "../firebaseConfig";
import Constants from "expo-constants";
import AppHeader from "../components/AppHeader";
import { WorkaholicTheme } from "../theme";

/**
 * Bas-URL till workaholic-web.
 * Hämtas från app.json > extra.webUrl med fallback.
 */
const WEB_URL =
  (Constants.expoConfig?.extra?.webUrl ?? "https://workaholic-web.vercel.app").replace(/\/$/, "");

/**
 * RexelPunchoutScreen
 *
 * Flöde:
 *  1. Hämtar Firebase ID-token för inloggad användare.
 *  2. POST:ar till /api/integrations/rexel/punchout-init med { targetId: groupId, targetType: 'app' }.
 *  3. Renderar WebView mot den returnerade redirectUrl (mock-butiken).
 *  4. Lyssnar på postMessage({ type: "PUNCHOUT_SUCCESS" }) → Alert + goBack().
 *
 * Props (via navigation route):
 *   route.params.groupId  – ID för det aktiva groups-dokumentet
 */
export default function RexelPunchoutScreen({ navigation, route }) {
  const groupId = route.params?.groupId ?? null;

  const [redirectUrl, setRedirectUrl] = useState(null);
  const [error, setError] = useState(null);
  const webViewRef = useRef(null);

  // Hämta redirectUrl vid mount
  const initPunchout = useCallback(async () => {
    if (!groupId) {
      setError("Inget projekt valt. Gå tillbaka och försök igen.");
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        setError("Du är inte inloggad.");
        return;
      }

      // Hämta färskt ID-token (force refresh = false är ok här)
      const idToken = await user.getIdToken();

      const res = await fetch(`${WEB_URL}/api/integrations/rexel/punchout-init`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          targetId: groupId,
          targetType: "app",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? `Serverfel (${res.status}).`);
        return;
      }

      if (!data.redirectUrl) {
        setError("Ingen redirect-URL mottagen från servern.");
        return;
      }

      setRedirectUrl(data.redirectUrl);
    } catch (e) {
      console.error("[RexelPunchoutScreen] initPunchout:", e?.message);
      setError("Kunde inte ansluta till Workaholic-servern. Kontrollera internetanslutningen.");
    }
  }, [groupId]);

  useEffect(() => {
    initPunchout();
  }, [initPunchout]);

  // Hantera meddelande från WebView (ReactNativeWebView.postMessage)
  const handleMessage = useCallback(
    (event) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg?.type === "PUNCHOUT_SUCCESS") {
          Alert.alert(
            "Klart!",
            "Materialet har importerats från Rexel.",
            [
              {
                text: "OK",
                onPress: () => navigation.goBack(),
              },
            ],
            { cancelable: false }
          );
        }
      } catch {
        // Icke-JSON-meddelanden ignoreras
      }
    },
    [navigation]
  );

  // --- Felvy ---
  if (error) {
    return (
      <View style={styles.container}>
        <AppHeader title="REXEL PUNCHOUT" navigation={navigation} />
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Kunde inte starta PunchOut</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setError(null); initPunchout(); }}>
            <Text style={styles.retryBtnText}>Försök igen</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Tillbaka</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- Laddningsvy (väntar på redirectUrl) ---
  if (!redirectUrl) {
    return (
      <View style={styles.container}>
        <AppHeader title="REXEL PUNCHOUT" navigation={navigation} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={WorkaholicTheme.colors.primary} />
          <Text style={styles.loadingText}>Startar Rexel-session…</Text>
        </View>
      </View>
    );
  }

  // --- WebView (mock-butiken) ---
  return (
    <View style={styles.container}>
      <AppHeader title="REXEL PUNCHOUT" navigation={navigation} />
      <WebView
        ref={webViewRef}
        source={{ uri: redirectUrl }}
        style={styles.webView}
        onMessage={handleMessage}
        // Tillåter JavaScript (krävs för postMessage)
        javaScriptEnabled
        // Kör ReactNativeWebView-injicering i alla frames
        javaScriptCanOpenWindowsAutomatically={false}
        // Laddar utan cache för att alltid visa färsk session
        cacheEnabled={false}
        // Visa en spinner medan sidan laddar
        startInLoadingState
        renderLoading={() => (
          <View style={styles.webViewLoader}>
            <ActivityIndicator size="large" color={WorkaholicTheme.colors.primary} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FB",
  },
  webView: {
    flex: 1,
  },
  webViewLoader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FB",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: "#8E8E93",
    fontWeight: "600",
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1C1C1E",
    marginBottom: 8,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 14,
    color: "#6B6B6B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  retryBtn: {
    backgroundColor: WorkaholicTheme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    marginBottom: 12,
    width: "100%",
    alignItems: "center",
  },
  retryBtnText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 14,
  },
  backBtn: {
    paddingVertical: 14,
    width: "100%",
    alignItems: "center",
  },
  backBtnText: {
    color: "#8E8E93",
    fontWeight: "700",
    fontSize: 14,
  },
});
