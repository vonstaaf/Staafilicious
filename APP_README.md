# 🛠 App-utvecklarens Gyllene Regler (För att inte paja webben)

Detta dokument skyddar kompatibiliteten mellan appen (`staafilicious-frontend`) och webben (`workaholic-web`).

## 1) Rör inte `users/{uid}`-strukturen

Hemsidan förlitar sig på att `companyId`, `role` och `permissions` ser ut exakt som de gör idag för att admin ska kunna logga in.

## 2) Firestore-tillägg är okej, borttagning är tabu

Du kan lägga till nya fält i `groups` (som vi gjorde med `plejdSystemCode`), men döp aldrig om eller radera befintliga fält.

Exempel:
- Om hemsidan förväntar sig fältet `anlaggning` och du döper om det till `installation`, kommer hemsidan att visa tomma rutor eller krascha.

## 3) Logotypen är "Read-Only"

Utgå alltid från att `logoUrl` i företagsprofilen sätts av webben.
Ändra aldrig detta värde från appen.

## 4) Håll koll på `SCHEMA.md`

Innan du gör en större ändring i hur data sparas:
- skicka ett meddelande till webb-utvecklaren, eller
- uppdatera den gemensamma `SCHEMA.md` så att webben kan anpassas.

## 5) Tenant-isolering

Fortsätt alltid använda `companyId` i alla queries.
Om data sparas utan `companyId` riskerar den att bli osynlig i admin-portalen.
