# Medigabe V2 — Midazolam, Sammel-Bestätigung, Kombi-Gabe — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax. Spec: docs/superpowers/specs/2026-06-10-medigabe-saa-design.md, Abschnitt „V2".

**Goal:** Midazolam als zweites Medikament (alle 4 Routen + 2 Indikationen mit eigenen KI-Listen), Ein-Klick-Sammel-Bestätigung im KI-Schritt, Mehrfach-Gabe (1–3 Medikamente in einem Wizard-Durchlauf, z. B. Esketamin + Midazolam Analgosedierung).

**Architecture:** Abwärtskompatible Schema-Erweiterung (`dosing.json`: KI-Override + minKg pro Indikation, `minAlterMonate`, Stufen mit kg-/Alter-Bedingungen + eigener Repetition). Wizard-State: `medId/indId/dosier/sechsR` → `gaben[]`-Array (Einzelgabe = 1 Eintrag). KI-Schritt merged Punktlisten aller Gaben dedupliziert per `normKey(text)`.

**Tech Stack:** wie V1 (React 18, Vite, Tailwind v4, Vitest). Bestehende Dateien: `src/modules/medigabe/` (lib/dose.js, lib/ki.js, lib/wizard.js, components/Step1–8, Medigabe.jsx), `src/lib/{caseMeds,saaMatrix}.js`.

**Nutzerentscheidungen (bindend):** Freie Mehrfachauswahl (max. 3). Sammel-Button setzt ausnahmslos ALLE Ja/Nein-Punkte der Sektion auf „Nein" — auch hervorgehobene. Dauermed-Abwäge-Haken bleiben einzeln.

---

## Referenz: Verträge V2

```js
// dose.js — erweitert, abwärtskompatibel:
computeDose({ dosis, kg, alterJahre, maxMgProKg, maxMgAbsolut })
// → { mg, maxMg, gekappt, schritte[], stufe }   // stufe = gewählte Stufe (Objekt) oder null
// Stufen-Bedingungen (UND-verknüpft, erste passende gewinnt, letzte = Default):
//   { wennAlterUnter?, wennAlterAb?, wennKgUnter?, wennKgAb?, fixMg|mgProKg, maxMgAbsolut?, repetition?, hinweis? }

// Wizard-State V2 (lib/wizard.js):
{
  step: 1,
  gaben: [],            // [{ medId, indId, dosier: { weg, prep }, sechsR: {} }]
  patient: { geschlecht, alter, alterEinheit, kg, dauerStatus },
  ki: {},               // Keys: "a:<normKey(text)>", "r:<normKey(text)>", "m:<normKey(med)>"
  aufkl: { items, faehig, einwilligung, mutmasslich },
  durchf: {},
  freigabeZeit: null,
  medsFingerprint: null,
}

// ki.js — erweitert:
kiPunkte({ gaben, saaById, dosingById })
// → { abs: [{ text, meds: [name…] }], rel: [{ text, meds: [name…] }] }
// Quelle pro Gabe: indikation.kontra/relKontra (Override) ?? saaEntry.kontra/relKontra;
// Dedupe per normKey(text), meds[] sammelt die Namen aller betroffenen Medikamente.
dauermedRowsMulti({ meds, matrix, saaEntries })
// → [{ med, level: höchstes über alle saaEntries, gruende: [{ medName, level, reason }], pending }]
kiOutcome({ answers, absKeys, relKeys, flaggedMeds })   // Keys statt Zählern (V2-Signatur!)
```

Indikations-Gates (Schritt 3): `minKg` gilt von Eintrag UND Indikation (strengster Wert); `minAlterMonate` vom Eintrag. Bei Mehrfach-Gabe gelten die strengsten Grenzen aller Gaben.

---

### Task A1: Stufen-Engine erweitern (TDD)

**Files:** Modify `src/modules/medigabe/lib/dose.js` · Test: `tests/medigabe-dose.test.js` (erweitern)

- [ ] **Step 1: Failing Tests ergänzen** (ans Ende der Datei):

```js
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
```

- [ ] **Step 2: Roter Lauf** — `npx vitest run tests/medigabe-dose.test.js` → neue Tests FAIL (stufe undefined / falsche Stufenwahl).
- [ ] **Step 3: Implementierung** — `resolveStufe` ersetzen und `computeDose` anpassen:

