# Medigabe nach SAA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Geführter 8-Schritte-Wizard „Medigabe" (3. Pharos-Modul), der NotSan SAA-konform durch eine Medikamentengabe führt — Phase 1 end-to-end mit Esketamin.

**Architecture:** Neues Modul `src/modules/medigabe/` mit Wizard-State in einem Modul-Store (überlebt Modulwechsel). Dosislogik (`dose.js`) und KI-Logik (`ki.js`) sind reine, TDD-getestete Funktionen. Patienten-Dauermedikation lebt in einem geteilten Memory-Store `src/lib/caseMeds.js`, den MedScan (Lexikon) befüllt und Medigabe liest. Dosisdaten in `dosing.json`, verifiziert gegen SAA/BPR 2025 PDF S. 50.

**Tech Stack:** React 18 (JSX, kein TS), Vite, Tailwind v4 (Theme-Tokens in `src/index.css`), Vitest (jsdom). Bestehende UI-Bausteine aus `src/modules/lexikon/components/ui/`.

**Spec:** `docs/superpowers/specs/2026-06-10-medigabe-saa-design.md`

---

## Referenz: Verträge (gelten für alle Tasks)

**`dosing.json`-Eintrag (Esketamin, einziger Phase-1-Eintrag):** siehe Task 1.

**`dose.js`:**
```js
computeDose({ dosis, kg, alterJahre, maxMgProKg, maxMgAbsolut })
// → { mg:Number, maxMg:Number|null, gekappt:Boolean, schritte:String[] }
computeVolume({ mg, mgPerMl, maxMg })
// → { ml:Number, mlRoh:Number, mgEffektiv:Number, schritte:String[] }
fmt(n) // 8.75 → "8,75" (max. 2 Nachkommastellen, deutsches Komma)
```

**`caseMeds.js`:** `getCaseMeds()`, `setCaseMeds(list)`, `addCaseMed(entry)`, `removeCaseMed(wirkstoff)`, `clearCaseMeds()`, `subscribeCaseMeds(fn)`, `caseMedNames(list)`. Einträge sind Objekte mit mind. `{ wirkstoff, source }` (Lexikon legt seine reichen `planEntries`-Objekte unverändert ab).

**`medigabe/lib/ki.js`:**
```js
dauermedRows({ meds, matrix, saaEntry })
// → [{ med, level:"ok"|"vorsicht"|"absolut", reason:String, pending:Boolean }]
kontraMatchIndex(medName, kontraList) // → Index des offiziellen KI-Punkts, der medName nennt, sonst -1
kiOutcome({ answers, nAbs, nRel, flaggedMeds })
// → { complete:Boolean, stop:Boolean, confirm:Boolean }
```

**`medigabe/lib/wizard.js`** (Modul-Store, Shape):
```js
{
  step: 1,                 // 1..8
  medId: null,             // "saa:esketamin"
  indId: null,             // "schmerz"
  patient: { geschlecht: null, alter: "", alterEinheit: "jahre", kg: "", dauerStatus: null },
  // dauerStatus: "uebernommen" | "keine"
  ki: {},                  // { "a:0":"nein"|"ja", "r:2":"nein"|"ja", "m:<normKey>":true }
  aufkl: { items: {}, faehig: null, einwilligung: null, mutmasslich: false },
  dosier: { weg: null, prep: null },   // Indizes in routen/preps
  sechsR: {},              // { "0":true … "5":true }
  durchf: {},              // { divi:true, augen:true, komm:true }
  freigabeZeit: null,      // ISO-String, gesetzt bei 6R-Freigabe
}
```

Vor jedem Commit mit deutschem Text: Umlaut-Scan (ä/ö/ü/ß korrekt).

---

### Task 1: Dosisdaten Esketamin + Schema-Test

**Files:**
- Create: `src/modules/medigabe/data/dosing.json`
- Test: `tests/medigabe-dosing-schema.test.js`

- [ ] **Step 1: `dosing.json` anlegen** (Werte verifiziert gegen SAA 2025 S. 50; das 10-mg/ml-Verdünnungsschema ist Praxis-Standard, vom Nutzer am 2026-06-10 freigegeben)

```json
{
  "version": "dosing-1",
  "quelle": "SAA und BPR 2025 (6-Länder-AG), Stand 30.04.2025",
  "entries": [
    {
      "id": "saa:esketamin",
      "saaSeite": 50,
      "verifiziert": "2026-06-10",
      "minKg": 10,
      "minKgHinweis": "Keine Anwendung bei Kindern < 10 kgKG (ca. 12 Monate)",
      "indikationen": [
        {
          "id": "schmerz",
          "label": "Starker Schmerz (NRS ≥ 6)",
          "routen": [
            {
              "weg": "i.v.",
              "dosis": { "mgProKg": 0.125 },
              "maxMgProKg": 0.25,
              "repetition": "Repetition 0,125 mg/kgKG, bis Maximaldosis 0,25 mg/kgKG",
              "preps": [
                {
                  "ampulle": "50 mg / 2 ml (25 mg/ml)",
                  "zugabe": "3 ml NaCl 0,9 %",
                  "ergebnis": "5 ml à 10 mg/ml",
                  "mgPerMl": 10,
                  "quelle": "praxis",
                  "freigegeben": true
                },
                {
                  "ampulle": "25 mg / 5 ml (5 mg/ml)",
                  "zugabe": null,
                  "ergebnis": "unverdünnt (5 mg/ml)",
                  "mgPerMl": 5,
                  "quelle": "saa",
                  "freigegeben": true
                }
              ],
              "hinweise": ["Kombination von Midazolam und Esketamin bei i.v.-Gabe empfohlen"]
            },
            {
              "weg": "nasal / i.m.",
              "dosis": { "mgProKg": 1 },
              "maxMgProKg": null,
              "repetition": "Einmalige Repetition 1 mg/kgKG möglich",
              "preps": [
                {
                  "ampulle": "50 mg / 2 ml (25 mg/ml)",
                  "zugabe": null,
                  "ergebnis": "unverdünnt (25 mg/ml) — kleines Volumen für MAD",
                  "mgPerMl": 25,
                  "quelle": "saa",
                  "freigegeben": true
                }
              ],
              "hinweise": []
            }
          ]
        }
      ],
      "cave": [
        "Ampullen mit unterschiedlichen Konzentrationen verfügbar (5 und 25 mg/ml)",
        "Bei Verwendung von Ketamin: Dosisverdopplung",
        "Hohe Geräusch- und Lichtempfindlichkeit; Wirkeintritt ca. 1 min, Wirkdauer ca. 20 min"
      ]
    }
  ]
}
```

- [ ] **Step 2: Schema-Test schreiben** — validiert JEDEN Eintrag (Phase-2-sicher)

```js
// tests/medigabe-dosing-schema.test.js
import { describe, it, expect } from "vitest";
import dosing from "../src/modules/medigabe/data/dosing.json";
import saa from "../src/modules/lexikon/data/saa.json";

const SAA_IDS = new Set(saa.entries.map((e) => e.id));

describe("dosing.json Schema", () => {
  it("hat Version und mindestens einen Eintrag", () => {
    expect(dosing.version).toBe("dosing-1");
    expect(dosing.entries.length).toBeGreaterThan(0);
  });

  for (const e of dosing.entries) {
    describe(e.id, () => {
      it("referenziert eine existierende SAA + ist verifiziert", () => {
        expect(SAA_IDS.has(e.id)).toBe(true);
        expect(e.saaSeite).toBeGreaterThan(0);
        expect(e.verifiziert).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
      it("hat valide Indikationen/Routen/Preps", () => {
        expect(e.indikationen.length).toBeGreaterThan(0);
        for (const ind of e.indikationen) {
          expect(ind.id).toBeTruthy();
          expect(ind.label).toBeTruthy();
          expect(ind.routen.length).toBeGreaterThan(0);
          for (const r of ind.routen) {
            expect(r.weg).toBeTruthy();
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
```

- [ ] **Step 3: Test laufen lassen**

Run: `npx vitest run tests/medigabe-dosing-schema.test.js`
Expected: PASS (alle Assertions grün)

- [ ] **Step 4: Commit**

```bash
git add src/modules/medigabe/data/dosing.json tests/medigabe-dosing-schema.test.js
git commit -m "feat(medigabe): Dosisdaten Esketamin (SAA S.50, verifiziert) + Schema-Test"
```

---

### Task 2: `dose.js` — computeDose + fmt (TDD)

**Files:**
- Create: `src/modules/medigabe/lib/dose.js`
- Test: `tests/medigabe-dose.test.js`

- [ ] **Step 1: Failing Tests schreiben**

```js
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
```

- [ ] **Step 2: Tests laufen lassen — müssen fehlschlagen**

Run: `npx vitest run tests/medigabe-dose.test.js`
Expected: FAIL — "Failed to load … dose.js" (Datei existiert nicht)

- [ ] **Step 3: Implementierung**

