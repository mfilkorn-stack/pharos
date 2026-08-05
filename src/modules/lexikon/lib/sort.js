// Sortierung der Ergebnisliste.
//
// Vorher wurde ausschliesslich nach Notfallrelevanz sortiert. Das hatte zwei
// Folgen: bei aktiver Suche verlor der exakte Namenstreffer gegen jeden
// Hochrisiko-Teilstringtreffer ("Morphin" zeigte Heroin zuerst), und innerhalb
// eines Rangs gab es gar keine Ordnung — allein 64 Substanzen teilen sich
// "hoch" und standen in reiner Dateireihenfolge.

import { norm } from "./match.js";

export function notfallRank(item) {
  const ns = item.notfall || [];
  if (ns.some((n) => n.level === "hoch")) return 3;
  if (ns.some((n) => n.level === "mittel")) return 2;
  if (ns.length) return 1;
  return 0;
}

// Trefferqualitaet, hoeher ist besser.
export const TIER = {
  EXAKT: 4,   // Wirkstoff oder Synonym exakt getroffen
  PREFIX: 3,  // Wortanfang: "para" → Paracetamol
  TEIL: 2,    // Teilstring im Namen
  KONTEXT: 1, // Treffer nur ueber Gruppe, Toxidrom oder Leitsymptom
  KEIN: 0,
};

// Erwartet einen Eintrag, der den Suchfilter bereits passiert hat — daher ist
// KONTEXT der Boden und nicht KEIN: irgendwo hat es gematcht, nur nicht im Namen.
export function relevanceTier(item, query) {
  const q = norm(query);
  if (!q) return TIER.KEIN;
  const namen = [item.wirkstoff, ...(item.synonyms || [])].map(norm).filter(Boolean);
  if (namen.some((n) => n === q)) return TIER.EXAKT;
  if (namen.some((n) => n.startsWith(q))) return TIER.PREFIX;
  if (namen.some((n) => n.includes(q))) return TIER.TEIL;
  return TIER.KONTEXT;
}

// Deutsche Kollation: sonst landet "Ähnlich" hinter "Zyprexa".
const byName = (a, b) => (a.wirkstoff || "").localeCompare(b.wirkstoff || "", "de");
const byGruppe = (a, b) =>
  (a.gruppe || "").localeCompare(b.gruppe || "", "de") || byName(a, b);

export const SORT_OPTIONS = [
  { key: "relevanz", label: "Relevanz", nurMitSuche: true },
  { key: "notfall", label: "Notfallrelevanz" },
  { key: "az", label: "A – Z" },
  { key: "gruppe", label: "Gruppe" },
];

export const SORT_KEYS = SORT_OPTIONS.map((o) => o.key);

// Ohne Query ist "relevanz" bedeutungslos — dann gilt Notfallrelevanz.
export function effectiveSortMode(mode, query) {
  const hasQuery = Boolean((query || "").trim());
  if (!mode) return hasQuery ? "relevanz" : "notfall";
  if (mode === "relevanz" && !hasQuery) return "notfall";
  return SORT_KEYS.includes(mode) ? mode : "notfall";
}

export function sortResults(list, mode, query) {
  const arr = [...(list || [])];
  switch (mode) {
    case "relevanz":
      return arr.sort(
        (a, b) =>
          relevanceTier(b, query) - relevanceTier(a, query) ||
          notfallRank(b) - notfallRank(a) ||
          byName(a, b)
      );
    case "az":
      return arr.sort(byName);
    case "gruppe":
      return arr.sort(byGruppe);
    case "notfall":
    default:
      return arr.sort((a, b) => notfallRank(b) - notfallRank(a) || byName(a, b));
  }
}