```js
// Löst dosis.stufen anhand Alter UND Gewicht auf (Bedingungen UND-verknüpft,
// erste passende Stufe gewinnt, letzte Stufe = Default).
function stufePasst(s, alterJahre, kg) {
  if (s.wennAlterUnter != null && !(alterJahre != null && alterJahre < s.wennAlterUnter)) return false;
  if (s.wennAlterAb != null && !(alterJahre != null && alterJahre >= s.wennAlterAb)) return false;
  if (s.wennKgUnter != null && !(kg != null && kg < s.wennKgUnter)) return false;
  if (s.wennKgAb != null && !(kg != null && kg >= s.wennKgAb)) return false;
  return true;
}
function resolveStufe(dosis, alterJahre, kg) {
  if (!Array.isArray(dosis.stufen)) return { d: dosis, stufe: null };
  for (const s of dosis.stufen) {
    if (stufePasst(s, alterJahre, kg)) return { d: s, stufe: s };
  }
  const last = dosis.stufen[dosis.stufen.length - 1];
  return { d: last, stufe: last };
}
```

In `computeDose`: `const { d, stufe } = resolveStufe(dosis, alterJahre, kg);` und Rückgabe `return { mg, maxMg, gekappt, schritte, stufe };`

- [ ] **Step 4: Grüner Lauf** — alle Tests (alte 13 + neue 6) grün. Beachte: Der bestehende Test „stufen ohne alterJahre → letzte Stufe" muss weiter grün sein (Default-Verhalten unverändert).
- [ ] **Step 5: Commit** `feat(medigabe): Stufen-Engine V2 — kg-/Alter-Bedingungen, Stufen-Repetition (TDD)`

---

### Task A2: Midazolam-Daten + Schema-Test-Erweiterung

**Files:** Modify `src/modules/medigabe/data/dosing.json` · Modify `tests/medigabe-dosing-schema.test.js`

- [ ] **Step 1: Schema-Test erweitern** (im Routen-Loop des bestehenden Tests):

```js
            // V2: Stufen-Felder validieren
            if (Array.isArray(d.stufen)) {
              expect(d.stufen.length).toBeGreaterThan(0);
              const last = d.stufen[d.stufen.length - 1];
              expect(last.wennAlterUnter == null && last.wennKgUnter == null).toBe(true); // Default-Stufe
              for (const s of d.stufen) expect(s.fixMg != null || s.mgProKg != null).toBe(true);
            }
```

Und im Indikationen-Loop:

```js
          // V2: optionale KI-Overrides + minKg pro Indikation
          if (ind.kontra) { expect(Array.isArray(ind.kontra)).toBe(true); expect(ind.kontra.length).toBeGreaterThan(0); for (const k of ind.kontra) expect(typeof k).toBe("string"); }
          if (ind.relKontra) { expect(Array.isArray(ind.relKontra)).toBe(true); for (const k of ind.relKontra) expect(typeof k).toBe("string"); }
          if (ind.minKg != null) expect(typeof ind.minKg).toBe("number");
```

Und im Eintrag-Test: `if (e.minAlterMonate != null) expect(typeof e.minAlterMonate).toBe("number");`

- [ ] **Step 2: Midazolam-Eintrag anfügen** (Werte verifiziert gegen SAA 2025 **S. 61** — exakt übernehmen):

