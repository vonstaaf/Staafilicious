export const PROFESSION_OPTIONS = [
  { key: "el", label: "Elektriker" },
  { key: "vvs", label: "Rörmokare (VVS)" },
  { key: "bygg", label: "Snickare / Bygg" },
];

export function normalizeProfession(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw.includes("vvs") || raw.includes("rör")) return "vvs";
  if (raw.includes("bygg") || raw.includes("snick")) return "bygg";
  return "el";
}

export function professionLabel(value) {
  const key = normalizeProfession(value);
  const opt = PROFESSION_OPTIONS.find((x) => x.key === key);
  return opt ? opt.label : "Elektriker";
}

