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
      });
      it("hat valide Indikationen/Routen/Preps", () => {
        expect(Array.isArray(e.cave)).toBe(true);
        for (const c of e.cave) expect(typeof c).toBe("string");
        expect(e.indikationen.length).toBeGreaterThan(0);
        for (const ind of e.indikationen) {
          expect(ind.id).toBeTruthy();
          expect(ind.label).toBeTruthy();
          expect(ind.routen.length).toBeGreaterThan(0);
          for (const r of ind.routen) {
            expect(r.weg).toBeTruthy();
            if (r.maxMgProKg !== undefined) expect(r.maxMgProKg === null || typeof r.maxMgProKg === "number").toBe(true);
            const d = r.dosis;
            expect(d.mgProKg != null || d.fixMg != null || Array.isArray(d.stufen)).toBe(true);
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