```js
// src/modules/medigabe/lib/dose.js
// Dosislogik Medigabe — reine Funktionen, keine Seiteneffekte.
// Alle mg-Werte auf 2 Nachkommastellen gerundet (Fließkomma-Artefakte).

const r2 = (n) => Math.round(n * 100) / 100;

// 8.75 → "8,75" (deutsches Komma). Bewusst OHNE Rundung: Dosisfaktoren wie
// 0,125 mg/kg müssen exakt erscheinen — gerundet wird nur in den
// compute-Funktionen (r2 für mg, r1 für ml).
export function fmt(n) {
  return String(n).replace(".", ",");
}

// Löst dosis.stufen anhand des Alters auf (erste passende Stufe gewinnt).
function resolveStufe(dosis, alterJahre) {
  if (!Array.isArray(dosis.stufen)) return dosis;
  for (const s of dosis.stufen) {
    if (s.wennAlterUnter == null || (alterJahre != null && alterJahre < s.wennAlterUnter)) return s;
  }
  return dosis.stufen[dosis.stufen.length - 1];
}

// → { mg, maxMg|null, gekappt, schritte[] }
export function computeDose({ dosis, kg, alterJahre, maxMgProKg, maxMgAbsolut }) {
  const d = resolveStufe(dosis, alterJahre);
  const schritte = [];
  let mg;
  if (d.fixMg != null) {
    mg = r2(d.fixMg);
    schritte.push(`Fixdosis ${fmt(mg)} mg`);
  } else {
    mg = r2(d.mgProKg * kg);
    schritte.push(`${fmt(d.mgProKg)} mg/kg × ${fmt(kg)} kg = ${fmt(mg)} mg`);
  }

  // Max-Grenzen: pro kg, absolut (Eintrag) und absolut (Stufe) — strengste gilt.
  const caps = [];
  if (maxMgProKg != null) caps.push(r2(maxMgProKg * kg));
  if (maxMgAbsolut != null) caps.push(r2(maxMgAbsolut));
  if (d.maxMgAbsolut != null) caps.push(r2(d.maxMgAbsolut));
  const maxMg = caps.length ? Math.min(...caps) : null;

  let gekappt = false;
  if (maxMg != null) {
    if (mg > maxMg) {
      gekappt = true;
      schritte.push(`Über Maximaldosis ${fmt(maxMg)} mg → gekappt auf ${fmt(maxMg)} mg`);
      mg = maxMg;
    } else {
      schritte.push(`Maximaldosis ${fmt(maxMg)} mg ✓`);
    }
  }
  return { mg, maxMg, gekappt, schritte };
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run tests/medigabe-dose.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/medigabe/lib/dose.js tests/medigabe-dose.test.js
git commit -m "feat(medigabe): computeDose mit Kappung (proKg/absolut/Stufen) + fmt, TDD"
```

---

### Task 3: `dose.js` — computeVolume (TDD)

**Files:**
- Modify: `src/modules/medigabe/lib/dose.js`
- Test: `tests/medigabe-dose.test.js` (erweitern)

- [ ] **Step 1: Failing Tests ergänzen** (ans Ende von `tests/medigabe-dose.test.js`)

```js
import { computeVolume } from "../src/modules/medigabe/lib/dose.js";

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
```

- [ ] **Step 2: Tests laufen lassen — neue müssen fehlschlagen**

Run: `npx vitest run tests/medigabe-dose.test.js`
Expected: FAIL — "computeVolume is not a function" (4 neue Tests rot, alte grün)

- [ ] **Step 3: Implementierung ergänzen** (ans Ende von `dose.js`)

```js
const r1 = (n) => Math.round(n * 10) / 10;
const r3 = (n) => Math.round(n * 1000) / 1000;

// Volumen auf 0,1 ml gerundet; niemals über maxMg runden (dann abrunden).
// → { ml, mlRoh, mgEffektiv, schritte[] }
export function computeVolume({ mg, mgPerMl, maxMg }) {
  const mlRoh = r3(mg / mgPerMl);
  let ml = r1(mlRoh);
  const schritte = [];
  let mgEffektiv = r2(ml * mgPerMl);

  if (maxMg != null && mgEffektiv > maxMg) {
    ml = Math.floor(mlRoh * 10) / 10;
    mgEffektiv = r2(ml * mgPerMl);
    schritte.push(`${fmt(mg)} mg ÷ ${fmt(mgPerMl)} mg/ml = ${fmt(mlRoh)} ml`);
    schritte.push(`Aufrunden überschritte Maximaldosis ${fmt(maxMg)} mg → abgerundet ${fmt(ml)} ml (= ${fmt(mgEffektiv)} mg)`);
  } else if (ml !== mlRoh) {
    const richtung = ml > mlRoh ? "aufgerundet" : "abgerundet";
    schritte.push(`${fmt(mg)} mg ÷ ${fmt(mgPerMl)} mg/ml = ${fmt(mlRoh)} ml → ${richtung} ${fmt(ml)} ml (= ${fmt(mgEffektiv)} mg)`);
  } else {
    schritte.push(`${fmt(mg)} mg ÷ ${fmt(mgPerMl)} mg/ml = ${fmt(ml)} ml`);
  }
  return { ml, mlRoh, mgEffektiv, schritte };
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run tests/medigabe-dose.test.js`
Expected: PASS (alle)

- [ ] **Step 5: Commit**

```bash
git add src/modules/medigabe/lib/dose.js tests/medigabe-dose.test.js
git commit -m "feat(medigabe): computeVolume — 0,1-ml-Rundung, nie über Maximaldosis"
```

---

### Task 4: Geteilter Store `caseMeds.js` (TDD)

**Files:**
- Create: `src/lib/caseMeds.js`
- Test: `tests/caseMeds.test.js`

- [ ] **Step 1: Failing Tests schreiben**

```js
// tests/caseMeds.test.js
import { describe, it, expect, beforeEach } from "vitest";
import {
  getCaseMeds, setCaseMeds, addCaseMed, removeCaseMed,
  clearCaseMeds, subscribeCaseMeds, caseMedNames,
} from "../src/lib/caseMeds.js";

beforeEach(() => clearCaseMeds());

describe("caseMeds Store", () => {
  it("setzt und liest Einträge (immutable Snapshot)", () => {
    setCaseMeds([{ wirkstoff: "Metoprolol", source: "0a" }]);
    const a = getCaseMeds();
    expect(a).toHaveLength(1);
    setCaseMeds([]);
    expect(a).toHaveLength(1); // alter Snapshot unverändert
  });
  it("addCaseMed dedupliziert per Wirkstoffname (case-insensitive)", () => {
    addCaseMed({ wirkstoff: "Ramipril", source: "medigabe" });
    addCaseMed({ wirkstoff: "ramipril", source: "medigabe" });
    expect(getCaseMeds()).toHaveLength(1);
  });
  it("removeCaseMed entfernt per Wirkstoffname", () => {
    setCaseMeds([{ wirkstoff: "A", source: "x" }, { wirkstoff: "B", source: "x" }]);
    removeCaseMed("A");
    expect(getCaseMeds().map((e) => e.wirkstoff)).toEqual(["B"]);
  });
  it("benachrichtigt Subscriber, Unsubscribe funktioniert", () => {
    let n = 0;
    const un = subscribeCaseMeds(() => n++);
    addCaseMed({ wirkstoff: "X", source: "t" });
    un();
    addCaseMed({ wirkstoff: "Y", source: "t" });
    expect(n).toBe(1);
  });
  it("caseMedNames filtert unknown/rejected (wie SaaCheck)", () => {
    const list = [
      { wirkstoff: "Metoprolol", source: "0a" },
      { wirkstoff: "Blister", source: "rejected" },
      { wirkstoff: "Xyz", source: "unknown" },
    ];
    expect(caseMedNames(list)).toEqual(["Metoprolol"]);
  });
});
```

- [ ] **Step 2: Tests laufen lassen — müssen fehlschlagen**

Run: `npx vitest run tests/caseMeds.test.js`
Expected: FAIL — Datei existiert nicht

- [ ] **Step 3: Implementierung**

```js
// src/lib/caseMeds.js
// Geteilte Einsatz-Medikationsliste (aktueller Patient) für MedScan + Medigabe.
// NUR im Speicher — bewusst kein localStorage (keine Patientendaten persistieren).

let entries = [];
const subs = new Set();
const emit = () => subs.forEach((fn) => fn());
const key = (s) => (s || "").trim().toLowerCase();

export function getCaseMeds() { return entries; }

export function setCaseMeds(list) { entries = [...(list || [])]; emit(); }

export function addCaseMed(entry) {
  if (!entry?.wirkstoff) return;
  if (entries.some((e) => key(e.wirkstoff) === key(entry.wirkstoff))) return;
  entries = [...entries, entry];
  emit();
}

export function removeCaseMed(wirkstoff) {
  entries = entries.filter((e) => key(e.wirkstoff) !== key(wirkstoff));
  emit();
}

export function clearCaseMeds() { entries = []; emit(); }

export function subscribeCaseMeds(fn) { subs.add(fn); return () => subs.delete(fn); }

// Namen für Matrix-Checks — gleiche Filterung wie SaaCheck (keine unknown/rejected).
export function caseMedNames(list = entries) {
  return list.filter((e) => e.source !== "unknown" && e.source !== "rejected").map((e) => e.wirkstoff);
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run tests/caseMeds.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/caseMeds.js tests/caseMeds.test.js
git commit -m "feat(shared): caseMeds-Store — Einsatz-Medikation geteilt MedScan/Medigabe"
```

---

### Task 5: KI-Logik `medigabe/lib/ki.js` (TDD)

**Files:**
- Create: `src/modules/medigabe/lib/ki.js`
- Test: `tests/medigabe-ki.test.js`

- [ ] **Step 1: Failing Tests schreiben**

```js
// tests/medigabe-ki.test.js
import { describe, it, expect } from "vitest";
import { dauermedRows, kontraMatchIndex, kiOutcome } from "../src/modules/medigabe/lib/ki.js";

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
  it("ok ohne jegliche Treffer", () => {
    const answers = { "a:0": "nein", "a:1": "nein", "r:0": "nein", "m:theophyllin": true };
    const r = kiOutcome({ answers, ...base });
    expect(r).toMatchObject({ complete: true, stop: false, confirm: false });
  });
});
```

- [ ] **Step 2: Tests laufen lassen — müssen fehlschlagen**

Run: `npx vitest run tests/medigabe-ki.test.js`
Expected: FAIL — Datei existiert nicht

- [ ] **Step 3: Implementierung**

