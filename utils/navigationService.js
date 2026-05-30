import { createRef } from "react";

/**
 * Module-level navigationRef som sätts på <NavigationContainer ref={navigationRef}>.
 *
 * Gör det möjligt att navigera från kod som lever utanför NavigationContainer-trädet
 * (t.ex. AIContext, notifikationshanterare).
 *
 * Användning i App.js:
 *   import { navigationRef } from "./utils/navigationService";
 *   <NavigationContainer ref={navigationRef} ...>
 *
 * Användning någonstans i appen:
 *   import { navigate } from "./utils/navigationService";
 *   navigate("ProductList", { project });
 */
export const navigationRef = createRef();

/**
 * Navigera programmatiskt till en skärm.
 * Är ett no-op om navigatorn ännu inte är redo (t.ex. under splash-skärmen).
 *
 * @param {string} name   Stack.Screen-namnen (t.ex. "ProductList", "GroupSchedule")
 * @param {object} [params]  Valfria route-parametrar
 */
export function navigate(name, params) {
  if (navigationRef.current?.isReady()) {
    navigationRef.current.navigate(name, params);
  } else {
    console.warn("[navigationService] navigate() anropades innan navigatorn är redo.", name);
  }
}

/**
 * Gå tillbaka i navigeringshistoriken (om möjligt).
 */
export function goBack() {
  if (navigationRef.current?.isReady() && navigationRef.current.canGoBack()) {
    navigationRef.current.goBack();
  }
}
