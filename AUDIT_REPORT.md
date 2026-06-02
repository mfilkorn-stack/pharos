# Pharos — Web App Audit (Funktion · UI/UX · Sicherheit)

_Audit-Datum: 2026-06-02 · Stand: `main` @ `95b77b0` · Stack: Vite 8 / React 19 PWA + Express-Proxy + Caddy (Hetzner, www.pharos.team)_

## Executive Summary

**Gesamtbewertung:** Solide, gut strukturierte App mit sauberem Design-System und 0 verwundbaren Dependencies — die ernsten Punkte sind **ungeschützte, kostenpflichtige KI-Endpunkte (Denial-of-Wallet)**, **fehlende HTTP-Security-Header** sowie ein **stillschweigend totes Lookup-Tier (leerer `atc_index.json`)**.

**Findings nach Severity (ohne positive Bestätigungen):**

| | Critical | High | Medium | Low |
|---|---|---|---|---|
| Phase 1 – Funktion | 1 | 2 | 3 | 3 |
| Phase 2 – UI/UX | 2 | 4 | 6 | 7 |
| Phase 3 – Sicherheit | 1 | 2 | 3 | — |
| **Gesamt** | **4** | **8** | **12** | **10** |

`npm audit`: **0 Vulnerabilities** (critical/high/moderate/low = 0). Keine XSS-Sinks (`dangerouslySetInnerHTML`/`eval`/`innerHTML` = 0). Keine hardcoded Secrets. Kein Path-Traversal-Vektor.

**Top-Hebel:** 1 Caddy-`header`-Block + Auth/Rate-Limit vor `handle @api` schließt das gesamte schwere Sicherheits-Cluster (C1+H1+H2). Funktional: `atc_index.json` befüllen.

---

## Phase 1 — Fehlfunktionen & Logikfehler

### 🔴 Critical
**P1-1 · Leerer `atc_index.json` → Tier-0b-Lookup tot**
`src/modules/lexikon/data/atc_index.json` = `[]` (2 Bytes, verifiziert). In `src/modules/lexikon/lib/lookup.js:11–31` findet `atcIndex.find(...)` daher nie etwas → der gesamte generische ATC→Gruppe-Pfad (`source:"0b"`) ist unerreichbar. Ein dokumentiertes Feature schlägt lautlos fehl.
**Fix:** `scripts/build-data.mjs` so erweitern, dass `atc_index.json` befüllt wird, oder Tier-0b entfernen.

### 🟠 High
**P1-2 · Modell-Inkonsistenz in `enrich.mjs`**
`server/enrich.mjs:49` hardcodiert `model: "claude-sonnet-4-5"` (verifiziert), während alles andere `ANTHROPIC_MODEL || "claude-sonnet-4-6"` nutzt. Bei Modell-Deprecation fällt nur `/enrich` aus.
**Fix:** Modell durchreichen: `enrich(name, { anthropic, model })` und `model` statt Literal verwenden.

**P1-3 · Scanner: Kamera-Cleanup beim Retry verloren**
`src/modules/lexikon/components/Scanner.jsx:28–34` — `resetForRetry()` ruft `startCamera()`, verwirft aber den Cancel-Callback; der `useEffect`-Cleanup (Z. 79) kennt nur den ersten Stream → möglicher Doppel-Stream/Track-Leak.
**Fix:** Cancel in einer Ref halten und in `stopCamera`/Cleanup aufrufen.

