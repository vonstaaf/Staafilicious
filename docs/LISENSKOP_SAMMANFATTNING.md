# Sammanfattning: Så ska lisensköpet se ut och gå till

Använd denna text när du öppnar din hemsida i Cursor och vill implementera eller granska lisensköpet.

---

## Grundidé

- **Företagsbaserat (B2B):** Företaget köper licenser och tilldelar dem till anställda. Det är företaget som betalar, inte den enskilda användaren.
- **Licenser = antal anställda:** Företaget köper ett antal licenser (t.ex. 5, 10, 25). Varje anställd som ska använda appen måste ha en licens tilldelad från företagets "pool".
- **Allt under företagsadmin:** Alla licenser som företaget köper hamnar under företagsadministratörens kontroll. Alla licenser är kopplade till samma företag och fungerar bara inom det företaget – ingen delad eller "lös" licens mellan företag.

---

## Flöde (steg för steg)

1. **Företaget landar på hemsidan** (t.ex. pris-/produktsida eller "Börja här").
2. **Företaget väljer antal licenser** (eller paket, t.ex. "Företag 5–10 anställda").
3. **Företaget går till kassan/betalning** – tydlig knapp t.ex. "Köp licenser" / "Beställ".
4. **Betalning** – hur ska det gå till?
   - T.ex. Stripe/klarna/faktura: företaget anger företagsuppgifter och betalningsmetod.
   - Efter lyckad betalning: företaget får en bekräftelse och (om ni vill) inlogg/länk till en "företagsportal" eller direkt till appen.
5. **Efter köp:**
   - Företaget har nu X licenser i sitt konto, alla under företagsadmins kontroll.
   - Admin/ägare kan bjuda in anställda (e-post) och tilldela licenser. Den som får en licens kan logga in och använda appen (enligt det ni redan byggt med företag/medlemmar).

---

## Giltighet och betalning (40 dagar + påminnelse/autogiro)

- **Licenser gäller i 40 dagar:** Varje köpt licensperiod är giltig i 40 dagar. Efter det ska appen inte fungera för företaget (eller endast i begränsat läge) tills betalning är genomförd eller förnyelse skett.
- **Påminnelse eller autogiro:** I slutet på varje månad, eller efter 30 dagar (innan 40-dagarsgränsen), ska företaget få:
  - antingen en **påminnelse om betalning** (e-post/SMS med länk till betalning eller faktura),
  - eller **autogiro** – att betalningen dras automatiskt (t.ex. månadsvis eller vid periodens slut).
- **Tydlig kommunikation:** Företagsadmin ska kunna se när licenserna löper ut och om påminnelse/autogiro är aktiverat, så att ingen blir avstängd oväntat.

---

## Så ska det "se ut" (UX / sidor)

- **Pris-/paketvy:** Tydlig visning av vad man köper (antal licenser, pris, ev. period – månad/år). Enkelt att välja paket (t.ex. 5, 10, 25 licenser eller "Kontakta oss" för större).
- **Kassan:** Enkel beställningsformulär: företagsnamn, org.nr (om ni vill), kontakt/e-post, betalningsmetod. Ingen onödig friction.
- **Bekräftelse:** Efter betalning – tacksida med ordernummer och tydlig info om nästa steg (t.ex. "Du får ett e-post med inlogg till företagsportalen" eller "Logga in här med din e-post").
- **Företagsportalen (om ni har en):** Där kan företaget se antal köpta licenser, använda licenser, bjuda in anställda och (vid behov) köpa fler licenser. Admin ska också se **när licenserna löper ut** och om påminnelse/autogiro är aktiverat.

---

## Tekniska saker att ha i åtanke

- **Var sparas köp?** T.ex. Firestore: `companies/{companyId}` med fält som:
  - `licenseCount`, `licenseUsed` – antal köpta och använda licenser (alla under samma företag och admins kontroll).
  - `licenseValidUntil` – datum då nuvarande period slutar (t.ex. 40 dagar från köp/förnyelse).
  - `billingPeriodDays` – 40 (eller vad ni bestämmer).
  - `paymentReminderSentAt` / `lastReminderAt` – när påminnelse skickades (t.ex. vid dag 30 eller månadsskifte).
  - `autogiroEnabled` (boolean) – om autogiro är aktiverat för detta företag.
  - `stripeCustomerId` / betalningsleverantör – för att kunna dra autogiro eller skicka faktura.
- **Koppling hemsida ↔ app:** När någon köper på hemsidan ska företaget (via e-post/org.nr/länk) kopplas till ett företag i er app-databas så att licensantalet och `licenseValidUntil` uppdateras; alla licenser förblir kopplade till samma företag och admin.
- **Kontroll i appen:** Vid inloggning (eller vid varje viktig åtgärd) kolla `licenseValidUntil` för användarens företag – om datumet passerat, visa tydligt meddelande ("Licensperioden har gått ut – betala eller förnya") och blockera eller begränsa användning tills betalning är genomförd.
- **Vad händer när alla licenser är använda?** Tydlig meddelande i appen ("Inga lediga licenser – kontakta er administratör" eller "Köp fler licenser") och ev. länk till hemsidan för att köpa fler.
- **Cron/jobb för påminnelse och autogiro:** Ett schemalagt jobb (t.ex. Cloud Functions som körs dagligen) som:
  - för företag där `licenseValidUntil` är inom X dagar (t.ex. 10 dagar) och `paymentReminderSentAt` är äldre än Y dagar – skickar påminnelse och sätter `paymentReminderSentAt`;
  - för företag med `autogiroEnabled` – vid periodens slut (eller månadsskifte) triggar betalning och förlänger `licenseValidUntil` med 40 dagar (eller en månad).

---

## Kort checklista för dig när du öppnar hemsidan i Cursor

- [ ] Var ska "Köp licenser" / prisinformation ligga? (sida, sektion)
- [ ] Vilken betalningslösning används eller ska användas? (Stripe, Klarna, faktura, annat)
- [ ] Behöver vi en separat "kassa"-sida eller modal?
- [ ] Vad ska hända efter lyckad betalning? (redirect, e-post, skapa konto i er backend?)
- [ ] Ska hemsidan prata med samma Firebase/backend som appen (t.ex. uppdatera `licenseCount` för företaget)?
- [ ] Hur visar företagsportalen "licenser löper ut" och "autogiro/påminnelse aktiverat"?

---

*Denna sammanfattning kan du klistra in i chatten eller referera till (t.ex. "enligt LISENSKOP_SAMMANFATTNING.md") när du öppnat din hemsida i Cursor så kan vi gå igenom sidorna och koppla flödet.*
