import { describe, it, expect } from "vitest";
import data from "../src/modules/lexikon/data/data.json";
import {
  notfallRank, relevanceTier, sortResults, effectiveSortMode, TIER, SORT_OPTIONS,
} from "../src/modules/lexikon/lib/sort.js";

// Wie Lexikon.jsx die Eintraege aufbaut (nur die fuer Sortierung relevanten Felder).
function mat(s) {
  const g = data.groups[s.group];
  return {
    ...s,
    gruppe: g?.gruppe || "",
    toxidrom: g?.toxidrom || null,
    notfall: [...(s.notfall?.length ? s.notfall : (g?.notfall || [])), ...(s.extra || [])],
  };
}
const DB = data.substances.map(mat);

// Derselbe Filter wie in Lexikon.jsx (results-useMemo).
function suche(q) {
  const ql = q.toLowerCase();
  return DB.filter((d) =>
    [d.wirkstoff, d.gruppe, ...(d.synonyms || []), d.toxidrom?.label, ...(d.toxidrom?.leitsymptome || [])]
      .filter(Boolean).join(" ").toLowerCase().includes(ql)
  );
}

describe("relevanceTier", () => {
  const item = { wirkstoff: "Paracetamol", synonyms: ["ben-u-ron"] };

  it("stuft exakt > Wortanfang > Teilstring > Kontext", () => {
    expect(relevanceTier(item, "Paracetamol")).toBe(TIER.EXAKT);
    expect(relevanceTier(item, "para")).toBe(TIER.PREFIX);
    expect(relevanceTier(item, "cetamo")).toBe(TIER.TEIL);
    expect(relevanceTier(item, "fieber")).toBe(TIER.KONTEXT);
  });

  it("wertet Synonyme wie den Wirkstoffnamen", () => {
    expect(relevanceTier(item, "ben-u-ron")).toBe(TIER.EXAKT);
    expect(relevanceTier(item, "ben")).toBe(TIER.PREFIX);
  });

  it("ignoriert Diakritika und Sonderzeichen", () => {
    const ass = { wirkstoff: "Acetylsalicylsäure", synonyms: ["ASS"] };
    expect(relevanceTier(ass, "acetylsalicylsaure")).toBe(TIER.EXAKT);
    expect(relevanceTier(ass, "a.s.s.")).toBe(TIER.EXAKT);
  });
});

describe("Regression: exakter Treffer schlaegt Hochrisiko-Teiltreffer", () => {
  // Belegte Fehlfaelle des alten Verhaltens (nur notfallRank):
  //   "morphin" → Heroin stand vor Morphin
  //   "ass"     → MDA stand vor Acetylsalicylsäure
  it("\"morphin\" liefert Morphin vor Heroin", () => {
    const treffer = sortResults(suche("morphin"), "relevanz", "morphin");
    expect(treffer[0].wirkstoff).toMatch(/^Morphin/);
    const namen = treffer.map((t) => t.wirkstoff);
    expect(namen.findIndex((n) => /^Morphin/.test(n)))
      .toBeLessThan(namen.findIndex((n) => /Heroin/.test(n)));
  });

  it("\"ass\" liefert Acetylsalicylsäure vor MDA", () => {
    const treffer = sortResults(suche("ass"), "relevanz", "ass");
    const namen = treffer.map((t) => t.wirkstoff);
    expect(namen[0]).toBe("Acetylsalicylsäure");
    expect(namen.indexOf("Acetylsalicylsäure")).toBeLessThan(namen.findIndex((n) => /MDA/.test(n)));
  });

  it("das Risiko bleibt Zweitschluessel innerhalb derselben Trefferstufe", () => {
    const a = { wirkstoff: "Aaa", notfall: [{ level: "info" }] };
    const b = { wirkstoff: "Bbb", notfall: [{ level: "hoch" }] };
    // Beide nur Kontexttreffer → hoeheres Risiko zuerst, trotz Alphabet.
    expect(sortResults([a, b], "relevanz", "xyz").map((x) => x.wirkstoff)).toEqual(["Bbb", "Aaa"]);
  });
});

