// src/modules/medigabe/lib/ki.js
// Kontraindikations-Logik für Schritt 4 — reine Funktionen.
// Dauermedikation = dritte KI-Klasse (Verhalten wie relativ, KI-generierte Hinweise).

import { normKey, aggregateCheck } from "../../lexikon/lib/saaCheck.js";

// Index des offiziellen Kontra-Punkts, der die Substanz namentlich nennt, sonst -1.
// Nur fürs Hervorheben (kein Block). Kurz-Tokens < 5 Zeichen matchen nicht —
// Abkürzungen wie „Met" würden sonst in beliebigen KI-Texten falsch anschlagen.
export function kontraMatchIndex(medName, kontraList) {
  const n = normKey(medName);
  if (!n || n.length < 5) return -1;
  return (kontraList || []).findIndex((k) => normKey(k).includes(n));
}

// KI-Punktquellen einer Gabe: Indikations-Override (SAA scoped Listen, z. B.
// Midazolam „bei Analgosedierung") — sonst die globalen saa.json-Listen.
export function kiListen(saaEntry, ind) {
  return {
    kontra: ind?.kontra ?? saaEntry.kontra ?? [],
    relKontra: ind?.relKontra ?? saaEntry.relKontra ?? [],
  };
}

// Gemergte KI-Punktlisten über alle Gaben: identische Texte dedupliziert
// (Key aus normKey), meds[] sammelt die Namen der betroffenen Medikamente.
// gaben: [{ saaEntry, ind }]
export function kiPunkte(gaben) {
  const mk = (prefix) => {
    const map = new Map();
    return {
      add(text, medName) {
        const key = `${prefix}:${normKey(text)}`;
        const cur = map.get(key);
        if (cur) { if (!cur.meds.includes(medName)) cur.meds.push(medName); }
        else map.set(key, { key, text, meds: [medName] });
      },
      list: () => [...map.values()],
    };
  };
  const abs = mk("a");
  const rel = mk("r");
  for (const { saaEntry, ind } of gaben) {
    const { kontra, relKontra } = kiListen(saaEntry, ind);
    for (const t of kontra) abs.add(t, saaEntry.name);
    for (const t of relKontra) rel.add(t, saaEntry.name);
  }
  return { abs: abs.list(), rel: rel.list() };
}

const LEVEL_RANG = { ok: 0, vorsicht: 1, absolut: 2 };

// Dauermed-Abgleich gegen ALLE gewählten Medikamente: höchstes Level gewinnt,
// gruende führt jeden Treffer mit Medikamentenname auf.
export function dauermedRowsMulti({ meds, matrix, saaEntries }) {
  return (meds || []).map((med) => {
    const { results, pending } = aggregateCheck([med], matrix, saaEntries);
    const gruende = [];
    let level = "ok";
    for (const e of saaEntries) {
      const hit = results.find((r) => r.id === e.id);
      if (hit && hit.level !== "ok") {
        gruende.push({ medName: e.name, level: hit.level, reason: hit.reason });
        if (LEVEL_RANG[hit.level] > LEVEL_RANG[level]) level = hit.level;
      }
    }
    return { med, level, gruende, pending: pending.length > 0 };
  });
}

// answers: { "<absKey>": "ja"|"nein", "<relKey>": "ja"|"nein", "m:<normKey>": true }
// absKeys/relKeys: stable string keys (a:<normKey(text)>) aus kiPunkte().
// flaggedMeds: normKeys der Dauermed-Zeilen mit level !== "ok" (nur die brauchen Haken).
export function kiOutcome({ answers, absKeys, relKeys, flaggedMeds }) {
  let complete = true;
  let stop = false;
  let confirm = false;
  for (const k of absKeys || []) {
    const a = answers[k];
    if (a !== "ja" && a !== "nein") complete = false;
    if (a === "ja") stop = true;
  }
  for (const k of relKeys || []) {
    const a = answers[k];
    if (a !== "ja" && a !== "nein") complete = false;
    if (a === "ja") confirm = true;
  }
  for (const m of flaggedMeds || []) {
    if (!answers[`m:${m}`]) complete = false;
    else confirm = true; // geflaggtes Dauermedikament → Abwäge-Dialog wie bei relativer KI
  }
  // stop überwiegt confirm: Caller zeigt bei stop=true den Stopp-Screen, kein Dialog.
  return { complete, stop, confirm };
}