```json
{
  "id": "saa:midazolam",
  "saaSeite": 61,
  "verifiziert": "2026-06-10",
  "minAlterMonate": 3,
  "minAlterHinweis": "Keine Anwendung bei Pat. < 3 Monate",
  "indikationen": [
    {
      "id": "krampf",
      "label": "Komplizierter Krampfanfall / Fieberkrampf",
      "kontra": [
        "Überempfindlichkeit gegen den Wirkstoff",
        "Primär hypoxisch bedingter Krampfanfall"
      ],
      "relKontra": [],
      "routen": [
        {
          "weg": "buccal",
          "dosis": { "stufen": [
            { "wennAlterUnter": 1, "fixMg": 2.5, "repetition": "Keine Repetition" },
            { "wennAlterUnter": 5, "fixMg": 5, "repetition": "Keine Repetition" },
            { "wennAlterUnter": 10, "fixMg": 7.5, "repetition": "Einmalige Repetition möglich" },
            { "fixMg": 10, "repetition": "Einmalige Repetition möglich" }
          ] },
          "preps": [
            { "ampulle": "Buccolam Fertigspritze (5 mg/ml)", "zugabe": null, "ergebnis": "unverdünnt (5 mg/ml) buccal", "mgPerMl": 5, "quelle": "saa", "freigegeben": true }
          ],
          "hinweise": ["Antikonvulsive Therapie: adäquat hohe Dosierung erforderlich, nicht titrieren"]
        },
        {
          "weg": "nasal (MAD)",
          "dosis": { "stufen": [
            { "wennKgUnter": 10, "fixMg": 2.5, "repetition": "Repetition erst bei Kindern > 10 kgKG" },
            { "wennKgUnter": 20, "fixMg": 5, "repetition": "Einmalige Repetition möglich" },
            { "fixMg": 10, "repetition": "Einmalige Repetition möglich" }
          ] },
          "preps": [
            { "ampulle": "5 mg/ml (zur i.n.-Gabe)", "zugabe": null, "ergebnis": "unverdünnt (5 mg/ml) — max. 1 ml = 5 mg pro Nasenloch", "mgPerMl": 5, "quelle": "saa", "freigegeben": true }
          ],
          "hinweise": ["Nasal per MAD ab dem 3. Lebensmonat"]
        },
        {
          "weg": "i.v.",
          "dosis": { "mgProKg": 0.1 },
          "maxMgProKg": null,
          "maxMgAbsolut": 20,
          "repetition": "Einmalige Repetition möglich (Erwachsene, Maximaldosis 20 mg); Kinder max. 1 × Repetition",
          "preps": [
            { "ampulle": "1 mg/ml (zur i.v.-Gabe)", "zugabe": null, "ergebnis": "unverdünnt (1 mg/ml)", "mgPerMl": 1, "quelle": "saa", "freigegeben": true }
          ],
          "hinweise": []
        },
        {
          "weg": "i.m.",
          "dosis": { "fixMg": 10 },
          "repetition": "Einmalige Repetition möglich, Maximaldosis 20 mg",
          "preps": [
            { "ampulle": "5 mg/ml (zur i.m.-Gabe)", "zugabe": null, "ergebnis": "unverdünnt (5 mg/ml)", "mgPerMl": 5, "quelle": "saa", "freigegeben": true }
          ],
          "hinweise": ["Erwachsene: 10 mg i.m."]
        }
      ]
    },
    {
      "id": "analgosedierung",
      "label": "Analgosedierung (in Kombination mit Esketamin)",
      "minKg": 10,
      "minKgHinweis": "Bei Analgosedierung keine Anwendung bei Pat. < 10 kgKG (ca. 12 Monate)",
      "kontra": [
        "Überempfindlichkeit gegen den Wirkstoff",
        "Schwere Bewusstseinsstörung – Sopor, Koma",
        "Intoxikation mit psychoaktiven Substanzen, Alkohol, Opioiden",
        "Atemdepression",
        "Myasthenia gravis",
        "Obstruktive Schlafapnoe (OSAS)",
        "Schwangerschaft"
      ],
      "relKontra": [
        "Bewusstseinsstörung – Somnolenz",
        "Chronisch-respiratorische Insuffizienz",
        "Schwere Leber- und / oder Nierenfunktionsstörung",
        "Schwere Herzinsuffizienz (ab Klasse NYHA III)",
        "Pat. unter akutem Alkoholeinfluss, zentral dämpfenden oder psychotropen Substanzen in der Anamnese"
      ],
      "routen": [
        {
          "weg": "i.v. (langsam)",
          "dosis": { "stufen": [
            { "wennAlterAb": 60, "fixMg": 1, "hinweis": "Pat. > 60 Jahre und / oder < 50 kgKG und / oder mit einschränkenden Krankheiten: 1 mg langsam i.v." },
            { "wennKgUnter": 50, "fixMg": 1, "hinweis": "Pat. < 50 kgKG (inkl. Kinder > 10 kgKG): 1 mg langsam i.v." },
            { "fixMg": 2 }
          ] },
          "repetition": "Gemäß Wirkung, langsam titrieren",
          "preps": [
            { "ampulle": "1 mg/ml (zur i.v.-Gabe)", "zugabe": null, "ergebnis": "unverdünnt (1 mg/ml)", "mgPerMl": 1, "quelle": "saa", "freigegeben": true }
          ],
          "hinweise": ["Langsam i.v. injizieren"]
        }
      ]
    }
  ],
  "cave": [
    "Unterschiedliche Konzentrationen verfügbar (1 mg/ml i.v.; 5 mg/ml i.n./i.m./buccal)"
  ]
}
```

