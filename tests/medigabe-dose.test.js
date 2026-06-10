// tests/medigabe-dose.test.js
import { describe, it, expect } from "vitest";
import { computeDose, computeVolume, fmt } from "../src/modules/medigabe/lib/dose.js";

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
  it("strengste Grenze gewinnt, wenn alle drei Cap-Quellen gesetzt sind", () => {
    const r = computeDose({
      dosis: { stufen: [{ wennAlterUnter: 18, mgProKg: 5, maxMgAbsolut: 200 }] },
      kg: 50, alterJahre: 10, maxMgProKg: 10, maxMgAbsolut: 300,
    });
    expect(r.mg).toBe(200); // 5×50=250 → Stufen-Cap 200 ist strenger als 10×50=500 und 300
    expect(r.maxMg).toBe(200);
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
    expect(kind.maxMg).toBe(300);
    const erw = computeDose({ dosis: { stufen }, kg: 80, alterJahre: 45 });
    expect(erw.mg).toBe(300);
    expect(erw.gekappt).toBe(false);
  });
  it("stufen ohne alterJahre → letzte Stufe als Fallback (Verhalten gepinnt)", () => {
    const stufen = [
      { wennAlterUnter: 18, mgProKg: 5, maxMgAbsolut: 300 },
      { fixMg: 300 },
    ];
    const r = computeDose({ dosis: { stufen }, kg: 80 });
    expect(r.mg).toBe(300); // fällt auf Default-Stufe (Erwachsene)
    expect(r.gekappt).toBe(false);
  });
});

describe("computeVolume", () => {
  it("Esketamin 8,75 mg bei 10 mg/ml → 0,9 ml, effektiv 9 mg", () => {
    const r = computeVolume({ mg: 8.75, mgPerMl: 10, maxMg: 17.5 });
    expect(r.mlRoh).toBe(0.875);
    expect(r.ml).toBe(0.9);
    expect(r.mgEffektiv).toBe(9);
    expect(r.schritte[0]).toBe("8,75 mg ÷ 10 mg/ml = 0,875 ml → aufgerundet 0,9 ml (= 9 mg)");
  });
  it("Esketamin 8,75 mg bei 5 mg/ml → 1,8 ml", () => {
    const r = computeVolume({ mg: 8.75, mgPerMl: 5, maxMg: 17.5 });
    expect(r.ml).toBe(1.8);
    expect(r.mgEffektiv).toBe(9);
  });
  it("rundet AB, wenn Aufrunden die Maximaldosis überschreiten würde (17,5 mg @ 10 mg/ml → 1,7 ml)", () => {
    const r = computeVolume({ mg: 17.5, mgPerMl: 10, maxMg: 17.5 });
    expect(r.ml).toBe(1.7); // 1,75 → 1,8 wären 18 mg > 17,5 → abrunden
    expect(r.mgEffektiv).toBe(17);
    expect(r.schritte.some((s) => s.includes("Maximaldosis"))).toBe(true);
  });
  it("glattes Volumen bleibt unverändert (250 mg @ 100 mg/ml → 2,5 ml)", () => {
    const r = computeVolume({ mg: 250, mgPerMl: 100 });
    expect(r.ml).toBe(2.5);
    expect(r.mgEffektiv).toBe(250);
  });
});

describe("computeDose: Stufen-Bedingungen V2 (Midazolam-Fälle)", () => {
  const buccal = [
    { wennAlterUnter: 1, fixMg: 2.5, repetition: "Keine Repetition" },
    { wennAlterUnter: 5, fixMg: 5, repetition: "Keine Repetition" },
    { wennAlterUnter: 10, fixMg: 7.5, repetition: "Einmalige Repetition möglich" },
    { fixMg: 10, repetition: "Einmalige Repetition möglich" },
  ];
  it("Altersbänder: 4 Jahre → 5 mg, Stufe trägt eigene Repetition", () => {
    const r = computeDose({ dosis: { stufen: buccal }, kg: 18, alterJahre: 4 });
    expect(r.mg).toBe(5);
    expect(r.stufe.repetition).toBe("Keine Repetition");
  });
  it("Altersbänder: 7 Jahre → 7,5 mg mit Repetition", () => {
    const r = computeDose({ dosis: { stufen: buccal }, kg: 25, alterJahre: 7 });
    expect(r.mg).toBe(7.5);
    expect(r.stufe.repetition).toBe("Einmalige Repetition möglich");
  });
  it("kg-Stufen (nasal): 8 kg → 2,5 mg; 15 kg → 5 mg; 70 kg → 10 mg", () => {
    const nasal = [
      { wennKgUnter: 10, fixMg: 2.5 },
      { wennKgUnter: 20, fixMg: 5 },
      { fixMg: 10 },
    ];
    expect(computeDose({ dosis: { stufen: nasal }, kg: 8, alterJahre: 0.5 }).mg).toBe(2.5);
    expect(computeDose({ dosis: { stufen: nasal }, kg: 15, alterJahre: 3 }).mg).toBe(5);
    expect(computeDose({ dosis: { stufen: nasal }, kg: 70, alterJahre: 40 }).mg).toBe(10);
  });
  it("Analgosedierung: ≥ 60 J → 1 mg; < 50 kg → 1 mg; sonst 2 mg", () => {
    const sed = [
      { wennAlterAb: 60, fixMg: 1 },
      { wennKgUnter: 50, fixMg: 1 },
      { fixMg: 2 },
    ];
    expect(computeDose({ dosis: { stufen: sed }, kg: 80, alterJahre: 72 }).mg).toBe(1);
    expect(computeDose({ dosis: { stufen: sed }, kg: 45, alterJahre: 30 }).mg).toBe(1);
    expect(computeDose({ dosis: { stufen: sed }, kg: 70, alterJahre: 45 }).mg).toBe(2);
  });
  it("UND-Verknüpfung mehrerer Bedingungen in einer Stufe", () => {
    const s = [{ wennAlterAb: 6, wennKgUnter: 40, fixMg: 1 }, { fixMg: 2 }];
    expect(computeDose({ dosis: { stufen: s }, kg: 30, alterJahre: 8 }).mg).toBe(1);
    expect(computeDose({ dosis: { stufen: s }, kg: 50, alterJahre: 8 }).mg).toBe(2);
  });
  it("ohne Stufen ist stufe null (Bestand unverändert)", () => {
    expect(computeDose({ dosis: { mgProKg: 0.125 }, kg: 70 }).stufe).toBeNull();
  });
});
