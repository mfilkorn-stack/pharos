# Wirkstoff-Lookup

Generisches fachliches Nachschlagewerk zu Arzneistoffen für Rettungsfachpersonal (Aus-/Fortbildung). **Kein Medizinprodukt.** **Keine patientenbezogene Entscheidungsgrundlage.**

## Stack

Vite + React + PWA (Workbox). Vitest. Tesseract.js (lazy). zxing-wasm (lazy Fallback).

## Setup

```bash
npm install
npm run data:ocr    # einmalig: deu.traineddata nach public/tesseract/ (~10 MB)
npm run data        # Pipeline → src/data/*.json (Inputs in scripts/input/)
npm run dev
```

## Build

```bash
npm run build && npm run preview
```

## Tests

```bash
npm test
```

## Datenpipeline

Siehe `scripts/README.md`. Inputs (manuell beschaffen): `scripts/input/wido-atc.zip`, `scripts/input/top250.csv`, optional `scripts/input/extras.json`.

## Architektur

Siehe `docs/superpowers/specs/2026-06-01-wirkstoff-lookup-v1.1-design.md`.

## Sicherheit & Recht

- Datensparsamkeit: alle Offline-Pfade on-device, ephemer, ohne Upload.
- KI-Pfad in dieser Version inaktiv (Flags in `src/config.js`, default false).
- BMP-Data-Matrix Parser ist Whitelist-only: Patientenkopf und Diagnosen werden nicht gelesen.
- Consent persistent in `localStorage`, kein PII.

## Stand v1.1 (Abnahme)

| Paket | Abnahme | Status |
|---|---|---|
| 1 | Scaffold + PWA installierbar offline | ✅ |
| 2 | Suche zeigt 48 Seed-Substanzen | ✅ |
| 3 | `build-data.mjs` idempotent, Validierung grün | ✅ |
| 4 | Tier 0a/0b mit Badge | ✅ |
| 5 | Scanner + Barcode + ConfirmList (Pflicht-Bestätigung) | ✅ |
| 6 | Consent persistent + Re-Consent bei Versionswechsel | ✅ |
| 7 | OCR Tesseract lazy, eigene Origin | ✅ |

Manueller Browser-Smoke-Test (PWA offline, OCR-Modell-Cache, Kamera) ist Endabnahme durch GF.

## v1.2-self (Test-Modus)

**Cloud-Erkennung** (Anthropic Claude) ist im Self-Test aktiviert. Setup:

```bash
cp .env.local.example .env.local
# ANTHROPIC_API_KEY eintragen
npm install
npm run ki-proxy      # in einem Terminal — startet localhost:8787
npm run dev           # in einem anderen Terminal — startet PWA
```

Pipeline: Barcode → BMP/PZN → OCR → KI. KI läuft nur, wenn lokal nichts gefunden wurde
und der Proxy erreichbar ist. KI gibt **nur Wirkstoffnamen** zurück — die Anzeige
kommt weiter aus der lokalen DB/ATC-Schicht.

**Test-Modus heißt: keine Patientendaten Dritter.** Eigene Packungen, eigene Pläne.
Vor produktivem Einsatz mit Drittdaten: AVV mit Anthropic, EU-Hosting, Rechtsgrundlage
(siehe Konzept §6).
