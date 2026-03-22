# Jämförelse: SQL-schema / .cursorrules mot vår kod

## 1. Databas (SQL vs Firestore)

**I din beskrivning:** PostgreSQL med tabeller `bygg_standarder`, `projekt`, `kontroll_moment` (matvarde, gransvarde_max/min, ar_godkand).

**I vår app:** Vi använder **Firestore** (NoSQL), ingen SQL.

| SQL-begrepp | Vår motsvarighet |
|-------------|------------------|
| `projekt` | `groups` (projekt) + `companies/{id}/groups/{groupId}` |
| `kontroll_moment` (matvarde, gransvarde, ar_godkand) | **Finns inte.** Vi sparar protokoll som dokument med `items`, `checks` (OK/N/A/Fel), `rowComments`, `images`. Mätvärden skrivs som text i kommentarsfält, ingen automatisk jämförelse mot gränsvärden. |
| `bygg_standarder` | Refereras bara i texter (t.ex. i `constants/byggChecklist.js`: "AMA Hus", "BKR", "BBR"). Ingen separat tabell/kollektion. |

**Slutsats:** SQL-schemat stämmer **inte** med vår arkitektur. Om du vill ha exakt den strukturen krävs en egen backend (t.ex. Node + Postgres) och API som appen anropar. Idag är all data i Firebase (Firestore + Storage).

---

## 2. Checklista och gränsvärden

**I .cursorrules:** Fuktkvot max 18 %, CC 300/450 mm, överlapp 200 mm m.m.

**I vår kod:**

- **Stämmer:**  
  - `constants/byggChecklist.js` beskriver samma regler i text (t.ex. "Fuktkvot <18% för inbyggnad", "Minst 200 mm överlapp", "CC 300 mm eller 450 mm").  
  - Enheter (`unit`) används för rätt punkter (%, mm).  
  - `.cursorrules` är tillagd i projektroten så att Cursor kan varna vid ny kod som bryter mot reglerna.

- **Stämmer inte (än):**  
  - Vi validerar **inte** mätvärden mot gränsvärdena i koden.  
  - Kommentarsfältet där användaren skriver t.ex. fuktkvot är fritext; det finns ingen kontroll som kastar fel eller varning om värdet > 18.  
  - Ingen motsvarighet till `ar_godkand` (beräknat från matvarde vs gransvarde).

**Slutsats:** Reglerna i .cursorrules **stämmer** med hur vi beskriver kraven i checklistor och dokumentation. De är **inte** ännu implementerade som programmatisk validering vid inmatning eller sparande.

---

## 3. Rekommendationer

1. **Behåll .cursorrules** – Cursor kan då varna om du t.ex. skriver `if (fuktkvot > 20)` eller genererar data som bryter mot reglerna.
2. **Valfritt – validering i appen:**  
   I `InspectionScreen` (där vi har fält "Ange värde i %...") kan du lägga in validering per checklistpunkt, t.ex.:  
   - för bygg-punkter med `unit: "%"` och label innehåller "Fuktkvot": varna om parseFloat(value) > 18 (eller > 12 för snickeri);  
   - för "Ångspärr"/"överlapp": varna om värde < 200 när enhet är mm.  
   Då kommer koden att **stämma bättre** med .cursorrules och byggstandarderna.
3. **SQL-schemat:** Använd det om du bygger en separat backend med Postgres. I nuvarande Firebase-baserade app används det **inte**.
