/**
 * Säker tolkning av AI-arbetsorder-svar (API kan returnera varierande JSON).
 * All JSON.parse sker i try/catch — inga okontrollerade kast från parse-lagret.
 */

function tryParseJsonString(str) {
  if (typeof str !== "string") return null;
  const t = str.trim();
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

/** Extraherar JSON ur ```json ... ``` om modellen råkar wrappa svaret. */
function unwrapMarkdownJson(text) {
  if (typeof text !== "string") return text;
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (m && m[1]) return m[1].trim();
  return text.trim();
}

/**
 * Försök hitta första välformade JSON-objektet i text (t.ex. om modellen skriver text runt JSON).
 */
function tryParseFirstJsonObjectInText(text) {
  if (typeof text !== "string") return null;
  const t = unwrapMarkdownJson(text);
  const start = t.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < t.length; i++) {
    const ch = t[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const slice = t.slice(start, i + 1);
        try {
          const o = JSON.parse(slice);
          return typeof o === "object" && o !== null ? o : null;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/**
 * Plockar ut ett payload-objekt oavsett om API lagt det på roten, i .data, eller som JSON-sträng.
 */
function extractPayloadObject(raw) {
  if (raw == null) return null;

  if (typeof raw === "string") {
    const unwrapped = unwrapMarkdownJson(raw);
    return (
      tryParseJsonString(unwrapped) ||
      tryParseFirstJsonObjectInText(unwrapped)
    );
  }

  if (typeof raw !== "object") return null;

  const looksLikePayload =
    "timeReported" in raw ||
    "materials" in raw ||
    "hours" in raw ||
    "timmar" in raw;
  if (looksLikePayload) return raw;

  const candidates = [
    raw.object,
    raw.result,
    raw.data,
    raw.parsed,
    raw.output,
    raw.payload,
  ];
  for (const c of candidates) {
    if (c == null) continue;
    if (typeof c === "string") {
      const p =
        tryParseJsonString(unwrapMarkdownJson(c)) ||
        tryParseFirstJsonObjectInText(c);
      if (p && typeof p === "object") return p;
    } else if (typeof c === "object") {
      return c;
    }
  }
  return null;
}

/**
 * Normaliserar ett material-objekt från API.
 */
function normalizeMaterialItem(m) {
  if (m == null) {
    return {
      designation: "",
      quantity: 0,
      unit: "",
      eNumber: "",
    };
  }
  if (typeof m === "string") {
    const parsed =
      tryParseJsonString(unwrapMarkdownJson(m)) ||
      tryParseFirstJsonObjectInText(m);
    if (parsed && typeof parsed === "object") {
      return normalizeMaterialItem(parsed);
    }
    return {
      designation: m,
      quantity: 0,
      unit: "",
      eNumber: "",
    };
  }
  const qtyRaw = m.quantity ?? m.qty ?? m.antal;
  const q =
    typeof qtyRaw === "number"
      ? qtyRaw
      : parseFloat(String(qtyRaw ?? "").replace(",", ".").trim());
  return {
    designation:
      String(m.designation ?? m.name ?? m.benamning ?? m.title ?? "").trim() ||
      "Artikel",
    quantity: !Number.isNaN(q) && Number.isFinite(q) ? q : 0,
    unit: String(m.unit ?? m.enhet ?? "").trim(),
    eNumber: String(
      m.eNumber ?? m.articleNumber ?? m.artnr ?? m.e_nummer ?? ""
    ).trim(),
  };
}

/**
 * Parsar API-svar till { timeReported, materials, notes }.
 * Kastar Error om strukturen är obrukbar (fångas i skärmen; där loggas med logError).
 */
export function parseAiWorkOrderPayload(raw) {
  let data;
  try {
    data = extractPayloadObject(raw);
  } catch {
    throw new Error("Kunde inte tolka AI-svaret (ogiltig JSON).");
  }

  if (!data || typeof data !== "object") {
    throw new Error("Kunde inte tolka AI-svaret (saknar förväntad struktur).");
  }

  const trRaw = data.timeReported ?? data.hours ?? data.timmar ?? 0;
  const timeReported =
    typeof trRaw === "number"
      ? trRaw
      : parseFloat(String(trRaw).replace(",", ".").trim());
  const timeSafe =
    Number.isFinite(timeReported) && !Number.isNaN(timeReported)
      ? Math.max(0, timeReported)
      : 0;

  let materialsIn = data.materials ?? data.material ?? [];
  if (typeof materialsIn === "string") {
    const p =
      tryParseJsonString(unwrapMarkdownJson(materialsIn)) ||
      tryParseFirstJsonObjectInText(materialsIn);
    materialsIn = Array.isArray(p) ? p : [];
  }
  if (!Array.isArray(materialsIn)) {
    materialsIn = [];
  }

  const materials = materialsIn.map((m) => normalizeMaterialItem(m));

  const notesRaw = data.notes ?? data.kommentar ?? data.comment ?? "";
  const notes = typeof notesRaw === "string" ? notesRaw : String(notesRaw ?? "");

  return {
    timeReported: timeSafe,
    materials,
    notes: notes.trim(),
  };
}
