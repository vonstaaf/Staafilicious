# Seed av testdata (licens + företag + projekt)

Skriptet `scripts/seedLicense.js` skapar i Firestore:

- Ett **testföretag** (companies)
- En **testlicens** med koden `TEST-1234` och max 5 platser
- **Första admin** (om du anger `--uid`)
- Ett **testprojekt** (groups): "Elinstallation Solna" kopplat till företaget

---

## 1. Service account (Firestore från Node)

Du behöver en nyckel så att skriptet får skriva till Firestore.

### Alternativ A: JSON-nyckel från Firebase Console

1. Gå till [Firebase Console](https://console.firebase.google.com) → ditt projekt → **Projektinställningar** (kugghjulet) → **Service accounts**.
2. Klicka **Generera ny privat nyckel**.
3. Spara filen i projektets **rot** som `serviceAccountKey.json` (lägg till den i `.gitignore` så den inte committas).

Sätt miljövariabeln (valfritt om filen ligger i rot som ovan):

```bash
export GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
```

### Alternativ B: Application Default Credentials (gcloud)

Om du använder Google Cloud CLI:

```bash
gcloud auth application-default login
```

Då används inloggade användarens behörighet. Skriptet behöver då ändras så att det inte kräver `require(keyPath)` utan använder `admin.credential.applicationDefault()`. Se nedan under "Kör utan JSON-fil".

---

## 2. Hämta ditt användar-UID (för första admin)

För att seeda med **dig själv som admin** behöver skriptet ditt Firebase Auth UID.

- **Firebase Console:** Authentication → Users → kopia användarens **User UID**.
- **Eller i appen:** Logga in och lägg tillfälligt in `console.log(auth.currentUser.uid)` (t.ex. i App.js efter inloggning) och kör appen.

---

## 3. Köra skriptet

Från **projektets rot** (där `package.json` ligger):

```bash
# Med dig som första admin (ersätt med ditt UID)
node scripts/seedLicense.js --uid DIN_UID_HÄR --email din@epost.se

# Endast företag + licens + projekt (ingen admin; första som anger TEST-1234 blir anställd)
node scripts/seedLicense.js
```

Om du lagt `serviceAccountKey.json` i roten behöver du inte sätta `GOOGLE_APPLICATION_CREDENTIALS`.

---

## 4. Efter körning

- **Licenskod:** `TEST-1234`
- **Max platser:** 5
- Om du angav `--uid`: det användardokumentet har fått `companyId` och `role: "admin"` och kommer direkt in i appen utan licensprompt.
- Om du **inte** angav `--uid`: logga in i appen, ange licenskoden `TEST-1234` – du kopplas som anställd och kommer in. Projektet "Elinstallation Solna" ska synas i projektlistan (om din app redan filtrerar på `companyId`; annars kan det synas bland övriga grupper tills filtrering är på plats).

---

## 5. npm-script (valfritt)

I `package.json` under `"scripts"`:

```json
"seed:license": "node scripts/seedLicense.js"
```

Kör då:

```bash
npm run seed:license -- --uid DIN_UID --email din@epost.se
```
