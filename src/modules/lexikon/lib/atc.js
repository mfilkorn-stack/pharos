const NTIN_PREFIX = "04150";

export function parsePznFromGtin(gtin) {
  if (!gtin || typeof gtin !== "string") return null;
  const digits = gtin.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 14) return null;
  const g14 = digits.length === 13 ? "0" + digits : digits;
  if (!g14.startsWith(NTIN_PREFIX)) return null;
  return g14.slice(5, 13);
}

export function groupForAtc(atc, map) {
  if (!atc || typeof atc !== "string") return null;
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (atc.startsWith(k)) return map[k];
  }
  return null;
}
