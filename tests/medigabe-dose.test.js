// tests/medigabe-dose.test.js
import { describe, it, expect } from "vitest";
import { computeDose, fmt } from "../src/modules/medigabe/lib/dose.js";

describe("fmt", () => {
  it("konvertiert nur das Dezimalzeichen — rundet NICHT (0,125 mg/kg muss exakt bleiben)", () => {
    expect(fmt(8.75)).toBe("8,75");
    expect(fmt(9)).toBe("9");
    expect(fmt(0.125)).toBe("0,125");
    expect(fmt(0.875)).toBe("0,875");
  });
});

describe("computeDose: mgProKg", () => {
  it("Esketamin i.v. 70 kg → 8,75 mg, Max 17,5 mg, nicht gekappt", () => {
    const r = computeDose({ dosis: { mgProKg: 0.125 }, kg: 70, maxMgProKg: 0.25 });
    expect(r.mg).toBe(8.75);
    expect(r.maxMg).toBe(17.5);
    expect(r.gekappt).toBe(false);
    expect(r.schritte[0]).toBe("0,125 mg/kg × 70 kg = 8,75 mg");
  });
  it("rundet Fließkomma-Artefakte: 0,3 mg/kg × 70 kg = exakt 21 mg", () => {
    const r = computeDose({ dosis: { mgProKg: 0.3 }, kg: 70 });
    expect(r.mg).toBe(21);
  });
});

describe("computeDose: Kappung", () => {
  it("kappt auf maxMgProKg", () => {
    const r = computeDose({ dosis: { mgProKg: 0.3 }, kg: 70, maxMgProKg: 0.25 });
    expect(r.mg).toBe(17.5);
    expect(r.gekappt).toBe(true);
    expect(r.schritte.some((s) => s.includes("gekappt"))).toBe(true);
  });
  it("kappt auf maxMgAbsolut (Butylscopolamin-Fall: 0,3 mg/kg × 80 kg = 24 → 20 mg)", () => {
    const r = computeDose({ dosis: { mgProKg: 0.3 }, kg: 80, maxMgAbsolut: 20 });
    expect(r.mg).toBe(20);
    expect(r.gekappt).toBe(true);
  });
});

describe("computeDose: fixMg + stufen", () => {
  it("fixMg ignoriert Gewicht (ASS-Fall)", () => {
    const r = computeDose({ dosis: { fixMg: 250 }, kg: 70 });
    expect(r.mg).toBe(250);
    expect(r.gekappt).toBe(false);
  });
  it("stufen: Kind < 18 J → mgProKg-Zweig mit eigener Kappung (Amiodaron-Fall)", () => {
    const stufen = [
      { wennAlterUnter: 18, mgProKg: 5, maxMgAbsolut: 300 },
      { fixMg: 300 },
    ];
    const kind = computeDose({ dosis: { stufen }, kg: 80, alterJahre: 12 });
    expect(kind.mg).toBe(300); // 5×80=400 → Kappung 300
    expect(kind.gekappt).toBe(true);
    const erw = computeDose({ dosis: { stufen }, kg: 80, alterJahre: 45 });
    expect(erw.mg).toBe(300);
    expect(erw.gekappt).toBe(false);
  });
});
