// tests/medigabe-ki.test.js
import { describe, it, expect } from "vitest";
import { dauermedRowsMulti, kontraMatchIndex, kiOutcome, kiListen, kiPunkte } from "../src/modules/medigabe/lib/ki.js";

const saaEntry = {
  id: "saa:esketamin",
  kontra: ["Überempfindlichkeit", "Vormedikation mit Aminophyllin, Theophyllin, Ergometrin"],
  relKontra: ["Pat. unter akutem Alkoholeinfluss"],
};
const matrix = {
  theophyllin: { flags: [
    { saaId: "saa:esketamin", level: "absolut", reason: "Vormedikation mit Theophyllin ist absolute KI." },
    { saaId: "saa:ass", level: "vorsicht", reason: "irrelevant für gewähltes Medikament" },
  ] },
  metoprolol: { flags: [] },
};

describe("dauermedRowsMulti", () => {
  it("liefert pro Patienten-Medi Level/Begründung nur für die gewählten Medikamente", () => {
    const rows = dauermedRowsMulti({ meds: ["Theophyllin", "Metoprolol"], matrix, saaEntries: [saaEntry] });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ med: "Theophyllin", level: "absolut", pending: false });
    expect(rows[0].gruende[0].reason).toContain("Theophyllin");
    expect(rows[1]).toMatchObject({ med: "Metoprolol", level: "ok" });
  });
  it("markiert Medis ohne Matrix-Eintrag als pending (Fallback-Level ok oder Text-Treffer)", () => {
    const rows = dauermedRowsMulti({ meds: ["Unbekantol"], matrix, saaEntries: [saaEntry] });
    expect(rows[0].pending).toBe(true);
  });
  it("höchstes Level über alle Gaben, Begründungen pro Medikament", () => {
    const mx = { theophyllin: { flags: [
      { saaId: "saa:esketamin", level: "absolut", reason: "KI bei Esketamin" },
      { saaId: "saa:midazolam", level: "vorsicht", reason: "Vorsicht bei Midazolam" },
    ] } };
    const rows = dauermedRowsMulti({ meds: ["Theophyllin"], matrix: mx, saaEntries: [
      { id: "saa:esketamin", name: "Esketamin", kontra: [], relKontra: [] },
      { id: "saa:midazolam", name: "Midazolam", kontra: [], relKontra: [] },
    ] });
    expect(rows[0].level).toBe("absolut");
    expect(rows[0].gruende).toHaveLength(2);
    expect(rows[0].gruende[0]).toMatchObject({ medName: "Esketamin", level: "absolut" });
  });
});

describe("kontraMatchIndex", () => {
  it("findet den offiziellen KI-Punkt, der die Substanz nennt", () => {
    expect(kontraMatchIndex("Theophyllin", saaEntry.kontra)).toBe(1);
  });
  it("liefert -1 ohne Namenstreffer", () => {
    expect(kontraMatchIndex("Metoprolol", saaEntry.kontra)).toBe(-1);
  });
  it("liefert -1 für Kurz-Abkürzungen (< 5 Zeichen) — kein irreführendes Highlighting", () => {
    expect(kontraMatchIndex("Met", saaEntry.kontra)).toBe(-1);
  });
});

describe("kiOutcome", () => {
  const base = { absKeys: ["a:0", "a:1"], relKeys: ["r:0"], flaggedMeds: ["theophyllin"] };
  it("unvollständig, solange nicht alle Punkte beantwortet/abgehakt", () => {
    const r = kiOutcome({ answers: { "a:0": "nein" }, ...base });
    expect(r.complete).toBe(false);
  });
  it("stop, wenn ein absoluter Punkt mit ja markiert ist", () => {
    const answers = { "a:0": "nein", "a:1": "ja", "r:0": "nein", "m:theophyllin": true };
    const r = kiOutcome({ answers, ...base });
    expect(r).toMatchObject({ complete: true, stop: true });
  });
  it("confirm, wenn relative KI oder Dauermed-Flag vorliegt, aber kein Stop", () => {
    const answers = { "a:0": "nein", "a:1": "nein", "r:0": "ja", "m:theophyllin": true };
    const r = kiOutcome({ answers, ...base });
    expect(r).toMatchObject({ complete: true, stop: false, confirm: true });
  });
  it("confirm auch ohne relative KI, wenn ein Dauermed-Flag abgehakt wurde (Spec: Abwägung nötig)", () => {
    const answers = { "a:0": "nein", "a:1": "nein", "r:0": "nein", "m:theophyllin": true };
    const r = kiOutcome({ answers, ...base });
    expect(r).toMatchObject({ complete: true, stop: false, confirm: true });
  });
  it("ok ohne jegliche Treffer (keine geflaggten Dauermedis)", () => {
    const answers = { "a:0": "nein", "a:1": "nein", "r:0": "nein" };
    const r = kiOutcome({ answers, absKeys: ["a:0", "a:1"], relKeys: ["r:0"], flaggedMeds: [] });
    expect(r).toMatchObject({ complete: true, stop: false, confirm: false });
  });
});

