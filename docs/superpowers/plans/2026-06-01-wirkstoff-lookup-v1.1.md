# Wirkstoff-Lookup v1 + v1.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vite+React PWA als generisches Wirkstoff-Nachschlagewerk mit Offline-Lookup (Tier 0a/0b), Barcode/BMP/OCR-Erkennung und persistentem Consent. KI-Pfad bleibt inaktiv.

**Architecture:** Modular nach Verantwortung (`match`, `atc`, `lookup`, `barcode`, `bmp`, `ocr`, `recognize`, `consent`). UI: ConsentGate → App-Shell (SearchBar + ResultCard) + Scanner-Overlay mit ConfirmList. Daten als Build-Artefakte (3 JSON-Files), nicht zur Laufzeit kuratiert. Service Worker (Workbox) precacht App-Shell, cached Daten an `dataVersion` gebunden, OCR-Modell + zxing-wasm lazy CacheFirst.

**Tech Stack:** Vite, React 18, `vite-plugin-pwa` (Workbox), `zxing-wasm`, `tesseract.js`, Vitest. Pipeline: Node 20+, `adm-zip`, `csv-parse`.

**Quellen-MVP:** `/Users/matthiasf/Downloads/WirkstoffLookup.jsx` — Domänenlogik (`norm`, `lev`, `scoreEntry`, `resolve`, `resolveMulti`), `GROUPS`, `RAW` (48 Substanzen), CSS und UI-Markup werden weitgehend übernommen und nur modularisiert.

**Spec:** `docs/superpowers/specs/2026-06-01-wirkstoff-lookup-v1.1-design.md`

---

## Task 1: Projekt-Scaffold (Vite + React + PWA + Vitest)

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `public/manifest.webmanifest`, `src/main.jsx`, `src/App.jsx`, `src/config.js`, `.gitignore`, `vitest.config.js`

- [ ] **Step 1: Init package.json**

Run im Repo-Root `/Users/matthiasf/wirkstoff-lookup/`:
```bash
npm init -y
```

- [ ] **Step 2: Dependencies installieren**

```bash
npm i react react-dom
npm i -D vite @vitejs/plugin-react vite-plugin-pwa vitest jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: `.gitignore`**

```
node_modules
dist
.DS_Store
*.log
.env
.env.local
scripts/input/
scripts/cache/
```

- [ ] **Step 4: `vite.config.js`**

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["manifest.webmanifest"],
      manifest: {
        name: "Wirkstoff-Lookup",
        short_name: "Wirkstoff",
        start_url: "/",
        display: "standalone",
        background_color: "#0b1220",
        theme_color: "#0b1220",
        icons: [],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,webmanifest}"],
        runtimeCaching: [
          {
            urlPattern: /\/src\/data\/.+\.json$/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "wirkstoff-data-v1" },
          },
          {
            urlPattern: /\/tesseract\/.+\.traineddata$/,
            handler: "CacheFirst",
            options: { cacheName: "wirkstoff-ocr-models", expiration: { maxEntries: 4 } },
          },
          {
            urlPattern: /zxing.*\.wasm$/,
            handler: "CacheFirst",
            options: { cacheName: "wirkstoff-zxing" },
          },
        ],
      },
    }),
  ],
});
```

- [ ] **Step 5: `vitest.config.js`**

```js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.js"],
  },
});
```

- [ ] **Step 6: `tests/setup.js`**

```js
import "@testing-library/jest-dom";
```

- [ ] **Step 7: `index.html`**

```html
<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="theme-color" content="#0b1220" />
    <title>Wirkstoff-Lookup</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 8: `public/manifest.webmanifest`**

```json
{
  "name": "Wirkstoff-Lookup",
  "short_name": "Wirkstoff",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0b1220",
  "theme_color": "#0b1220",
  "icons": []
}
```

- [ ] **Step 9: `src/config.js`**

```js
export const config = {
  dataVersion: "2026.1",
  consentVersion: "1.0",
  flags: {
    ocrEnabled: true,
    cloudPackung: false,
    cloudPlan: false,
  },
  kiProxyUrl: import.meta.env.VITE_KI_PROXY_URL || "",
};
```

- [ ] **Step 10: `src/App.jsx` Stub**

```jsx
export default function App() {
  return <div style={{ padding: 24, color: "#e6edf6", background: "#0b1220", minHeight: "100vh", fontFamily: "system-ui" }}>Wirkstoff-Lookup — Scaffold OK</div>;
}
```

- [ ] **Step 11: `src/main.jsx`**

```jsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);
```

- [ ] **Step 12: `package.json` scripts**

Im `package.json` `scripts` ergänzen:
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest",
  "data": "node scripts/build-data.mjs"
}
```

- [ ] **Step 13: Build + Smoke-Test**

```bash
npm run build
```
Expected: `dist/` mit `index.html` + Service Worker (`sw.js`) erzeugt, keine Errors.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "scaffold: Vite+React+PWA+Vitest skeleton"
```

---

## Task 2: `lib/match.js` (TDD-Port der Matching-Engine)

**Files:**
- Create: `src/lib/match.js`, `tests/match.test.js`

**Quelle:** MVP `/Users/matthiasf/Downloads/WirkstoffLookup.jsx` Zeilen 282–356 (`norm`, `lev`, `scoreEntry`, `resolve`, `resolveMulti`). API leicht angepasst: `resolve` und `resolveMulti` nehmen den Datenbestand als Argument (keine globale `DB`).

- [ ] **Step 1: Test schreiben (failing)**

`tests/match.test.js`:
```js
import { describe, it, expect } from "vitest";
import { norm, lev, scoreEntry, resolve, resolveMulti } from "../src/lib/match.js";

const DB = [
  { id: "apixaban", wirkstoff: "Apixaban", synonyms: ["Eliquis"] },
  { id: "metoprolol", wirkstoff: "Metoprolol", synonyms: ["Beloc", "Beloc-Zok"] },
  { id: "ibuprofen", wirkstoff: "Ibuprofen", synonyms: ["Nurofen"] },
];

describe("norm", () => {
  it("lowercases, strips diacritics and non-alphanumerics", () => {
    expect(norm("Acetylsalicylsäure")).toBe("acetylsalicylsaure");
    expect(norm("  Beloc-Zok  ")).toBe("beloczok");
    expect(norm("")).toBe("");
  });
});

describe("lev", () => {
  it("returns edit distance", () => {
    expect(lev("kitten", "sitting")).toBe(3);
    expect(lev("abc", "abc")).toBe(0);
    expect(lev("", "abc")).toBe(3);
  });
});

describe("scoreEntry", () => {
  it("scores exact wirkstoff match as 1", () => {
    expect(scoreEntry("Apixaban", DB[0])).toBe(1);
  });
  it("scores synonym as 1 when exact", () => {
    expect(scoreEntry("Eliquis", DB[0])).toBe(1);
  });
  it("tolerates typos", () => {
    expect(scoreEntry("Apixban", DB[0])).toBeGreaterThan(0.7);
  });
});

describe("resolve", () => {
  it("returns sorted candidates above threshold", () => {
    const r = resolve("metoprolol", DB);
    expect(r[0].entry.id).toBe("metoprolol");
    expect(r[0].score).toBe(1);
  });
  it("returns [] for nonsense", () => {
    expect(resolve("zzzzzzzzz", DB)).toEqual([]);
  });
});

describe("resolveMulti", () => {
  it("splits lines and dedupes matched hits", () => {
    const r = resolveMulti("Apixaban\nApixaban\nIbuprofen", DB);
    expect(r.matched.map((e) => e.id)).toEqual(["apixaban", "ibuprofen"]);
    expect(r.unmatched).toEqual([]);
  });
  it("collects unmatched lines", () => {
    const r = resolveMulti("Apixaban\nzzzzz", DB);
    expect(r.matched.map((e) => e.id)).toEqual(["apixaban"]);
    expect(r.unmatched).toEqual(["zzzzz"]);
  });
});
```

- [ ] **Step 2: Test ausführen, Fail bestätigen**

```bash
npm test -- match
```
Expected: FAIL — Modul existiert nicht.

- [ ] **Step 3: Implementierung `src/lib/match.js`**

```js
export function norm(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const d = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
    }
  }
  return d[m][n];
}

export function scoreEntry(token, entry) {
  const t = norm(token);
  if (!t) return 0;
  const synonyms = entry.synonyms || entry.handelsnamen || [];
  const cands = [entry.wirkstoff, ...synonyms].map(norm);
  let best = 0;
  for (const c of cands) {
    if (!c) continue;
    let s;
    if (c === t) s = 1;
    else if (c.includes(t) || t.includes(c)) s = 0.85;
    else s = 1 - lev(t, c) / Math.max(t.length, c.length);
    if (s > best) best = s;
  }
  return best;
}

