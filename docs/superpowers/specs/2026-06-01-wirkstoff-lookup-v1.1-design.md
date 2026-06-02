# Wirkstoff-Lookup v1 + v1.1 — Design

**Datum:** 2026-06-01
**Scope:** Bauplan-Pakete 1–7 (v1 vollständig + v1.1 OCR). KI-Proxy (v1.2) explizit out-of-scope.
**Quellen:** `Bauplan_ClaudeCode.md`, `Konzept_Datenbank_Erkennung.md`, MVP `WirkstoffLookup.jsx`.

---

## 1. Leitplanken (übernommen, nicht verhandelbar)

- Generisches Nachschlagewerk je Substanz 
- Datensparsamkeit: Offline-Pfade on-device, ephemer, ohne Upload. Kein Telemetrie-Capturing.
- State ephemer: nur Consent + Settings persistieren.
- Zwei Nutzer-Optionen („Scannen", „Hochladen"); Erkennungsmethode intern.

---

## 2. Stack

- Vite + React (Hooks), Single-Page.
- PWA: `vite-plugin-pwa` (Workbox), offline-first, installierbar.
- Tests: Vitest.
- Keine Secrets im Client. KI-Pfad in diesem Sprint **nicht aktiv** (Flags `cloudPackung`/`cloudPlan` existieren, default `false`, kein Codepfad).

---

## 3. Architektur & Modulgrenzen

```
src/
  main.jsx
  App.jsx
  config.js                 # dataVersion, Flags, (zukünftiger) kiProxyUrl
  data/
    data.json               # Tier 0a: groups + substances (Top-250)
    atc_index.json          # Tier 0b: ATC <-> Wirkstoff (Long Tail)
    atc_group_map.json      # ATC-Präfix -> groupId
  lib/
    match.js                # norm, lev, scoreEntry, resolve, resolveMulti (MVP-Port)
    atc.js                  # parsePznFromGtin, groupForAtc
    lookup.js               # Tier 0a -> 0b -> manuell
    recognize.js            # Pipeline-Orchestrator (Blob/PDF -> Tokens)
    barcode.js              # BarcodeDetector zuerst, zxing-wasm Fallback (lazy)
    ocr.js                  # Tesseract.js deu (lazy, eigene Origin)
    bmp.js                  # BMP-Data-Matrix Parser + Feld-Whitelist
    consent.js              # localStorage { version, hash, acceptedAt }
  components/
    ConsentGate.jsx
    SearchBar.jsx
    ResultCard.jsx          # Badge "generische Gruppeninfo" für Tier-0b-Treffer
    Scanner.jsx             # Prop source: "scan" | "upload"
    ConfirmList.jsx         # „Vorschlag – bitte prüfen"
scripts/
  build-data.mjs            # Daten-Pipeline (siehe §5)
  atc_group_map.source.json # Kuratierte Quelle, Pipeline kopiert/validiert
public/
  manifest.webmanifest
  tesseract/
    deu.traineddata         # ~10 MB, von eigener Origin, lazy via Workbox
tests/
  match.test.js
  atc.test.js
  bmp.test.js
  recognize.test.js
  lookup.test.js
docs/superpowers/specs/
  2026-06-01-wirkstoff-lookup-v1.1-design.md
```

**Modulverantwortungen (eine pro Datei):**

