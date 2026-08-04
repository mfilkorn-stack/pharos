import { describe, it, expect } from "vitest";
import map from "../src/modules/lexikon/data/atc_group_map.json";
import sourceMap from "../scripts/atc_group_map.source.json";
import data from "../src/modules/lexikon/data/data.json";
import seed from "../scripts/seed.json";
import { CATEGORIZED_GROUPS } from "../src/modules/lexikon/components/CategoryIcon.jsx";

// Dieselbe Praefix-Logik wie server/enrich.mjs — laengster Treffer gewinnt.
function groupForAtc(atc) {
  if (!atc) return null;
  const up = String(atc).toUpperCase();
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  for (const k of keys) if (up.startsWith(k.toUpperCase())) return map[k];
  return null;
}

// Gruppen, die bewusst in keiner benannten Kategorie stehen und ueber den
// Auffang-Chip "Andere" erreichbar sind. Explizit gelistet, damit eine NEUE
// unkategorisierte Gruppe den Test bricht statt still in "Andere" zu landen.
const BEWUSST_ANDERE = ["5alpha_reduktase", "mineralstoff", "ppi", "schilddruese"];

describe("ATC-Gruppen-Map", () => {
  it("jeder Map-Wert ist eine echte Gruppe in data.json", () => {
    // Spiegelt die Validierung in scripts/build-data.mjs:133.
    const unknown = Object.entries(map).filter(([, g]) => !data.groups[g]);
    expect(unknown).toEqual([]);
  });

  it("Quelle und ausgelieferte Map sind deckungsgleich", () => {
    // build-data.mjs kopiert die Quelle 1:1. Laufen sie auseinander, weicht
    // das, was der Server nutzt, von der kanonischen Quelle ab.
    expect(map).toEqual(sourceMap);
  });

  it("jede Gruppe aus seed.json existiert auch in data.json", () => {
    const missing = Object.keys(seed.groups).filter((g) => !data.groups[g]);
    expect(missing).toEqual([]);
  });

  it("jede Map-Gruppe ist kategorisiert oder bewusst in 'Andere'", () => {
    const orphans = [...new Set(Object.values(map))]
      .filter((g) => !CATEGORIZED_GROUPS.has(g))
      .filter((g) => !BEWUSST_ANDERE.includes(g));
    expect(orphans).toEqual([]);
  });

  it("ordnet die zuvor unerkannten Psychopharmaka korrekt zu", () => {
    expect(groupForAtc("N05AH04")).toBe("antipsychotikum"); // Quetiapin
    expect(groupForAtc("N05AN01")).toBe("lithium");         // Lithiumcarbonat
    expect(groupForAtc("N06BA04")).toBe("psychostimulans"); // Methylphenidat
  });

  it("laengeres Praefix gewinnt (N05AN vor N05A)", () => {
    expect(groupForAtc("N05AL01")).toBe("antipsychotikum"); // Sulpirid → N05A
    expect(groupForAtc("N05AN01")).toBe("lithium");         // → N05AN
  });

  it("die neuen Gruppen haengen an der Neuro/Psyche-Kategorie", () => {
    for (const g of ["antipsychotikum", "lithium", "psychostimulans"]) {
      expect(CATEGORIZED_GROUPS.has(g), `${g} nicht kategorisiert`).toBe(true);
    }
  });
});
