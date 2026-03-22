# Branschstandard: Egenkontroller för Bygg (Snickeri & Stomme)

Teknisk sammanställning enligt svenska regler (AMA, BKR, GVK, BBR). Används som underlag för appens Kvalitetsdokument Bygg.

---

## 1. Grund- och Stommontage

Bärighet och skelett. Fel kan leda till sättningar eller instabilitet.

| Kontroll | Referens | Dokumentkrav |
|----------|----------|--------------|
| Mottagningskontroll (Material) | Virke C24/C14, fuktkvot vid ankomst | Fuktprotokoll |
| Fuktmätningsprotokoll | <18% inbyggnad, <15% limning/målning | AMA Hus |
| Syllmontage | Syllisolering (kapillärbrytande), förankring | Egenkontroll |
| Avvägning (Tolerans) | Lod och våg ±2 mm på 2 m | AMA Hus |
| K-ritnings efterlevnad | Dimensioner bärande balkar/pelare | Ritning |

---

## 2. Klimatskärm & Isolering

Energieffektivitet och fuktsäkerhet (mögel, drag).

| Kontroll | Referens | Dokumentkrav |
|----------|----------|--------------|
| Ångspärr (Lufttäthet) | Tejp i skarvar, minst 200 mm överlapp | BBR / Foto |
| Vindavledare | Luftspalt vid takfot, ventilation bakom isolering | — |
| Isolering | Skivor tätt, ej komprimerade (U-värde) | — |
| Genomföringar | Tätning rör och el-dosor med manschetter | — |

---

## 3. Våtrumsförberedelse (Underlag för ytskikt)

Kritiskt för plattsättare/mattläggare. BKR/GVK.

| Kontroll | Referens | Dokumentkrav |
|----------|----------|--------------|
| Regelavstånd (CC-mått) | CC 300 mm eller 450 mm enligt skivkonstruktion | Säker Vatten/BKR |
| Kortlingar för infästning | Kommod, tvättställ, duschväggar, armaturer, toalett, grab bars | Signerad checklista |
| Skivmontage | Fogavstånd, skruvskallar ej punkterat våtrumsskiva | — |

---

## 4. Brand- och Ljudtätning

BBR.

| Kontroll | Referens | Dokumentkrav |
|----------|----------|--------------|
| Brandcellsgränser | Brandstopp (stenull/brandfog) lägenheter/garage | EI30/EI60, Intyg/Foto |
| Ljudisolering | Syllisolering, elastiska fogar, ljudbryggor | — |
| Dörrmontage | Brand/ljudklassade dörrar, mineralull, fogning | — |

---

## 5. Slutfinish och Besiktning

| Kontroll | Referens |
|----------|----------|
| Målarnära ytor | Gipsning, hörnskydd, skruvskallar försänkta |
| Listning och omfattningar | Geringar, passform dörrar/fönster |
| Funktionskontroll | Fönster/dörrar öppna, stänga, låsa efter sättning |

---

## Implementering i appen

- Checklistan finns i **`constants/byggChecklist.js`** som `BYGG_EGENKONTROLL_ITEMS`.
- Kortet **KVALITETSDOKUMENT BYGG** visas i Kontroller för användare med yrke Bygg och öppnar `InspectionScreen` med denna mall.
