import { describe, it, expect } from "vitest";
import data from "../src/modules/lexikon/data/data.json";
import saaData from "../src/modules/lexikon/data/saa.json";
import { CATEGORIES, CATEGORIZED_GROUPS } from "../src/modules/lexikon/components/CategoryIcon.jsx";
import { matchesFilter } from "../src/modules/lexikon/components/QuickFilters.jsx";

// Nur die Felder, die matchesFilter tatsaechlich auswertet.
function asItem(s) {
  const g = data.groups[s.group];
  const groupNotfall = g ? g.notfall || [] : [];
  return {
    wirkstoff: s.wirkstoff,
    group: s.group,
    source: s.source || "0a",
    notfall: [...(s.notfall && s.notfall.length ? s.notfall : groupNotfall), ...(s.extra || [])],
  };
}

const SEED_ITEMS = data.substances.map(asItem);
const SAA_ITEMS = (saaData.entries || []).map((e) => ({
  wirkstoff: e.name,
  group: null,
  source: "saa",
  notfall: [],
}));
const ALL_ITEMS = [...SEED_ITEMS, ...SAA_ITEMS];

const CHIP_KEYS = CATEGORIES.map((c) => c.key);

function chipsFor(item) {
  return CHIP_KEYS.filter((k) => matchesFilter(item, k));
}

describe("Kategorie-Zuordnung", () => {
  it("jeder Eintrag ist ueber mindestens einen Chip erreichbar", () => {
    const orphans = ALL_ITEMS.filter((i) => chipsFor(i).length === 0);
    expect(
      orphans.map((o) => `${o.wirkstoff} (group=${o.group})`),
      "Eintraege ohne jede Kategorie"
    ).toEqual([]);
  });

  it("jede Gruppe aus data.json ist entweder kategorisiert oder faellt in 'andere'", () => {
    for (const s of data.substances) {
      const item = asItem(s);
      const inNamed = CHIP_KEYS.filter((k) => k !== "andere" && k !== "kritisch")
        .some((k) => matchesFilter(item, k));
      const inOther = matchesFilter(item, "andere");
      // Genau eine der beiden Aussagen muss gelten — sonst waere die
      // Auffangkategorie entweder loechrig oder wuerde doppelt zaehlen.
      expect(inNamed || inOther, `${s.wirkstoff}: weder benannt noch 'andere'`).toBe(true);
      expect(inNamed && inOther, `${s.wirkstoff}: doppelt in benannt UND 'andere'`).toBe(false);
    }
  });

  it("Fexofenadin/Allegra landet unter 'allergie'", () => {
    const fexo = data.substances.find((s) => s.id === "fexofenadin");
    expect(fexo).toBeDefined();
    expect(chipsFor(asItem(fexo))).toContain("allergie");
  });

  it("Eintraege ohne Gruppe (z. B. unvollstaendig angereichert) landen in 'andere'", () => {
    const item = { wirkstoff: "Irgendwas", group: null, source: "ki", notfall: [] };
    expect(matchesFilter(item, "andere")).toBe(true);
  });

  it("SAA-Eintraege zaehlen nur unter 'saa', nicht zusaetzlich unter 'andere'", () => {
    for (const item of SAA_ITEMS) {
      expect(matchesFilter(item, "saa")).toBe(true);
      expect(matchesFilter(item, "andere")).toBe(false);
    }
  });

  it("CATEGORIZED_GROUPS deckt sich mit den Gruppen der Kategorien", () => {
    const fromCats = CATEGORIES.filter((c) => c.groups).flatMap((c) => [...c.groups]);
    expect([...CATEGORIZED_GROUPS].sort()).toEqual([...new Set(fromCats)].sort());
  });

  it("keine Gruppe steht in zwei Kategorien gleichzeitig", () => {
    const seen = new Map();
    for (const cat of CATEGORIES) {
      if (!cat.groups) continue;
      for (const g of cat.groups) {
        expect(seen.has(g), `Gruppe "${g}" in ${seen.get(g)} und ${cat.key}`).toBe(false);
        seen.set(g, cat.key);
      }
    }
  });
});
