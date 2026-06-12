# Medigabe V3 — Restliche 27 Medikamente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Daten-Tasks sind batch-weise; JEDER Eintrag wird gegen die PDF-Seite verifiziert (Read mit pages auf /Users/matthiasf/Downloads/saa_bpr_2025.pdf). Spec: docs/superpowers/specs/2026-06-10-medigabe-saa-design.md.

**Goal:** Alle 29 SAA-Medikamente in `dosing.json` — vollständig, seitenverifiziert, mit praxisüblichen Verdünnungen (vom Nutzer freigegeben).

**Architecture:** Erst eine kleine Schema-/UI-Erweiterung (Einheiten ≠ mg, Darreichungen ohne ml-Rechnung), dann reine Daten-Batches à 3–4 Medikamente. Pro Batch: PDF-Seiten lesen → Einträge bauen → Schema-Test (läuft generisch mit) → Plausi-Rechnungen per node → Commit.

**Daten-Disziplin (Hard Rule):** Werte NUR von der PDF-Seite. Praxis-Verdünnungen NUR aus der Freigabe-Tabelle unten (`quelle: "praxis"`, im Commit erst nach Nutzer-Freigabe `freigegeben: true`). Nichts erfinden — fehlende Angaben bleiben weg (`repetition: null` etc.).

---

## Seitenverzeichnis

PDF ist alphabetisch; saa.json NICHT (Midazolam = Position 15, PDF-S. 61!).
Verifizierte Anker (Seiten gesehen): ASS 43, Amiodaron 44, Atropin 45,
Esketamin 50, GTN 55, Heparin 56, Ibuprofen 57, Ipratropium 58, Lidocain 59,
Metoprolol 60, Midazolam 61, Morphin 62. **Jeder Batch-Task MUSS den
Medikamentennamen im Seitenkopf gegen die erwartete Seite verifizieren —
bei Mismatch ±2 Seiten suchen, nie blind übernehmen.**

| S. | Medikament | Batch | | S. | Medikament | Batch |
|---|---|---|---|---|---|---|
| 43 | Acetylsalicylsäure | 1 | | 58 | Ipratropiumbromid | 4 |
| 44 | Amiodaron | 1 | | 59 | Lidocain | 5 |
| 45 | Atropin | 1 | | 60 | Metoprolol | 5 |
| 46 | Butylscopolamin | 2 | | 61 | Midazolam ✓ (Prep-Update B1) | — |
| 47 | Dimenhydrinat | 2 | | 62 | Morphin | 5 |
| 48 | Dimetinden | 2 | | 63 | Nalbuphin | 5 |
| 49 | Epinephrin (Adrenalin) | 2 | | 64 | Naloxon | 5 |
| 50 | Esketamin ✓ | — | | 65 | Paracetamol | 6 |
| 51 | Fentanyl | 3 | | 66 | Prednisolon | 6 |
| 52 | Furosemid | 3 | | 67 | Salbutamol | 6 |
| 53 | Glucagon | 3 | | 68 | Sauerstoff | 6 |
| 54 | Glucose | 3 | | 69 | Tranexamsäure | 6 |
| 55 | Glyceroltrinitrat | 4 | | 70 | Urapidil | 6 |
| 56 | Heparin | 4 | | 71 | Vollelektrolytlösung | 6 |
| 57 | Ibuprofen | 4 | | | | |

Sauerstoff/VEL: Einheiten l/min bzw. ml-Infusion — mit `einheit` +
`mgPerMl: null` abbilden; falls ein Eintrag sich nicht ehrlich ins Schema
fügt: NEEDS_CONTEXT melden statt Daten verbiegen.

---

## Batch 0 — Schema-/UI-Erweiterung (Code, einmalig, VOR den Daten)

1. **Darreichung ohne ml-Rechnung** (Tablette, Hub, Inhalation): `prep.mgPerMl: null` erlaubt; dann KEIN computeVolume, Ergebnis-Karte zeigt nur Dosis + `prep.ergebnis` (z. B. „Kautablette" / „1 Hub sublingual"); 6-R „Richtige Dosierung" ohne ml; Doku analog. Schema-Test: `mgPerMl > 0` ODER `null`.
2. **Einheiten ≠ mg:** `route.einheit` (Default `"mg"`; erlaubt `"µg"`, `"I.E."`, `"g"`, `"Hub"`). dose.js rechnet einheitenagnostisch (Zahlen bleiben Zahlen); UI ersetzt das „mg"-Label durch `einheit`, `mgPerMl`-Label „{einheit}/ml". Fentanyl-µg & Heparin-I.E. werden NICHT in mg umgerechnet — Anzeige in Originaleinheit (Verwechslungsschutz).
3. Tests: dose.test (einheit default), Schema-Test-Update, Step6/7/8-Anzeige manuell.