### 🟡 Medium
**P1-4 · Codefence-Stripping zu eng** — `server/ki-proxy.mjs:117`, `server/enrich.mjs:54`: `/^```json\s*/i` greift nicht bei ```` ``` ```` ohne `json`-Label → `JSON.parse` wirft → `/ki` still `[]`, `/enrich` `null`. **Fix:** `/^```(?:json)?\s*/i`.

**P1-5 · Toter Synonym-Block** — `server/enrich.mjs:163–167`: `synSet`-Schleife ist ein No-op (`synSet` wird nie gelesen); echte Dedup folgt erst danach. **Fix:** Block löschen.

**P1-6 · ConfirmList Key-Kollision** — `ConfirmList.jsx:43` `key={`u:${name}`}` bricht bei doppelten unmatched-Namen (React-Key-Warning). **Fix:** Index anhängen: `key={`u:${name}:${i}`}`.

### 🟢 Low
**P1-7 · Tote Komponenten** — `Sidebar.jsx`, `Header.jsx` (hardcoded `v1.1`), `MobileHeader.jsx`, `ResultRow.jsx` werden nirgends importiert. **Fix:** löschen.
**P1-8 · Debug-Log in Prod** — `enrich.mjs:55` loggt rohen KI-Output (siehe auch Sicherheit M1).
**P1-9 · String-Proxy-Deps** in `SaaCheck.jsx:21,26` (funktional ok, Lint-Warnung).

---

## Phase 2 — UI/UX-Qualität

> Kernbefund: Das **Lexikon** folgt dem Design-System sauber. Der **Trainer** wurde parallel/vorher gebaut und umgeht es weitgehend (kein `Button`, keine Fokus-States, Inline-Hex).

### 🔴 Critical
**P2-1 · Trainer umgeht das UI-System** — `src/modules/trainer/Trainer.jsx` (Buttons Z. 282/319/371/384/507/606/720/878/…): native `<button>` mit Inline-Klassen statt `Button`. Folge: **kein** `focus-visible:ring` (Tastaturnutzer sehen keinen Fokus), abweichendes `disabled`-Pattern, Icon-Buttons < 44px Touch-Target. **Fix:** `Button` verwenden; CTAs größer; Icon-Buttons ≥ `h-11 w-11`.

**P2-2 · Trainer-Start-Checks nicht a11y-konform** — `Trainer.jsx:643–661`: Checkboxen sind `<button>` ohne `role="checkbox"`/`aria-checked`; Screenreader liest nur „Button". **Fix:** `role="checkbox" aria-checked` oder echtes `<input type="checkbox" class="sr-only">`.

### 🟠 High
**P2-3 · `sm:flex-2` existiert nicht** — `ConsentGate.jsx:85` (verifiziert): keine gültige Tailwind-Klasse → primärer „Verstanden"-Button bekommt ab `sm` keine Breite, wird vom „Ablehnen"-Button schmal gedrückt. **Fix:** `sm:flex-[2]` oder `sm:flex-1`.

**P2-4 · Unechte Empty-States** — `Lexikon.jsx:453`: leere Favoriten/Verlauf rendern `Kein Treffer für „"`. **Fix:** echte Empty-States („Noch keine Favoriten — tippe auf den Stern", „Noch nichts geöffnet").

**P2-5 · Scanner-Overlay ohne Esc/Scroll-Lock/Fokus-Trap** — `Scanner.jsx:119`: anders als `SlideOver` kein `Esc`, kein Body-Scroll-Lock, kein `role="dialog"`/`aria-modal`. **Fix:** Esc-Listener + `body.overflow=hidden` + Dialog-Rollen analog `SlideOver`.

**P2-6 · Verschachtelte interaktive Elemente** — `ResultCard.jsx:143–157`: Favoriten-`span[role=button]` liegt im Karten-`<button>` (Z. 55) = invalides HTML, unzuverlässige Tab-Reihenfolge. **Fix:** Karte als `div[role=button]` + separater echter Stern-`<button>`.