```js
// src/modules/medigabe/lib/ki.js
// Kontraindikations-Logik für Schritt 4 — reine Funktionen.
// Dauermedikation = dritte KI-Klasse (Verhalten wie relativ, KI-generierte Hinweise).

import { normKey, aggregateCheck } from "../../lexikon/lib/saaCheck.js";

// Pro Patienten-Medi: Flag-Level gegen GENAU das gewählte SAA-Medikament.
// → [{ med, level, reason, pending }]
export function dauermedRows({ meds, matrix, saaEntry }) {
  return (meds || []).map((med) => {
    const { results, pending } = aggregateCheck([med], matrix, [saaEntry]);
    const hit = results.find((r) => r.id === saaEntry.id);
    return {
      med,
      level: hit ? hit.level : "ok",
      reason: hit ? hit.reason : "",
      pending: pending.length > 0,
    };
  });
}

// Index des offiziellen Kontra-Punkts, der die Substanz namentlich nennt, sonst -1.
export function kontraMatchIndex(medName, kontraList) {
  const n = normKey(medName);
  if (!n) return -1;
  return (kontraList || []).findIndex((k) => normKey(k).includes(n));
}

// answers: { "a:i": "ja"|"nein", "r:i": "ja"|"nein", "m:<normKey>": true }
// flaggedMeds: normKeys der Dauermed-Zeilen mit level !== "ok" (nur die brauchen Haken).
export function kiOutcome({ answers, nAbs, nRel, flaggedMeds }) {
  let complete = true;
  let stop = false;
  let confirm = false;
  for (let i = 0; i < nAbs; i++) {
    const a = answers[`a:${i}`];
    if (a !== "ja" && a !== "nein") complete = false;
    if (a === "ja") stop = true;
  }
  for (let i = 0; i < nRel; i++) {
    const a = answers[`r:${i}`];
    if (a !== "ja" && a !== "nein") complete = false;
    if (a === "ja") confirm = true;
  }
  for (const m of flaggedMeds || []) {
    if (!answers[`m:${m}`]) complete = false;
    else confirm = true;
  }
  return { complete, stop, confirm };
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run tests/medigabe-ki.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/medigabe/lib/ki.js tests/medigabe-ki.test.js
git commit -m "feat(medigabe): KI-Logik — Dauermedikation als dritte KI-Klasse, Stop/Confirm"
```

---

### Task 6: Wizard-Store `medigabe/lib/wizard.js` (TDD)

**Files:**
- Create: `src/modules/medigabe/lib/wizard.js`
- Test: `tests/medigabe-wizard.test.js`

- [ ] **Step 1: Failing Tests schreiben**

```js
// tests/medigabe-wizard.test.js
import { describe, it, expect, beforeEach } from "vitest";
import { getWizard, patchWizard, resetWizard, subscribeWizard } from "../src/modules/medigabe/lib/wizard.js";

beforeEach(() => resetWizard());

describe("wizard Store", () => {
  it("startet bei Schritt 1 mit leerem State", () => {
    const w = getWizard();
    expect(w.step).toBe(1);
    expect(w.medId).toBeNull();
    expect(w.patient.dauerStatus).toBeNull();
  });
  it("patcht flach und benachrichtigt Subscriber", () => {
    let n = 0;
    const un = subscribeWizard(() => n++);
    patchWizard({ medId: "saa:esketamin", step: 2 });
    expect(getWizard().medId).toBe("saa:esketamin");
    expect(n).toBe(1);
    un();
  });
  it("reset stellt Initialzustand wieder her", () => {
    patchWizard({ step: 6, sechsR: { 0: true } });
    resetWizard();
    expect(getWizard().step).toBe(1);
    expect(getWizard().sechsR).toEqual({});
  });
});
```

- [ ] **Step 2: Tests laufen lassen — müssen fehlschlagen**

Run: `npx vitest run tests/medigabe-wizard.test.js`
Expected: FAIL — Datei existiert nicht

- [ ] **Step 3: Implementierung**

```js
// src/modules/medigabe/lib/wizard.js
// Wizard-State als Modul-Store: überlebt Modulwechsel (z. B. Sprung zu MedScan
// zum Scannen) — bewusst NICHT persistiert (keine Patientendaten in Storage).

const initial = () => ({
  step: 1,
  medId: null,
  indId: null,
  patient: { geschlecht: null, alter: "", alterEinheit: "jahre", kg: "", dauerStatus: null },
  ki: {},
  aufkl: { items: {}, faehig: null, einwilligung: null, mutmasslich: false },
  dosier: { weg: null, prep: null },
  sechsR: {},
  durchf: {},
  freigabeZeit: null,
});

let state = initial();
const subs = new Set();
const emit = () => subs.forEach((fn) => fn());

export function getWizard() { return state; }
export function patchWizard(patch) { state = { ...state, ...patch }; emit(); }
export function resetWizard() { state = initial(); emit(); }
export function subscribeWizard(fn) { subs.add(fn); return () => subs.delete(fn); }
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run tests/medigabe-wizard.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/medigabe/lib/wizard.js tests/medigabe-wizard.test.js
git commit -m "feat(medigabe): Wizard-Store (Modul-Singleton, überlebt Modulwechsel)"
```

---

### Task 7: Modul-Shell + App-Integration (sichtbares Skelett)

**Files:**
- Create: `src/modules/medigabe/Medigabe.jsx`
- Create: `src/modules/medigabe/components/bits.jsx`
- Modify: `src/App.jsx` (medigabe-Mode)
- Modify: `src/shell/HomeScreen.jsx` (3. Kachel)
- Modify: `src/shell/BottomTabBar.jsx` (Medigabe-Tab)
- Modify: `src/shell/DesktopSidebar.jsx` (Medigabe-Mode)

- [ ] **Step 1: Gemeinsame UI-Bits anlegen**

