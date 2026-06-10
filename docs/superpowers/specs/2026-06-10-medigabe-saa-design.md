# Medigabe nach SAA — Design

**Datum:** 2026-06-10 · **Status:** Entwurf zur Review
**Quelle:** SAA und BPR 2025 (6-Länder-AG, Stand 30.04.2025), insb. S. 41 „Standardvorgehen bei Medikamentengabe"

## Ziel

Geführter Wizard, der NotSan strukturiert und schnell durch eine SAA-konforme
Medikamentengabe führt: Medikament → Indikation → Patient → Kontraindikationen →
Aufklärung/Einwilligung → Dosierung (inkl. Vorbereitung/Aufziehen) → 6-R-Regel →
Durchführung/Doku. Nur die 29 SAA-Medikamente, nur deren offizielle Indikationen.
Einsatz aktiv im Rettungsdienst → jeder Schritt in Sekunden bedienbar,
Touch-Targets ≥ 56 px, offline-fähig.

## Modul & Integration

- Neues Modul `src/modules/medigabe/` mit eigenem `mode: "medigabe"`.
- Dritte Kachel auf dem HomeScreen („Medigabe", Tag „Durchführen"),
  Eintrag in `BottomTabBar`/`DesktopSidebar` analog MedScan/Übergabe.
- Wiederverwendet:
  - `src/modules/lexikon/data/saa.json` — 29 Medikamente (Indikationen, kontra,
    relKontra, alter, uaw, besonderheiten).
  - `aggregateCheck()` aus `lexikon/lib/saaCheck.js` + `saa-matrix.json`
    (678 Substanzen) für den Auto-Abgleich Dauermedikation, gefiltert auf das
    gewählte Medikament.
  - UI-Bausteine `lexikon/components/ui/*` (Button, Badge, SlideOver, icons).
- Kein Backend-Bedarf: alles offline; Matrix-Nachberechnung unbekannter Medis
  läuft wie bisher fire-and-forget über `triggerMatrixCompute()`.

### Geteilte Einsatz-Medikationsliste `src/lib/caseMeds.js`

Kleiner Shared-Store (nur im Speicher, kein localStorage — PII-frei bleiben):
hält die Dauermedikation des aktuellen Patienten als eine Quelle der Wahrheit
für beide Module, mit Subscribe-API (`useSyncExternalStore`).

- **MedScan** schreibt seine `planEntries` (Scan-/Such-Ergebnisse) durch und
  hydriert sich beim Mount daraus → Liste überlebt Modulwechsel (Fix eines
  bestehenden Mankos).
- **Medigabe** liest dieselbe Liste in Schritt 3 und kann Einträge ergänzen
  (Texteingabe mit Lookup) oder entfernen.
- „Neuer Patient"-Reset leert die Liste (Schutz vor veralteten Daten des
  vorherigen Einsatzes).

## Flow (8 Schritte)

Ein Wizard, ein Schritt pro Screen, Fortschrittsbalken, Kontext-Chip
(gewähltes Medikament · Indikation · Patient) immer sichtbar. Zurück jederzeit;
Schritte validieren vor „Weiter".

1. **Medikament** — Grid der 29 SAA-Medis (Suche + Favoriten oben).
   Nur Medis mit vorhandenem, freigegebenem Dosierungs-Datensatz wählbar;
   übrige ausgegraut mit „folgt".
2. **Indikation** — nur die offiziellen Indikationen des gewählten Medikaments
   (aus `saa.json`/`dosing.json`). Genau eine wählbar.
3. **Patient** — Geschlecht (m/w/d), Alter (Jahre; Säugling in Monaten),
   Gewicht in kg (Zahlenfeld + Schnell-Chips 50/60/70/80/90/100; bei Kind
   Ableitung-Hinweis). Dauermedikation, genau einer von zwei Wegen (Pflicht,
   aktive Bestätigung — Checklisten-Charakter):
   - **Liste bestätigen:** Einträge aus der geteilten Einsatzliste
     (`caseMeds`) werden mit Herkunft „aus MedScan" angezeigt und müssen
     explizit per „Übernehmen" bestätigt werden (kein stilles Übernehmen —
     Schutz vor Daten des vorherigen Patienten). Ergänzen per Texteingabe
     mit Lookup; **„Scannen"/„Suchen"-Buttons** springen ins MedScan-Modul
     (Scanner- bzw. Suche-Tab); der Wizard-State lebt im Modul-Store und
     überlebt den Modulwechsel — zurück in Medigabe ist die Liste via
     `caseMeds` aktualisiert.
   - **„Keine Dauermedikation"**-Chip (dokumentierte Negativ-Angabe);
     nur wählbar, wenn die Liste leer ist bzw. verworfen wurde.
   Plausibilitätsgrenzen: Gewicht 1–250 kg, Alter 0–120; Altersgrenze des
   Medikaments (`minKg`/`minAlter`) blockt hier sofort mit Begründung.