ACHTUNG Daten-Disziplin: `"repetition": "Gemäß Wirkung, langsam titrieren"` bei Analgosedierung ist NICHT aus der SAA (dort keine explizite Repetitionsangabe) → stattdessen `"repetition": null` setzen und im Schema-Test `repetition` optional lassen. Kein erfundener Text.

- [ ] **Step 3:** `npx vitest run tests/medigabe-dosing-schema.test.js` → PASS (jetzt 2 Einträge validiert). Esketamin in Schritt 1 nicht mehr allein: Step1Medikament zeigt Midazolam automatisch als wählbar (READY-Gate greift, alle preps freigegeben).
- [ ] **Step 4: Commit** `feat(medigabe): Midazolam-Dosisdaten (SAA S.61) — 2 Indikationen, 4 Routen, KI-Overrides`

---

### Task A3: Indikations-Gates + KI-Override + Stufen-Anzeige (Einzelgabe)

**Files:** Modify `src/modules/medigabe/Medigabe.jsx`, `components/Step4Kontra.jsx`, `components/Step6Dosierung.jsx`, `lib/ki.js` · Test: `tests/medigabe-ki.test.js`

- [ ] **Step 1 (TDD): kiQuellen-Helfer in ki.js** — Test zuerst:

```js
describe("kiListen (Indikations-Override)", () => {
  const saaEntry = { id: "x", kontra: ["A", "B"], relKontra: ["R"] };
  it("nutzt Indikations-Listen, wenn vorhanden", () => {
    const ind = { kontra: ["Nur K1"], relKontra: [] };
    expect(kiListen(saaEntry, ind)).toEqual({ kontra: ["Nur K1"], relKontra: [] });
  });
  it("fällt auf saa.json zurück, wenn Indikation keine Listen definiert", () => {
    expect(kiListen(saaEntry, {})).toEqual({ kontra: ["A", "B"], relKontra: ["R"] });
  });
});
```

Implementierung in ki.js:

```js
// KI-Punktquellen einer Gabe: Indikations-Override (SAA scoped Listen, z. B.
// Midazolam „bei Analgosedierung") — sonst die globalen saa.json-Listen.
export function kiListen(saaEntry, ind) {
  return {
    kontra: ind?.kontra ?? saaEntry.kontra ?? [],
    relKontra: ind?.relKontra ?? saaEntry.relKontra ?? [],
  };
}
```

- [ ] **Step 2: Medigabe.jsx + Step4Kontra auf kiListen umstellen** — überall, wo `saaEntry.kontra`/`saaEntry.relKontra` für Schritt 4 verwendet wird, `kiListen(saaEntry, ind)` nutzen (Antwort-Keys bleiben Index-basiert `a:i`/`r:i` — Umstellung auf Text-Keys kommt erst in C3).
- [ ] **Step 3: Schritt-3-Gates erweitern** (Medigabe.jsx): wirksames `minKg = max(eintrag.minKg ?? 0, ind.minKg ?? 0)` (Hinweistext der strengeren Quelle); `minAlterMonate`: Block analog minKg, wenn `alterJahre * 12 < minAlterMonate`. Step3Patient bekommt zusätzlich `minAlterMonate`/`minAlterHinweis`-Props (gleiche rote Karte wie minKg).
- [ ] **Step 4: Schritt 6 Stufen-Anzeige** (Step6Dosierung.jsx): Wenn `dose.stufe` gesetzt: `dose.stufe.repetition` hat Vorrang vor `route.repetition`; `dose.stufe.hinweis` als zusätzliche Zeile. `route.repetition === null` → Zeile weglassen.
- [ ] **Step 5:** `npx vitest run` + `npm run build` grün · Manuell (dev-Server): Midazolam → Krampf zeigt NUR 2 absolute KI; Analgosedierung zeigt 7 + 5 und blockt < 10 kg; buccal 4-Jähriger → 5 mg = 1 ml, „Keine Repetition".
- [ ] **Step 6: Commit** `feat(medigabe): Indikationsspezifische KI-Listen, minAlter-Gate, Stufen-Repetition`