```jsx
// src/modules/medigabe/components/bits.jsx
// Kleine geteilte Bausteine des Medigabe-Wizards.
import Button from "../../lexikon/components/ui/Button.jsx";
import { ChevronLeftIcon } from "../../lexikon/components/ui/icons.jsx";

export const STEP_LABELS = ["Medikament", "Indikation", "Patient", "Kontraindikationen", "Aufklärung", "Dosierung", "6-R-Regel", "Durchführung"];

// Rahmen jedes Schritts: Fortschritt, Kontext-Chip, Inhalt, Footer-CTA.
export function StepFrame({ step, context, children, onBack, footer }) {
  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 pb-32 w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-text-muted">Schritt {step} / 8</span>
        <span className="text-xs text-text-secondary">{STEP_LABELS[step - 1]}</span>
      </div>
      <div className="flex gap-1 mb-4" aria-hidden="true">
        {STEP_LABELS.map((_, i) => (
          <span key={i} className={`flex-1 h-1 rounded-full ${i < step ? "bg-accent" : "bg-border"}`} />
        ))}
      </div>
      {context ? (
        <div className="flex flex-wrap items-center gap-1.5 mb-4 text-xs text-text-secondary">
          {context.map((c, i) => (
            <span key={i} className="bg-card border border-border rounded-md px-2 py-1">{c}</span>
          ))}
        </div>
      ) : null}
      {children}
      <div className="mt-6 flex items-center gap-3">
        {step > 1 ? (
          <Button variant="ghost" size="lg" onClick={onBack}>
            <ChevronLeftIcon className="h-4 w-4" /> Zurück
          </Button>
        ) : null}
        <div className="flex-1">{footer}</div>
      </div>
      <p className="mt-6 text-xs text-text-muted border-t border-border pt-3">
        Entscheidungsunterstützung — kein Ersatz für ärztliche Anordnung / gültige SAA-Freigabe.
      </p>
    </div>
  );
}

// Auswahl-Zeile (Checkliste): Touch-Target ≥ 56 px.
// Tone-Klassen statisch (Tailwind kann keine dynamisch zusammengesetzten Klassen).
const CHECK_TONES = {
  accent: "border-accent text-accent",
  warning: "border-warning text-warning",
};
export function CheckRow({ checked, onToggle, children, tone = "accent" }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className="w-full min-h-[56px] flex items-center gap-3 px-3 py-2.5 bg-card border border-border rounded-lg text-left hover:bg-card-hover transition-colors"
    >
      <span className={`h-6 w-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${checked ? CHECK_TONES[tone] : "border-border-strong text-transparent"}`}>
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 8.5l3.5 3.5L13 4" /></svg>
      </span>
      <span className="text-sm text-text-primary leading-snug">{children}</span>
    </button>
  );
}

// Ja/Nein-Zeile für KI-Punkte: „Nein" = liegt nicht vor (ok), „Ja" = liegt vor.
export function JaNeinRow({ text, value, onChange, highlight }) {
  const seg = (v, label, activeCls) => (
    <button
      type="button"
      onClick={() => onChange(v)}
      aria-pressed={value === v}
      className={`h-11 px-4 rounded-lg border text-sm font-medium transition-colors ${
        value === v ? activeCls : "border-border text-text-muted hover:text-text-secondary"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 bg-card border rounded-lg ${highlight ? "border-critical/60" : "border-border"}`}>
      <span className="flex-1 text-sm text-text-primary leading-snug">{text}</span>
      <div className="flex gap-1.5 flex-shrink-0">
        {seg("nein", "Nein", "border-success/50 bg-success/10 text-success")}
        {seg("ja", "Ja", "border-critical/50 bg-critical/10 text-critical")}
      </div>
    </div>
  );
}

// Segment-Auswahl (z. B. Applikationsweg, Geschlecht).
export function SegPick({ options, value, onChange }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`min-h-[44px] px-4 rounded-lg border text-sm font-medium transition-colors ${
            value === o.value
              ? "bg-accent text-bg-primary border-transparent"
              : "bg-card text-text-secondary border-border hover:bg-card-hover"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Wizard-Shell anlegen** (Schritte zunächst als Platzhalter-Switch; echte Steps folgen in Tasks 8–13)

```jsx
// src/modules/medigabe/Medigabe.jsx
// Medigabe nach SAA — geführter 8-Schritte-Wizard (SAA S. 41 Standardvorgehen).
import { useSyncExternalStore, useCallback } from "react";
import { getWizard, patchWizard, subscribeWizard } from "./lib/wizard.js";
import { StepFrame } from "./components/bits.jsx";

export default function Medigabe({ onJumpToMedScan }) {
  const w = useSyncExternalStore(subscribeWizard, getWizard);
  const back = useCallback(() => patchWizard({ step: Math.max(1, getWizard().step - 1) }), []);

  return (
    <main className="flex-1 min-w-0 flex flex-col">
      <StepFrame step={w.step} onBack={back} footer={null}>
        <p className="text-sm text-text-secondary">Schritt {w.step} — wird in Tasks 8–13 implementiert.</p>
      </StepFrame>
    </main>
  );
}
```

- [ ] **Step 3: App.jsx erweitern** — Mode `medigabe` + Deep-Link-Mechanik zu MedScan

In `src/App.jsx` (bestehende Imports unverändert lassen — `useRef`, `useEffect`, `useCallback` sind schon importiert):

1. Import hinzufügen: `import Medigabe from "./modules/medigabe/Medigabe.jsx";`
2. Im Component-Body nach `const lexRef = useRef(null);` ergänzen:

```jsx
  // Medigabe → MedScan-Sprung (Scannen/Suchen): Ziel-Tab merken, nach Mount navigieren.
  const pendingLexNav = useRef(null);
  useEffect(() => {
    if (mode === "lexikon" && pendingLexNav.current) {
      lexRef.current?.nav(pendingLexNav.current);
      pendingLexNav.current = null;
    }
  }, [mode]);
  const jumpToMedScan = useCallback((tab) => {
    pendingLexNav.current = tab;
    setMode("lexikon");
  }, [setMode]);
```

3. Im Render-Block der Module ergänzen (nach der trainer-Zeile):

```jsx
        {mode === "medigabe" ? <Medigabe onJumpToMedScan={jumpToMedScan} /> : null}
```

- [ ] **Step 4: HomeScreen-Kachel ergänzen**

In `src/shell/HomeScreen.jsx`: `SyringeIcon` zum Import hinzufügen und `TILES` erweitern:

```jsx
import { PharosLogo, MagnifyingGlassIcon, ClipboardCheckIcon, ArrowRightIcon, WifiIcon, SyringeIcon } from "../modules/lexikon/components/ui/icons.jsx";
```

```jsx
  {
    key: "medigabe",
    title: "Medigabe",
    desc: "SAA-konform durch die Medikamentengabe — Indikation, KI-Check, Dosis, 6-R.",
    Icon: SyringeIcon,
    tag: "Durchführen",
  },
```

Außerdem den Intro-Text anpassen: `Zwei Werkzeuge, ein Ort.` → `Drei Werkzeuge, ein Ort.`

- [ ] **Step 5: BottomTabBar erweitern**

In `src/shell/BottomTabBar.jsx`: `SyringeIcon` importieren. Den `mode === "trainer"`-Block und den Default-Block so ändern, dass jedes Modul die jeweils anderen beiden als Wechsel-Tabs zeigt:

```jsx
import {
  MagnifyingGlassIcon,
  CameraIcon,
  FlaskIcon,
  StarIcon,
  ClipboardCheckIcon,
  SyringeIcon,
} from "../modules/lexikon/components/ui/icons.jsx";
```

```jsx
  if (mode === "trainer") {
    return (
      <nav className={navCls} style={safe}>
        <Tab Icon={ClipboardCheckIcon} label="Übergabe" active onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
        <Tab Icon={MagnifyingGlassIcon} label="MedScan" active={false} onClick={() => onMode?.("lexikon")} />
        <Tab Icon={SyringeIcon} label="Medigabe" active={false} onClick={() => onMode?.("medigabe")} />
      </nav>
    );
  }

  if (mode === "medigabe") {
    return (
      <nav className={navCls} style={safe}>
        <Tab Icon={SyringeIcon} label="Medigabe" active onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
        <Tab Icon={MagnifyingGlassIcon} label="MedScan" active={false} onClick={() => onMode?.("lexikon")} />
        <Tab Icon={ClipboardCheckIcon} label="Übergabe" active={false} onClick={() => onMode?.("trainer")} />
      </nav>
    );
  }
```

Und im MedScan-Block den Wechsel-Tab ergänzen (nach dem Übergabe-Tab):

```jsx
      <Tab Icon={SyringeIcon} label="Medigabe" active={false} onClick={() => onMode?.("medigabe")} />
```

- [ ] **Step 6: DesktopSidebar erweitern**

In `src/shell/DesktopSidebar.jsx`: `SyringeIcon` importieren, `MODES` erweitern:

```jsx
const MODES = [
  { key: "lexikon", label: "MedScan", Icon: MagnifyingGlassIcon },
  { key: "medigabe", label: "Medigabe", Icon: SyringeIcon },
  { key: "trainer", label: "Übergabe", Icon: ClipboardCheckIcon },
];
```

Offline-Badge-Text: Bedingung `mode === "trainer"` bleibt — Medigabe ist offline-fähig, der Default-Text „Offline verfügbar" passt.

- [ ] **Step 7: Manuell prüfen**

Run: `npm run dev` → Browser:
- HomeScreen zeigt 3 Kacheln; „Medigabe" öffnet das Skelett (Schritt 1 / 8, Fortschrittsbalken, Disclaimer).
- BottomTabBar (schmales Fenster): in jedem Modul sind die anderen beiden erreichbar.
- DesktopSidebar (breites Fenster): 3 Modi, Medigabe aktiv markiert.

- [ ] **Step 8: Commit**

```bash
git add src/modules/medigabe/ src/App.jsx src/shell/HomeScreen.jsx src/shell/BottomTabBar.jsx src/shell/DesktopSidebar.jsx
git commit -m "feat(medigabe): Modul-Shell, 3. Kachel, Navigation (Mobile + Desktop)"
```

---

### Task 8: Schritt 1 (Medikament) + Schritt 2 (Indikation)

**Files:**
- Create: `src/modules/medigabe/components/Step1Medikament.jsx`
- Create: `src/modules/medigabe/components/Step2Indikation.jsx`
- Modify: `src/modules/medigabe/Medigabe.jsx`

- [ ] **Step 1: Step1Medikament**

```jsx
// src/modules/medigabe/components/Step1Medikament.jsx
import { useMemo, useState } from "react";
import saa from "../../lexikon/data/saa.json";
import dosing from "../data/dosing.json";
import Badge from "../../lexikon/components/ui/Badge.jsx";

// Medikament wählbar = Dosis-Datensatz vorhanden UND alle Preps freigegeben.
const READY = new Set(
  dosing.entries
    .filter((e) => e.indikationen.every((i) => i.routen.every((r) => r.preps.every((p) => p.freigegeben))))
    .map((e) => e.id)
);

export default function Step1Medikament({ value, onPick }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const all = [...saa.entries].sort((a, b) => Number(READY.has(b.id)) - Number(READY.has(a.id)) || a.name.localeCompare(b.name));
    return t ? all.filter((e) => e.name.toLowerCase().includes(t)) : all;
  }, [q]);

  return (
    <div>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Medikament suchen …"
        autoComplete="off"
        className="w-full h-12 px-4 mb-4 bg-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {list.map((e) => {
          const ready = READY.has(e.id);
          const active = value === e.id;
          return (
            <button
              key={e.id}
              type="button"
              disabled={!ready}
              onClick={() => onPick(e.id)}
              className={`min-h-[56px] px-3 py-2.5 rounded-lg border text-left transition-colors ${
                active ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-text-primary">{e.name}</span>
                {!ready ? <Badge variant="neutral" size="sm">folgt</Badge> : null}
              </div>
              <div className="text-xs text-text-muted mt-0.5 truncate">{e.gruppe}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Step2Indikation**

```jsx
// src/modules/medigabe/components/Step2Indikation.jsx
import dosing from "../data/dosing.json";

export default function Step2Indikation({ medId, value, onPick }) {
  const entry = dosing.entries.find((e) => e.id === medId);
  if (!entry) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-text-muted mb-1">Nur die in der SAA genannten Indikationen sind wählbar.</p>
      {entry.indikationen.map((ind) => (
        <button
          key={ind.id}
          type="button"
          onClick={() => onPick(ind.id)}
          aria-pressed={value === ind.id}
          className={`min-h-[56px] px-4 py-3 rounded-lg border text-left text-sm font-medium transition-colors ${
            value === ind.id ? "border-accent bg-accent/10 text-text-primary" : "border-border bg-card text-text-secondary hover:bg-card-hover"
          }`}
        >
          {ind.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Medigabe.jsx verdrahten** — Platzhalter ersetzen

```jsx
// src/modules/medigabe/Medigabe.jsx
import { useSyncExternalStore, useCallback } from "react";
import saa from "../lexikon/data/saa.json";
import dosing from "./data/dosing.json";
import { getWizard, patchWizard, subscribeWizard } from "./lib/wizard.js";
import { StepFrame } from "./components/bits.jsx";
import Step1Medikament from "./components/Step1Medikament.jsx";
import Step2Indikation from "./components/Step2Indikation.jsx";
import Button from "../lexikon/components/ui/Button.jsx";

export default function Medigabe({ onJumpToMedScan }) {
  const w = useSyncExternalStore(subscribeWizard, getWizard);
  const back = useCallback(() => patchWizard({ step: Math.max(1, getWizard().step - 1) }), []);
  const saaEntry = saa.entries.find((e) => e.id === w.medId) || null;
  const dosingEntry = dosing.entries.find((e) => e.id === w.medId) || null;
  const ind = dosingEntry?.indikationen.find((i) => i.id === w.indId) || null;

  const context = [];
  if (saaEntry) context.push(saaEntry.name);
  if (ind) context.push(ind.label);
  if (w.step > 3 && w.patient.kg) context.push(`${w.patient.kg} kg · ${w.patient.geschlecht || "?"} · ${w.patient.alter} ${w.patient.alterEinheit === "monate" ? "Mon" : "J"}`);

  let body = null;
  let footer = null;

  if (w.step === 1) {
    body = <Step1Medikament value={w.medId} onPick={(medId) => patchWizard({ medId, indId: null, ki: {}, dosier: { weg: null, prep: null } })} />;
    footer = <Button size="lg" className="w-full" disabled={!w.medId} onClick={() => patchWizard({ step: 2 })}>Weiter</Button>;
  } else if (w.step === 2) {
    body = <Step2Indikation medId={w.medId} value={w.indId} onPick={(indId) => patchWizard({ indId })} />;
    footer = <Button size="lg" className="w-full" disabled={!w.indId} onClick={() => patchWizard({ step: 3 })}>Weiter</Button>;
  } else {
    body = <p className="text-sm text-text-secondary">Schritt {w.step} — folgt.</p>;
  }

  return (
    <main className="flex-1 min-w-0 flex flex-col">
      <StepFrame step={w.step} context={context} onBack={back} footer={footer}>
        {body}
      </StepFrame>
    </main>
  );
}
```

- [ ] **Step 4: Manuell prüfen**

Run: `npm run dev` → Medigabe: 29 Medikamente, nur Esketamin wählbar (Rest „folgt", ausgegraut, Esketamin oben). Auswahl → Weiter → genau eine Indikation „Starker Schmerz (NRS ≥ 6)" → Weiter führt zu Platzhalter Schritt 3. Zurück funktioniert.

- [ ] **Step 5: Commit**

```bash
git add src/modules/medigabe/
git commit -m "feat(medigabe): Schritt 1+2 — Medikamenten-Grid (Freigabe-Gate) + Indikation"
```

---

### Task 9: Schritt 3 (Patient) + Lexikon-Anbindung caseMeds

**Files:**
- Create: `src/modules/medigabe/components/Step3Patient.jsx`
- Modify: `src/modules/lexikon/Lexikon.jsx` (Hydrieren + Write-through)
- Modify: `src/modules/medigabe/Medigabe.jsx`

- [ ] **Step 1: Lexikon an caseMeds anbinden**

In `src/modules/lexikon/Lexikon.jsx`:

1. Import ergänzen (bei den anderen lib-Imports):
```jsx
import { getCaseMeds, setCaseMeds, clearCaseMeds } from "../../lib/caseMeds.js";
```
2. `planEntries`-Initialisierung ändern (Zeile ~126) — hydriert vom geteilten Store:
```jsx
  const [planEntries, setPlanEntries] = useState(() => getCaseMeds());
```
3. Write-through-Effect direkt unter den State-Deklarationen ergänzen (nur nicht-leer schreiben — Leeren passiert bei Suche-Tippen ständig und darf die Einsatzliste nicht löschen):
```jsx
  // Einsatzliste teilen: Scan-/Suchergebnisse für Medigabe verfügbar machen.
  useEffect(() => {
    if (planEntries.length) setCaseMeds(planEntries);
  }, [planEntries]);
```
4. Den „Zurücksetzen"-Button (Zeile ~398) zusätzlich `clearCaseMeds()` aufrufen lassen:
```jsx
<Button variant="ghost" size="sm" onClick={() => { setPlanEntries([]); clearCaseMeds(); }}>Zurücksetzen</Button>
```

- [ ] **Step 2: Step3Patient**

```jsx
// src/modules/medigabe/components/Step3Patient.jsx
import { useState, useSyncExternalStore } from "react";
import { getCaseMeds, addCaseMed, removeCaseMed, clearCaseMeds, subscribeCaseMeds, caseMedNames } from "../../../lib/caseMeds.js";
import { SegPick } from "./bits.jsx";
import Button from "../../lexikon/components/ui/Button.jsx";
import Badge from "../../lexikon/components/ui/Badge.jsx";
import { CameraIcon, MagnifyingGlassIcon, XIcon } from "../../lexikon/components/ui/icons.jsx";

const KG_CHIPS = [50, 60, 70, 80, 90, 100];

export default function Step3Patient({ patient, onPatch, minKg, minKgHinweis, onJumpToMedScan }) {
  const meds = useSyncExternalStore(subscribeCaseMeds, getCaseMeds);
  const [medInput, setMedInput] = useState("");
  const names = caseMedNames(meds);

  const addManual = () => {
    const t = medInput.trim();
    if (!t) return;
    addCaseMed({ wirkstoff: t, source: "medigabe" });
    setMedInput("");
    if (patient.dauerStatus === "keine") onPatch({ dauerStatus: null });
  };

  const kg = Number(patient.kg);
  const alterJahre = patient.alterEinheit === "monate" ? Number(patient.alter) / 12 : Number(patient.alter);
  const kgInvalid = patient.kg !== "" && (!(kg > 0) || kg < 1 || kg > 250);
  const alterInvalid = patient.alter !== "" && (!(alterJahre >= 0) || alterJahre > 120);
  const unterMinKg = minKg != null && patient.kg !== "" && kg < minKg;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-xs text-text-muted mb-2">Geschlecht</div>
        <SegPick
          options={[{ value: "m", label: "männlich" }, { value: "w", label: "weiblich" }, { value: "d", label: "divers" }]}
          value={patient.geschlecht}
          onChange={(geschlecht) => onPatch({ geschlecht })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-text-muted mb-2">Alter</div>
          <div className="flex gap-2">
            <input
              type="number" inputMode="numeric" min="0"
              value={patient.alter}
              onChange={(e) => onPatch({ alter: e.target.value })}
              className="w-full h-12 px-3 bg-card border border-border rounded-lg text-sm text-text-primary"
              placeholder={patient.alterEinheit === "monate" ? "Monate" : "Jahre"}
            />
            <SegPick
              options={[{ value: "jahre", label: "J" }, { value: "monate", label: "Mon" }]}
              value={patient.alterEinheit}
              onChange={(alterEinheit) => onPatch({ alterEinheit })}
            />
          </div>
          {alterInvalid ? <p className="text-xs text-critical mt-1">Unplausibel (0–120 Jahre).</p> : null}
        </div>
        <div>
          <div className="text-xs text-text-muted mb-2">Gewicht (kg)</div>
          <input
            type="number" inputMode="decimal" min="1" max="250"
            value={patient.kg}
            onChange={(e) => onPatch({ kg: e.target.value })}
            className="w-full h-12 px-3 bg-card border border-border rounded-lg text-sm text-text-primary"
            placeholder="kg"
          />
          {kgInvalid ? <p className="text-xs text-critical mt-1">Unplausibel (1–250 kg).</p> : null}
        </div>
      </div>
      <div className="flex gap-1.5 flex-wrap -mt-2">
        {KG_CHIPS.map((c) => (
          <button key={c} type="button" onClick={() => onPatch({ kg: String(c) })}
            className={`h-9 px-3 rounded-lg border text-xs font-mono transition-colors ${Number(patient.kg) === c ? "border-accent text-accent bg-accent/10" : "border-border text-text-muted hover:text-text-secondary"}`}>
            {c}
          </button>
        ))}
      </div>

      {unterMinKg ? (
        <div className="border border-critical/40 bg-critical/10 rounded-lg p-3 text-sm text-text-primary">
          <span className="font-semibold text-critical">Altersgrenze: </span>{minKgHinweis}
        </div>
      ) : null}

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-text-muted">Dauermedikation</div>
          {meds.length ? (
            <button type="button" onClick={() => { clearCaseMeds(); onPatch({ dauerStatus: null }); }} className="text-xs text-text-muted hover:text-critical">
              Liste verwerfen
            </button>
          ) : null}
        </div>

        {meds.length ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1.5">
              {meds.map((m) => (
                <span key={m.wirkstoff} className="inline-flex items-center gap-1.5 text-xs text-text-primary bg-card border border-border rounded-md pl-2 pr-1 py-1">
                  {m.wirkstoff}
                  {m.source !== "medigabe" ? <Badge variant="accent" size="sm">MedScan</Badge> : null}
                  <button type="button" aria-label={`${m.wirkstoff} entfernen`} onClick={() => removeCaseMed(m.wirkstoff)} className="p-1 text-text-muted hover:text-critical">
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <Button
              variant={patient.dauerStatus === "uebernommen" ? "primary" : "subtle"}
              size="lg" className="w-full"
              onClick={() => onPatch({ dauerStatus: "uebernommen" })}
            >
              {patient.dauerStatus === "uebernommen" ? `✓ ${names.length} Medikament(e) übernommen` : `${names.length} Medikament(e) übernehmen`}
            </Button>
          </div>
        ) : (
          <Button
            variant={patient.dauerStatus === "keine" ? "primary" : "subtle"}
            size="lg" className="w-full"
            onClick={() => onPatch({ dauerStatus: "keine" })}
          >
            {patient.dauerStatus === "keine" ? "✓ Keine Dauermedikation" : "Keine Dauermedikation (bestätigen)"}
          </Button>
        )}

        <div className="flex gap-2 mt-3">
          <input
            value={medInput}
            onChange={(e) => setMedInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addManual(); }}
            placeholder="Medikament ergänzen …"
            autoComplete="off"
            className="flex-1 h-11 px-3 bg-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted"
          />
          <Button variant="subtle" size="md" onClick={addManual} disabled={!medInput.trim()}>Hinzufügen</Button>
        </div>
        <div className="flex gap-2 mt-2">
          <Button variant="ghost" size="md" className="flex-1" onClick={() => onJumpToMedScan("scannen")}>
            <CameraIcon className="h-4 w-4" /> Scannen
          </Button>
          <Button variant="ghost" size="md" className="flex-1" onClick={() => onJumpToMedScan("suche")}>
            <MagnifyingGlassIcon className="h-4 w-4" /> Suchen
          </Button>
        </div>
        <p className="text-[11px] text-text-muted mt-2">Scan/Suche öffnet MedScan — der Wizard bleibt erhalten, zurück über die Tab-Leiste.</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: In Medigabe.jsx verdrahten** (im Step-Switch ergänzen)

```jsx
import Step3Patient from "./components/Step3Patient.jsx";
```

```jsx
  } else if (w.step === 3) {
    const p = w.patient;
    const kg = Number(p.kg);
    const alterJahre = p.alterEinheit === "monate" ? Number(p.alter) / 12 : Number(p.alter);
    const valid =
      p.geschlecht && p.alter !== "" && p.kg !== "" &&
      kg >= 1 && kg <= 250 && alterJahre >= 0 && alterJahre <= 120 &&
      (dosingEntry?.minKg == null || kg >= dosingEntry.minKg) &&
      (p.dauerStatus === "keine" || p.dauerStatus === "uebernommen");
    body = (
      <Step3Patient
        patient={p}
        onPatch={(patch) => patchWizard({ patient: { ...getWizard().patient, ...patch } })}
        minKg={dosingEntry?.minKg}
        minKgHinweis={dosingEntry?.minKgHinweis}
        onJumpToMedScan={onJumpToMedScan}
      />
    );
    footer = <Button size="lg" className="w-full" disabled={!valid} onClick={() => patchWizard({ step: 4 })}>Weiter</Button>;
  }
```

- [ ] **Step 4: Bestehende Tests laufen lassen** (Lexikon-Änderung absichern)

Run: `npx vitest run`
Expected: PASS (alle bestehenden + neuen Tests)

- [ ] **Step 5: Manuell prüfen**

Run: `npm run dev`:
- MedScan: Medikament suchen/scannen → Liste erscheint; zu Medigabe wechseln → Schritt 3 zeigt Chips mit „MedScan"-Badge; „übernehmen" bestätigen.
- „Scannen"-Button in Schritt 3 springt in den MedScan-Scanner; zurück via Tab → Wizard-State unverändert.
- Leere Liste: „Keine Dauermedikation (bestätigen)" als Pflicht.
- Esketamin + 8 kg → roter Altersgrenze-Block, kein Weiter.

- [ ] **Step 6: Commit**

```bash
git add src/modules/medigabe/ src/modules/lexikon/Lexikon.jsx
git commit -m "feat(medigabe): Schritt 3 Patient — caseMeds-Übernahme, Scan/Suche-Sprung, Plausibilität"
```

---

### Task 10: Schritt 4 — Kontraindikationen (3 Klassen)

**Files:**
- Create: `src/modules/medigabe/components/Step4Kontra.jsx`
- Modify: `src/modules/medigabe/Medigabe.jsx`

- [ ] **Step 1: Step4Kontra**

```jsx
// src/modules/medigabe/components/Step4Kontra.jsx
import { useMemo, useEffect } from "react";
import saaMatrixData from "../../lexikon/data/saa-matrix.json";
import { normKey, triggerMatrixCompute } from "../../lexikon/lib/saaCheck.js";
import { dauermedRows, kontraMatchIndex } from "../lib/ki.js";
import { JaNeinRow, CheckRow } from "./bits.jsx";
import Badge from "../../lexikon/components/ui/Badge.jsx";
import { AlertTriangleIcon, CheckCircleIcon } from "../../lexikon/components/ui/icons.jsx";

const FERTILE = (p) => {
  const j = p.alterEinheit === "monate" ? Number(p.alter) / 12 : Number(p.alter);
  return p.geschlecht === "w" && j >= 12 && j <= 55;
};

export default function Step4Kontra({ saaEntry, patient, medNames, answers, onAnswer }) {
  const rows = useMemo(
    () => dauermedRows({ meds: medNames, matrix: saaMatrixData.entries, saaEntry }),
    [medNames.join("|"), saaEntry.id]
  );
  const flagged = rows.filter((r) => r.level !== "ok");
  const okCount = rows.length - flagged.length;
  const pending = rows.filter((r) => r.pending).map((r) => r.med);
  useEffect(() => { if (pending.length) triggerMatrixCompute(pending); }, [pending.join("|")]);

  // Offizielle KI-Punkte, die eine geflaggte Substanz namentlich nennen → hervorheben.
  const highlightIdx = new Set(
    flagged.map((r) => kontraMatchIndex(r.med, saaEntry.kontra)).filter((i) => i >= 0)
  );
  const fertile = FERTILE(patient);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-critical mb-2">Absolut — liegt das vor?</div>
        <div className="flex flex-col gap-2">
          {saaEntry.kontra.map((text, i) => (
            <JaNeinRow
              key={i}
              text={text}
              value={answers[`a:${i}`]}
              onChange={(v) => onAnswer(`a:${i}`, v)}
              highlight={highlightIdx.has(i) || (fertile && /schwanger/i.test(text))}
            />
          ))}
        </div>
        {fertile ? (
          <p className="text-xs text-warning mt-2">Patientin im gebärfähigen Alter — Schwangerschafts-Punkte besonders prüfen.</p>
        ) : null}
      </section>

      {saaEntry.relKontra.length ? (
        <section>
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-warning mb-2">Relativ — liegt das vor?</div>
          <div className="flex flex-col gap-2">
            {saaEntry.relKontra.map((text, i) => (
              <JaNeinRow key={i} text={text} value={answers[`r:${i}`]} onChange={(v) => onAnswer(`r:${i}`, v)} />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-text-muted mb-2">
          Dauermedikation <span className="normal-case tracking-normal">· KI-gestützter Abgleich</span>
        </div>
        {patient.dauerStatus === "keine" ? (
          <div className="flex items-center gap-2 border border-border bg-card rounded-lg px-3 py-3">
            <CheckCircleIcon className="h-5 w-5 text-success flex-shrink-0" />
            <span className="text-sm text-text-secondary">Keine Dauermedikation angegeben.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {flagged.map((r) => (
              <div key={r.med} className={`border rounded-lg p-3 ${r.level === "absolut" ? "border-critical/50 bg-critical/5" : "border-warning/40 bg-warning/5"}`}>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <AlertTriangleIcon className={`h-4 w-4 ${r.level === "absolut" ? "text-critical" : "text-warning"}`} />
                  <span className="text-sm font-semibold text-text-primary">{r.med}</span>
                  <Badge variant={r.level === "absolut" ? "critical" : "warning"} size="sm">
                    {r.level === "absolut" ? "Absolute KI" : "Vorsicht"}
                  </Badge>
                  {r.pending ? <Badge variant="neutral" size="sm">vorläufig</Badge> : null}
                </div>
                <p className="text-sm text-text-secondary leading-relaxed mb-2">{r.reason}</p>
                {r.level === "absolut" ? (
                  <p className="text-xs text-critical mb-2">→ Entspricht einem absoluten KI-Punkt oben — dort entscheiden.</p>
                ) : null}
                <CheckRow tone="warning" checked={!!answers[`m:${normKey(r.med)}`]} onToggle={() => onAnswer(`m:${normKey(r.med)}`, !answers[`m:${normKey(r.med)}`])}>
                  Zur Kenntnis genommen / abgewogen
                </CheckRow>
              </div>
            ))}
            {okCount ? (
              <div className="flex items-center gap-2 border border-border bg-card rounded-lg px-3 py-2.5">
                <CheckCircleIcon className="h-4 w-4 text-success flex-shrink-0" />
                <span className="text-xs text-text-secondary">{okCount} Medikament(e) unkritisch gegenüber {saaEntry.name}.</span>
              </div>
            ) : null}
            {!rows.length ? (
              <p className="text-xs text-text-muted">Liste leer — in Schritt 3 übernehmen oder „keine" bestätigen.</p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: In Medigabe.jsx verdrahten**

```jsx
import Step4Kontra from "./components/Step4Kontra.jsx";
import { kiOutcome, dauermedRows } from "./lib/ki.js";
import { normKey } from "../lexikon/lib/saaCheck.js";
import saaMatrixData from "../lexikon/data/saa-matrix.json";
import { caseMedNames, getCaseMeds } from "../../lib/caseMeds.js";
```

```jsx
  } else if (w.step === 4 && saaEntry) {
    const medNames = w.patient.dauerStatus === "uebernommen" ? caseMedNames(getCaseMeds()) : [];
    const rows = dauermedRows({ meds: medNames, matrix: saaMatrixData.entries, saaEntry });
    const flaggedMeds = rows.filter((r) => r.level !== "ok").map((r) => normKey(r.med));
    const out = kiOutcome({ answers: w.ki, nAbs: saaEntry.kontra.length, nRel: saaEntry.relKontra.length, flaggedMeds });

    body = (
      <Step4Kontra
        saaEntry={saaEntry}
        patient={w.patient}
        medNames={medNames}
        answers={w.ki}
        onAnswer={(k, v) => patchWizard({ ki: { ...getWizard().ki, [k]: v } })}
      />
    );
    footer = out.stop ? (
      <div className="w-full border border-critical/50 bg-critical/10 rounded-lg p-4 text-center">
        <div className="text-sm font-semibold text-critical mb-1">Absolute Kontraindikation — keine Gabe</div>
        <p className="text-xs text-text-secondary mb-3">Vorgehen nach BPR (Alternativen / NA-Nachforderung). Wizard hier beenden.</p>
        <Button variant="subtle" size="lg" className="w-full" onClick={() => { resetWizard(); }}>Beenden &amp; zurücksetzen</Button>
      </div>
    ) : (
      <Button
        size="lg" className="w-full" disabled={!out.complete}
        onClick={() => {
          if (out.confirm && !window.confirm("Relative Kontraindikation(en) bzw. Dauermedikations-Hinweise liegen vor. Nutzen-Risiko abgewogen? Begründung dokumentieren.")) return;
          patchWizard({ step: 5 });
        }}
      >
        Weiter
      </Button>
    );
  }
```

Zusätzlich `resetWizard` importieren: `import { getWizard, patchWizard, resetWizard, subscribeWizard } from "./lib/wizard.js";`

- [ ] **Step 3: Manuell prüfen**

Run: `npm run dev`:
- Esketamin, Patient mit Dauermedikation „Theophyllin" (manuell ergänzen): Schritt 4 zeigt rote Karte mit Verweis auf den hervorgehobenen Punkt „Vormedikation mit Aminophyllin, Theophyllin, Ergometrin".
- Alle Punkte „Nein" + Haken → Weiter aktiv; ein absoluter Punkt „Ja" → roter Stopp-Block.
- Relativer Punkt „Ja" → Confirm-Dialog vor Weiter.
- Patientin w/30 J → Schwangerschafts-Punkt hervorgehoben + Hinweistext.

- [ ] **Step 4: Commit**

```bash
git add src/modules/medigabe/
git commit -m "feat(medigabe): Schritt 4 — KI-Checkliste (absolut/relativ/Dauermedikation), Stopp-Logik"
```

---

### Task 11: Schritt 5 — Aufklärung & Einwilligung

**Files:**
- Create: `src/modules/medigabe/components/Step5Aufklaerung.jsx`
- Modify: `src/modules/medigabe/Medigabe.jsx`

- [ ] **Step 1: Step5Aufklaerung** (Inhalte aus BPR Aufklärung, S. 14)

```jsx
// src/modules/medigabe/components/Step5Aufklaerung.jsx
import { CheckRow, SegPick } from "./bits.jsx";

export const AUFKL_ITEMS = [
  "Grund der Maßnahme erklärt",
  "Eigene Qualifikation genannt",
  "Erwarteter Nutzen und mögliche Risiken erläutert",
  "Alternativen genannt",
  "Nachteile einer Ablehnung erläutert",
  "Für den Patienten verständlich erklärt",
];

export default function Step5Aufklaerung({ aufkl, onPatch }) {
  return (
    <div className="flex flex-col gap-5">
      <section>
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-text-muted mb-2">Situationsgerechte Aufklärung (BPR S. 14)</div>
        <div className="flex flex-col gap-2">
          {AUFKL_ITEMS.map((text, i) => (
            <CheckRow key={i} checked={!!aufkl.items[i]} onToggle={() => onPatch({ items: { ...aufkl.items, [i]: !aufkl.items[i] } })}>
              {text}
            </CheckRow>
          ))}
        </div>
      </section>

      <section>
        <div className="text-xs text-text-muted mb-2">Einwilligungsfähigkeit vorhanden?</div>
        <SegPick
          options={[{ value: "ja", label: "Ja" }, { value: "nein", label: "Nein" }, { value: "unklar", label: "Unklar" }]}
          value={aufkl.faehig}
          onChange={(faehig) => onPatch({ faehig, einwilligung: null, mutmasslich: false })}
        />
      </section>

      {aufkl.faehig === "ja" ? (
        <section>
          <div className="text-xs text-text-muted mb-2">Einwilligung in die Maßnahme?</div>
          <SegPick
            options={[{ value: "ja", label: "Erteilt" }, { value: "nein", label: "Verweigert" }]}
            value={aufkl.einwilligung}
            onChange={(einwilligung) => onPatch({ einwilligung })}
          />
          {aufkl.einwilligung === "nein" ? (
            <div className="mt-3 border border-critical/40 bg-critical/10 rounded-lg p-3 text-sm">
              <span className="font-semibold text-critical">Ablehnung akzeptieren.</span>{" "}
              <span className="text-text-secondary">Weiter nach BPR „Behandlungs-/Transportverweigerung" (Formblatt, Zeugen, Doku) — keine Gabe.</span>
            </div>
          ) : null}
        </section>
      ) : null}

      {aufkl.faehig === "nein" || aufkl.faehig === "unklar" ? (
        <section className="border border-warning/40 bg-warning/5 rounded-lg p-3">
          <p className="text-sm text-text-secondary mb-2">
            Versorgung nach mutmaßlichem Patientenwillen gemäß SAA/BPR. NA / TNA hinzuziehen. Umfang und Gründe dokumentieren.
          </p>
          <CheckRow tone="warning" checked={aufkl.mutmasslich} onToggle={() => onPatch({ mutmasslich: !aufkl.mutmasslich })}>
            Nach mutmaßlichem Willen — NA/TNA-Kontakt veranlasst
          </CheckRow>
        </section>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: In Medigabe.jsx verdrahten**

```jsx
import Step5Aufklaerung, { AUFKL_ITEMS } from "./components/Step5Aufklaerung.jsx";
```

```jsx
  } else if (w.step === 5) {
    const a = w.aufkl;
    const itemsOk = AUFKL_ITEMS.every((_, i) => a.items[i]);
    const verweigert = a.faehig === "ja" && a.einwilligung === "nein";
    const ok =
      (a.faehig === "ja" && a.einwilligung === "ja" && itemsOk) ||
      ((a.faehig === "nein" || a.faehig === "unklar") && a.mutmasslich);
    body = <Step5Aufklaerung aufkl={a} onPatch={(patch) => patchWizard({ aufkl: { ...getWizard().aufkl, ...patch } })} />;
    footer = verweigert ? (
      <Button variant="subtle" size="lg" className="w-full" onClick={() => resetWizard()}>Beenden — keine Gabe</Button>
    ) : (
      <Button size="lg" className="w-full" disabled={!ok} onClick={() => patchWizard({ step: 6 })}>Weiter</Button>
    );
  }
```

Hinweis: Bei `faehig = nein/unklar` ist die Aufklärungs-Checkliste nicht Pflicht (Patient kann nicht aufgeklärt werden) — bewusst nur `mutmasslich`-Haken.

- [ ] **Step 3: Manuell prüfen**

Run: `npm run dev` — drei Pfade: (a) fähig+erteilt+6 Haken → Weiter; (b) fähig+verweigert → roter Block, nur Beenden; (c) unklar+Haken → Weiter ohne Aufklärungs-Items.

- [ ] **Step 4: Commit**

```bash
git add src/modules/medigabe/
git commit -m "feat(medigabe): Schritt 5 — Aufklärung & Einwilligung nach BPR (3 Pfade)"
```

---

### Task 12: Schritt 6 — Dosierung mit Vorbereitung & Rechenweg

**Files:**
- Create: `src/modules/medigabe/components/Step6Dosierung.jsx`
- Modify: `src/modules/medigabe/Medigabe.jsx`

- [ ] **Step 1: Step6Dosierung**

```jsx
// src/modules/medigabe/components/Step6Dosierung.jsx
import { computeDose, computeVolume, fmt } from "../lib/dose.js";
import { SegPick } from "./bits.jsx";
import Badge from "../../lexikon/components/ui/Badge.jsx";
import { AlertTriangleIcon, DropletIcon } from "../../lexikon/components/ui/icons.jsx";

export default function Step6Dosierung({ ind, cave, patient, dosier, onPatch }) {
  const route = dosier.weg != null ? ind.routen[dosier.weg] : null;
  const prep = route && dosier.prep != null ? route.preps[dosier.prep] : null;
  const kg = Number(patient.kg);
  const alterJahre = patient.alterEinheit === "monate" ? Number(patient.alter) / 12 : Number(patient.alter);

  let dose = null, vol = null;
  if (route && prep) {
    dose = computeDose({ dosis: route.dosis, kg, alterJahre, maxMgProKg: route.maxMgProKg, maxMgAbsolut: route.maxMgAbsolut });
    vol = computeVolume({ mg: dose.mg, mgPerMl: prep.mgPerMl, maxMg: dose.maxMg });
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-xs text-text-muted mb-2">Applikationsweg</div>
        <SegPick
          options={ind.routen.map((r, i) => ({ value: i, label: r.weg }))}
          value={dosier.weg}
          onChange={(weg) => onPatch({ weg, prep: ind.routen[weg].preps.length === 1 ? 0 : null })}
        />
      </div>

      {route ? (
        <div>
          <div className="text-xs text-text-muted mb-2">Ampulle / Konzentration</div>
          <div className="flex flex-col gap-2">
            {route.preps.map((p, i) => (
              <button
                key={i} type="button" onClick={() => onPatch({ prep: i })} aria-pressed={dosier.prep === i}
                className={`min-h-[56px] px-3 py-2.5 rounded-lg border text-left transition-colors ${
                  dosier.prep === i ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"
                }`}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-text-primary">{p.ampulle}</span>
                  {p.quelle === "praxis" ? <Badge variant="info" size="sm">Praxis-Schema</Badge> : null}
                </div>
                <div className="text-xs text-text-secondary mt-0.5">
                  {p.zugabe ? `+ ${p.zugabe} → ` : ""}{p.ergebnis}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {route && prep && dose && vol ? (
        <>
          {prep.zugabe ? (
            <div className="border border-border bg-card rounded-lg p-3">
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-text-muted mb-1.5">Vorbereitung</div>
              <p className="text-sm text-text-primary leading-relaxed">
                {prep.ampulle} <span className="text-text-muted">+</span> {prep.zugabe} <span className="text-text-muted">→</span>{" "}
                <span className="font-semibold">{prep.ergebnis}</span>
              </p>
            </div>
          ) : null}

          <div className="border-2 border-accent rounded-xl bg-card p-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-text-primary leading-none">{fmt(vol.mgEffektiv)}</span>
              <span className="text-base text-text-secondary">mg</span>
              {dose.gekappt ? <Badge variant="warning" size="sm">gekappt</Badge> : null}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <DropletIcon className="h-5 w-5 text-accent" />
              <span className="text-lg font-semibold text-accent">{fmt(vol.ml)} ml</span>
              <span className="text-xs text-text-muted">aus {prep.ergebnis} aufziehen</span>
            </div>
          </div>

          <div className="border border-border bg-bg-secondary rounded-lg p-3 font-mono text-xs leading-relaxed text-text-secondary">
            {[...dose.schritte, ...vol.schritte].map((s, i) => (<div key={i}>{s}</div>))}
          </div>

          {route.repetition ? <p className="text-xs text-text-secondary"><span className="font-semibold">Repetition:</span> {route.repetition}</p> : null}
          {route.hinweise?.map((h, i) => (<p key={i} className="text-xs text-text-secondary">• {h}</p>))}

          {cave?.length ? (
            <div className="border border-warning/40 bg-warning/5 rounded-lg p-3 flex flex-col gap-1.5">
              {cave.map((c, i) => (
                <div key={i} className="flex items-start gap-2">
                  <AlertTriangleIcon className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-text-primary leading-snug">{c}</span>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: In Medigabe.jsx verdrahten**

```jsx
import Step6Dosierung from "./components/Step6Dosierung.jsx";
```

```jsx
  } else if (w.step === 6 && ind) {
    body = (
      <Step6Dosierung
        ind={ind}
        cave={dosingEntry.cave}
        patient={w.patient}
        dosier={w.dosier}
        onPatch={(patch) => patchWizard({ dosier: { ...getWizard().dosier, ...patch } })}
      />
    );
    footer = (
      <Button size="lg" className="w-full" disabled={w.dosier.weg == null || w.dosier.prep == null} onClick={() => patchWizard({ step: 7 })}>
        Weiter → 6-R-Regel
      </Button>
    );
  }
```

- [ ] **Step 3: Manuell prüfen**

Run: `npm run dev` — Esketamin, 70 kg, Schmerz:
- i.v. + „50 mg / 2 ml" (Praxis-Schema-Badge): Vorbereitung „+ 3 ml NaCl 0,9 % → 5 ml à 10 mg/ml", Ergebnis 9 mg / 0,9 ml, Rechenweg 3 Zeilen, Cave-Block sichtbar.
- i.v. + „25 mg / 5 ml": 9 mg / 1,8 ml, keine Vorbereitung.
- nasal/i.m.: 70 mg / 2,8 ml (25 mg/ml), Repetitionstext.

- [ ] **Step 4: Commit**

```bash
git add src/modules/medigabe/
git commit -m "feat(medigabe): Schritt 6 — Dosierung mit Vorbereitung, Rechenweg, Cave"
```

---

### Task 13: Schritt 7 (6-R) + Schritt 8 (Durchführung & Doku)

**Files:**
- Create: `src/modules/medigabe/components/Step7SechsR.jsx`
- Create: `src/modules/medigabe/components/Step8Doku.jsx`
- Modify: `src/modules/medigabe/Medigabe.jsx`

- [ ] **Step 1: Step7SechsR** — Haken mit konkreten Werten

```jsx
// src/modules/medigabe/components/Step7SechsR.jsx
import { CheckRow } from "./bits.jsx";

// Sechs R mit den konkreten Werten dieses Durchlaufs (SAA S. 41).
export function sechsRItems({ saaEntry, ind, route, prep, patient, mgEffektiv, ml }) {
  const alterTxt = `${patient.alter} ${patient.alterEinheit === "monate" ? "Monate" : "Jahre"}`;
  return [
    { titel: "Richtiger Patient?", wert: `${patient.geschlecht || "?"} · ${alterTxt} · ${patient.kg} kg` },
    { titel: "Richtiges Medikament?", wert: `${saaEntry.name} — Ampulle ${prep.ampulle}` },
    { titel: "Richtige Dosierung?", wert: `${mgEffektiv} mg = ${ml} ml` },
    { titel: "Richtiger Zeitpunkt?", wert: `Jetzt indiziert: ${ind.label}` },
    { titel: "Richtige Konzentration?", wert: prep.ergebnis },
    { titel: "Richtige Applikationsart?", wert: route.weg },
  ];
}

export default function Step7SechsR({ items, sechsR, onToggle }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((it, i) => (
        <CheckRow key={i} checked={!!sechsR[i]} onToggle={() => onToggle(i)}>
          <span className="font-semibold">{it.titel}</span>
          <span className="block text-text-secondary text-xs mt-0.5">{it.wert}</span>
        </CheckRow>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Step8Doku**

```jsx
// src/modules/medigabe/components/Step8Doku.jsx
import { CheckRow } from "./bits.jsx";
import Button from "../../lexikon/components/ui/Button.jsx";

const DURCHF = [
  { key: "divi", text: "Spritze eindeutig gekennzeichnet (DIVI-ISO-Aufkleber)" },
  { key: "augen", text: "Doppelkontrolle / 4-Augen-Prinzip durchgeführt" },
  { key: "komm", text: "Anordnung mündlich wiederholt (gesicherte Kommunikation)" },
];

export default function Step8Doku({ zusammenfassung, durchf, onToggle, onNeuerPatient }) {
  return (
    <div className="flex flex-col gap-5">
      <section>
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-text-muted mb-2">Vor der Gabe</div>
        <div className="flex flex-col gap-2">
          {DURCHF.map((d) => (
            <CheckRow key={d.key} checked={!!durchf[d.key]} onToggle={() => onToggle(d.key)}>{d.text}</CheckRow>
          ))}
        </div>
      </section>

      <section className="border border-border bg-card rounded-lg p-4">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-text-muted mb-2">Doku-Zusammenfassung</div>
        <dl className="text-sm leading-relaxed">
          {zusammenfassung.map(([k, v]) => (
            <div key={k} className="flex gap-3 py-0.5">
              <dt className="w-32 flex-shrink-0 text-text-muted text-xs pt-0.5">{k}</dt>
              <dd className="text-text-primary">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-[11px] text-text-muted mt-3">
          Ins Einsatzprotokoll übernehmen — inkl. Befunde, Aufklärung/Einwilligung, Wirkungskontrolle. Verlaufskontrolle: gewünschte Wirkung erreicht? Sonst Folgemaßnahmen/Repetition gemäß SAA.
        </p>
      </section>

      <Button variant="subtle" size="lg" className="w-full" onClick={onNeuerPatient}>
        Neuer Patient — alles zurücksetzen
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: In Medigabe.jsx verdrahten**

```jsx
import Step7SechsR, { sechsRItems } from "./components/Step7SechsR.jsx";
import Step8Doku from "./components/Step8Doku.jsx";
import { computeDose, computeVolume, fmt } from "./lib/dose.js";
import { clearCaseMeds } from "../../lib/caseMeds.js";
```

```jsx
  } else if ((w.step === 7 || w.step === 8) && ind && w.dosier.weg != null && w.dosier.prep != null) {
    const route = ind.routen[w.dosier.weg];
    const prep = route.preps[w.dosier.prep];
    const kg = Number(w.patient.kg);
    const alterJahre = w.patient.alterEinheit === "monate" ? Number(w.patient.alter) / 12 : Number(w.patient.alter);
    const dose = computeDose({ dosis: route.dosis, kg, alterJahre, maxMgProKg: route.maxMgProKg, maxMgAbsolut: route.maxMgAbsolut });
    const vol = computeVolume({ mg: dose.mg, mgPerMl: prep.mgPerMl, maxMg: dose.maxMg });
    const items = sechsRItems({ saaEntry, ind, route, prep, patient: w.patient, mgEffektiv: fmt(vol.mgEffektiv), ml: fmt(vol.ml) });

    if (w.step === 7) {
      const all = items.every((_, i) => w.sechsR[i]);
      body = <Step7SechsR items={items} sechsR={w.sechsR} onToggle={(i) => patchWizard({ sechsR: { ...getWizard().sechsR, [i]: !getWizard().sechsR[i] } })} />;
      footer = (
        <Button size="lg" className="w-full" disabled={!all}
          onClick={() => patchWizard({ step: 8, freigabeZeit: new Date().toISOString() })}>
          6× Ja — Freigabe zur Durchführung
        </Button>
      );
    } else {
      const zeit = w.freigabeZeit ? new Date(w.freigabeZeit).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "—";
      const zusammenfassung = [
        ["Medikament", `${saaEntry.name} (${prep.ampulle})`],
        ["Indikation", ind.label],
        ["Patient", items[0].wert],
        ["Dosis", `${fmt(vol.mgEffektiv)} mg = ${fmt(vol.ml)} ml ${route.weg}`],
        ["Lösung", prep.ergebnis],
        ["Repetition", route.repetition || "—"],
        ["6-R bestätigt", `${zeit} Uhr`],
        ["UAW beachten", (saaEntry.uaw || []).join(", ")],
      ];
      body = (
        <Step8Doku
          zusammenfassung={zusammenfassung}
          durchf={w.durchf}
          onToggle={(k) => patchWizard({ durchf: { ...getWizard().durchf, [k]: !getWizard().durchf[k] } })}
          onNeuerPatient={() => { clearCaseMeds(); resetWizard(); }}
        />
      );
      footer = null;
    }
  }
```

- [ ] **Step 4: Manuell prüfen**

Run: `npm run dev` — Schritt 7 zeigt 6 Zeilen mit konkreten Werten; erst nach 6 Haken Freigabe. Schritt 8: 3 Vor-Gabe-Haken, Doku-Zusammenfassung vollständig, „Neuer Patient" setzt Wizard UND Einsatzliste zurück (MedScan-Liste danach leer).

- [ ] **Step 5: Commit**

```bash
git add src/modules/medigabe/
git commit -m "feat(medigabe): Schritt 7+8 — 6-R-Freigabe mit Ist-Werten, Durchführung & Doku"
```

---

### Task 14: Gesamtverifikation

**Files:** keine neuen — Validierung.

- [ ] **Step 1: Alle Tests**

Run: `npx vitest run`
Expected: PASS — alte Lexikon-/Trainer-Tests + 5 neue Medigabe-/caseMeds-Testdateien

- [ ] **Step 2: Produktions-Build**

Run: `npm run build`
Expected: Build ohne Fehler

- [ ] **Step 3: Manueller E2E-Durchlauf (Esketamin, mobile Breite ~390 px)**

1. Happy Path: Esketamin → Schmerz → m/45 J/70 kg + „keine Dauermedikation" → alle KI „Nein" → Aufklärung fähig+erteilt → i.v., 50 mg/2 ml-Prep → 9 mg / 0,9 ml + Rechenweg → 6× Ja → Doku vollständig.
2. Stopp-Pfad: absoluter KI-Punkt „Ja" → roter Block, kein Weiter.
3. Dauermed-Pfad: MedScan „Theophyllin" suchen → Medigabe Schritt 3 übernimmt → Schritt 4 rote Karte + Hervorhebung; „Metoprolol" → gelbe Vorsicht-Karte mit Abwäge-Haken.
4. Modulwechsel-Pfad: in Schritt 3 „Scannen" → MedScan → zurück → State erhalten.
5. Altersgrenze: 8 kg → Block in Schritt 3.

- [ ] **Step 4: Umlaut-Scan über neue Dateien**

Run: `grep -rn "ae\|oe\|ue" src/modules/medigabe/ --include="*.jsx" --include="*.js" | grep -v "neue\|Aufkl"` — manuell sichten: keine ae/oe/ue-Ersatzschreibungen in UI-Texten.

- [ ] **Step 5: Abschluss-Commit (falls Fixes anfielen)**

```bash
git add -A && git commit -m "fix(medigabe): Feinschliff aus E2E-Durchlauf"
```

---

## Phase 2 (separater Lauf, nicht Teil dieses Plans)

Die übrigen 28 Medikamente als `dosing.json`-Einträge — je Eintrag: PDF-Seite lesen (S. 43–71), Daten strukturieren, `verifiziert` setzen, Praxis-Verdünnungsschemata sammeln und vom Nutzer freigeben lassen (`freigegeben: true`), Schema-Test läuft automatisch mit. Kein Code-Umbau nötig (`fixMg`, `stufen`, `maxMgAbsolut` sind implementiert und getestet).
