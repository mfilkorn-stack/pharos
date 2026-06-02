import { norm } from "./match.js";

// Normalisierte Schlüssel eines Eintrags: Wirkstoffname + alle Synonyme.
// Damit erkennen wir Dubletten, deren Name als Synonym eines anderen Eintrags
// auftaucht (z. B. KI-„Metoprololsuccinat" mit Synonym „Metoprolol").
export function nameKeys(entry) {
  const keys = new Set();
  const add = (s) => { const k = norm(s || ""); if (k) keys.add(k); };
  add(entry.wirkstoff);
  for (const s of entry.synonyms || []) add(s);
  return keys;
}

// Baut die volle DB aus Seed + Runtime-Extras und entfernt Dubletten.
// Ein Extra gilt als Dublette eines bereits vorhandenen Eintrags, wenn:
//   - dieselbe id, ODER
//   - derselbe (nicht-leere) ATC-Code, ODER
//   - Überschneidung bei normalisiertem Wirkstoffname/Synonym.
// Seed-Einträge werden immer behalten; nur Extras können verworfen werden.
// Bereits behaltene Extras zählen für nachfolgende Extras als „vorhanden".
export function buildDedupedDB(seed, extras) {
  const result = [...seed];
  const ids = new Set(seed.map((e) => e.id));
  const atcs = new Set(seed.map((e) => e.atc).filter(Boolean).map((a) => String(a).toUpperCase()));
  const names = new Set();
  for (const e of seed) for (const k of nameKeys(e)) names.add(k);

  for (const e of extras) {
    if (ids.has(e.id)) continue;
    const atc = e.atc ? String(e.atc).toUpperCase() : null;
    const keys = [...nameKeys(e)];
    const isDupe = (atc && atcs.has(atc)) || keys.some((k) => names.has(k));
    if (isDupe) continue;
    ids.add(e.id);
    if (atc) atcs.add(atc);
    for (const k of keys) names.add(k);
    result.push(e);
  }
  return result;
}
