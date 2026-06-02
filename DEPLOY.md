# Deploy-Anleitung – Wirkstoff-Lookup

## Architektur-Überblick

Das Projekt hat **zwei Deployment-Szenarien**:

| Szenario | Hosting | KI-Features |
|---|---|---|
| **A – Static only** | Netlify / Vercel / nginx | ❌ (Fallback auf lokale DB) |
| **B – Full Stack** | VPS / Railway / Render | ✅ vollständig |

Die App ist eine Vite/React-PWA (`dist/`) + ein Express-Backend (`server/ki-proxy.mjs`).
Der ki-proxy läuft auf Port 8787, hält den Anthropic-API-Key serverseitig und persistiert
den Enrich-Cache (`public/data/extras-runtime.json`).

---

## Voraussetzungen

### Einmalig beschaffen (nicht im Repo)

| Datei | Quelle | Pfad |
|---|---|---|
| `wido-atc.zip` | WIdO ATC-Index (frei, wido.de) | `scripts/input/wido-atc.zip` |
| `top250.csv` | Intern, Header: `wirkstoff,atc` | `scripts/input/top250.csv` |
| `extras.json` | Optional, substanzspezifische Warnhinweise | `scripts/input/extras.json` |

### Umgebungsvariablen

```
ANTHROPIC_API_KEY=sk-ant-...        # Pflicht für KI-Features
KI_PROXY_PORT=8787                  # Optional, Default: 8787
VITE_KI_PROXY_URL=https://...      # Öffentliche URL des ki-proxy (Pflicht für Szenario B)
```

---

## Schritt-für-Schritt

### Schritt 1 – Repo klonen & Abhängigkeiten installieren

```bash
git clone <repo-url> wirkstoff-lookup
cd wirkstoff-lookup
npm install
```

### Schritt 2 – Umgebungsvariablen konfigurieren

```bash
cp .env.local.example .env.local
```

`.env.local` befüllen:
```
ANTHROPIC_API_KEY=sk-ant-<dein-key>
KI_PROXY_PORT=8787
VITE_KI_PROXY_URL=https://deine-domain.de/ki   # Szenario B
# VITE_KI_PROXY_URL=http://localhost:8787/ki    # nur lokal
```

> ⚠️ `.env.local` ist gitignored und darf nie ins Repository.

### Schritt 3 – OCR-Modell herunterladen (einmalig, ~10 MB)

```bash
npm run data:ocr
```

Lädt `deu.traineddata` nach `public/tesseract/`. Schlägt fehl bei keiner Internetverbindung.
Das Modell ist ebenfalls gitignored – muss auf jedem Deploy-System einmalig laufen.

### Schritt 4 – Datenpipeline ausführen

```bash
npm run data
```

Liest aus `scripts/input/` und erzeugt:
- `src/data/data.json`
- `src/data/atc_index.json`
- `src/data/atc_group_map.json`

Exit ≠ 0 = Validierungsfehler → Build abbrechen, Inputs prüfen.

> **Wichtig:** `scripts/seed.json` ist der kanonische Input für Substanzen/Gruppen.
> Niemals `src/data/data.json` direkt editieren.

### Schritt 5 – Frontend bauen

```bash
npm run build
```

Erzeugt `dist/` mit PWA-Assets, Service Worker und Workbox-Cache-Config.
`VITE_KI_PROXY_URL` aus `.env.local` wird zur Build-Zeit eingebettet.

### Schritt 6a – Szenario A: Static Hosting (ohne KI)

`dist/` auf ein beliebiges Static-Hosting deployen:

**Netlify / Vercel:**
```bash
# Netlify
netlify deploy --prod --dir=dist

# Vercel
vercel --prod
```

**nginx:**
```nginx
server {
    root /var/www/wirkstoff-lookup/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

> KI-Features (`cloudPackung`, `cloudPlan`) stehen in `src/config.js` auf `true`.
> Ist der Proxy nicht erreichbar, zeigt die App eine Fehlermeldung – lokale Suche
> funktioniert weiterhin vollständig.

### Schritt 6b – Szenario B: Full Stack (mit KI)

Der ki-proxy muss als dauerhafter Node-Prozess laufen **und** Schreibzugriff auf
`public/data/extras-runtime.json` haben (Enrich-Cache).

**Auf einem VPS (empfohlen: PM2):**

```bash
npm install -g pm2

# ki-proxy starten
pm2 start server/ki-proxy.mjs --name ki-proxy --node-args="--env-file=.env.local"
pm2 save
pm2 startup   # Autostart bei Reboot

# Static files über nginx servieren (Konfig wie oben)
# ki-proxy über nginx reverse-proxyen:
```

Nginx-Ergänzung für ki-proxy:
```nginx
location /ki {
    proxy_pass http://localhost:8787/ki;
}
location /enrich {
    proxy_pass http://localhost:8787/enrich;
}
```

**Auf Railway / Render:**
- Build Command: `npm install && npm run data:ocr && npm run data && npm run build`
- Start Command: `node server/ki-proxy.mjs`
- Static files separat oder via Express servieren
- Env vars im Dashboard eintragen

### Schritt 7 – Smoke-Test

```bash
# Health-Check ki-proxy
curl https://deine-domain.de/health
# Erwartete Antwort: {"ok":true,"hasKey":true}

# PWA-Check
# → Chrome DevTools → Lighthouse → PWA-Audit
# → Offline-Modus: Netzwerk deaktivieren, Reload → App muss laden
# → OCR: Kamera-Test mit Medikamentenpackung
```

---

## Aktueller Projektstatus (was bereits vorhanden ist)

| Artefakt | Status |
|---|---|
| `dist/` | ✅ Build vorhanden |
| `dist/tesseract/deu.traineddata` | ✅ OCR-Modell vorhanden |
| `dist/data/extras-runtime.json` | ✅ Enrich-Cache vorhanden |
| `src/data/*.json` | ✅ Datenpipeline-Output vorhanden |
| `.env.local` | ✅ Konfiguriert |
| `scripts/input/` | ⚠️ Prüfen ob wido-atc.zip + top250.csv liegen |

Ein neuer Build (Schritt 5) auf einem frischen System braucht zwingend Schritte 3 & 4.
Der aktuelle `dist/` im Repo kann direkt für Szenario A verwendet werden.

---

## Rechtlicher Hinweis für Produktivbetrieb mit Patientendaten

Vor dem Einsatz mit Drittdaten (Patientenpläne etc.):
- AVV mit Anthropic abschließen
- EU-Hosting sicherstellen (Anthropic EU-Endpunkt)
- Rechtsgrundlage nach DSGVO klären (§6 Konzept)

Im aktuellen Self-Test-Modus: **nur eigene Packungen / eigene Pläne**.