describe("Zweitschluessel innerhalb gleicher Notfallrelevanz", () => {
  it("sortiert bei gleichem Rang alphabetisch statt zufaellig", () => {
    const list = [
      { wirkstoff: "Zolpidem", notfall: [{ level: "hoch" }] },
      { wirkstoff: "Amiodaron", notfall: [{ level: "hoch" }] },
      { wirkstoff: "Midazolam", notfall: [{ level: "hoch" }] },
    ];
    expect(sortResults(list, "notfall").map((x) => x.wirkstoff))
      .toEqual(["Amiodaron", "Midazolam", "Zolpidem"]);
  });

  it("haelt den Risikorang ueber dem Alphabet", () => {
    const list = [
      { wirkstoff: "Aaa", notfall: [{ level: "info" }] },
      { wirkstoff: "Zzz", notfall: [{ level: "hoch" }] },
    ];
    expect(sortResults(list, "notfall").map((x) => x.wirkstoff)).toEqual(["Zzz", "Aaa"]);
  });

  it("die echte Liste hat unter 'hoch' keine Gleichstaende mehr", () => {
    const hoch = sortResults(DB, "notfall").filter((d) => notfallRank(d) === 3);
    const namen = hoch.map((d) => d.wirkstoff);
    expect(namen).toEqual([...namen].sort((a, b) => a.localeCompare(b, "de")));
    expect(namen.length).toBeGreaterThan(50); // 64 zum Zeitpunkt der Umstellung
  });
});

describe("Sortiermodi", () => {
  it("A–Z sortiert mit deutscher Kollation", () => {
    const list = [{ wirkstoff: "Zink" }, { wirkstoff: "Ähnlich" }, { wirkstoff: "Apixaban" }];
    expect(sortResults(list, "az").map((x) => x.wirkstoff)).toEqual(["Ähnlich", "Apixaban", "Zink"]);
  });

  it("Gruppe sortiert nach Gruppe, dann alphabetisch", () => {
    const list = [
      { wirkstoff: "Bbb", gruppe: "Betablocker" },
      { wirkstoff: "Aaa", gruppe: "Statin" },
      { wirkstoff: "Ccc", gruppe: "Betablocker" },
    ];
    expect(sortResults(list, "gruppe").map((x) => x.wirkstoff)).toEqual(["Bbb", "Ccc", "Aaa"]);
  });

  it("laesst die Eingabeliste unveraendert", () => {
    const list = [{ wirkstoff: "Zzz" }, { wirkstoff: "Aaa" }];
    const kopie = [...list];
    sortResults(list, "az");
    expect(list).toEqual(kopie);
  });
});

describe("effectiveSortMode", () => {
  it("waehlt ohne Nutzerwahl automatisch je nach Suchbegriff", () => {
    expect(effectiveSortMode(null, "morphin")).toBe("relevanz");
    expect(effectiveSortMode(null, "")).toBe("notfall");
    expect(effectiveSortMode(null, "   ")).toBe("notfall");
  });

  it("respektiert die Nutzerwahl", () => {
    expect(effectiveSortMode("az", "morphin")).toBe("az");
    expect(effectiveSortMode("gruppe", "")).toBe("gruppe");
  });

  it("faellt ohne Suchbegriff von Relevanz auf Notfallrelevanz zurueck", () => {
    expect(effectiveSortMode("relevanz", "")).toBe("notfall");
  });

  it("faengt unbekannte Modi ab", () => {
    expect(effectiveSortMode("quatsch", "")).toBe("notfall");
  });
});

describe("SORT_OPTIONS", () => {
  it("bietet Relevanz nur mit aktiver Suche an", () => {
    const ohneSuche = SORT_OPTIONS.filter((o) => !o.nurMitSuche).map((o) => o.key);
    expect(ohneSuche).toEqual(["notfall", "az", "gruppe"]);
    expect(SORT_OPTIONS.find((o) => o.key === "relevanz").nurMitSuche).toBe(true);
  });
});