---

### Task B1: Sammel-Bestätigung im KI-Schritt

**Files:** Modify `components/Step4Kontra.jsx`

- [ ] **Step 1:** Pro Ja/Nein-Sektion (absolut, relativ) ein Sammel-Button im Sektionskopf:

```jsx
<button
  type="button"
  onClick={onAlleNein /* setzt answers für ALLE Keys der Sektion auf "nein" in EINEM patch */}
  className="ml-auto h-9 px-3 rounded-lg border border-success/40 bg-success/5 text-success text-xs font-medium hover:bg-success/10 transition-colors"
>
  Keine liegt vor — alle „Nein"
</button>
```

WICHTIG (Lost-Update-Lektion aus V1): `onAlleNein` muss EIN `patchWizard` mit allen Keys sein — Callback via Medigabe.jsx `onAnswerMany(patch)`: `patchWizard({ ki: { ...getWizard().ki, ...patch } })`. Setzt ausnahmslos alle Punkte der Sektion (Nutzerentscheidung), einzelne danach umschaltbar. Dauermed-Haken unverändert einzeln.

- [ ] **Step 2:** Manuell: Ein Klick → alle Nein (grün), Weiter aktiv (wenn Dauermed ok); einzelner Punkt danach auf „Ja" umschaltbar → Stopp/Confirm greift normal.
- [ ] **Step 3: Commit** `feat(medigabe): Sammel-Bestätigung „Keine liegt vor" je KI-Sektion`

---

### Task C1: Wizard-State auf gaben[] (TDD)

**Files:** Modify `lib/wizard.js` · Test `tests/medigabe-wizard.test.js`

- [ ] **Step 1: Tests anpassen/ergänzen** (Initial-Shape: `gaben: []` statt medId/indId/dosier/sechsR; Helper):

```js
it("startet mit leerem gaben-Array", () => {
  const w = getWizard();
  expect(w.gaben).toEqual([]);
  expect(w.medId).toBeUndefined();
});
it("patchGabe aktualisiert genau eine Gabe (immutable)", () => {
  patchWizard({ gaben: [{ medId: "a", indId: null, dosier: { weg: null, prep: null }, sechsR: {} }, { medId: "b", indId: null, dosier: { weg: null, prep: null }, sechsR: {} }] });
  patchGabe(1, { indId: "x" });
  expect(getWizard().gaben[1].indId).toBe("x");
  expect(getWizard().gaben[0].indId).toBeNull();
});
```

- [ ] **Step 2: Implementierung** — initial: `gaben: []`; neuer Export:

```js
// Aktualisiert eine Gabe immutable; verschachtelte Felder (dosier, sechsR) spreaden Caller.
export function patchGabe(index, patch) {
  state = { ...state, gaben: state.gaben.map((g, i) => (i === index ? { ...g, ...patch } : g)) };
  emit();
}
```

- [ ] **Step 3: Commit** `feat(medigabe): Wizard-State V2 — gaben[] statt Einzel-Medikament (TDD)`

---

### Task C2: Schritt 1 Mehrfachauswahl + Schritt 2 pro Gabe

**Files:** Modify `components/Step1Medikament.jsx`, `components/Step2Indikation.jsx`, `Medigabe.jsx`

- [ ] **Step 1: Step1** — `value` → `values: string[]`, Toggle-Verhalten (an/abwählen, max. 3, Auswahl-Reihenfolge bewahren), Badge „n gewählt" optional. onToggle(medId) statt onPick.
- [ ] **Step 2: Medigabe.jsx Schritt 1** — onToggle baut `gaben` neu: bestehende Gabe behalten (State-Erhalt beim Abwählen ANDERER Medis), neue mit `{ medId, indId: null, dosier: { weg: null, prep: null }, sechsR: {} }`; bei JEDER Auswahländerung: `ki: {}`, `aufkl`-Reset, `freigabeZeit: null` (Downstream-Reset wie V1). CTA: `Weiter (n Medikamente)` disabled bei 0.
- [ ] **Step 3: Schritt 2** — pro Gabe eine Sektion mit Medikamenten-Überschrift; Auto-Skip entfällt (auch Einzelgabe zeigt die Liste); `onPick(gIndex, indId)` → `patchGabe(gIndex, { indId, dosier: { weg: null, prep: null }, sechsR: {} })` + `freigabeZeit: null`. Weiter erst, wenn ALLE Gaben eine Indikation haben.
- [ ] **Step 4:** Kontext-Chips: alle Medikamentennamen + gewählte Indikationen.
- [ ] **Step 5:** Tests/Build grün; manuell: Esketamin + Midazolam wählbar, Schritt 2 zeigt 2 Sektionen. Einzelgabe (nur Esketamin) verhält sich wie V1.
- [ ] **Step 6: Commit** `feat(medigabe): Mehrfachauswahl + Indikation pro Gabe`

