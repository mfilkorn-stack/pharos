# Pharos

Werkzeuge für Rettungsfachpersonal (Aus-/Fortbildung) in einer PWA. **Kein Medizinprodukt.** **Keine patientenbezogene Entscheidungsgrundlage.**

## Module

- **Lexikon / MedScan** — Wirkstoff-Nachschlagewerk mit Barcode-, BMP- und OCR-Erkennung, SAA-Check.
- **Medigabe** — 8-Schritt-Wizard für die Medikamentengabe nach SAA/BPR 2025.
- **Trainer** — SINNHAFT-Übergabe nach Gräff et al. 2023.

## Stack

Vite 8 + React 19 + Tailwind 4, PWA (Workbox). Vitest (jsdom). Express-Proxy für die KI-Pfade. Tesseract.js (lazy). zxing-wasm (lazy Fallback).

## Setup

```bash
npm install
npm run data:ocr    # einmalig: deu.traineddata nach public/tesseract/ (~10 MB)
npm run data        # Pipeline → src/modules/lexikon/data/*.json (Inputs in scripts/input/)
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
- KI-Pfad aktiv (Flags `cloudPackung`/`cloudPlan` in `src/modules/lexikon/config.js`). Der Anthropic-Key liegt nur serverseitig im Proxy, nie im Client-Bundle.
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