describe("kiListen (Indikations-Override)", () => {
  const entry = { id: "x", kontra: ["A", "B"], relKontra: ["R"] };
  it("nutzt Indikations-Listen, wenn vorhanden", () => {
    const ind = { kontra: ["Nur K1"], relKontra: [] };
    expect(kiListen(entry, ind)).toEqual({ kontra: ["Nur K1"], relKontra: [] });
  });
  it("fällt auf saa.json zurück, wenn Indikation keine Listen definiert", () => {
    expect(kiListen(entry, {})).toEqual({ kontra: ["A", "B"], relKontra: ["R"] });
  });
  it("verträgt fehlende Indikation (null)", () => {
    expect(kiListen(entry, null)).toEqual({ kontra: ["A", "B"], relKontra: ["R"] });
  });
});

describe("kiPunkte (Merge über Gaben)", () => {
  it("dedupliziert identische Texte und sammelt Medikamentennamen", () => {
    const gaben = [
      { saaEntry: { id: "e", name: "Esketamin", kontra: ["Überempfindlichkeit", "Schwangerschaft"], relKontra: [] }, ind: {} },
      { saaEntry: { id: "m", name: "Midazolam", kontra: ["X"], relKontra: [] }, ind: { kontra: ["Überempfindlichkeit", "Atemdepression"], relKontra: [] } },
    ];
    const { abs } = kiPunkte(gaben);
    const ue = abs.find((p) => p.text === "Überempfindlichkeit");
    expect(ue.meds).toEqual(["Esketamin", "Midazolam"]);
    expect(abs.map((p) => p.text)).toEqual(["Überempfindlichkeit", "Schwangerschaft", "Atemdepression"]);
  });
  it("liefert stabile Keys aus normKey(text)", () => {
    const gaben = [{ saaEntry: { id: "e", name: "E", kontra: ["Schwere Bewusstseinsstörung (Sopor/Koma)"], relKontra: ["R 1"] }, ind: {} }];
    const { abs, rel } = kiPunkte(gaben);
    expect(abs[0].key.startsWith("a:")).toBe(true);
    expect(rel[0].key.startsWith("r:")).toBe(true);
  });
});

describe("kiOutcome V2 (Key-Listen)", () => {
  const absKeys = ["a:k1", "a:k2"]; const relKeys = ["r:r1"];
  it("complete erst wenn alle Keys beantwortet; stop bei ja auf absolut", () => {
    expect(kiOutcome({ answers: { "a:k1": "nein" }, absKeys, relKeys, flaggedMeds: [] }).complete).toBe(false);
    const r = kiOutcome({ answers: { "a:k1": "nein", "a:k2": "ja", "r:r1": "nein" }, absKeys, relKeys, flaggedMeds: [] });
    expect(r).toMatchObject({ complete: true, stop: true });
  });
  it("confirm bei relativ ja oder abgehaktem Dauermed-Flag", () => {
    expect(kiOutcome({ answers: { "a:k1": "nein", "a:k2": "nein", "r:r1": "ja" }, absKeys, relKeys, flaggedMeds: [] }).confirm).toBe(true);
    expect(kiOutcome({ answers: { "a:k1": "nein", "a:k2": "nein", "r:r1": "nein", "m:x": true }, absKeys, relKeys, flaggedMeds: ["x"] }).confirm).toBe(true);
  });
});