---

### Task C3: Schritt 4 gemergte KI-Listen (TDD) + Schritt 3 strengste Gates

**Files:** Modify `lib/ki.js`, `components/Step4Kontra.jsx`, `Medigabe.jsx` · Test `tests/medigabe-ki.test.js`

- [ ] **Step 1 (TDD): kiPunkte + dauermedRowsMulti + kiOutcome-V2** — Tests:

```js
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
});
describe("kiOutcome V2 (Key-Listen)", () => {
  it("stop/confirm/complete über Text-Keys", () => {
    const absKeys = ["a:k1", "a:k2"]; const relKeys = ["r:r1"];
    expect(kiOutcome({ answers: { "a:k1": "nein", "a:k2": "ja", "r:r1": "nein" }, absKeys, relKeys, flaggedMeds: [] }).stop).toBe(true);
    expect(kiOutcome({ answers: { "a:k1": "nein" }, absKeys, relKeys, flaggedMeds: [] }).complete).toBe(false);
  });
});
describe("dauermedRowsMulti", () => {
  it("höchstes Level über alle Gaben, Begründungen pro Medikament", () => {
    const matrix = { theophyllin: { flags: [
      { saaId: "saa:esketamin", level: "absolut", reason: "KI bei Esketamin" },
      { saaId: "saa:midazolam", level: "vorsicht", reason: "Vorsicht bei Midazolam" },
    ] } };
    const rows = dauermedRowsMulti({ meds: ["Theophyllin"], matrix, saaEntries: [
      { id: "saa:esketamin", name: "Esketamin", kontra: [], relKontra: [] },
      { id: "saa:midazolam", name: "Midazolam", kontra: [], relKontra: [] },
    ] });
    expect(rows[0].level).toBe("absolut");
    expect(rows[0].gruende).toHaveLength(2);
  });
});
```

Implementierung (ki.js): `kiPunkte(gaben)` nutzt `kiListen` pro Gabe, Map per `normKey(text)`, Key-Format `a:<normKey>`/`r:<normKey>`; `dauermedRowsMulti` ruft aggregateCheck pro Med gegen ALLE saaEntries, nimmt höchstes Level (Rang ok<vorsicht<absolut), `gruende` = Treffer je saaEntry; `kiOutcome({answers, absKeys, relKeys, flaggedMeds})` iteriert Key-Listen statt Indizes (Semantik unverändert: stop überwiegt confirm; Dauermed-Haken → confirm).

MIGRATION: Die bestehenden kiOutcome-Tests (nAbs/nRel-Signatur) auf absKeys/relKeys umstellen — gleiche Fälle, Keys statt Zähler (z. B. nAbs: 2 → absKeys: ["a:0","a:1"]). `dauermedRows` (Singular) bleibt für Übergang erhalten, bis Step 2 den letzten Caller umstellt — danach entfernen (kein toter Export).

