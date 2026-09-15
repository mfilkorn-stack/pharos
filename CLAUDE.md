# Pharos

## Zweck

Pharos ist eine PWA mit Werkzeugen für Rettungsfachpersonal (Aus- und Fortbildung): **Lexikon/MedScan**
(Wirkstoff-Nachschlagewerk mit Barcode-, BMP- und OCR-Erkennung), **Medigabe** (8-Schritt-Wizard für die
Medikamentengabe nach SAA) und **Trainer** (SINNHAFT-Übergabe nach Gräff et al. 2023).
Kein Medizinprodukt, keine patientenbezogene Entscheidungsgrundlage — dieser Hinweis bleibt in der UI sichtbar.

## Stack und Architektur

Vite 8 + React 19 + Tailwind 4, PWA über `vite-plugin-pwa` (Workbox, `registerType: autoUpdate`).
Tests: Vitest mit jsdom. Modulare Struktur unter `src/modules/<lexikon|medigabe|trainer>/`, gemeinsame Shell
in `src/shell/`, kein TypeScript.

Backend ist ein Express-5-Proxy (`server/ki-proxy.mjs`, Port 8787), der den Anthropic-Key serverseitig hält
und den Enrich-Cache nach `public/data/extras-runtime.json` schreibt. Der Client spricht ihn über
`VITE_KI_PROXY_URL` an — die URL wird **zur Build-Zeit** eingebettet.

Deployment: Hetzner (Ubuntu, Caddy + systemd), Domain `www.pharos.team`. Siehe `DEPLOY-HETZNER.md`.

## Harte Regeln

- **Medigabe-Dosierungen stammen ausschließlich aus SAA und BPR 2025 (6-Länder-AG, Stand 30.04.2025).**
  Jeder Eintrag in `src/modules/medigabe/data/dosing.json` trägt `saaSeite` und `verifiziert`. Keine Dosis,
  keine Indikation, keine Kontraindikation ohne Seitenbeleg — auch nicht aus Fachinfo, Leitlinie oder KI.
  Praxis-Verdünnungen, die nicht in der SAA stehen, werden einzeln freigegeben und als solche gekennzeichnet.
- **Lexikon-Daten sind Pipeline-Output.** `src/modules/lexikon/data/data.json`, `atc_index.json` und
  `atc_group_map.json` werden nie direkt editiert. Änderungen gehen in `scripts/seed.json` bzw. die Inputs
  unter `scripts/input/`, danach `npm run data`.
- **Keine Patientendaten persistieren.** Trainer- und Medigabe-Zustand bleiben im Speicher; `localStorage`
  hält nur Consent, Favoriten und Verlauf (Wirkstoff-IDs). Der BMP-Data-Matrix-Parser ist Whitelist-only,
  Patientenkopf und Diagnosen werden nicht gelesen.
- **`ANTHROPIC_API_KEY` bleibt serverseitig** in `.env.local` (gitignored). Nie ins Client-Bundle, nie ins Repo.
- Keine Backtick-Template-Literals mit einfachen Anführungszeichen in JSX — stattdessen Array-Joins.

## Konventionen

Deutsch in Doku, Code-Kommentaren und Commits. Domänenbegriffe bleiben deutsch (`wirkstoff`, `indikationen`,
`kontra`, `saaSeite`), technische Bezeichner englisch. Conventional Commits mit Modul-Scope:
`feat(medigabe):`, `fix(lexikon):`, `docs(...)`. Reine Logik (`lib/`) bleibt seiteneffektfrei und testbar;
für jede Dosis- und Matching-Regel gibt es einen Test unter `tests/`.
Lean and clean, keine Ausschweifungen. Umfangreiche Vorschläge hinterfragen statt ausführen.

## Befehle

```bash
npm run dev            # Vite-Dev-Server
npm run ki-proxy       # Express-Proxy auf :8787 (liest .env.local)
npm run dev:all        # beides parallel
npm test               # Vitest einmalig · npm run test:watch für Watch
npm run build          # dist/ — VITE_KI_PROXY_URL muss vorher gesetzt sein
npm run preview
npm run data           # Lexikon-Pipeline (Inputs in scripts/input/)
npm run data:saa       # SAA-Datensatz
npm run data:saa-matrix
npm run data:ocr       # deu.traineddata nach public/tesseract/ (einmalig)
```

## Struktur

```
src/App.jsx              Modul-Routing + Consent-Gate
src/shell/               Navigation: HomeScreen, Sidebar, BottomTabBar, ActionBar
src/modules/lexikon/     Suche, Scanner (Barcode/BMP/OCR), SAA-Check, Daten + Pipeline-Output
src/modules/medigabe/    8-Schritt-Wizard, dosing.json (SAA-Dosierungen), Dosislogik
src/modules/trainer/     SINNHAFT-Übergabetrainer
src/lib/                 modulübergreifend (buildInfo, kiClient, saaMatrix, caseMeds)
server/                  Express-Proxy: ki, enrich, verify, saa-check, wikipedia
scripts/                 Build-Pipeline (siehe scripts/README.md)
tests/                   Vitest
deploy/                  Caddyfile + systemd-Unit
```

## Offene Entscheidungen

Siehe `docs/DECISIONS.md`. Offene Befunde aus dem Audit: `AUDIT_REPORT.md` (Stand 2026-06-02).
