# Firestore-struktur – B2B SaaS (Workaholic)

Denna struktur stödjer licenser, företag (tenants), roller och isolering mellan företag.

---

## 1. Licenser (lookup + huvuddokument)

**licenseCodes/{normalizedCode}**  
Snabb lookup: licenskod → licenseId. Document ID = normaliserad kod (versaler, trim).

```txt
licenseCodes/{code}   (t.ex. "ABC12XYZ")
  └── licenseId: string   // referens till licenses/{licenseId}
```

**licenses/{licenseId}**

```txt
licenses/{licenseId}
  ├── code: string              // ursprunglig kod (för visning)
  ├── companyId: string         // vilket företag licensen tillhör
  ├── maxSeats: number          // max antal anställda
  ├── usedSeats: number         // antal kopplade användare (uppdateras av Cloud Functions)
  ├── status: "active" | "cancelled" | "expired"
  ├── purchasedByUid: string    // första admin (köpare)
  ├── createdAt: timestamp
  └── updatedAt: timestamp
```

---

## 2. Företag (tenants)

**companies/{companyId}**

```txt
companies/{companyId}
  ├── licenseId: string         // tillhörande licens
  ├── name?: string             // företagsnamn (valfritt)
  ├── createdAt: timestamp
  └── updatedAt: timestamp
```

**companies/{companyId}/members/{uid}**

```txt
companies/{companyId}/members/{uid}
  ├── role: "admin" | "employee"
  ├── email?: string            // denormaliserat för visning
  └── joinedAt: timestamp
```

- **Admin:** kan se ekonomi/fakturering, hantera anställda, köpa fler platser (webb).
- **Employee:** ser sina projekt och material, kan inte hantera licens/anställda.

---

## 3. Användare (utökad users-dokument)

**users/{uid}**  
Samma dokument som idag; lägg till fält för B2B:

```txt
users/{uid}
  ├── ... (befintliga fält: email, logoUrl, profession, etc.)
  ├── companyId?: string        // satt när användaren kopplats till ett företag
  └── role?: "admin" | "employee"
```

- Om `companyId` saknas efter inloggning → visa licensprompt i appen.
- Om `companyId` finns → släpp in i appen (ingen prompt).

---

## 4. Projekt (grupper) – isolering per företag

**groups/{groupId}** (befintlig kollektion)

Lägg till fält så att projekt tillhör ett företag:

```txt
groups/{groupId}
  ├── companyId: string         // NYTT – vilket företag projektet tillhör
  ├── name: string
  ├── code: string
  ├── members: string[]         // uids
  ├── owner: string
  └── ... (övriga befintliga fält)
```

- Alla projekt-queries filtreras på `companyId == currentUser.companyId` (via ProjectsContext / säkerhetsregler).

---

## 5. Flöden

**Köp på webben (Stripe webhook → Cloud Function)**  
1. Skapa `licenses/{licenseId}` (code, companyId, maxSeats, usedSeats: 0, status: "active", purchasedByUid).  
2. Skapa `companies/{companyId}` (licenseId).  
3. Skapa `companies/{companyId}/members/{purchaserUid}` (role: "admin").  
4. Skapa `licenseCodes/{normalizedCode}` → licenseId.  
5. Uppdatera `users/{purchaserUid}` med companyId, role: "admin".  
6. Sätt license.usedSeats = 1.

**Aktivering i appen (användare anger licenskod)**  
1. Anrop till callable Cloud Function `claimLicense` med `{ code }`.  
2. Function: hämta license via licenseCodes, kolla status och usedSeats < maxSeats.  
3. Function: skapa `companies/{companyId}/members/{uid}` (role: "employee").  
4. Function: öka license.usedSeats med 1.  
5. Function: uppdatera `users/{uid}` med companyId, role: "employee".  
6. Returnera { companyId, role } till klienten.

**När platser är fulla**  
- Function returnerar fel; appen visar: *"Licensen är full. Be din administratör utöka antalet platser."*

---

## 6. Säkerhetsregler (Firestore Rules) – förslag

- **licenseCodes:** endast läsning för autentiserade användare (eller endast via Cloud Function).  
- **licenses:** läs/skriv endast från Cloud Functions (admin SDK).  
- **companies:** användare kan läsa sitt eget company (där de finns i members).  
- **companies/{companyId}/members:** användare kan läsa members i sitt company; skriv endast via Cloud Function.  
- **users:** användare kan läsa/skriva sitt eget dokument (users/{uid}); companyId/role uppdateras av Cloud Function.  
- **groups:** läs/skriv endast om request.auth.uid finns i members **och** group.companyId == användarens companyId.

---

## 7. Index (vid behov)

- `licenseCodes`: ingen samling-index (document lookup på ID).  
- `licenses`: eventuellt `status` + `companyId` om ni filtrerar i admin.  
- `groups`: sammansatt index på `companyId` + `status` (eller `members`) för projektlistan per företag.
