// src/modules/medigabe/lib/ki.js
// Kontraindikations-Logik für Schritt 4 — reine Funktionen.
// Dauermedikation = dritte KI-Klasse (Verhalten wie relativ, KI-generierte Hinweise).

import { normKey, aggregateCheck } from "../../lexikon/lib/saaCheck.js";

// Pro Patienten-Medi: Flag-Level gegen GENAU das gewählte SAA-Medikament.
// → [{ med, level, reason, pending }]
export function dauermedRows({ meds, matrix, saaEntry }) {
  return (meds || []).map((med) => {
    const { results, pending } = aggregateCheck([med], matrix, [saaEntry]);
    const hit = results.find((r) => r.id === saaEntry.id);
    return {
      med,
      level: hit ? hit.level : "ok",
      reason: hit ? hit.reason : "",
      pending: pending.length > 0,
    };
  });
}

// Index des offiziellen Kontra-Punkts, der die Substanz namentlich nennt, sonst -1.
export function kontraMatchIndex(medName, kontraList) {
  const n = normKey(medName);
  if (!n) return -1;
  return (kontraList || []).findIndex((k) => normKey(k).includes(n));
}

// answers: { "a:i": "ja"|"nein", "r:i": "ja"|"nein", "m:<normKey>": true }
// flaggedMeds: normKeys der Dauermed-Zeilen mit level !== "ok" (nur die brauchen Haken).
export function kiOutcome({ answers, nAbs, nRel, flaggedMeds }) {
  let complete = true;
  let stop = false;
  let confirm = false;
  for (let i = 0; i < nAbs; i++) {
    const a = answers[`a:${i}`];
    if (a !== "ja" && a !== "nein") complete = false;
    if (a === "ja") stop = true;
  }
  for (let i = 0; i < nRel; i++) {
    const a = answers[`r:${i}`];
    if (a !== "ja" && a !== "nein") complete = false;
    if (a === "ja") confirm = true;
  }
  for (const m of flaggedMeds || []) {
    if (!answers[`m:${m}`]) complete = false;
  }
  return { complete, stop, confirm };
}
