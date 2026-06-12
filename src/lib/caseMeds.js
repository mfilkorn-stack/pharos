// Geteilte Einsatz-Medikationsliste (aktueller Patient) für MedScan + Medigabe.
// NUR im Speicher — bewusst kein localStorage (keine Patientendaten persistieren).

let entries = [];
const subs = new Set();
// Snapshot vor Iteration: Unsubscribe während emit darf andere Subscriber nicht überspringen.
const emit = () => [...subs].forEach((fn) => fn());
const key = (s) => (s || "").trim().toLowerCase();

export function getCaseMeds() { return entries; }

export function setCaseMeds(list) { entries = [...(list || [])]; emit(); }

export function addCaseMed(entry) {
  if (!entry?.wirkstoff) return;
  if (entries.some((e) => key(e.wirkstoff) === key(entry.wirkstoff))) return;
  entries = [...entries, entry];
  emit();
}

export function removeCaseMed(wirkstoff) {
  entries = entries.filter((e) => key(e.wirkstoff) !== key(wirkstoff));
  emit();
}

// Ergänzt/aktualisiert per Wirkstoffname statt zu ersetzen — ein neuer Scan in
// MedScan darf zuvor erfasste Einsatz-Medikation nicht stillschweigend löschen.
export function upsertCaseMeds(list) {
  if (!list?.length) return;
  const incoming = new Map(list.filter((e) => e?.wirkstoff).map((e) => [key(e.wirkstoff), e]));
  entries = [
    ...entries.map((e) => incoming.get(key(e.wirkstoff)) || e),
    ...list.filter((e) => e?.wirkstoff && !entries.some((x) => key(x.wirkstoff) === key(e.wirkstoff))),
  ];
  emit();
}

export function clearCaseMeds() { entries = []; emit(); }

export function subscribeCaseMeds(fn) { subs.add(fn); return () => subs.delete(fn); }

// Namen für Matrix-Checks — gleiche Filterung wie SaaCheck (keine unknown/rejected).
export function caseMedNames(list = entries) {
  return list.filter((e) => e.source !== "unknown" && e.source !== "rejected").map((e) => e.wirkstoff);
}