export function resolve(input, db) {
  const tokens = (input || "").split(/[\s,;\n]+/).filter((x) => x.length >= 3);
  const probe = tokens.length ? tokens : [input];
  return db.map((entry) => {
    let best = 0;
    for (const tok of probe) {
      const s = scoreEntry(tok, entry);
      if (s > best) best = s;
    }
    return { entry, score: best };
  })
    .filter((x) => x.score >= 0.55)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

export function resolveMulti(text, db) {
  const lines = (text || "").split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const matched = [];
  const unmatched = [];
  const seen = new Set();
  for (const line of lines) {
    const top = resolve(line, db)[0];
    if (top && top.score >= 0.6) {
      if (!seen.has(top.entry.id)) {
        seen.add(top.entry.id);
        matched.push(top.entry);
      }
    } else {
      unmatched.push(line);
    }
  }
  return { matched, unmatched };
}
```

- [ ] **Step 4: Tests grün**

```bash
npm test -- match
```
Expected: PASS, alle 9 Tests grün.

- [ ] **Step 5: Commit**

```bash
git add src/lib/match.js tests/match.test.js
git commit -m "feat(match): port fuzzy resolver from MVP with tests"
```

---

## Task 3: `lib/atc.js` (PZN-Parser + Gruppen-Auflösung, TDD)

**Files:**
- Create: `src/lib/atc.js`, `tests/atc.test.js`

- [ ] **Step 1: Tests schreiben**

`tests/atc.test.js`:
```js
import { describe, it, expect } from "vitest";
import { parsePznFromGtin, groupForAtc } from "../src/lib/atc.js";

describe("parsePznFromGtin", () => {
  it("parses 8-digit PZN from NTIN-prefixed GTIN-14", () => {
    // GTIN-14: 0 4150 12345678 C  => PZN 12345678
    expect(parsePznFromGtin("04150123456785")).toBe("12345678");
  });
  it("returns null for non-NTIN GTIN", () => {
    expect(parsePznFromGtin("04006381333931")).toBeNull();
  });
  it("returns null for malformed input", () => {
    expect(parsePznFromGtin("")).toBeNull();
    expect(parsePznFromGtin("abc")).toBeNull();
    expect(parsePznFromGtin(null)).toBeNull();
  });
  it("accepts 13-digit GTIN by left-padding to 14", () => {
    expect(parsePznFromGtin("4150123456785")).toBe("12345678");
  });
});

describe("groupForAtc", () => {
  const MAP = {
    "B01AF": "doak",
    "B01AA": "vka",
    "C07": "betablocker",
    "C09A": "acehemmer",
    "C09AA": "acehemmer",
  };
  it("longest matching prefix wins", () => {
    expect(groupForAtc("C09AA05", MAP)).toBe("acehemmer");
  });
  it("matches by exact prefix", () => {
    expect(groupForAtc("C07AB02", MAP)).toBe("betablocker");
  });
  it("returns null when no prefix matches", () => {
    expect(groupForAtc("Z99XX99", MAP)).toBeNull();
  });
  it("returns null for empty input", () => {
    expect(groupForAtc("", MAP)).toBeNull();
    expect(groupForAtc(null, MAP)).toBeNull();
  });
});
```

- [ ] **Step 2: Fail bestätigen**

```bash
npm test -- atc
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implementierung `src/lib/atc.js`**

```js
const NTIN_PREFIX = "04150";

export function parsePznFromGtin(gtin) {
  if (!gtin || typeof gtin !== "string") return null;
  const digits = gtin.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 14) return null;
  const g14 = digits.length === 13 ? "0" + digits : digits;
  if (!g14.startsWith(NTIN_PREFIX)) return null;
  return g14.slice(5, 13);
}

export function groupForAtc(atc, map) {
  if (!atc || typeof atc !== "string") return null;
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (atc.startsWith(k)) return map[k];
  }
  return null;
}
```

- [ ] **Step 4: Tests grün**

```bash
npm test -- atc
```
Expected: PASS, 8 Tests grün.

- [ ] **Step 5: Commit**

```bash
git add src/lib/atc.js tests/atc.test.js
git commit -m "feat(atc): NTIN→PZN parser and longest-prefix group resolver"
```

---

## Task 4: Seed-Daten aus MVP nach `src/data/data.json` (Tier 0a)

**Files:**
- Create: `src/data/data.json`, `scripts/seed-from-mvp.mjs` (einmalig nutzbar)

Hintergrund: Die 48 Substanzen + `GROUPS` aus dem MVP werden in das JSON-Schema aus Spec §4 überführt. Bis `build-data.mjs` (Task 6) scharf ist, ist diese Seed-Datei die `data.json`.

- [ ] **Step 1: `scripts/seed-from-mvp.mjs` schreiben**

```js
// Einmaliger Konverter: liest GROUPS+RAW aus dem MVP-File via dynamic import nicht praktikabel,
// daher hartkodierter Re-Export. Quelle: /Users/matthiasf/Downloads/WirkstoffLookup.jsx Zeilen 20-260.
// Dieses Skript dient nur dem Erstbefüllen; danach übernimmt build-data.mjs.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const GROUPS = /* GROUPS-Objekt aus MVP Zeile 20-208 */ null;
const RAW = /* RAW-Array aus MVP Zeile 211-260 */ null;

if (!GROUPS || !RAW) {
  console.error("Bitte GROUPS und RAW aus /Users/matthiasf/Downloads/WirkstoffLookup.jsx einkopieren.");
  process.exit(1);
}

const substances = RAW.map((e) => ({
  id: e.id,
  wirkstoff: e.wirkstoff,
  synonyms: e.handelsnamen || [],
  atc: e.atc,
  group: e.group,
  indikationen: e.indikationen,
  extra: e.extra || [],
  quelle: "MVP-Seed",
  stand: "2026-05",
}));

const out = {
  version: "2026.1-seed",
  groups: GROUPS,
  substances,
};

const target = "src/data/data.json";
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify(out, null, 2));
console.log(`Wrote ${substances.length} substances + ${Object.keys(GROUPS).length} groups → ${target}`);
```

- [ ] **Step 2: GROUPS und RAW aus MVP übernehmen**

Im Skript die Platzhalter `/* GROUPS-Objekt … */` und `/* RAW-Array … */` durch die wörtlichen Konstanten aus `/Users/matthiasf/Downloads/WirkstoffLookup.jsx` (Zeilen 20–208 bzw. 211–260) ersetzen.

- [ ] **Step 3: Ausführen**

```bash
node scripts/seed-from-mvp.mjs
```
Expected: `Wrote 48 substances + 30 groups → src/data/data.json`

- [ ] **Step 4: Sanity-Check**

```bash
node -e "const d=require('./src/data/data.json'); console.log(d.substances.length, Object.keys(d.groups).length, d.substances[0].wirkstoff);"
```
Expected: `48 30 Apixaban`

- [ ] **Step 5: Platzhalter-Files für atc_index und atc_group_map**

`src/data/atc_index.json`:
```json
[]
```

`src/data/atc_group_map.json`:
```json
{}
```

- [ ] **Step 6: Commit**

```bash
git add src/data scripts/seed-from-mvp.mjs
git commit -m "data: seed data.json from MVP (48 substances, 30 groups)"
```

---

## Task 5: Minimal-UI — SearchBar + ResultCard + App (zeigt 48 Seed-Substanzen)

**Files:**
- Create: `src/components/SearchBar.jsx`, `src/components/ResultCard.jsx`, `src/styles.js`
- Modify: `src/App.jsx`

CSS aus MVP `/Users/matthiasf/Downloads/WirkstoffLookup.jsx` Zeile 753–833 in `src/styles.js` als exportierten `CSS`-String übernehmen.

- [ ] **Step 1: `src/styles.js`**

```js
// Quelle: MVP Zeile 753-833 (CSS-Array.join("\n")).
// 1:1 übernommen; spätere UI-Erweiterungen ergänzen hier.
export const CSS = [
  // ... vollständigen Array-Inhalt aus MVP-File übernehmen ...
].join("\n");
```
Den vollständigen Array-Inhalt (alle CSS-Strings) aus dem MVP-File 1:1 einsetzen.

- [ ] **Step 2: `src/components/ResultCard.jsx`**

```jsx
const LEVEL_STYLE = {
  hoch: { label: "HOCH", cls: "lvl-hoch" },
  mittel: { label: "MITTEL", cls: "lvl-mittel" },
  info: { label: "INFO", cls: "lvl-info" },
};

export default function ResultCard({ item, badge }) {
  return (
    <article className="card">
      <header className="card-head">
        <div>
          <h2 className="card-title">{item.wirkstoff}</h2>
          <p className="card-sub">{(item.synonyms || []).join(" · ")}</p>
        </div>
        <span className="atc" title="ATC-Code">{item.atc}</span>
      </header>
      <div className="gruppe">{item.gruppe}</div>
      {badge ? <div className="badge-generic">generische Gruppeninfo</div> : null}
      <div className="block">
        <div className="block-label">Typische Indikationen</div>
        <div className="chips">
          {(item.indikationen || []).map((ind, i) => <span key={i} className="chip">{ind}</span>)}
        </div>
      </div>
      <div className="block">
        <div className="block-label">Notfallrelevante Implikationen</div>
        <ul className="notfall">
          {(item.notfall || []).map((n, i) => {
            const s = LEVEL_STYLE[n.level] || LEVEL_STYLE.info;
            return (
              <li key={i} className="notfall-row">
                <span className={`tag ${s.cls}`}>{s.label}</span>
                <span className="notfall-text">{n.text}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </article>
  );
}
```

Zusätzlich im `CSS` (styles.js) Badge-Klasse ergänzen:
```css
.badge-generic{display:inline-block;font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--mittel);border:1px solid var(--mittel);border-radius:5px;padding:2px 7px;margin:0 0 8px;}
```

- [ ] **Step 3: `src/components/SearchBar.jsx`**

```jsx
export default function SearchBar({ value, onChange, onScan, onUpload, count }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">RX</span>
        <span className="brand-name">Wirkstoff-Lookup</span>
        <span className="brand-ver">v1.1</span>
      </div>
      <input
        className="search"
        type="text"
        inputMode="search"
        placeholder="Wirkstoff oder Handelsname suchen …"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus
      />
      <div className="capture-row">
        <button className="cap-btn" onClick={onScan}>Scannen</button>
        <button className="cap-btn" onClick={onUpload}>Hochladen</button>
      </div>
      <div className="count">{count} Einträge</div>
    </header>
  );
}
```

- [ ] **Step 4: `src/App.jsx` neu**

```jsx
import { useState, useMemo } from "react";
import data from "./data/data.json";
import SearchBar from "./components/SearchBar.jsx";
import ResultCard from "./components/ResultCard.jsx";
import { CSS } from "./styles.js";

// Build runtime DB: erbt Gruppen-Notfall + ergänzt extra.
const DB = data.substances.map((e) => {
  const g = data.groups[e.group] || { gruppe: e.group, notfall: [] };
  return {
    id: e.id,
    wirkstoff: e.wirkstoff,
    synonyms: e.synonyms,
    atc: e.atc,
    gruppe: g.gruppe,
    indikationen: e.indikationen,
    notfall: [...g.notfall, ...(e.extra || [])],
  };
});

export default function App() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DB;
    return DB.filter((d) => [d.wirkstoff, d.gruppe, ...d.synonyms].join(" ").toLowerCase().includes(q));
  }, [query]);
  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <SearchBar value={query} onChange={setQuery} onScan={() => alert("Scanner folgt in Task 13")} onUpload={() => alert("Upload folgt in Task 13")} count={results.length} />
        <main className="content">
          {results.length === 0 ? (
            <div className="empty">Kein Treffer für „{query}".</div>
          ) : (
            <div className="grid">
              {results.map((item) => <ResultCard key={item.id} item={item} />)}
            </div>
          )}
        </main>
        <footer className="disclaimer">
          Generische Wirkstoffinformation · kein Medizinprodukt · keine patientenbezogene Entscheidungsgrundlage
        </footer>
      </div>
    </>
  );
}
```

- [ ] **Step 5: Dev-Server smoke-test**

```bash
npm run dev
```
Im Browser `http://localhost:5173` öffnen. Expected: 48 Karten sichtbar, Suche „apix" reduziert auf 1 Treffer.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(ui): SearchBar + ResultCard + 48 seed substances displayed"
```

---

## Task 6: `scripts/build-data.mjs` Pipeline (scharf)

**Files:**
- Create: `scripts/build-data.mjs`, `scripts/atc_group_map.source.json`, `scripts/input/.gitkeep`, `scripts/README.md`

- [ ] **Step 1: Build-Dependencies installieren**

```bash
npm i -D adm-zip csv-parse
```

- [ ] **Step 2: `scripts/atc_group_map.source.json`**

Initial-Inhalt (kuratiert, deckt MVP-Gruppen ab — später erweiterbar):
```json
{
  "B01AF": "doak",
  "B01AE": "doak",
  "B01AA": "vka",
  "B01AC": "tah",
  "C07": "betablocker",
  "C09A": "acehemmer",
  "C09B": "acehemmer",
  "C09C": "sartan",
  "C09D": "sartan",
  "C08": "ca_antagonist",
  "C03D": "kalium_diuretikum",
  "C03C": "schleifendiuretikum",
  "C03A": "thiazid",
  "C01A": "glykosid",
  "C01B": "antiarrhythmikum",
  "A10A": "insulin",
  "A10BA": "biguanid",
  "A10BK": "sglt2",
  "A10BB": "sulfonylharnstoff",
  "C10A": "statin",
  "A02BC": "ppi",
  "R03AC": "saba",
  "H02AB": "glukokortikoid",
  "N03A": "antiepileptikum",
  "N04B": "parkinson",
  "N06AB": "ssri",
  "N05BA": "benzodiazepin",
  "M01A": "nsar",
  "N02A": "opioid",
  "H03A": "schilddruese",
  "G04CA": "alphablocker",
  "R06AA": "antihistaminikum1",
  "J01FA": "makrolid"
}
```

- [ ] **Step 3: `scripts/README.md`**

```markdown
# Build-Pipeline

## Inputs (manuell beschaffen, in `scripts/input/`)

- `wido-atc.zip` — WIdO-ATC-Index ZIP (frei). Falls offene URL: `npm run data -- --fetch-atc`.
- `top250.csv` — Top-250 nach DDD. Format: `wirkstoff,atc?` pro Zeile.
- `extras.json` (optional) — substanzspezifische Notfallhinweise: `{ "<id>": [{ "level": "hoch"|"mittel"|"info", "text": "…" }] }`.

## Lauf

```bash
npm run data
```

Erzeugt: `src/data/data.json`, `src/data/atc_index.json`, `src/data/atc_group_map.json`. Validiert hart; Exit ≠ 0 bei Verstoß.

## Idempotenz

Bei identischen Inputs identische Outputs (deterministische Sortierung).
```

- [ ] **Step 4: `scripts/build-data.mjs`**

```js
#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import AdmZip from "adm-zip";
import { parse as parseCsv } from "csv-parse/sync";

const ROOT = process.cwd();
const IN = join(ROOT, "scripts/input");
const OUT = join(ROOT, "src/data");
const VERSION = "2026.1";

const GROUPS_SEED = JSON.parse(readFileSync(join(OUT, "data.json"), "utf8")).groups;

function norm(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
}

function loadAtcIndex() {
  const zipPath = join(IN, "wido-atc.zip");
  if (!existsSync(zipPath)) {
    console.warn(`[atc] ${zipPath} nicht gefunden — atc_index.json bleibt leer.`);
    return [];
  }
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries().filter((e) => /\.(csv|txt)$/i.test(e.entryName));
  if (!entries.length) throw new Error("Keine CSV/TXT im WIdO-ZIP gefunden.");
  // WIdO-Format ist semikolongetrennt mit Spalten ATC;Wirkstoff;... (Layout kann variieren).
  // Heuristik: ATC = Regex /^[A-Z]\d{2}[A-Z]{0,2}\d{0,2}$/, Wirkstoff = nicht-leere Nachbarspalte.
  const raw = entries[0].getData().toString("latin1");
  const rows = parseCsv(raw, { delimiter: ";", relax_column_count: true, skip_empty_lines: true });
  const atcRe = /^[A-Z]\d{2}([A-Z]{1,2}(\d{1,2})?)?$/;
  const out = [];
  const seen = new Set();
  for (const row of rows) {
    const atc = row.find((c) => atcRe.test((c || "").trim()));
    if (!atc) continue;
    const idx = row.indexOf(atc);
    const name = (row[idx + 1] || row[idx - 1] || "").trim();
    if (!name) continue;
    const key = `${atc}::${norm(name)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ atc: atc.trim(), wirkstoff: name });
  }
  return out.sort((a, b) => a.atc.localeCompare(b.atc) || a.wirkstoff.localeCompare(b.wirkstoff));
}

function loadTop250() {
  const p = join(IN, "top250.csv");
  if (!existsSync(p)) {
    console.warn(`[top250] ${p} nicht gefunden — nur Seed-Substanzen werden verwendet.`);
    return [];
  }
  const raw = readFileSync(p, "utf8");
  const rows = parseCsv(raw, { columns: true, skip_empty_lines: true, trim: true });
  return rows.map((r) => ({ wirkstoff: r.wirkstoff, atc: r.atc || null }));
}

function loadExtras() {
  const p = join(IN, "extras.json");
  if (!existsSync(p)) return {};
  return JSON.parse(readFileSync(p, "utf8"));
}

function groupForAtc(atc, map) {
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  for (const k of keys) if (atc.startsWith(k)) return map[k];
  return null;
}

function mergeSubstances(seedSubs, top250, atcIndex, extras, groupMap) {
  // Seed bleibt erhalten; Top-250 ergänzen, wenn nicht schon im Seed.
  const byNorm = new Map(seedSubs.map((s) => [norm(s.wirkstoff), s]));
  for (const t of top250) {
    const k = norm(t.wirkstoff);
    if (byNorm.has(k)) continue;
    const atc = t.atc || (atcIndex.find((a) => norm(a.wirkstoff) === k) || {}).atc;
    if (!atc) {
      console.warn(`[top250] kein ATC für "${t.wirkstoff}" — übersprungen.`);
      continue;
    }
    const group = groupForAtc(atc, groupMap);
    if (!group) {
      console.warn(`[top250] keine Gruppe für ATC ${atc} (${t.wirkstoff}) — übersprungen.`);
      continue;
    }
    const id = k;
    const xs = extras[id] || [];
    byNorm.set(k, {
      id, wirkstoff: t.wirkstoff, synonyms: [], atc, group,
      indikationen: [], extra: xs, quelle: "Top250+WIdO", stand: "2026-05",
    });
  }
  return [...byNorm.values()].sort((a, b) => a.wirkstoff.localeCompare(b.wirkstoff));
}

function validate(data, atcIndex, groupMap) {
  const errs = [];
  for (const v of Object.values(groupMap)) {
    if (!data.groups[v]) errs.push(`atc_group_map referenziert unbekannte Gruppe "${v}".`);
  }
  const atcSet = new Set(atcIndex.map((x) => x.atc));
  for (const s of data.substances) {
    if (!s.id || !s.wirkstoff || !s.atc || !s.group) errs.push(`Pflichtfeld fehlt: ${JSON.stringify(s)}`);
    if (!data.groups[s.group]) errs.push(`Substanz ${s.id}: Gruppe ${s.group} nicht in groups.`);
    if (atcIndex.length && !atcSet.has(s.atc)) console.warn(`[validate] ${s.id} ATC ${s.atc} nicht in atc_index (Hinweis).`);
  }
  const ids = data.substances.map((s) => s.id);
  if (new Set(ids).size !== ids.length) errs.push("Dublette in substance.id");
  const norms = data.substances.map((s) => norm(s.wirkstoff));
  if (new Set(norms).size !== norms.length) errs.push("Dublette in norm(wirkstoff)");
  return errs;
}

function main() {
  mkdirSync(OUT, { recursive: true });
  const groupMapSrc = JSON.parse(readFileSync(join(ROOT, "scripts/atc_group_map.source.json"), "utf8"));
  const atcIndex = loadAtcIndex();
  const top250 = loadTop250();
  const extras = loadExtras();
  const seed = JSON.parse(readFileSync(join(OUT, "data.json"), "utf8"));
  const substances = mergeSubstances(seed.substances, top250, atcIndex, extras, groupMapSrc);

  const data = { version: VERSION, groups: GROUPS_SEED, substances };
  const errs = validate(data, atcIndex, groupMapSrc);
  if (errs.length) {
    console.error("Validation failed:\n - " + errs.join("\n - "));
    process.exit(1);
  }
  writeFileSync(join(OUT, "data.json"), JSON.stringify(data, null, 2));
  writeFileSync(join(OUT, "atc_index.json"), JSON.stringify(atcIndex, null, 2));
  writeFileSync(join(OUT, "atc_group_map.json"), JSON.stringify(groupMapSrc, null, 2));
  console.log(`OK · ${substances.length} substances · ${atcIndex.length} atc_index · ${Object.keys(groupMapSrc).length} group_map entries`);
}

main();
```

- [ ] **Step 5: Lauf ohne Input-Files (Validierung idempotent)**

```bash
npm run data
```
Expected: Warnungen für fehlende `wido-atc.zip` und `top250.csv`, am Ende `OK · 48 substances · 0 atc_index · 33 group_map entries`, Exit 0.

- [ ] **Step 6: Zweimal hintereinander → identisches Diff**

```bash
npm run data && git diff --stat src/data
```
Expected: leeres Diff oder identische Files (idempotent).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(pipeline): build-data.mjs with validation, atc_group_map source"
```

---

## Task 7: `lib/lookup.js` Tier 0a → 0b (TDD)

**Files:**
- Create: `src/lib/lookup.js`, `tests/lookup.test.js`

API:
```ts
lookup(token, { db, atcIndex, groupMap, groups }) => { hits: LookupHit[], badge?: "generic" }
LookupHit = { id, wirkstoff, synonyms, atc, gruppe, indikationen, notfall, source: "0a" | "0b" }
```

- [ ] **Step 1: Tests schreiben**

`tests/lookup.test.js`:
```js
import { describe, it, expect } from "vitest";
import { lookup } from "../src/lib/lookup.js";

const groups = {
  doak: { gruppe: "DOAK", notfall: [{ level: "hoch", text: "Blutungsrisiko" }] },
  betablocker: { gruppe: "Betablocker", notfall: [{ level: "mittel", text: "Bradykardie" }] },
};
const db = [
  { id: "apixaban", wirkstoff: "Apixaban", synonyms: ["Eliquis"], atc: "B01AF02", group: "doak", indikationen: ["VHF"], notfall: [...groups.doak.notfall] },
];
const atcIndex = [
  { wirkstoff: "Bisoprolol", atc: "C07AB07" },
];
const groupMap = { "B01AF": "doak", "C07": "betablocker" };

describe("lookup tier 0a", () => {
  it("returns full hit for known substance", () => {
    const r = lookup("Apixaban", { db, atcIndex, groupMap, groups });
    expect(r.hits.length).toBeGreaterThan(0);
    expect(r.hits[0].source).toBe("0a");
    expect(r.hits[0].id).toBe("apixaban");
  });
});

describe("lookup tier 0b", () => {
  it("returns generic group hit when not in 0a but in atc_index", () => {
    const r = lookup("Bisoprolol", { db, atcIndex, groupMap, groups });
    expect(r.hits.length).toBe(1);
    expect(r.hits[0].source).toBe("0b");
    expect(r.hits[0].gruppe).toBe("Betablocker");
    expect(r.hits[0].notfall.length).toBe(1);
    expect(r.badge).toBe("generic");
  });
});

describe("lookup manual fallback", () => {
  it("returns empty for unknown token", () => {
    const r = lookup("Zzzzzz", { db, atcIndex, groupMap, groups });
    expect(r.hits).toEqual([]);
  });
});
```

- [ ] **Step 2: Fail bestätigen**

```bash
npm test -- lookup
```
Expected: FAIL.

- [ ] **Step 3: Implementierung `src/lib/lookup.js`**

```js
import { resolve, norm } from "./match.js";
import { groupForAtc } from "./atc.js";

export function lookup(token, { db, atcIndex, groupMap, groups }) {
  // Tier 0a
  const a = resolve(token, db);
  if (a.length) {
    return { hits: a.map((x) => ({ ...x.entry, source: "0a" })) };
  }
  // Tier 0b: name → atc_index → group
  const t = norm(token);
  const idxHit = atcIndex.find((e) => norm(e.wirkstoff) === t || (e.synonyms || []).some((s) => norm(s) === t));
  if (idxHit) {
    const groupId = groupForAtc(idxHit.atc, groupMap);
    if (groupId && groups[groupId]) {
      const g = groups[groupId];
      return {
        hits: [{
          id: norm(idxHit.wirkstoff),
          wirkstoff: idxHit.wirkstoff,
          synonyms: idxHit.synonyms || [],
          atc: idxHit.atc,
          gruppe: g.gruppe,
          indikationen: [],
          notfall: g.notfall,
          source: "0b",
        }],
        badge: "generic",
      };
    }
  }
  return { hits: [] };
}
```

- [ ] **Step 4: Tests grün**

```bash
npm test -- lookup
```
Expected: PASS, 3 Tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/lookup.js tests/lookup.test.js
git commit -m "feat(lookup): Tier 0a→0b orchestration with generic-group badge"
```

---

## Task 8: `consent.js` + `ConsentGate.jsx` + Persistenz

**Files:**
- Create: `src/lib/consent.js`, `src/components/ConsentGate.jsx`, `tests/consent.test.js`
- Modify: `src/App.jsx`

- [ ] **Step 1: Test schreiben**

`tests/consent.test.js`:
```js
import { describe, it, expect, beforeEach } from "vitest";
import { hashText, isAccepted, accept, KEY } from "../src/lib/consent.js";

beforeEach(() => localStorage.clear());

describe("consent", () => {
  it("hashText is stable and not empty", async () => {
    const a = await hashText("hello");
    const b = await hashText("hello");
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(8);
  });
  it("isAccepted false when never accepted", async () => {
    expect(await isAccepted("1.0", "TEXT")).toBe(false);
  });
  it("accept + isAccepted true for same version+text", async () => {
    await accept("1.0", "TEXT");
    expect(await isAccepted("1.0", "TEXT")).toBe(true);
  });
  it("isAccepted false after text change (re-consent)", async () => {
    await accept("1.0", "TEXT-A");
    expect(await isAccepted("1.0", "TEXT-B")).toBe(false);
  });
  it("isAccepted false after version change", async () => {
    await accept("1.0", "TEXT");
    expect(await isAccepted("2.0", "TEXT")).toBe(false);
  });
  it("payload is PII-free", async () => {
    await accept("1.0", "TEXT");
    const raw = JSON.parse(localStorage.getItem(KEY));
    expect(Object.keys(raw).sort()).toEqual(["acceptedAt", "hash", "version"].sort());
  });
});
```

- [ ] **Step 2: Fail bestätigen**

```bash
npm test -- consent
```
Expected: FAIL.

- [ ] **Step 3: `src/lib/consent.js`**

```js
export const KEY = "wirkstoff-lookup.consent";

export async function hashText(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isAccepted(version, text) {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const obj = JSON.parse(raw);
    if (obj.version !== version) return false;
    const h = await hashText(text);
    return obj.hash === h;
  } catch {
    return false;
  }
}

export async function accept(version, text) {
  const hash = await hashText(text);
  localStorage.setItem(KEY, JSON.stringify({ version, hash, acceptedAt: new Date().toISOString() }));
}
```

- [ ] **Step 4: `src/components/ConsentGate.jsx`**

```jsx
import { useState } from "react";
import { config } from "../config.js";
import { accept } from "../lib/consent.js";

export const CONSENT_TEXT = `
Diese App ist ein generisches fachliches Nachschlagewerk zu Arzneistoffen für Rettungsfachpersonal zu Aus- und Fortbildungszwecken. Sie ist kein Medizinprodukt und keine Grundlage für Entscheidungen am Patienten.
Ich gebe keine patientenbezogenen Daten ein (Namen, Geburtsdaten, Befunde, Fotos).
Ich nutze die App nur zum Nachschlagen allgemeiner Wirkstoffinformationen.
Mir ist bewusst, dass die Inhalte allgemeiner Natur sind und keine fachliche Beurteilung im Einzelfall ersetzen.
`.trim();

export default function ConsentGate({ onAccept }) {
  const [denied, setDenied] = useState(false);
  if (denied) {
    return (
      <div className="screen center">
        <div className="gate-card">
          <div className="gate-badge">GESPERRT</div>
          <p className="gate-text">Ohne Zustimmung zur Nutzungsvereinbarung ist die App nicht nutzbar.</p>
          <button className="btn btn-ghost" onClick={() => setDenied(false)}>Zurück</button>
        </div>
      </div>
    );
  }
  const handleAccept = async () => { await accept(config.consentVersion, CONSENT_TEXT); onAccept(); };
  return (
    <div className="screen center">
      <div className="gate-card">
        <div className="kicker">Nutzungsvereinbarung · v{config.consentVersion}</div>
        <p className="gate-text" style={{ whiteSpace: "pre-line" }}>{CONSENT_TEXT}</p>
        <div className="gate-actions">
          <button className="btn btn-ghost" onClick={() => setDenied(true)}>Ablehnen</button>
          <button className="btn btn-primary" onClick={handleAccept}>Verstanden und einverstanden</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: `src/App.jsx` Gate integrieren**

Oben ergänzen:
```jsx
import { useState, useMemo, useEffect } from "react";
import ConsentGate, { CONSENT_TEXT } from "./components/ConsentGate.jsx";
import { isAccepted } from "./lib/consent.js";
import { config } from "./config.js";
```

In `App` State + Effect ergänzen:
```jsx
const [consented, setConsented] = useState(false);
const [checking, setChecking] = useState(true);
useEffect(() => {
  isAccepted(config.consentVersion, CONSENT_TEXT).then((ok) => { setConsented(ok); setChecking(false); });
}, []);
if (checking) return <style>{CSS}</style>;
if (!consented) return (<><style>{CSS}</style><ConsentGate onAccept={() => setConsented(true)} /></>);
```

(Den bestehenden Return-Block der App in den `consented`-Pfad einrücken.)

- [ ] **Step 6: Tests grün**

```bash
npm test -- consent
```
Expected: PASS, 6 Tests.

- [ ] **Step 7: Manueller Reload-Test**

```bash
npm run dev
```
Im Browser: Consent annehmen → Reload → kein Gate. `localStorage.clear()` in DevTools → Reload → Gate erscheint. CONSENT_TEXT in `ConsentGate.jsx` minimal ändern → Reload → Gate erscheint erneut.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(consent): persistent consent with hash-bound re-consent"
```

---

## Task 9: `lib/barcode.js` (BarcodeDetector + zxing-wasm Fallback)

**Files:**
- Create: `src/lib/barcode.js`, `tests/barcode.test.js`

- [ ] **Step 1: zxing-wasm installieren**

```bash
npm i zxing-wasm
```

- [ ] **Step 2: Test schreiben (Unit, mit Mocks)**

`tests/barcode.test.js`:
```js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { detectFromBlob, _resetForTests } from "../src/lib/barcode.js";

beforeEach(() => _resetForTests());

describe("barcode.detectFromBlob", () => {
  it("uses BarcodeDetector when available", async () => {
    globalThis.BarcodeDetector = class {
      constructor() {}
      async detect() { return [{ rawValue: "04150123456785", format: "data_matrix" }]; }
    };
    globalThis.createImageBitmap = async () => ({ close() {} });
    const r = await detectFromBlob(new Blob([]));
    expect(r).toEqual({ rawValue: "04150123456785", format: "data_matrix", engine: "native" });
  });

  it("returns null when no engines available", async () => {
    delete globalThis.BarcodeDetector;
    // Force zxing loader to fail
    vi.doMock("zxing-wasm/reader", () => ({ readBarcodesFromImageData: async () => [] }));
    const r = await detectFromBlob(new Blob([]));
    expect(r).toBeNull();
  });
});
```

- [ ] **Step 3: Fail bestätigen**

```bash
npm test -- barcode
```
Expected: FAIL.

- [ ] **Step 4: Implementierung `src/lib/barcode.js`**

```js
const FORMATS = ["data_matrix", "code_39", "ean_13", "qr_code"];

let zxingMod = null;
async function loadZxing() {
  if (zxingMod) return zxingMod;
  zxingMod = await import("zxing-wasm/reader");
  return zxingMod;
}

export function _resetForTests() { zxingMod = null; }

async function viaNative(blob) {
  if (!("BarcodeDetector" in globalThis)) return null;
  try {
    const det = new globalThis.BarcodeDetector({ formats: FORMATS });
    const bmp = await createImageBitmap(blob);
    const codes = await det.detect(bmp);
    if (bmp.close) bmp.close();
    if (!codes || !codes[0]) return null;
    return { rawValue: String(codes[0].rawValue), format: codes[0].format || "unknown", engine: "native" };
  } catch {
    return null;
  }
}

async function viaZxing(blob) {
  try {
    const { readBarcodesFromImageData } = await loadZxing();
    const bmp = await createImageBitmap(blob);
    const c = document.createElement("canvas");
    c.width = bmp.width; c.height = bmp.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(bmp, 0, 0);
    if (bmp.close) bmp.close();
    const img = ctx.getImageData(0, 0, c.width, c.height);
    const res = await readBarcodesFromImageData(img, { formats: ["DataMatrix", "Code39", "EAN-13", "QRCode"] });
    if (!res || !res[0]) return null;
    return { rawValue: String(res[0].text || res[0].rawValue || ""), format: res[0].format || "unknown", engine: "zxing" };
  } catch {
    return null;
  }
}

export async function detectFromBlob(blob) {
  const a = await viaNative(blob);
  if (a) return a;
  return await viaZxing(blob);
}
```

- [ ] **Step 5: Tests grün**

```bash
npm test -- barcode
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(barcode): BarcodeDetector first, lazy zxing-wasm fallback"
```

---

## Task 10: `lib/bmp.js` (BMP-Data-Matrix Whitelist-Parser, TDD)

**Files:**
- Create: `src/lib/bmp.js`, `tests/bmp.test.js`, `tests/fixtures/bmp-sample.txt`

Hintergrund BMP 2.x Payload-Format (vereinfacht): XML-ähnlich mit Tags `<MP>`, darin Patient `<P>`, Operator `<O>`, mehrere `<S …>`-Medikationszeilen mit Attributen u.a. `w="Wirkstoff"`, `g="Grund"` (Diagnose), `d="Dosis"`, `h="Handelsname"`. Whitelist: nur `w` und `h` extrahieren; `g` (Diagnose), `<P>`-Inhalte (Patient) und `<O>` (Operator) werden im Parser nicht gelesen.

- [ ] **Step 1: Fixture mit Patientendaten + Diagnose**

`tests/fixtures/bmp-sample.txt`:
```
<MP v="029" U="..." l="de-DE">
  <P g="Mustermann" v="Max" b="19550101"/>
  <O n="Praxis Dr. Test"/>
  <S w="Apixaban" h="Eliquis" d="2x5mg" g="Vorhofflimmern"/>
  <S w="Metoprolol" h="Beloc-Zok" d="1x47.5mg" g="Hypertonie"/>
  <S w="Ramipril" d="1x5mg" g="Herzinsuffizienz"/>
</MP>
```

- [ ] **Step 2: Tests schreiben**

`tests/bmp.test.js`:
```js
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { isBmpPayload, parseBmpWhitelist } from "../src/lib/bmp.js";

const sample = readFileSync("tests/fixtures/bmp-sample.txt", "utf8");

describe("isBmpPayload", () => {
  it("detects BMP root tag", () => {
    expect(isBmpPayload(sample)).toBe(true);
    expect(isBmpPayload("hello world")).toBe(false);
    expect(isBmpPayload("")).toBe(false);
  });
});

describe("parseBmpWhitelist", () => {
  const out = parseBmpWhitelist(sample);

  it("extracts wirkstoff names", () => {
    expect(out.substances).toEqual(["Apixaban", "Metoprolol", "Ramipril"]);
  });

  it("extracts handelsnamen where present", () => {
    expect(out.handelsnamen).toContain("Eliquis");
    expect(out.handelsnamen).toContain("Beloc-Zok");
  });

  it("does NOT contain patient name", () => {
    const all = JSON.stringify(out);
    expect(all).not.toMatch(/Mustermann/);
    expect(all).not.toMatch(/Max/);
    expect(all).not.toMatch(/19550101/);
  });

  it("does NOT contain diagnoses (Grund)", () => {
    const all = JSON.stringify(out);
    expect(all).not.toMatch(/Vorhofflimmern/);
    expect(all).not.toMatch(/Hypertonie/);
    expect(all).not.toMatch(/Herzinsuffizienz/);
  });

  it("does NOT contain operator info", () => {
    const all = JSON.stringify(out);
    expect(all).not.toMatch(/Praxis/);
    expect(all).not.toMatch(/Dr\./);
  });

  it("does NOT contain dosages", () => {
    const all = JSON.stringify(out);
    expect(all).not.toMatch(/2x5mg/);
    expect(all).not.toMatch(/47\.5/);
  });
});
```

- [ ] **Step 3: Fail bestätigen**

```bash
npm test -- bmp
```
Expected: FAIL.

- [ ] **Step 4: Implementierung `src/lib/bmp.js`**

```js
const ROOT_RE = /<MP\b[^>]*>/i;
const S_TAG_RE = /<S\b([^>]*)\/?>/gi;
const ATTR_W = /\bw\s*=\s*"([^"]*)"/i;
const ATTR_H = /\bh\s*=\s*"([^"]*)"/i;

export function isBmpPayload(text) {
  return typeof text === "string" && ROOT_RE.test(text);
}

// Whitelist: nur w (Wirkstoff) und h (Handelsname) werden überhaupt gelesen.
// Andere Attribute (g=Grund, d=Dosis, m=Menge, …) und andere Tags (P, O, …)
// werden im Parser gar nicht erst extrahiert — keine Variable, kein Return.
export function parseBmpWhitelist(text) {
  if (!isBmpPayload(text)) return { substances: [], handelsnamen: [] };
  const substances = [];
  const handelsnamen = [];
  let m;
  while ((m = S_TAG_RE.exec(text)) !== null) {
    const attrs = m[1];
    const w = ATTR_W.exec(attrs);
    const h = ATTR_H.exec(attrs);
    if (w && w[1]) substances.push(w[1].trim());
    if (h && h[1]) handelsnamen.push(h[1].trim());
  }
  return { substances, handelsnamen };
}
```

- [ ] **Step 5: Tests grün**

```bash
npm test -- bmp
```
Expected: PASS, 6 Tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(bmp): BMP-2.x data-matrix whitelist parser (w/h only, no PII/diagnoses)"
```

---

## Task 11: `lib/recognize.js` (Pipeline-Orchestrator, TDD)

**Files:**
- Create: `src/lib/recognize.js`, `tests/recognize.test.js`

API:
```ts
recognize(blob, { isPdf, ocr, lookup }) => { matched, unmatched, codeNote? }
```
`ocr` ist eine injizierte Funktion `(blob) => Promise<string>` (Tokens als Text). `lookup` ist eine injizierte Funktion `(text) => { matched, unmatched }` (basierend auf `resolveMulti` + Lookup-Stack).

- [ ] **Step 1: Tests schreiben**

`tests/recognize.test.js`:
```js
import { describe, it, expect, vi } from "vitest";
import { recognize } from "../src/lib/recognize.js";

vi.mock("../src/lib/barcode.js", () => ({
  detectFromBlob: vi.fn(),
}));
vi.mock("../src/lib/bmp.js", () => ({
  isBmpPayload: (s) => /^<MP/.test(s),
  parseBmpWhitelist: () => ({ substances: ["Apixaban", "Metoprolol"], handelsnamen: [] }),
}));

import { detectFromBlob } from "../src/lib/barcode.js";

describe("recognize", () => {
  it("PZN-NTIN: resolves via lookup(PZN)", async () => {
    detectFromBlob.mockResolvedValueOnce({ rawValue: "04150123456785", format: "data_matrix", engine: "native" });
    const lookup = vi.fn((t) => ({ matched: [{ id: "x", wirkstoff: "X" }], unmatched: [] }));
    const r = await recognize(new Blob([]), { isPdf: false, ocr: vi.fn(), lookup });
    expect(lookup).toHaveBeenCalledWith("12345678");
    expect(r.matched.length).toBe(1);
  });

  it("BMP-DataMatrix → multi substance result", async () => {
    detectFromBlob.mockResolvedValueOnce({ rawValue: "<MP v='029'><S w='Apixaban'/></MP>", format: "data_matrix", engine: "native" });
    const lookup = vi.fn((t) => ({ matched: t.split("\n").map((n, i) => ({ id: String(i), wirkstoff: n })), unmatched: [] }));
    const r = await recognize(new Blob([]), { isPdf: false, ocr: vi.fn(), lookup });
    expect(r.matched.length).toBe(2);
  });

  it("no barcode → OCR fallback", async () => {
    detectFromBlob.mockResolvedValueOnce(null);
    const ocr = vi.fn(async () => "Ibuprofen\n");
    const lookup = vi.fn((t) => ({ matched: [{ id: "ibu", wirkstoff: "Ibuprofen" }], unmatched: [] }));
    const r = await recognize(new Blob([]), { isPdf: false, ocr, lookup });
    expect(ocr).toHaveBeenCalled();
    expect(r.matched[0].id).toBe("ibu");
  });

  it("PDF skips barcode → OCR direct", async () => {
    const ocr = vi.fn(async () => "Ramipril\n");
    const lookup = vi.fn((t) => ({ matched: [{ id: "ram", wirkstoff: "Ramipril" }], unmatched: [] }));
    const r = await recognize(new Blob([]), { isPdf: true, ocr, lookup });
    expect(detectFromBlob).not.toHaveBeenCalled();
    expect(r.matched[0].id).toBe("ram");
  });

  it("OCR error → codeNote 'recognition failed'", async () => {
    detectFromBlob.mockResolvedValueOnce(null);
    const ocr = vi.fn(async () => { throw new Error("boom"); });
    const lookup = vi.fn();
    const r = await recognize(new Blob([]), { isPdf: false, ocr, lookup });
    expect(r.matched).toEqual([]);
    expect(r.codeNote).toMatch(/fehlgeschlagen/i);
  });
});
```

- [ ] **Step 2: Fail bestätigen**

```bash
npm test -- recognize
```
Expected: FAIL.

- [ ] **Step 3: Implementierung `src/lib/recognize.js`**

```js
import { detectFromBlob } from "./barcode.js";
import { isBmpPayload, parseBmpWhitelist } from "./bmp.js";
import { parsePznFromGtin } from "./atc.js";

export async function recognize(blob, { isPdf, ocr, lookup }) {
  // PDF → direkt OCR
  if (isPdf) {
    try {
      const text = await ocr(blob);
      return lookup(text);
    } catch {
      return { matched: [], unmatched: [], codeNote: "Erkennung fehlgeschlagen — bitte erneut versuchen oder Namen manuell suchen." };
    }
  }
  // Bild → Barcode-Versuch
  const code = await detectFromBlob(blob);
  if (code) {
    const raw = code.rawValue;
    // BMP zuerst prüfen (Inhalt entscheidet, nicht Format)
    if (isBmpPayload(raw)) {
      const { substances, handelsnamen } = parseBmpWhitelist(raw);
      const text = [...substances, ...handelsnamen].join("\n");
      return lookup(text);
    }
    // NTIN-GTIN → PZN
    const pzn = parsePznFromGtin(raw);
    if (pzn) {
      const r = lookup(pzn);
      if (r.matched.length) return r;
      return { ...r, codeNote: `PZN erkannt: ${pzn} — nicht im Datenbestand.` };
    }
    // anderer Code: als Text weiterreichen (ggf. EAN ohne NTIN)
    const r = lookup(raw);
    if (r.matched.length) return r;
    // weiter zu OCR
  }
  // OCR-Fallback
  try {
    const text = await ocr(blob);
    return lookup(text);
  } catch {
    return { matched: [], unmatched: [], codeNote: "Erkennung fehlgeschlagen — bitte erneut versuchen oder Namen manuell suchen." };
  }
}
```

- [ ] **Step 4: Tests grün**

```bash
npm test -- recognize
```
Expected: PASS, 5 Tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(recognize): orchestrator barcode→BMP/PZN→OCR with injected deps"
```

---

## Task 12: `lib/ocr.js` (Tesseract.js, lazy, eigene Origin)

**Files:**
- Create: `src/lib/ocr.js`, `public/tesseract/.gitkeep`, `scripts/fetch-tesseract-model.mjs`

- [ ] **Step 1: tesseract.js installieren**

```bash
npm i tesseract.js
```

- [ ] **Step 2: Modell-Fetch-Skript**

`scripts/fetch-tesseract-model.mjs`:
```js
#!/usr/bin/env node
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
const URL = "https://github.com/tesseract-ocr/tessdata_fast/raw/main/deu.traineddata";
const OUT = "public/tesseract/deu.traineddata";
if (existsSync(OUT)) { console.log("Modell vorhanden, übersprungen."); process.exit(0); }
mkdirSync("public/tesseract", { recursive: true });
const res = await fetch(URL);
if (!res.ok) throw new Error("Download failed: " + res.status);
const buf = Buffer.from(await res.arrayBuffer());
writeFileSync(OUT, buf);
console.log(`Wrote ${OUT} (${buf.length} bytes)`);
```

`package.json` script ergänzen:
```json
"data:ocr": "node scripts/fetch-tesseract-model.mjs"
```

- [ ] **Step 3: Modell laden**

```bash
npm run data:ocr
```
Expected: `Wrote public/tesseract/deu.traineddata (~10 MB)`.

- [ ] **Step 4: `src/lib/ocr.js`**

```js
// Lazy-loaded Tesseract worker. Modell wird aus eigener Origin (`/tesseract/`) gezogen,
// vom Service Worker (CacheFirst) gecacht. KEIN Drittanbieter-CDN.
let workerP = null;

async function getWorker() {
  if (workerP) return workerP;
  workerP = (async () => {
    const { createWorker } = await import("tesseract.js");
    const w = await createWorker("deu", 1, {
      langPath: "/tesseract",
      cachePath: "/tesseract",
      // tesseract.js lädt das Modell von langPath/${lang}.traineddata
    });
    return w;
  })();
  return workerP;
}

export async function recognizeText(blob) {
  const w = await getWorker();
  const { data } = await w.recognize(blob);
  return (data && data.text) ? data.text : "";
}

export async function terminateOcr() {
  if (!workerP) return;
  const w = await workerP;
  await w.terminate();
  workerP = null;
}
```

- [ ] **Step 5: `.gitignore` für das große Modell ergänzen**

`.gitignore`:
```
public/tesseract/*.traineddata
```

(Modell wird per `npm run data:ocr` lokal beschafft; nicht im Repo.)

- [ ] **Step 6: Manueller Smoke-Test (optional, ohne Test-Modell-Mock)**

Schwer automatisch zu testen ohne echtes Modell. Stattdessen Smoke im Dev-Server (Task 13).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(ocr): lazy Tesseract worker, model fetched to public/tesseract, no CDN"
```

---

## Task 13: `Scanner.jsx` + `ConfirmList.jsx` + App-Integration

**Files:**
- Create: `src/components/Scanner.jsx`, `src/components/ConfirmList.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: `ConfirmList.jsx`**

```jsx
export default function ConfirmList({ matched, unmatched, codeNote, onPick, onPickAll, onClose }) {
  return (
    <div className="scan-results">
      <div className="result-head">Vorschlag – bitte prüfen</div>
      {matched.map((entry) => (
        <button key={entry.id} className="cand" onClick={() => onPick(entry)}>
          <span className="cand-name">{entry.wirkstoff}</span>
          <span className="cand-sub">{(entry.synonyms || []).join(" · ")}</span>
        </button>
      ))}
      {matched.length === 0 && !codeNote ? (
        <div className="muted-line">Nichts erkannt – bitte erneut versuchen oder Namen manuell suchen.</div>
      ) : null}
      {codeNote ? <div className="muted-line">{codeNote}</div> : null}
      {unmatched && unmatched.length ? (
        <div className="muted-line">Nicht im Datenbestand: {unmatched.join(", ")}</div>
      ) : null}
      {matched.length > 1 ? (
        <button className="btn btn-primary" onClick={() => onPickAll(matched)}>Alle {matched.length} anzeigen</button>
      ) : null}
      <button className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
    </div>
  );
}
```

- [ ] **Step 2: `Scanner.jsx`**

```jsx
import { useRef, useState, useEffect } from "react";
import { recognize } from "../lib/recognize.js";
import { recognizeText } from "../lib/ocr.js";
import ConfirmList from "./ConfirmList.jsx";

export default function Scanner({ source, onClose, onPick, onPickAll, lookup }) {
  const videoRef = useRef(null);
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [result, setResult] = useState(null);

  const run = async (blob, isPdf) => {
    setBusy(true); setResult(null); setMsg("");
    try {
      const r = await recognize(blob, { isPdf, ocr: recognizeText, lookup });
      setResult(r);
    } catch {
      setMsg("Erkennung fehlgeschlagen – bitte erneut versuchen oder Namen manuell suchen.");
    } finally { setBusy(false); }
  };

  useEffect(() => {
    if (source !== "scan") return;
    let stream = null, cancelled = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        const v = videoRef.current;
        v.srcObject = stream;
        await v.play();
      } catch {
        setMsg("Kamera nicht verfügbar – bitte stattdessen Hochladen nutzen.");
      }
    })();
    return () => { cancelled = true; if (stream) stream.getTracks().forEach((t) => t.stop()); };
  }, [source]);

  useEffect(() => { if (source === "upload" && fileRef.current) fileRef.current.click(); }, [source]);

  const capture = async () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) { setMsg("Noch kein Kamerabild – kurz warten."); return; }
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.9));
    if (blob) run(blob, false);
  };

  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    run(f, f.type === "application/pdf");
  };

  return (
    <div className="scan-overlay">
      <div className="scan-card">
        <div className="scan-head">
          <span className="kicker">{source === "scan" ? "Scannen" : "Hochladen"}</span>
          <button className="btn btn-ghost" onClick={onClose}>Schließen</button>
        </div>
        {source === "scan" ? (
          <>
            <video ref={videoRef} className="cam" muted playsInline />
            <button className="btn btn-primary" onClick={capture} disabled={busy}>{busy ? "Erkenne …" : "Aufnehmen & erkennen"}</button>
          </>
        ) : (
          <>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="file-hidden" onChange={onFile} />
            <button className="btn btn-primary" onClick={() => fileRef.current && fileRef.current.click()} disabled={busy}>{busy ? "Erkenne …" : "Datei wählen (Bild / PDF)"}</button>
          </>
        )}
        {msg ? <div className="scan-msg">{msg}</div> : null}
        {result ? <ConfirmList {...result} onPick={onPick} onPickAll={onPickAll} onClose={onClose} /> : (
          <p className="scan-note">
            {source === "scan" ? "Packung, Plan oder Barcode vor die Kamera halten und aufnehmen." : "PDF oder Bild auswählen. Erkannte Wirkstoffe erscheinen als Vorschlag."}
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `src/App.jsx` Scanner + lookup-Adapter integrieren**

In `App.jsx` ergänzen (imports):
```jsx
import Scanner from "./components/Scanner.jsx";
import atcIndex from "./data/atc_index.json";
import groupMap from "./data/atc_group_map.json";
import { lookup as lookupTier } from "./lib/lookup.js";
```

State:
```jsx
const [scanSource, setScanSource] = useState(null);
const [planIds, setPlanIds] = useState([]);
```

Lookup-Adapter für `Scanner` (multiline → resolveMulti via Tier-Stack):
```jsx
const scanLookup = (text) => {
  const lines = String(text || "").split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const matched = [];
  const unmatched = [];
  const seen = new Set();
  for (const line of lines) {
    const r = lookupTier(line, { db: DB, atcIndex, groupMap, groups: data.groups });
    if (r.hits.length && !seen.has(r.hits[0].id)) {
      seen.add(r.hits[0].id);
      matched.push(r.hits[0]);
    } else if (!r.hits.length) {
      unmatched.push(line);
    }
  }
  return { matched, unmatched };
};
```

SearchBar-Props anpassen:
```jsx
<SearchBar value={query} onChange={setQuery} onScan={() => setScanSource("scan")} onUpload={() => setScanSource("upload")} count={results.length} />
```

Am Ende des `consented`-Branches:
```jsx
{scanSource ? (
  <Scanner
    source={scanSource}
    lookup={scanLookup}
    onClose={() => setScanSource(null)}
    onPick={(e) => { setPlanIds([]); setQuery(e.wirkstoff); setScanSource(null); }}
    onPickAll={(entries) => { setQuery(""); setPlanIds(entries.map((x) => x.id)); setScanSource(null); }}
  />
) : null}
```

Plan-Banner wenn `planIds.length` (vor `grid`):
```jsx
{planIds.length && !query.trim() ? (
  <div className="plan-banner">
    <span>Plan-Auswahl · {results.length} Wirkstoffe</span>
    <button className="btn btn-ghost" onClick={() => setPlanIds([])}>Zurücksetzen</button>
  </div>
) : null}
```

`results` Berechnung erweitern:
```jsx
const results = useMemo(() => {
  const q = query.trim().toLowerCase();
  if (!q) {
    if (planIds.length) return DB.filter((d) => planIds.includes(d.id));
    return DB;
  }
  return DB.filter((d) => [d.wirkstoff, d.gruppe, ...d.synonyms].join(" ").toLowerCase().includes(q));
}, [query, planIds]);
```

- [ ] **Step 4: Manueller Smoke-Test**

```bash
npm run dev
```
- Consent annehmen.
- „Hochladen" → ein Foto einer Medikamentenpackung mit Data-Matrix → ConfirmList zeigt Vorschlag(e); nichts wird automatisch übernommen.
- Ein Foto ohne Code (Packung mit Text) → OCR-Fallback liefert Vorschlag.
- BMP-Fixture-Bild (falls vorhanden) → mehrere Vorschläge, „Alle anzeigen" → Plan-Banner.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(scanner): Scanner+ConfirmList wired via recognize+lookup, multi-result plan view"
```

---

## Task 14: Tier-0b-Badge im UI verifizieren

**Files:**
- Modify: `src/App.jsx` (Lookup-Ergebnis-Quelle für Anzeige), `src/components/ResultCard.jsx` (Badge prop bereits da)

Hintergrund: Wenn ein Treffer aus `lookup` mit `source: "0b"` kommt, muss die Karte den Badge „generische Gruppeninfo" zeigen.

- [ ] **Step 1: `scanLookup` markiert 0b-Treffer**

In `App.jsx` `scanLookup` so anpassen, dass Hits ihren `source` behalten (oben in Task 13 schon — bestätigen, ggf. ergänzen):
```jsx
matched.push({ ...r.hits[0] }); // source bleibt erhalten ("0a" | "0b")
```

- [ ] **Step 2: ResultCard mit Badge bei 0b**

In `App.jsx` Rendering der Karten:
```jsx
{results.map((item) => <ResultCard key={item.id} item={item} badge={item.source === "0b"} />)}
```

- [ ] **Step 3: Smoke-Test mit Long-Tail-Substanz**

Voraussetzung: `atc_index.json` enthält Einträge (echte Pipeline-Lauf mit `wido-atc.zip` oder Mock).

Für Smoke: temporär `src/data/atc_index.json` mit einem Long-Tail-Eintrag füllen, z.B.:
```json
[{ "wirkstoff": "Pregabalin", "atc": "N03AX16" }]
```
und in `scripts/atc_group_map.source.json` `"N03AX": "antiepileptikum"` ergänzen, `npm run data` laufen lassen, dann im Scanner-Pfad „Pregabalin" als OCR-Text simulieren (oder direkt in der Suchleiste — funktioniert nur über den Scanner-Pfad, da die Volltextsuche im UI bislang nur `DB` durchsucht).

Erwartung: ConfirmList → Pick → ResultCard zeigt Badge „generische Gruppeninfo".

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): tier-0b results render generic-group badge"
```

---

## Task 15: PWA-Smoke + Offline-Verifikation

**Files:**
- Modify: `vite.config.js` (falls Pfade angepasst werden müssen)

- [ ] **Step 1: Production-Build**

```bash
npm run build
npm run preview
```
Expected: `http://localhost:4173` erreichbar, Service Worker registriert (DevTools → Application → Service Workers).

- [ ] **Step 2: Install-Prompt prüfen**

Chrome DevTools → Application → Manifest → „Installable". Optional installieren.

- [ ] **Step 3: Offline-Test**

DevTools → Network → „Offline". Reload — App-Shell + 48 Substanzen laden weiterhin.

- [ ] **Step 4: Tesseract-Modell offline nach Erst-Use**

Online: einmal OCR triggern (Foto hochladen). Dann Offline schalten → erneut OCR triggern → funktioniert (CacheFirst).

- [ ] **Step 5: zxing-wasm offline nach Erst-Use**

Browser, der `BarcodeDetector` nicht hat (Safari Desktop): einmal Scan/Upload mit Bild → zxing lädt → erneut offline → funktioniert.

- [ ] **Step 6: Stand-Datum sichtbar**

`SearchBar` ergänzen — neben `brand-ver` Stand aus `data.json#version` zeigen:

In `App.jsx`:
```jsx
<SearchBar value={query} onChange={setQuery} onScan={...} onUpload={...} count={results.length} stand={data.version} />
```

In `SearchBar.jsx` neben `brand-ver`:
```jsx
<span className="brand-ver">v1.1 · Daten {stand}</span>
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(pwa): production build verified offline-installable, stand-date visible"
```

---

## Task 16: README + Abnahme-Lauf

**Files:**
- Create: `README.md`

- [ ] **Step 1: `README.md`**

```markdown
# Wirkstoff-Lookup

Generisches fachliches Nachschlagewerk zu Arzneistoffen für Rettungsfachpersonal (Aus-/Fortbildung). **Kein Medizinprodukt.** **Keine patientenbezogene Entscheidungsgrundlage.**

## Stack
Vite + React + PWA (Workbox). Vitest. Tesseract.js (lazy). zxing-wasm (lazy Fallback).

## Setup

```bash
npm install
npm run data:ocr    # einmalig: deu.traineddata nach public/tesseract/
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
```

- [ ] **Step 2: Vollständiger Test-Lauf**

```bash
npm test
```
Expected: alle Suiten grün (match, atc, lookup, consent, barcode, bmp, recognize).

- [ ] **Step 3: Build + Preview-Smoke**

```bash
npm run build && npm run preview
```
Expected: läuft, manuell offline testbar.

- [ ] **Step 4: Abnahmekriterien aus Spec §13 abhaken (manuelle Liste)**

| # | Paket | Abnahme erfüllt? |
|---|---|---|
| 1 | Scaffold + PWA | Leere PWA installierbar, offline ladbar. |
| 2 | Seed + `match.js` | 48 Substanzen suchbar. |
| 3 | `build-data.mjs` | Idempotent, Validierung grün. |
| 4 | `lookup.js` 0a/0b | Long-Tail-Substanz → Gruppeninfo + Badge. |
| 5 | Scanner + Barcode + ConfirmList | Barcode aus Bild → Vorschlag, nur nach Bestätigung übernommen. BMP-Whitelist verifiziert. |
| 6 | Consent persistent | Reload hält, Versionswechsel erzwingt Re-Consent. |
| 7 | OCR | Foto liefert Namensvorschlag offline nach Erst-Modellload. |

- [ ] **Step 5: Final Commit**

```bash
git add -A
git commit -m "docs: README + acceptance checklist; v1.1 ready"
```

---

## Self-Review-Hinweise

- **Spec-Coverage:** Tasks 1–16 decken Spec-Abschnitte 1–13 ab. §14/15 (Out of Scope, Risiken) sind nicht implementierbar — Dokumentation reicht.
- **Bewusste Abweichungen aus Spec §15** sind in Tasks codiert: Task 9 (BarcodeDetector first), Task 6 (Pipeline läuft auch ohne ATC-ZIP), Task 14 (Long-Tail-Smoke benötigt manuell präpariertes atc_index).
- **Modell-Datei** (`deu.traineddata`) liegt **nicht** im Repo (`.gitignore`), wird per `npm run data:ocr` lokal beschafft.
- **Top-250 / extras.json** sind redaktionelle Arbeit und nicht Teil dieses Sprints — Pipeline läuft grün auch ohne diese Inputs.