### 🟡 Medium
**P2-7 · 4 tote Komponenten-Dateien** (`MobileHeader/ResultRow/Sidebar/Header`) → löschen.
**P2-8 · Trainer nutzt Inline-Hex** statt Tokens (`#22D3EE`, `#94A3B8`, Score-Farben …) — bricht bei Token-Änderung. (Datengetriebene `sc.accent` sind ok.)
**P2-9 · Drogen-Empty-State fehlt** (`Lexikon.jsx:425–439`).
**P2-10 · Disabled-Submit ohne Erklärung** — `Trainer.jsx:720` (Tooltip „Mindestens eine Sektion ausfüllen").
**P2-11 · Such-Sackgasse bei 1–2 Zeichen** — kein Treffer, kein Hinweis/Aktion (`Lexikon.jsx:454`).
**P2-12 · `⌘K`-Hint ohne Funktion** — `SearchBar.jsx:105`: kein globaler Shortcut implementiert → Fake-Affordance. **Fix:** implementieren oder entfernen.

### 🟢 Low
P2-13 `QuickFilters` baut Chips inline statt `ui/Chip` (abweichende Optik). · P2-14 Inaktive Chip-Textfarben uneinheitlich (`text-secondary` vs `text-primary`). · P2-15 Kategorien als Emoji statt monolineare Icons (plattformabhängig). · P2-16 `BottomTabBar`-Badge-Position per `calc()` fragil. · P2-17 Trainer-Score-Mono-Text grenzwertiger WCAG-Kontrast. · P2-18 `MagnifyingGlassIcon` == `SearchIcon` (redundant). · P2-19 Drei verschiedene „Section"-Konzepte (`ui/Section`, lokale in `ResultDetail`/`SaaDetail`).

---

## Phase 3 — Sicherheit (OWASP Top 10:2025)

### 🔴 Critical
**P3-C1 · Unauthentifizierte, kostenintensive KI-Endpunkte (Denial-of-Wallet)**
`A01 Broken Access Control` + `A07` · CWE-770 / CWE-799
`server/ki-proxy.mjs` `/ki`, `/enrich`, `/saa-check`, `/saa-matrix`, `/uebergabe/parse|evaluate` sind über Caddy (`deploy/Caddyfile`) **öffentlich, ohne Auth, ohne Rate-Limit**. `/ki` akzeptiert 20 MB Bilder (`:78`), `/enrich` triggert zusätzlich `web_search` (`verify.mjs`). Jeder Anonyme kann unbegrenzt Anthropic-Kosten erzeugen.
**Fix:** (a) Caddy `basic_auth`/Shared-Token vor `handle @api`; (b) Rate-Limit pro IP (caddy-ratelimit oder `express-rate-limit`); (c) Anthropic-Budget-Cap im Account; (d) `express.json` limit auf ~6 MB senken.

### 🟠 High
**P3-H1 · CORS erlaubt jede Origin** — `A05` · CWE-942
`server/ki-proxy.mjs:77` `cors({ origin: true })` (verifiziert) reflektiert jede Origin → Drittseiten können den Proxy aus dem Opfer-Browser nutzen (verstärkt C1). Client+Proxy teilen dieselbe Domain → CORS faktisch unnötig.
**Fix:** `cors({ origin: "https://www.pharos.team" })` oder ganz entfernen.

**P3-H2 · Keine HTTP-Security-Header** — `A05` · CWE-693 / CWE-1021
`deploy/Caddyfile` setzt **keine** Header (verifiziert: 0 Treffer): kein CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-/Permissions-Policy. App nutzt Kamera (`getUserMedia`) → Clickjacking-Risiko; ohne CSP keine XSS-Tiefenverteidigung.
**Fix:** `header`-Block in Caddyfile (HSTS, `X-Frame-Options DENY`/`frame-ancestors 'none'`, `X-Content-Type-Options nosniff`, Referrer-Policy, `Permissions-Policy camera=(self) microphone=(self)`, CSP mit `worker-src 'self' blob:` für Tesseract/zxing, `img-src 'self' data: blob:`, Google-Fonts-Domains). CSP vor Aktivierung gegen die echte App testen.

### 🟡 Medium
**P3-M1 · Substanznamen im Klartext-Log (DSGVO)** — `A09` · CWE-532
`enrich.mjs:55/59/81`, `ki-proxy.mjs` (Status-Logs) loggen Med-/Wirkstoffnamen → landen via systemd in `journalctl`. Mittelbar gesundheitsbezogen (Art. 9 DSGVO), obwohl App „keine Patientendaten" bewirbt. (Bilder/Transkripte werden **nicht** geloggt — gut.)
**Fix:** Debug-Logs hinter `DEBUG`-Flag; Namen in Status-Logs auf IDs reduzieren; journald-Retention begrenzen.

**P3-M2 · Prompt-Injection (persistiert)** — `A03` · CWE-1427
`enrich.mjs:27` (`name`), `ki-proxy.mjs` `transcript`/`scenario` werden ungefiltert in Prompts interpoliert. Output ist schema-validiert (kein Stored-XSS), aber `/enrich`-Ergebnis wird in `extras-runtime.json` persistiert und allen Nutzern serviert → Verfälschung medizinischer Inhalte möglich.
**Fix:** Längenlimits (`name` ~100, `transcript` ~5000); User-Input als Daten kapseln (Delimiter); Zeichensatz für `name` whitelisten.

**P3-M3 · `/saa-matrix` ohne `if (!anthropic)`-Guard** — `A01` · CWE-770
Inkonsistent zu allen anderen Endpunkten; reiht anonyme Requests in die KI-Queue (Teil von C1).
**Fix:** Key-Guard + unter das Rate-Limit von C1.

### 🟢 Geprüft — kein Fund (positiv)
- **Path Traversal (CWE-22):** Datei-Keys via `normName`/`normKey` auf `[a-z0-9]` reduziert → kein `.`/`/`/`\`. **Safe.**
- **localStorage (A02):** nur Consent-Hash + Substanz-IDs, kein PII/Token.
- **Secrets (A02):** Key nur aus `process.env`; `.env.local` gitignored & nicht getrackt; `/health` gibt nur `hasKey:boolean`.
- **SSRF:** Wikipedia-Fetch fest auf `*.wikipedia.org`, Web-Search auf `allowed_domains` begrenzt.
- **A06 Dependencies:** `npm audit` = 0/0/0/0.
- **A07 Auth/Session:** kein Auth-Konzept (bewusst) → genau deshalb ist C1 (Zugriffsschutz/Rate-Limit) der kritischste Punkt.

---

## Empfohlene Reihenfolge (Aufwand → Wirkung)
1. **P3-H2 + P3-H1** — Caddy `header`-Block + CORS einschränken (klein, hohe Wirkung).
2. **P3-C1** — Rate-Limit/Token vor `@api` + Anthropic-Budget-Cap (verhindert Kosten-DoS).
3. **P1-1** — `atc_index.json` befüllen (totes Feature).
4. **P2-3 / P2-4 / P2-7** — `sm:flex-2`-Fix, echte Empty-States, tote Dateien löschen (Quick Wins).
5. **P2-1/P2-2** — Trainer ans Design-System + a11y angleichen (größter UI-Block).
6. **P3-M1** — Med-Namen aus Prod-Logs (DSGVO).
