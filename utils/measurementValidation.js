/**
 * Validering och sparande av mätvärden enligt AMA, BBR, Säker Vatten (.cursorrules).
 * Används av InspectionScreen för punkter med unit (%, mm).
 */

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";

/**
 * Returnerar gränsvärden för en checklistpunkt utifrån label/unit.
 * @param {{ id: string, label: string, section: string, unit: string }} item
 * @returns {{ limitMin?: number, limitMax?: number, parameter: string, category: string, standardRef: string } | null}
 */
export function getLimitForItem(item) {
  if (!item || !item.unit) return null;
  const label = (item.label || "").toLowerCase();
  const section = (item.section || "").toLowerCase();

  // Fuktkvot (AMA Hus)
  if (item.unit === "%" && (label.includes("fuktkvot") || label.includes("fukt"))) {
    const isSnickeri = label.includes("snickeri") || label.includes("list") || section.includes("slutfinish");
    return {
      parameter: "fuktkvot",
      category: "Stomme",
      standardRef: "AMA Hus",
      limitMax: isSnickeri ? 12 : 18,
      limitMin: 0,
    };
  }

  // Regelavstånd CC (BKR/GVK) – endast 300 eller 450 mm
  if ((item.unit === "mm" && (label.includes("cc") || label.includes("regelavstånd"))) || (label.includes("cc-mått"))) {
    return {
      parameter: "cc_matt",
      category: "Våtrum",
      standardRef: "BKR/GVK",
      limitMin: 300,
      limitMax: 450,
      allowedValues: [300, 450],
    };
  }

  // Ångspärr överlapp (BBR) – minst 200 mm
  if (item.unit === "mm" && (label.includes("överlapp") || label.includes("ångspärr"))) {
    return {
      parameter: "overlapp",
      category: "Täthet",
      standardRef: "BBR",
      limitMin: 200,
      limitMax: null,
    };
  }

  // Avvägning / lod (AMA Hus) – max 2 mm per 2 m
  if (item.unit === "mm" && (label.includes("avvägning") || label.includes("lod"))) {
    return {
      parameter: "lodavvikelse",
      category: "Stomme",
      standardRef: "AMA Hus",
      limitMax: 2,
      limitMin: null,
    };
  }

  return null;
}

/**
 * Validerar ett mätvärde mot gränsvärdena. Returnerar { valid, message }.
 * @param {string} valueStr - användarens inmatning
 * @param {{ id: string, label: string, unit: string }} item
 */
export function validateMeasurement(valueStr, item) {
  const limits = getLimitForItem(item);
  if (!limits) return { valid: true };

  const num = parseFloat(String(valueStr).replace(",", ".").trim());
  if (Number.isNaN(num)) return { valid: true }; // fritext är ok

  if (limits.allowedValues) {
    const ok = limits.allowedValues.includes(num);
    return {
      valid: ok,
      message: ok ? null : `Enligt ${limits.standardRef} ska regelavstånd (CC) vara 300 eller 450 mm.`,
    };
  }
  if (limits.limitMax != null && num > limits.limitMax) {
    const ref = limits.standardRef;
    const max = limits.limitMax;
    return {
      valid: false,
      message: limits.parameter === "fuktkvot"
        ? `Enligt ${ref} ska fuktkvot max vara ${max} %. Justera eller dokumentera avvikelse.`
        : `Enligt ${ref} ska värdet max vara ${max} ${item.unit}.`,
    };
  }
  if (limits.limitMin != null && num < limits.limitMin) {
    return {
      valid: false,
      message: `Enligt ${limits.standardRef} ska överlappning vara minst ${limits.limitMin} mm.`,
    };
  }
  return { valid: true };
}

/**
 * Sparar ett mätvärde till Firestore (companies/.../groups/.../measurements).
 * @param {string} companyId
 * @param {string} groupId
 * @param {{ id: string, label: string, section: string, unit: string }} item
 * @param {number} value
 */
export async function saveMeasurement(companyId, groupId, item, value) {
  if (!companyId || !groupId || !item || Number.isNaN(Number(value))) return;
  const limits = getLimitForItem(item);
  const num = Number(value);

  const limitMin = limits?.limitMin ?? null;
  const limitMax = limits?.limitMax ?? null;
  let isApproved = true;
  if (limits?.allowedValues) {
    isApproved = limits.allowedValues.includes(num);
  } else {
    if (limitMax != null && num > limitMax) isApproved = false;
    if (limitMin != null && num < limitMin) isApproved = false;
  }

  const ref = collection(db, "companies", companyId, "groups", groupId, "measurements");
  await addDoc(ref, {
    itemId: item.id,
    parameter: limits?.parameter ?? "mätvärde",
    category: limits?.category ?? item.section ?? "",
    value: num,
    unit: item.unit,
    limitMin,
    limitMax,
    isApproved,
    standardRef: limits?.standardRef ?? "",
    createdAt: serverTimestamp(),
  });
}
