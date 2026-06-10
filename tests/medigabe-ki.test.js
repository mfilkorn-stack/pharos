// tests/medigabe-ki.test.js
import { describe, it, expect } from "vitest";
import { dauermedRows, kontraMatchIndex, kiOutcome, kiListen } from "../src/modules/medigabe/lib/ki.js";

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

describe("dauermedRows", () => {
  it("liefert pro Patienten-Medi Level/Begründung nur für das gewählte Medikament", () => {
    const rows = dauermedRows({ meds: ["Theophyllin", "Metoprolol"], matrix, saaEntry });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ med: "Theophyllin", level: "absolut", pending: false });
    expect(rows[0].reason).toContain("Theophyllin");
    expect(rows[1]).toMatchObject({ med: "Metoprolol", level: "ok" });
  });
  it("markiert Medis ohne Matrix-Eintrag als pending (Fallback-Level ok oder Text-Treffer)", () => {
    const rows = dauermedRows({ meds: ["Unbekantol"], matrix, saaEntry });
    expect(rows[0].pending).toBe(true);
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
  const base = { nAbs: 2, nRel: 1, flaggedMeds: ["theophyllin"] };
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
    const r = kiOutcome({ answers, nAbs: 2, nRel: 1, flaggedMeds: [] });
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