4. **Kontraindikationen** — drei Abschnitte:
   1. **„Absolut ausschließen"** (kontra aus `saa.json`) — jeder Punkt aktiv
      verneinen (Haken = „liegt NICHT vor").
   2. **„Relativ abwägen"** (relKontra) — dito.
   3. **„Dauermedikation"** (neue KI-Klasse, Verhalten wie relativ) —
      Auto-Abgleich jeder Patienten-Medikation gegen die Matrix, gefiltert
      auf das gewählte Medikament. Pro Medikament eine Zeile mit
      Ampel-Badge + Begründung: `vorsicht` (gelb) bzw. `absolut` (rot);
      unkritische Medis kompakt als eine Sammelzeile „n unkritisch".
      Geflaggte Einträge müssen wie relative KI aktiv abgehakt
      (= zur Kenntnis genommen / abgewogen) werden — **kein Auto-Stopp**,
      denn die Matrix-Begründungen sind KI-generiert (Label „KI-gestützter
      Abgleich"). Treffer mit Level `absolut` verweisen auf den passenden
      offiziellen KI-Punkt in Abschnitt 1 und heben ihn hervor (z. B.
      Theophyllin → „Vormedikation mit Aminophyllin, Theophyllin,
      Ergometrin") — die Stopp-Entscheidung fällt dort, durch den NotSan.
   - Absolute KI (Abschnitt 1) bestätigt/markiert → roter Stopp „Keine Gabe",
     Wizard endet (Alternative laut BPR als Hinweis, falls in Daten hinterlegt).
   - Relative KI oder Dauermedikations-Flag markiert → gelber
     Bestätigungsdialog „Nutzen-Risiko abgewogen?", dann weiter möglich.
   - Bei Geschlecht = w und gebärfähigem Alter: Schwangerschafts-KI optisch
     hervorgehoben.
5. **Aufklärung & Einwilligung** — kompakte Checkliste nach BPR Aufklärung
   (S. 14): situationsgerecht aufgeklärt (Grund, Nutzen/Risiken, Alternativen,
   Nachteile der Ablehnung, verständlich); Einwilligungsfähigkeit ja/nein/unklar.
   - nicht einwilligungsfähig/unklar → Hinweis „mutmaßlicher Wille + NA/TNA",
     weiter möglich (dokumentiert).
   - Einwilligung verweigert → Stopp mit Verweis BPR Behandlungs-/
     Transportverweigerung.
6. **Dosierung** — Auswahl Applikationsweg (nur die in der SAA genannten),
   dann Ampulle/Konzentration. Danach:
   - **Vorbereitungs-Block:** Ampulle → ggf. Zugabe (z. B. „+ 3 ml NaCl 0,9 %")
     → Ziellösung („5 ml à 10 mg/ml"). Kennzeichnung der Quelle:
     `saa` (offiziell, z. B. Naloxon S. 42) vs. `praxis` (Praxis-Standard,
     sichtbares Label „Praxis-Schema").
   - **Ergebnis:** Dosis in mg (groß) + aufzuziehendes Volumen in ml (akzent),
     gerundet auf 0,1 ml; effektive mg nach Rundung angezeigt.
   - **Rechenweg sichtbar** (Monospace-Block): mg/kg × kg = mg; mg ÷ mg/ml = ml;
     Max-Grenze mit ✓/⚠. Digitales 4-Augen-Prinzip.
   - Repetitions-Regel + Cave-Hinweise (z. B. „2 Konzentrationen verfügbar!").
7. **6-R-Regel** — sechs Pflicht-Haken, vorbelegt mit den konkreten Werten:
   richtiger Patient / richtiges Medikament (Wirkstoff + gewählte Ampulle) /
   richtige Dosierung (berechnete mg/ml) / richtiger Zeitpunkt /
   richtige Konzentration (Ziellösung) / richtige Applikationsart (gewählter Weg).
   Alle 6 = Freigabe-Button aktiv (SAA S. 41: „6-mal mit ja bestätigt?").
8. **Durchführung & Doku** — Kurz-Checkliste: Spritze gekennzeichnet
   (DIVI-ISO), 4-Augen-Doppelkontrolle, gesicherte Kommunikation; danach
   Wirkungskontrolle (gewünschte Wirkung erreicht? → ggf. Repetition gemäß
   Regel oder Folgemaßnahmen) und Zusammenfassung als Doku-Vorlage
   (alle Angaben + Zeitstempel) zum Abfotografieren/Übertragen ins Protokoll.

Schritt-Reihenfolge folgt bewusst SAA S. 41: KI-Ausschluss **vor** Aufklärung.

## Datenschema `medigabe/data/dosing.json`

Pro Medikament ein Eintrag; deckt alle 29 Fälle ab (gewichtsadaptiert, fix,
altersgestaffelt, mehrere Wege/Konzentrationen). Beispiel Esketamin:

```json
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
          "repetition": "0,125 mg/kgKG, bis Maximaldosis 0,25 mg/kgKG",
          "preps": [
            {
              "ampulle": "50 mg / 2 ml (25 mg/ml)",
              "zugabe": "3 ml NaCl 0,9 %",
              "ergebnis": "5 ml à 10 mg/ml",
              "mgPerMl": 10,
              "quelle": "praxis"
            },
            {
              "ampulle": "25 mg / 5 ml (5 mg/ml)",
              "zugabe": null,
              "ergebnis": "unverdünnt (5 mg/ml)",
              "mgPerMl": 5,
              "quelle": "saa"
            }
          ],
          "hinweise": ["Kombination mit Midazolam bei i.v.-Gabe empfohlen"]
        },
        {
          "weg": "nasal / i.m.",
          "dosis": { "mgProKg": 1 },
          "repetition": "einmalige Repetition 1 mg/kgKG möglich",
          "preps": [
            {
              "ampulle": "50 mg / 2 ml (25 mg/ml)",
              "zugabe": null,
              "ergebnis": "unverdünnt (25 mg/ml) — kleines Volumen für MAD",
              "mgPerMl": 25,
              "quelle": "saa"
            }
          ]
        }
      ]
    }
  ],
  "cave": [
    "Ampullen mit unterschiedlichen Konzentrationen verfügbar",
    "Bei Verwendung von Ketamin: Dosisverdopplung"
  ]
}
```

Weitere Dosis-Formen im Schema: `{ "fixMg": 250 }` (ASS i.v.),
`{ "stufen": [{ "wer": "erwachsen", "mg": 300 }, { "wer": "kind",
"mgProKg": 5, "maxMg": 300 }] }` (Amiodaron), `maxMgAbsolut` (Butylscopolamin
max. 20 mg). Felder, die nicht gebraucht werden, entfallen.

**Datendisziplin:** Jeder Eintrag wird gegen die PDF-Seite verifiziert
(`saaSeite`, `verifiziert`-Datum). Praxis-Verdünnungsschemata (`quelle:
"praxis"`) werden vom Nutzer einzeln freigegeben, bevor das Medikament
wählbar wird. Keine erfundenen Dosen/Schemata.

## Berechnung `medigabe/lib/dose.js`

Reine Funktionen, per TDD entwickelt:

- `computeDose({ dosis, kg, maxMgProKg, maxMgAbsolut })` →
  `{ mg, gekappt, schritte: [...] }` — mg aus mgProKg×kg / fixMg / stufen;
  Kappung auf Max (beide Varianten); `schritte` = anzeigbarer Rechenweg.
- `computeVolume({ mg, mgPerMl })` → `{ ml, mlGerundet, mgEffektiv }` —
  Rundung auf 0,1 ml; effektive mg nach Rundung; **Max-Check erneut nach
  Rundung** (niemals über Max runden — dann abrunden).
- Testfälle u. a.: Esketamin 70 kg i.v. (8,75 mg → 0,9 ml bei 10 mg/ml;
  1,8 ml bei 5 mg/ml), Cap greift (Repetition über 0,25 mg/kg),
  fixMg (ASS), stufen (Amiodaron Kind 80 kg → Cap 300 mg),
  maxMgAbsolut (Butylscopolamin 80 kg: 24 mg → 20 mg),
  Rundung würde Max überschreiten → abrunden, minKg-Block.

## Patientensicherheit

- Absolute KI markiert → harter Stopp, kein „Weiter".
- Rechenweg immer sichtbar; keine Black-Box-Zahl.
- Cave-Karte bei mehreren Konzentrationen (Esketamin 5 vs. 25 mg/ml).
- Plausibilitätsgrenzen bei Gewicht/Alter; Altersgrenzen aus SAA blocken früh.
- Jeder Screen trägt den bestehenden Disclaimer: „Entscheidungsunterstützung —
  kein Ersatz für ärztliche Anordnung / gültige SAA-Freigabe."
- Wizard-State nur im Speicher (kein Persistieren von Patientendaten).

## Nicht-Ziele (YAGNI)

- Keine Protokoll-/PDF-Export-Funktion (Doku-Zusammenfassung als Screen reicht).
- Keine BPR-Behandlungspfad-Navigation (nur Medikamenten-SAA).
- Keine Offline-Sync/Server-Erweiterung.
- Keine Bearbeitung der Dosisdaten in der App (Daten = committete JSON).

## Phasen

- **Phase 1a (< 90 min):** `dose.js` per TDD + `dosing.json` mit Esketamin
  (verifiziert gegen S. 50) + Schema-Validierung. Reine Logik, ohne UI.
- **Phase 1b (< 90 min):** Wizard-Steps 1–8 + Stopp-Logik + HomeScreen/
  Nav-Integration + `caseMeds`-Store inkl. MedScan-Anbindung (Write-through
  + Hydrieren). Ende-zu-Ende am Esketamin-Beispiel testbar.
- **Phase 2:** Restliche 28 Medikamente als reine Dateneinträge, je gegen
  PDF-Seite verifiziert; Praxis-Schemata zur Freigabe gesammelt vorgelegt.

## Teststrategie

- `dose.js`: Vitest-Unit-Tests (Fälle oben), zuerst geschrieben (TDD).
- Wizard: Komponententest für Stopp-Logik (absolute KI → kein Weiter;
  6-R unvollständig → keine Freigabe).
- Manuell: Esketamin-Durchlauf mobil (Touch, Handschuh-Tauglichkeit).