- [ ] **Step 2: Step4Kontra umbauen** — Props: `{ punkte: { abs, rel }, dauermedRows, patient, answers, onAnswer, onAnswerMany }`; JaNeinRow-Text mit Med-Badges (`punkt.meds.length > 1` oder immer bei Kombi: kleine neutrale Badges je Medikament); Antwort-Keys = Punkt-Keys; Sammel-Buttons aus B1 arbeiten auf den Key-Listen; Dauermed-Sektion rendert `gruende` (eine Zeile pro Medikament-Begründung). kontraMatchIndex-Highlight: über `abs`-Punkte (Index in der gemergten Liste).
- [ ] **Step 3: Medigabe.jsx Schritt 4** — gaben → `{saaEntry, ind}`-Paare; kiPunkte/dauermedRowsMulti/kiOutcome-V2 verdrahten. Schritt-3-Gates: strengstes minKg/minAlter über alle Gaben (Hinweis nennt das auslösende Medikament).
- [ ] **Step 4:** Tests/Build grün. Manuell: Esketamin+Midazolam(Analgosedierung): „Überempfindlichkeit…"-artige Duplikate erscheinen einmal mit 2 Badges; Sopor/Koma einmal (beide listen es); Sammel-Button setzt alles.
- [ ] **Step 5: Commit** `feat(medigabe): Schritt 4 V2 — gemergte KI-Listen mit Med-Badges (TDD)`

---

### Task C4: Schritte 6–8 pro Gabe

**Files:** Modify `components/Step6Dosierung.jsx`, `components/Step7SechsR.jsx`, `components/Step8Doku.jsx`, `Medigabe.jsx`

- [ ] **Step 1: Schritt 6** — Medigabe.jsx rendert pro Gabe eine Sektion (Überschrift = Medikamentenname) mit bestehender Step6Dosierung (Props ind/cave/patient/dosier + onPatch → `patchGabe(i, { dosier: … , sechsR: {} })` + `freigabeZeit: null`). Weiter, wenn ALLE Gaben weg+prep haben.
- [ ] **Step 2: Schritt 7** — pro Gabe ein 6-R-Block (Überschrift Medikament, sechsRItems wie gehabt mit deren dose/vol); Freigabe-Button, wenn ALLE Blöcke voll (6 × n Haken). freigabeZeit einmal.
- [ ] **Step 3: Schritt 8** — Doku-Zusammenfassung: Patient/Aufklärung-Zeilen einmal, dann pro Gabe Block (Medikament, Indikation, Dosis, Lösung, Repetition: Stufen-Repetition falls vorhanden); UAW vereinigt über Gaben (je Medikament eine Zeile). „Neuer Patient" unverändert.
- [ ] **Step 4: Wächter prüfen** — medsFingerprint-Wächter resettet `gaben[*].sechsR` (alle) + Schritt ≤ 3; Patient-Änderung ebenso (Medigabe.jsx Patch-Stellen anpassen: `gaben: getWizard().gaben.map((g) => ({ ...g, sechsR: {} }))`).
- [ ] **Step 5:** Tests/Build grün.
- [ ] **Step 6: Commit** `feat(medigabe): Schritte 6–8 pro Gabe — Dosierung, 6-R-Blöcke, Sammel-Doku`

---

### Task C5: Gesamtverifikation V2 (Browser-E2E)

- [ ] `npx vitest run` + `npm run build` grün; Umlaut-Scan neue Strings.
- [ ] E2E (Preview, mobile + desktop):
  1. **Einzelgabe-Regression:** Esketamin-Happy-Path wie V1 (9 mg/0,9 ml) — unverändert.
  2. **Midazolam einzeln:** Krampf, Kind 4 J/18 kg, buccal → 5 mg = 1 ml, „Keine Repetition"; nur 2 absolute KI sichtbar. Analgosedierung 8 kg → minKg-Block.
  3. **Kombi:** Esketamin (Schmerz) + Midazolam (Analgosedierung), 70 kg/45 J → Schritt 4 gemergt (Duplikate einmal, Badges), Sammel-Button, Schritt 6 zwei Sektionen (8,75→9 mg/0,9 ml + 2 mg/2 ml), Schritt 7 zwölf Haken, Doku mit beiden Gaben.
  4. **Kombi-Grenzfall:** 72 J/80 kg → Midazolam Analgosedierung 1 mg (Stufen-Hinweis sichtbar).
  5. **Wächter:** Kombi bis Schritt 7, MedScan-Mutation → zurück auf Schritt 3, alle 6-R weg.
- [ ] Commit ggf. `fix(medigabe): Feinschliff V2-E2E`

---

## Nicht-Ziele V2 (YAGNI)

Keine Kombi-Presets, keine Kombi-spezifischen Warnkarten (z. B. Metoprolol+Nitrat) — Phase 3 zusammen mit restlichen Medikamenten. Keine Doku-Export-Funktion.
