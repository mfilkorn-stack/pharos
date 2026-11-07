# Pharos

Stand: 07.11.2026

Werkzeuge für Rettungsfachpersonal (Aus- und Fortbildung) in einer PWA, live unter
[www.pharos.team](https://www.pharos.team). **Kein Medizinprodukt.** **Keine patientenbezogene
Entscheidungsgrundlage.**

## Module

| Modul | Was es kann |
|---|---|
| **MedScan** (Lexikon) | Wirkstoffe und Handelsnamen nachschlagen, Packung oder Medikationsplan scannen (Barcode, BMP, OCR), Drogen und Toxidrome, SAA-Check gegen die Dauermedikation. Offline nutzbar. |
| **Medigabe** | 8-Schritt-Wizard für die Medikamentengabe nach SAA/BPR 2025: Indikation, Kontraindikationen, Aufklärung, Dosis, 6-R-Regel, Doku-Zusammenfassung. |
| **Übergabe** (Trainer) | SINNHAFT-Übergabe nach Gräff et al. 2023 einsprechen oder tippen; die KI sortiert in die Felder und bewertet wie das aufnehmende ZNA-Team. |

## Stack

Vite 8, React 19, Tailwind 4, PWA über `vite-plugin-pwa` (Workbox). Vitest mit jsdom.
Express-5-Proxy (`server/ki-proxy.mjs`) für die KI-Pfade, der Anthropic-Key bleibt serverseitig.
Tesseract.js und zxing-wasm werden erst bei Bedarf geladen. Schriften (Inter, JetBrains Mono)
sind selbst gehostet.

## Entwicklung

```bash
npm ci
npm run data:ocr      # einmalig: deu.traineddata nach public/tesseract/ (~10 MB)
cp .env.local.example .env.local   # ANTHROPIC_API_KEY eintragen
npm run dev:all       # KI-Proxy (:8787) und Vite parallel
```

| Befehl | Zweck |
|---|---|
| `npm test` | Vitest einmalig, `npm run test:watch` im Watch-Modus |
| `npm run build` | `dist/`, `VITE_KI_PROXY_URL` wird zur Build-Zeit eingebettet |
| `npm run data` | Lexikon-Pipeline, Inputs in `scripts/input/` (siehe `scripts/README.md`) |
| `npm run data:saa` / `data:saa-matrix` | SAA-Datensatz und Interaktionsmatrix |

Lexikon-Daten (`src/modules/lexikon/data/*.json`) sind Pipeline-Output und werden nie direkt
editiert. Medigabe-Dosierungen stammen ausschließlich aus SAA und BPR 2025 mit Seitenbeleg.
Weitere Regeln stehen in `CLAUDE.md`.

## Release

Zwei manuelle Schritte, Merges lösen nichts aus:

1. **Prüfen:** GitHub → Actions → **Release** → „Run workflow" auf `main` (Tests und Build).
2. **Ausrollen**, wenn der Lauf grün ist:
   ```bash
   ssh -t pharos 'cd /opt/pharos && bash deploy/deploy.sh'
   ```

Kein Deploy zwischen 9 und 18 Uhr ohne Rückfrage. Server-Einrichtung, Skript-Ablauf und
Fallstricke: `DEPLOY-HETZNER.md`.

## Datenschutz und KI

- Offline-Pfade (Suche, Barcode, BMP, OCR) laufen auf dem Gerät, nichts wird hochgeladen.
- Die Cloud-Erkennung greift nur, wenn lokal nichts gefunden wurde, und liefert nur
  Wirkstoffnamen. Die Anzeige kommt weiter aus der lokalen Datenbank.
- Der BMP-Parser liest nur die Medikation, Patientenkopf und Diagnosen werden ignoriert.
- `localStorage` hält nur Consent, Favoriten und Verlauf (Wirkstoff-IDs), keine Patientendaten.
- Test-Modus: keine Patientendaten Dritter eingeben. Vor produktivem Einsatz mit Drittdaten
  braucht es AVV mit Anthropic, EU-Hosting und eine Rechtsgrundlage.

## Dokumentation

| Datei | Inhalt |
|---|---|
| `CLAUDE.md` | Harte Regeln, Konventionen, Struktur |
| `DEPLOY-HETZNER.md` | Server, Caddy, systemd, Release-Ablauf |
| `docs/DECISIONS.md` | Getroffene und offene Entscheidungen |
| `docs/audits/2026-10-21-design-ux-audit.md` | UI/UX-Audit mit offenen Punkten |
| `AUDIT_REPORT.md` | Funktions- und Sicherheitsaudit (Stand 2026-06-02) |