| Modul | Tut | Hängt ab von |
|---|---|---|
| `match.js` | Fuzzy-Match Token→Substanz | — |
| `atc.js` | NTIN→PZN, ATC→GroupId | — |
| `lookup.js` | Tier 0a → 0b → manuell | match, atc, data/* |
| `barcode.js` | Code-Erkennung | BarcodeDetector (nativ) / zxing-wasm (lazy) |
| `ocr.js` | Bild → Text-Tokens | tesseract.js (lazy) |
| `bmp.js` | BMP-Data-Matrix → Wirkstoff-Whitelist | — |
| `recognize.js` | Pipeline orchestrieren | barcode, bmp, ocr, lookup |
| `consent.js` | Persistenz Consent | localStorage |

---

## 4. Datenfluss Erkennung

```
Blob/PDF
  │
  ├─ ist Bild? ── ja ──▶ barcode.detect()
  │                         │
  │                         ├─ NTIN-GTIN? ──▶ parsePznFromGtin ──▶ lookup(PZN)
  │                         ├─ BMP-DataMatrix? ──▶ bmp.parse() ──▶ resolveMulti(names)
  │                         └─ andere Codes / nichts ──▶ ocr.recognize()
  │                                                         └─ Tokens ──▶ resolveMulti()
  └─ PDF ────────────────▶ ocr.recognize() ──▶ resolveMulti()

Ergebnis: { matched: Entry[], unmatched: string[], codeNote?: string }
  └─▶ ConfirmList (Nutzer bestätigt) ──▶ ResultCard(s)
```

**Regel:** Nie Auto-Übernehmen. Jeder Pfad endet in ConfirmList.

---

## 5. Build-Pipeline (`scripts/build-data.mjs`)

Einmalig / jährlich, **nicht** zur Laufzeit. Idempotent.

**Schritte:**

1. **WIdO ATC-Index ZIP** parsen (Input-Pfad parametrisierbar; falls Download-URL nicht offen, manueller Download dokumentiert) → vollständige ATC ↔ Wirkstoff-Tabelle.
2. **Top-250 Ranking** aus `scripts/input/top250.csv` (Wirkstoff + optional ATC). Beschaffung aus Arzneiverordnungs-Report / WIdO PharMaAnalyst, manuelle Pflege.
3. **atc_group_map** kuratiert in `scripts/atc_group_map.source.json`. Pipeline validiert und kopiert nach `src/data/atc_group_map.json`.
4. **Merge & Enrich:**
   - Top-250 mit ATC aus `atc_index` anreichern (kanonische Schreibweise).
   - Gruppen-Zuordnung via `groupForAtc(atc, map)` (längster Präfix gewinnt).
   - Notfall-Defaults aus `GROUPS` (aus MVP übernommen + erweitert nach Bedarf).
   - Substanzspezifische `extra` aus `scripts/input/extras.json` (manuell kuratiert).
5. **Schreiben:**
   - `src/data/data.json` (Tier 0a)
   - `src/data/atc_index.json` (Tier 0b, getrimmt)
   - `src/data/atc_group_map.json`
6. **Validation (Exit ≠ 0 bei Fehler):**
   - Jede in atc_group_map referenzierte groupId existiert in `GROUPS`.
   - Jeder Top-250-ATC existiert im atc_index.
   - Keine Dubletten (id, norm(wirkstoff)).
   - Pflichtfelder vorhanden (`id, wirkstoff, atc, group`).
7. **Quellen-Stempel** je Eintrag (`quelle`, `stand`).

Cache-Bust: `config.js#dataVersion` ist in Workbox-Cache-Key der Datenfiles eingebunden — neue Version → erzwungener Neu-Download.

---

## 6. Tiers & Lookup

- **Tier 0a:** `resolve(token)` gegen `data.json`. Voller Treffer (Gruppe + spezifische Notfallinfo).
- **Tier 0b:** Miss in 0a → `atc_index` → `groupForAtc` → generische Gruppenkarte. Badge **„generische Gruppeninfo"**. Bleibt offline.
- **Tier 1 (KI):** Out-of-scope dieser Sprint. Flags existieren, kein Codepfad.
- **Tier 2:** Manuelle Suche.

Matching-Härtung: exakt/Präfix zuerst; Fuzzy nur als Kandidatenliste mit höherer Schwelle. Nie einzelner unsicherer Treffer als Fakt.

---

## 7. Erkennung im Detail

**Barcode (`barcode.js`):**
- Strategie: `BarcodeDetector`-API zuerst (Chrome/Android nativ, schnell). Fallback: `zxing-wasm`, **lazy-geladen** beim ersten Bedarf, via Service Worker gecacht.
- Formate: `data_matrix`, `code_39`, `ean_13`, `qr_code`.
- **Bewusste Abweichung zum Bauplan** (der „NICHT BarcodeDetector" schreibt): Native API liefert auf Mobile deutlich bessere Latenz; zxing als universeller Fallback erfüllt die Cross-Browser-Anforderung.
- Bei NTIN-GTIN (Präfix `04150`): `parsePznFromGtin` → PZN.
- Bei BMP-Data-Matrix: an `bmp.js` weiterreichen.

**OCR (`ocr.js`):**
- `tesseract.js` mit `deu.traineddata` (~10 MB).
- Modell in `public/tesseract/deu.traineddata`, **nicht** im Precache. Workbox `CacheFirst` lädt beim ersten Einsatz, danach permanent offline.
- Output: Token-Strom → `resolveMulti`.

**BMP (`bmp.js`):**
- Parser für BMP-2.x Data-Matrix-Payload.
- **Whitelist-Architektur:** Nur Wirkstoff/Substanz-Felder (`<S>`) werden in den Token-Stream geschrieben. Patientenkopf (`<P>`, `<O>`) und Diagnosen (`<R>`) werden im Parser gar nicht erst extrahiert — keine Variable, kein Log, kein Return.
- Tests beweisen das anhand öffentlicher BMP-Demo-Payloads (Negative Assertion: Patientenname / Diagnose-Strings dürfen im Output nicht auftauchen).

---

## 8. UI-Komponenten

- **ConsentGate** — nicht überspringbar, Re-Consent bei Versionswechsel.
- **SearchBar** — Live-Filter über `data.json` (norm-Match).
- **ResultCard** — wie MVP, plus Badge „generische Gruppeninfo" für Tier-0b-Treffer.
- **Scanner** (`source: "scan" | "upload"`):
  - `scan`: Kamera (`getUserMedia`), Button „Aufnehmen & erkennen". Live-Barcode passiv optional.
  - `upload`: Datei-Dialog (Bild/PDF).
  - Beide → `recognize()` → `ConfirmList`.
- **ConfirmList** — „Vorschlag – bitte prüfen"; n Kandidaten, jeder Pick übernimmt aktiv.

---

## 9. Consent

`localStorage` Key: `wirkstoff-lookup.consent`
Payload: `{ version: "1.0", hash: "<sha256 des Texts>", acceptedAt: <iso> }`
- Nicht überspringbar.
- Versionswechsel (Hash ≠ gespeichert) → Re-Consent erzwungen.
- Keine PII.

---

## 10. PWA & Stabilität

- App-Shell precachen.
- Datenfiles (`data.json`, `atc_index.json`, `atc_group_map.json`): Cache-Key an `dataVersion` gekoppelt.
- `deu.traineddata`: CacheFirst, **kein** Precache.
- `zxing-wasm`: lazy, dann CacheFirst.
- Sichtbares „Stand"-Datum in der UI (aus `data.json#version` + `stand`).
- Fehlerpfade: Netzfehler / Kamera nicht verfügbar / Parser-Fehler → klare Meldung + Rückfall auf manuelle Suche.

---

## 11. Konfiguration (`config.js`)

```js
export const config = {
  dataVersion: "2026.1",
  flags: {
    ocrEnabled: true,        // v1.1
    cloudPackung: false,     // v1.2 — nicht aktiv
    cloudPlan: false,        // v1.2 — nicht aktiv
  },
  kiProxyUrl: import.meta.env.VITE_KI_PROXY_URL || "",
};
```

---

## 12. Tests (Vitest)

- `match.test.js` — Resolver gegen MVP-Seed (Top-Treffer, Synonyme, Tippfehler-Toleranz, Schwellenwerte).
- `atc.test.js` — `parsePznFromGtin` an bekannten NTIN-Beispielen; `groupForAtc` (längster Präfix, null-Fall).
- `bmp.test.js` — Whitelist-Beweis: Patientenkopf/Diagnosen kommen **nicht** im Output vor (öffentliche BMP-Demo-Payloads).
- `recognize.test.js` — Pipeline-Reihenfolge, Multi-Result, Error-Paths.
- `lookup.test.js` — Tier 0a-Hit, 0a-Miss → 0b-Hit (Badge), beides-Miss → manuell.

Tests begleitend zu jedem Paket, nicht als Schlusspaket.

---

## 13. Arbeitspakete (Abnahmekriterien aus Bauplan §9)

| # | Paket | Abnahme |
|---|---|---|
| 1 | Scaffold + PWA | Leere PWA installierbar, offline ladbar. |
| 2 | Seed + `match.js` | Suche + ResultCard zeigen die 48 Seed-Substanzen. |
| 3 | `build-data.mjs` scharf | Skript idempotent; Validierung grün; alle drei Artefakte erzeugt. |
| 4 | `lookup.js` Tier 0a/0b | Unbekannte, aber im ATC-Index gelistete Substanz liefert Gruppeninfo + Badge. |
| 5 | Scanner + Barcode + ConfirmList | Barcode aus Bild erkannt; nur nach Bestätigung übernommen. BMP-Data-Matrix → mehrere Wirkstoffvorschläge, Patientenkopf nicht im Output. |
| 6 | Consent persistent | Reload hält Consent; Versionswechsel erzwingt Re-Consent. |
| 7 | OCR (Tesseract, lazy) | Foto einer Packung liefert Namensvorschlag offline (nach Erst-Modellload). |

---

## 14. Out of Scope (dieser Sprint)

- KI-Proxy / `cloudPackung` / `cloudPlan` (v1.2).
- Top-250-Kuratierung jenseits der Pipeline-Mechanik — die redaktionelle Befüllung von `top250.csv` und `extras.json` ist eine Daten-Arbeit, nicht Code.
- App-Store-Vertrieb (PWA-only).
- IFA/ABDATA-Lizenzdaten.

---

## 15. Risiken & Bewusste Abweichungen

- **`BarcodeDetector` statt nur zxing-wasm** (Bauplan §5). Begründung: native Performance auf Mobile. Mitigation: zxing-wasm als Fallback erfüllt Cross-Browser-Anforderung.
- **WIdO-ATC-Beschaffung** könnte manuellen Download erfordern → Pipeline akzeptiert lokalen ZIP-Pfad.
- **Top-250 CSV** ist redaktionelle Daueraufgabe — nicht Teil dieses Sprints, Pipeline läuft mit Teilbestand grün.
- **BMP-Parser** ist die anspruchsvollste neue Komponente. Whitelist-Tests sind Pflicht-Abnahme.
