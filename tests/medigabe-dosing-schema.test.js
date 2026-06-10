// tests/medigabe-dosing-schema.test.js
import { describe, it, expect } from "vitest";
import dosing from "../src/modules/medigabe/data/dosing.json";
import saa from "../src/modules/lexikon/data/saa.json";

const SAA_IDS = new Set(saa.entries.map((e) => e.id));

describe("dosing.json Schema", () => {
  it("hat Version und mindestens einen Eintrag", () => {
    expect(dosing.version).toBe("dosing-1");
    expect(dosing.entries.length).toBeGreaterThan(0);
    expect(dosing.quelle).toBeTruthy();
  });

  for (const e of dosing.entries) {
    describe(e.id, () => {
      it("referenziert eine existierende SAA + ist verifiziert", () => {
        expect(SAA_IDS.has(e.id)).toBe(true);
        expect(e.saaSeite).toBeGreaterThan(0);
        expect(e.verifiziert).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        if (e.minKg != null) expect(typeof e.minKg).toBe("number");
        if (e.minAlterMonate != null) expect(typeof e.minAlterMonate).toBe("number");
      });
      it("hat valide Indikationen/Routen/Preps", () => {
        expect(Array.isArray(e.cave)).toBe(true);
        for (const c of e.cave) expect(typeof c).toBe("string");
        expect(e.indikationen.length).toBeGreaterThan(0);
        for (const ind of e.indikationen) {
          expect(ind.id).toBeTruthy();
          expect(ind.label).toBeTruthy();
          // V2: optionale KI-Overrides + minKg pro Indikation
          if (ind.kontra) { expect(Array.isArray(ind.kontra)).toBe(true); expect(ind.kontra.length).toBeGreaterThan(0); for (const k of ind.kontra) expect(typeof k).toBe("string"); }
          if (ind.relKontra) { expect(Array.isArray(ind.relKontra)).toBe(true); for (const k of ind.relKontra) expect(typeof k).toBe("string"); }
          if (ind.minKg != null) expect(typeof ind.minKg).toBe("number");
          expect(ind.routen.length).toBeGreaterThan(0);
          for (const r of ind.routen) {
            expect(r.weg).toBeTruthy();
            if (r.maxMgProKg !== undefined) expect(r.maxMgProKg === null || typeof r.maxMgProKg === "number").toBe(true);
            const d = r.dosis;
            expect(d.mgProKg != null || d.fixMg != null || Array.isArray(d.stufen)).toBe(true);
            // V2: Stufen-Felder validieren
            if (Array.isArray(d.stufen)) {
              expect(d.stufen.length).toBeGreaterThan(0);
              const last = d.stufen[d.stufen.length - 1];
              expect(last.wennAlterUnter == null && last.wennAlterAb == null && last.wennKgUnter == null && last.wennKgAb == null).toBe(true); // letzte Stufe = bedingungsloser Default
              for (const s of d.stufen) expect(s.fixMg != null || s.mgProKg != null).toBe(true);
            }
            expect(r.preps.length).toBeGreaterThan(0);
            for (const p of r.preps) {
              expect(p.mgPerMl).toBeGreaterThan(0);
              expect(["saa", "praxis"]).toContain(p.quelle);
              expect(typeof p.freigegeben).toBe("boolean");
              expect(p.ampulle).toBeTruthy();
              expect(p.ergebnis).toBeTruthy();
            }
          }
        }
      });
    });
  }
});