## Batch 1 — ASS (43), Amiodaron (44), Atropin (45) + Midazolam-Praxis-Prep

Seiten bereits gelesen und im Kontext verifiziert. Besonderheiten:
- ASS: i.v. 250 mg (500 mg + 5 ml Lösungsmittel = 100 mg/ml → 2,5 ml); oral 200 mg (Darreichung ohne ml); minAlter 18 J (216 Monate, „keine Anwendung durch NotSan < 18 J").
- Amiodaron: Stufen Kinder 5 mg/kg (max 300) / Erw. 300 mg fix; Ampulle 150 mg/3 ml (50 mg/ml) unverdünnt → Erw. 6 ml = 2 Ampullen; minAlter 36 Monate (Benzylalkohol); Repetition n. 5. Defi (Kinder max 150 mg / Erw. 150 mg) als Text.
- Atropin: fix 0,5 mg i.v.; zwei Ampullen (0,5 und 1 mg/ml) → Cave unterschiedliche Konzentrationen; Repetition bis Gesamtdosis 3 mg als Text; minAlter 18 J.
- Midazolam i.v.-Routen (beide Indikationen): zusätzliche Praxis-Prep „5 mg / 1 ml + 4 ml NaCl 0,9 % → 5 ml à 1 mg/ml" (vom Nutzer 2026-06-12 benannt → freigegeben).

## Batches 2–6 — je Subagent: Seiten lesen → Einträge → Plausi → Commit

Pro Batch-Task gilt: (a) `Read` der PDF-Seiten, Werte wörtlich übernehmen; (b) indikationsspezifische KI-Listen nur wenn die SAA scoped (wie Midazolam „bei Analgosedierung"); (c) Stufen-Engine nutzen (wennAlterUnter/-Ab, wennKgUnter/-Ab, stufeneigene repetition/hinweis); (d) Plausi-Check per node gegen 2–3 typische Patienten; (e) Schema-Test + Gesamtsuite grün; (f) Report listet JEDEN übernommenen Zahlenwert mit Seitenzitat. Controller macht Stichproben-Review gegen die Seite.

Bekannte Sonderfälle: Epinephrin (Rea 1:10-Verdünnung — siehe Tabelle; Anaphylaxie i.m. unverdünnt; ggf. Inhalation), Glucose (G20/G40, g-Einheit), GTN (Hub sublingual, keine ml), Heparin (I.E.), Ipratropium/Salbutamol (Inhalation), Fentanyl (µg).

## Praxis-Verdünnungen — Freigabe-Tabelle (Nutzer = Freigabeinstanz)

| Medikament | Ampulle | Zugabe | Ergebnis | Status |
|---|---|---|---|---|
| Midazolam i.v. | 5 mg / 1 ml | + 4 ml NaCl 0,9 % | 5 ml à 1 mg/ml | ✅ freigegeben (Nutzer, 2026-06-12) |
| Esketamin i.v. | 50 mg / 2 ml | + 3 ml NaCl 0,9 % | 5 ml à 10 mg/ml | ✅ freigegeben (Nutzer, 2026-06-10) |
| Morphin i.v. | 10 mg / 1 ml | + 9 ml NaCl 0,9 % | 10 ml à 1 mg/ml | 🟡 VORSCHLAG — Freigabe ausstehend |
| Epinephrin i.v. (Rea) | 1 mg / 1 ml | + 9 ml NaCl 0,9 % | 10 ml à 0,1 mg/ml | 🟡 VORSCHLAG — Freigabe ausstehend |
| Naloxon i.v. | 0,4 mg / 1 ml | + 3 ml NaCl 0,9 % | 4 ml à 0,1 mg/ml | 🟡 SAA-Seite 64 nennt sie NICHT (nur BPR-Karte S. 42) → wie Praxis-Schema behandeln, Freigabe ausstehend; bis dahin unverdünnt (0,1 mg = 0,25 ml) |
| Fentanyl / Urapidil / Metoprolol / Amiodaron (Rea) / Atropin | — | unverdünnt | — | kein Schema nötig |

Vorschläge werden erst nach Chat-Freigabe mit `freigegeben: true` committet; bis dahin bleiben die Routen auf den unverdünnten SAA-Preps nutzbar.

## Verifikation (nach letztem Batch)

Alle 29 im Schritt-1-Grid wählbar (kein „folgt" mehr) · Schema-Test grün über 29 Einträge · Browser-Stichproben: ASS i.v. 2,5 ml; Amiodaron Kind 20 kg → 100 mg = 2 ml; GTN 1 Hub ohne ml; Heparin in I.E.; Kombi-Regression Esketamin+Midazolam · Umlaut-Scan.
