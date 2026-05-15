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

## Viktig arkitektur
* **Databas:** Firestore (Kollektionen `groups` är hjärtat i appen).
* **Tenant-isolering:** Sker via `companyId` i alla dokument.
* **PDF-generering:** Sker lokalt i appen via `GroupSchedulePdf.js`.
