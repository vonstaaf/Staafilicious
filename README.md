# Workaholic – Mobile App (Frontend)

> ⚠️ **VIKTIGT:** Vid utveckling i appen, läs och följ reglerna i [APP_README.md](./APP_README.md) för att säkerställa att inga ändringar bryter synken med webbportalen.

## Om projektet
Detta repo innehåller frontend-applikationen för Workaholic, en multi-tenant SaaS för hantverkare. Appen är byggd med Expo och React Native och kommunicerar direkt med Firebase (Firestore, Auth, Storage).

## Installation & Körning
1. Klona repot och gå in i mappen: `cd staafilicious-frontend`
2. Installera beroenden: `npm install`
3. Starta Expo Go: `npx expo start`

## Builds
Vi använder EAS (Expo Application Services) för att generera produktionsbyggen.
* **Android:** `eas build --platform android`
* **iOS:** `eas build --platform ios`

## Webbportal (systerrepo)

Server-API, företagsportal, uppdrag v2, geotagg och planeringskalender ligger i **`workaholic-web`**.

Läs [workaholic-web README](https://github.com/vonstaaf/workaholic-web/blob/master/README.md) (eller lokalt: `../Hemmabygge/Workaholic/workaholic-web/README.md`) innan du ändrar saker som påverkar båda klienterna.

Gemensam dokumentation: `workaholic-web/docs/SYSTEM_ARCHITECTURE.md` och `docs/SCHEMA.md`.

## Viktig arkitektur
* **Databas:** Firestore (Kollektionen `groups` är hjärtat i appen).
* **Tenant-isolering:** Sker via `companyId` i alla dokument.
* **PDF-generering:** Sker lokalt i appen; Workaholic-logga hämtas från webbens branding-API (`/api/public/branding/workaholic-logo`).
* **Företagsprofil:** Läs från `companies/{companyId}` — inte från `users/{uid}` (se `utils/companyProfile.js`).
