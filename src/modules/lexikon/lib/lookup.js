import { resolve, norm } from "./match.js";
import { groupForAtc } from "./atc.js";

export function lookup(token, { db, atcIndex, groupMap, groups }) {
  // Tier 0a
  const a = resolve(token, db);
  if (a.length) {
    return { hits: a.map((x) => ({ ...x.entry, source: "0a" })) };
  }
  // Tier 0b: name → atc_index → group
  const t = norm(token);
  const idxHit = atcIndex.find((e) => norm(e.wirkstoff) === t || (e.synonyms || []).some((s) => norm(s) === t));
  if (idxHit) {
    const groupId = groupForAtc(idxHit.atc, groupMap);
    if (groupId && groups[groupId]) {
      const g = groups[groupId];
      return {
        hits: [{
          id: norm(idxHit.wirkstoff),
          wirkstoff: idxHit.wirkstoff,
          synonyms: idxHit.synonyms || [],
          atc: idxHit.atc,
          gruppe: g.gruppe,
          indikationen: [],
          notfall: g.notfall,
          source: "0b",
        }],
        badge: "generic",
      };
    }
  }
  return { hits: [] };
}

export function unknownHit(name) {
  const t = (name || "").trim();
  return {
    id: `unknown:${norm(t)}`,
    wirkstoff: t,
    synonyms: [],
    atc: null,
    gruppe: "Nicht im Datenbestand",
    indikationen: [],
    notfall: [],
    source: "unknown",
  };
}
