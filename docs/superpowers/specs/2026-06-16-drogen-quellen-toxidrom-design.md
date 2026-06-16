# Design: Drogen — verifizierte Quellen + Toxidrom-Einstieg

- **Datum:** 2026-06-16
- **Status:** Genehmigt (Brainstorming abgeschlossen) → bereit für Implementierungsplan
- **Autor:** Pharos / Claude (Sparring)
- **Betrifft:** `server/enrich.mjs`, `server/verify.mjs`, `server/ki-proxy.mjs`, `src/modules/lexikon/*`, `src/shell/HomeScreen.jsx`, `src/App.jsx`

---

## 1. Kontext & Problem

Pharos ist eine Vite/React-19-PWA (Wirkstoff-Lexikon + Übergabe-Trainer). Der Drogen-Pfad ist
bereits zu ~70 % gebaut:

- **Foto → KI-Erkennung:** Der `/ki`-Vision-Prompt erkennt Drogen (MDMA, LSD, Kokain, Ketamin,
  Cannabis, GHB/GBL, Lachgas/Poppers, Drug-Checking-Befunde). — `server/ki-proxy.mjs:88`
- **Text-Suche + „neu hinzufügen":** identische Pipeline wie Medikamente; Straßenname →
  kanonische Substanz, 7 Drogenklassen, keine Konsum-/Dosis-/Beschaffungshinweise. — `server/enrich.mjs:28`
- **Toxidrom-Wissen:** 7 Klassen (`drogen_opioide` … `drogen_inhalantien`) mit Toxidrom,
  Antidot, Mischkonsum fest in `src/modules/lexikon/data/data.json#groups`.
- **22 Drogen-Substanzen offline geseedet** (Heroin, Fentanyl, Kokain, Meth, MDMA, LSD,
  Psilocybin, Ketamin, GHB/GBL, Nitazene, Kratom, Lachgas, Poppers …).
- **UI:** Kategorie „Drogen" (`CategoryIcon.jsx`), Drogen-Detailpfad (`ResultDetail.jsx:104`),
  HomeScreen-Tile nennt „Drogen & Toxidrome".

### Die Lücke (🔴 = der Auftrag)

1. **Quellen sind rein medikamenten-lastig.** `TRUSTED_SOURCES` (Deeplinks) und `TRUST_DOMAINS`
   (Verify-Allowlist) kennen nur gelbe-liste, fachinfo, embryotox, bfarm, pubchem, drugbank,
   whocc. Für MDMA/LSD/Kokain liefern die **nichts** → Drogen-Einträge bekommen unbrauchbare
   Deeplinks und können nicht verifiziert werden. — `server/enrich.mjs:96`, `server/verify.mjs`
2. **Detail-Quellen werden nur für KI-Einträge gerendert** (`isKI && item.sources`) → die 22
   geseedeten Drogen zeigen **gar keine** Quellen. — `ResultDetail.jsx:297`
3. **Drogen-Einstieg unprominent:** „Drogen" ist nur der 5. von 7 Filter-Chips und zeigt eine
   flache Substanzliste — kein einsatztauglicher Einstieg.

---

## 2. Ziele / Nicht-Ziele

**Ziele**
- Verifizierte, für Drogen relevante Quellen (Harm-Reduction/Drug-Checking + Fachtoxikologie) in
  Deeplinks **und** Verify-Allowlist einhängen — kategorieabhängig.
- Prominenter, einsatztauglicher Drogen-Einstieg: HomeScreen-Tile + Toxidrom-first-Ansicht.
- Saubere Speicher-Logik: sofort verfügbar, aber widersprüchliche Drogen automatisch
  quarantänieren (schleifen-/kostensicher).

**Nicht-Ziele (YAGNI)**
- Kein neuer Drogen-Substanz-Seed (22 reichen; KI ergänzt on-demand).
- Keine Änderung des bestehenden **Medikamenten**-Verhaltens (Quarantäne nur für Drogen).
- Keine Konsum-/Dosier-/Safer-Use-Empfehlungen — strikt notfallmedizinische Identifikation.
- Kein Fix des Nebenbefunds (stale `src/data/`-Pfad im ki-proxy) — separat, siehe §13.

---

## 3. Entscheidungen (aus dem Brainstorming)

| # | Frage | Entscheidung | Begründung |
|---|---|---|---|
| 1 | Scope | **Quellen verdrahten + UI-Einstieg** | Erkennung/Enrich/Toxidrom-DB existieren schon |
| 2 | UI-Einstieg | **Beides:** HomeScreen-Tile + Toxidrom-first-Ansicht | Maximal sichtbar + klinisch sinnvollster erster Screen |
| 3 | Speicher-Logik | **Hybrid:** sofort speichern, bei `widerspruch` raus | Neue Substanzen (NPS) ohne Quelle dürfen im Einsatz nicht fehlen; falsche Drogen-Fakten aber gefährlicher → Quarantäne |

Default-Quellenauswahl (nicht widersprochen): DE/EU zuerst (EUDA, mindzone, checkit,
drugchecking.berlin, saferparty, GIZ/Tox, PubChem, DrugBank, Wikipedia), NIDA als nachrangige
englische Fachquelle.

---

## 4. Quellen-Modell (zwei Stufen, bewusst getrennt)

Kern der Entscheidung: Drug-Checking-Seiten und Fachquellen spielen **verschiedene Rollen** und
dürfen nicht vermischt werden.

| Stufe (`role`) | Rolle im System | Zählt als Verify-Beleg? |
|---|---|---|
| `auth` (Fachquelle) | Verify-Korroboration, „geprüft"-Badge, `verify.mjs`-Allowlist | **Ja** |
| `harm_reduction` (Drug-Checking) | Informativer Deeplink (aktuelle Substanzwarnungen) | **Nein** |

**Warum getrennt:** Eine Pillenwarnung („XTC-Pille X = 250 mg MDMA") belegt nichts über
Toxidrom/ATC/Identität. Als Korroboration gezählt würde sie das „geprüft"-Badge unehrlich
aufblähen. Trotzdem im Einsatz wertvoll → anzeigen, klar als externe Harm-Reduction-Info
gelabelt, getrennt von „Fachquellen". Passt zum Disclaimer „kein Medizinprodukt".

### Konkrete Quellen

**`auth` (Fachquellen, Drogen):**
| Publisher | Domain | Link-Typ |
|---|---|---|
| EUDA/EMCDDA Drug Profiles (DE) | euda.europa.eu | Per-Substanz-Profil **oder** Site-Search (validieren) |
| PubChem | pubchem.ncbi.nlm.nih.gov | `#query=` (bestätigt) |
| DrugBank | go.drugbank.com | `unearth/q?query=` (bestätigt) |
| Giftnotruf/GIZ Tox München | toxikologie.mri.tum.de | Referenz/Notfall-Hotline-Seite |
| NIDA | nida.nih.gov | Site-Search/Drug-Facts (validieren) |
| Wikipedia (DE/EN) | de./en.wikipedia.org | aufgelöste Artikel-URL (bestehend) |

**`harm_reduction` (Drug-Checking / Substanzwarnungen):**
| Publisher | Domain | Link-Typ |
|---|---|---|
| saferparty.ch | saferparty.ch | Warnungen/Substanz-Seite **oder** Site-Search (validieren) |
| mindzone.info | mindzone.info | WP Site-Search `?s=` (validieren) |
| Drugchecking Berlin | drugchecking.berlin | Warnungen/Ergebnisse-Seite |
| checkit! Wien | checkit.wien | Substanz-/Ergebnis-Seite (validieren) |
| KnowDrugs | knowdrugs.app | App/Pillenwarnungen-Seite |

### URL-Ehrlichkeit (Hard Rule: keine Fake-URLs)

Jeder `link(name, atc)`-Builder erzeugt **entweder** eine live-validierte
Per-Substanz-/Such-URL **oder** eine stabile Sektions-/Landing-URL der Quelle — **nie** einen
geratenen Slug. Welche Patterns vor dem Merge live geprüft werden müssen: siehe §14. Fallback,
falls ein Such-Pattern nicht bestätigt werden kann: stabile Sektions-Landing-URL.

---

## 5. Architektur

### 5.1 `src/modules/lexikon/lib/sources.js` (NEU, shared, framework-neutral)

Eine Wahrheit für die Quellen-Policy. **Keine** Vite-Spezifika (`import.meta.env`), **kein** JSX
→ importierbar von Server (`enrich.mjs`, `verify.mjs`) **und** Client (`ResultDetail.jsx`).

Quellobjekt-Form:
```js
// { id, publisher, domain, role: "auth" | "harm_reduction", lang, link(name, atc) => url }
```

Exporte:
```js
export const MED_SOURCES          // die bisherigen 7 Med-Quellen (aus enrich.mjs hierher verschoben)
export const DRUG_SOURCES_AUTH    // EUDA, PubChem, DrugBank, GIZ/Tox, NIDA
export const DRUG_SOURCES_HARMRED // saferparty, mindzone, drugchecking.berlin, checkit, KnowDrugs

export function isDrug(entry)         // true, wenn (entry.group||"").startsWith("drogen_") || entry.kategorie === "droge"
export function buildSources(entry, wiki?)  // → [{url,title,publisher,domain,kind:"deterministisch",role,corroborates:null}]
                                            //   drug → wiki(falls da) + DRUG_SOURCES_AUTH + DRUG_SOURCES_HARMRED
                                            //   med  → wiki(falls da) + MED_SOURCES
export function trustDomainsFor(entry)      // Verify-Allowlist: drug → AUTH-Domains + wikipedia; med → Med-Domains + wikipedia
export const TRUST_DOMAINS                  // Rückwärtskompat = Med-Allowlist (verify.mjs-Altimport)
```

Wichtig: `role` wird **mitpersistiert** auf jedem Source-Objekt → der Client kann Quellen ohne
erneute Logik nach Rolle gruppieren.

### 5.2 `server/enrich.mjs`

- Lokale `TRUSTED_SOURCES` / `TRUST_DOMAINS` **entfernen** → aus `sources.js` importieren.
- `buildDeterministicSources(wirkstoff, atc, wiki)` → ersetzt durch `buildSources(entry, wiki)`
  (entry trägt `group`/`kategorie`/`atc`/`wirkstoff`). Auswahl Med vs. Drogen passiert in
  `buildSources`.
- Drogen-Klassen-Validierung (`enrich.mjs:160`: nur persistieren bei gültiger `drogen_`-Klasse +
  ≥1 Notfall) **bleibt unverändert**.

### 5.3 `server/verify.mjs`

- `verifyEntry(entry, …)`: `allowed_domains` = `trustDomainsFor(entry)` statt fixem
  `TRUST_DOMAINS`. Für Drogen also AUTH-Drogen-Domains + Wikipedia — Harm-Reduction-Domains sind
  **nicht** in der Allowlist (zählen nie als Beleg).
- Web-Search-Quellen erben `role` per Domain-Lookup (Default `auth`, da Drogen-Allowlist
  ausschließlich `auth` ist).

### 5.4 Quarantäne-Hybrid (`server/ki-proxy.mjs`)

**Datenmodell** `public/data/extras-runtime.json`:
```jsonc
{
  "version": "runtime-1",
  "entries": [ /* aktive Einträge (Client lädt nur diese) */ ],
  "quarantine": [
    { "id", "wirkstoff", "synonyms": [], "reason": "widerspruch",
      "sources": [], "quarantinedAt": "ISO" }
  ]
}
```

**`verifyOne(id)`** — nach Status-Berechnung:
- wenn `isDrug(e2)` **und** `status === "widerspruch"`: Eintrag aus `entries[]` entfernen, nach
  `quarantine[]` verschieben (Grund + Quellen + Zeitstempel), `saveExtras`.
- sonst: heutiges Verhalten (Status/Sources am Eintrag aktualisieren; Med-Widerspruch bleibt mit
  rotem Badge in `entries[]`).

**`/enrich`** — schleifen-/kostensichere Dedupe gegen Quarantäne (Set aus `normName(wirkstoff)` +
`normName(synonym)`):
- **Pre-Check** (vor dem teuren Claude-Call): `normName(name)` ∈ quarantineKeys →
  sofort `{ entry: null, quarantined: true, reason: "widerspruch" }` (HTTP 200, **kein** API-Call).
- **Post-Check** (nach enrich, vor Persist): kanonischer `wirkstoff` oder ein Synonym ∈
  quarantineKeys → **nicht** persistieren, `{ entry: null, quarantined: true }`.

→ Verhindert die Endlosschleife „löschen → neu scannen → neu enrichen → wieder Widerspruch".

### 5.5 Frontend

**`src/modules/lexikon/components/ToxidromeOverview.jsx` (NEU)** — rein präsentational.
- Liest die 7 `drogen_*`-Gruppen aus `data.groups`.
- Pro Klasse eine Karte: `toxidrom.label`, `toxidrom.leitsymptome` (Chips), `antidot` (falls
  vorhanden, hervorgehoben), Anzahl Substanzen der Klasse.
- Props: `onPickClass(groupId)`, `onScan()`, `onSearch()`.

**`src/modules/lexikon/Lexikon.jsx`** — neue Nav-View `"drogen"`:
- Oben `ToxidromeOverview` + prominenter CTA „Substanz/Fund scannen oder suchen".
- Darunter die auf `drogen_*` gefilterte Substanzliste; Klick auf Klassenkarte setzt Filter auf
  diese eine Klasse.
- `nav("drogen")` (bestehender `useImperativeHandle`) aktiviert die View.

**`src/shell/HomeScreen.jsx`** — 4. Tile:
```js
{ key: "drogen", title: "Drogen / Tox", tag: "Erkennen",
  desc: "Toxidrome, Substanzen scannen/suchen, verifizierte Quellen — offline verfügbar.",
  Icon: FlaskIcon }
```

**`src/App.jsx`** — Tile-Routing über bestehendes `pendingLexNav`-Pattern:
- `handlePick(key)`: bei `"drogen"` → `pendingLexNav.current = "drogen"; setMode("lexikon")`;
  sonst `setMode(key)`. `HomeScreen onPick={handlePick}`.
- Bestehender Effekt (`mode === "lexikon" && pendingLexNav` → `lexRef.nav(...)`) bleibt.

**`src/modules/lexikon/components/ResultDetail.jsx`** — Quellen für **alle** Drogen:
- Quellen-Block-Bedingung von `isKI && item.sources` → für Drogen auch ohne KI rendern.
- KI-Drogen: gespeicherte `item.sources` (enthält wiki + auth-Deeplinks + Verify-Web-Quellen mit
  `corroborates`-Badges).
- Geseedete Drogen (kein `item.sources`): `buildSources(item)` **client-seitig** berechnen.
- Gruppierung nach `role` in zwei Sektionen: **„Geprüfte Fachquellen"** (`auth`, mit
  `corroborates`-Badges) und **„Substanzwarnungen · Drug-Checking"** (`harm_reduction`, Label
  „extern, Harm-Reduction"). Client dedupliziert nach URL/Domain.

**Quarantäne-Notiz (Client, `lib/enrich.js` + `Lexikon.jsx`)**: Enrich-Antwort mit
`quarantined: true` → keine Karte, stattdessen Inline-Notiz: „[Name]: wegen widersprüchlicher
Fachquellen ausgeblendet — nicht verlässlich."

---

## 6. Datenfluss (end-to-end)

```
Foto/Text
  └─ /ki  (Vision erkennt Substanz; Drogen bereits abgedeckt)        [unverändert]
       └─ Client-Lookup lokal (Seed + extras)
            ├─ Treffer → Detailansicht (buildSources falls Seed-Droge)
            └─ kein Treffer → /enrich
                 ├─ Pre-Check Quarantäne ─ Treffer → {quarantined:true} → Inline-Notiz
                 ├─ enrich(): Wiki ∥ Claude → Drogen-Klassen-Gate
                 ├─ buildSources(entry, wiki) → role-getaggte Deeplinks
                 ├─ Post-Check Quarantäne ─ Treffer → nicht persistieren
                 ├─ persist → extras-runtime.json (status "pending")
                 └─ queueVerify (Prio 2, async)
                      └─ verifyEntry(allowed_domains = trustDomainsFor(entry))
                           ├─ status valide/teilverifiziert → Eintrag + Badge updaten
                           └─ status widerspruch & isDrug → nach quarantine[] verschieben
```

---

## 7. Edge Cases & Fehlerverhalten

- **NPS ohne Quelle:** enrich-Gate bestanden (Klasse + Notfall) → persistiert als
  `teilverifiziert`/`pending`; Badge kommuniziert Unsicherheit. **Nicht** ausgeblendet.
- **Re-Scan einer quarantänierten Droge:** Pre-Check greift → kein Claude-Call, Inline-Notiz.
- **Synonym/Straßenname einer quarantänierten Substanz:** Post-Check greift nach Kanonisierung →
  nicht persistiert.
- **Med mit Widerspruch:** unverändert (roter Badge, bleibt in `entries[]`).
- **Quelle liefert keinen Treffer (leere Such-Seite):** akzeptabel — Deeplink ist eine
  Nachschlage-Hilfe, kein Versprechen. Kein Fehlerzustand.
- **ki-proxy ohne `ANTHROPIC_API_KEY`:** `/enrich` 503 (bestehend); Seed-Drogen + Toxidrom-View
  funktionieren offline weiter.
- **`buildSources` client-seitig ohne `wiki`:** liefert nur deterministische Deeplinks (für
  Seed-Drogen korrekt — die haben keine Wiki-Auflösung).

---

## 8. Recht & Positionierung

- Framing strikt **notfallmedizinische Identifikation** (Toxidrom/Antidot/Mischkonsum). Keine
  Konsum-/Dosis-/Beschaffungs-/Safer-Use-Hinweise (enrich-Prompt erzwingt das bereits).
- Drug-Checking-Links klar als **externe** Harm-Reduction-Info gelabelt, getrennt von Fachquellen,
  ohne „geprüft"-Implikation.
- Bestehender Footer-Disclaimer („Generische Fachinformation · kein Medizinprodukt") bleibt
  sichtbar.

---

## 9. Tests (vitest, vorhanden)

**Backend**
- `server/sources.test.mjs` (NEU):
  - `buildSources(drugEntry)` enthält AUTH- **und** harm_reduction-Domains; **keine** Med-only-Domains.
  - `buildSources(medEntry)` enthält Med-Domains; keine Drogen-Domains.
  - `trustDomainsFor(drugEntry)` enthält **keine** harm_reduction-Domains.
  - URL-Builder: `encodeURIComponent`, kein `undefined`/leerer Slug.
  - `isDrug`: `drogen_*`-Group bzw. `kategorie==="droge"` → true; Med → false.
- Quarantäne (Prädikat-/Unit-Ebene, ohne echten API-Call):
  - Widerspruch-Drogeneintrag → aus `entries` entfernt, in `quarantine`.
  - Quarantäne-Dedupe-Set matcht Name + Synonym (Pre/Post-Check).

**Frontend** (`@testing-library/react`)
- `ToxidromeOverview` rendert 7 Klassenkarten mit Leitsymptomen.
- `ResultDetail` gruppiert Quellen in zwei Sektionen nach `role`.
- Enrich-Antwort `quarantined:true` → Inline-Notiz statt Karte.

---

## 10. Task-Zerlegung (Hard Rule ≤ 90 Min/Task)

### Task A — Backend-Quellen + Quarantäne (~90 Min)
`sources.js` (shared, 2-stufig) anlegen; `enrich.mjs`/`verify.mjs` darauf umstellen;
Quarantäne-Hybrid in `ki-proxy.mjs` (Datenmodell + `verifyOne` + Pre/Post-Dedupe in `/enrich`);
`sources.test.mjs` + Quarantäne-Tests.
**Akzeptanz:** Drogeneintrag bekommt Drogen-Deeplinks; Verify nutzt AUTH-Allowlist;
Widerspruch-Droge wandert in Quarantäne; Re-Scan löst keinen API-Call aus; `npm test` grün.

### Task B — Toxidrom-Ansicht (~90 Min)
`ToxidromeOverview.jsx`; Lexikon-View `"drogen"` (Overview + gefilterte Liste + Scan/Such-CTA);
Klassen-Klick → Filter; Tests.
**Akzeptanz:** Nav `"drogen"` zeigt 7 Klassenkarten; Klick filtert; CTA öffnet Scan/Suche.

### Task C — Einstieg + Detail-Quellen (~60 Min)
HomeScreen-Tile „Drogen / Tox"; App-Routing (`handlePick` + `pendingLexNav="drogen"`);
ResultDetail-2-Quellen-Blöcke (auch für Seed-Drogen via `buildSources`); Quarantäne-Inline-Notiz.
**Akzeptanz:** Tile springt in Toxidrom-View; Seed-Droge (z. B. MDMA) zeigt beide
Quellen-Blöcke; quarantänierte Substanz zeigt Notiz.

Reihenfolge: A → B → C (C nutzt `buildSources` aus A und die View aus B).

---

## 11. Out-of-scope / Nebenbefunde

- 🟡 **Stale Pfad im ki-proxy:** `SEED`/`groupMap` lesen aus `src/data/data.json` bzw.
  `src/data/atc_group_map.json` — Verzeichnis existiert nicht (Daten liegen unter
  `src/modules/lexikon/data/`). Folge: `isSeedDuplicate` läuft auf leere Sets → Seed-Dedupe
  faktisch wirkungslos. **Nicht** Teil dieses Designs; eigener Fix-Task empfohlen.
- **Promote-to-Seed:** verifizierte Hochqualitäts-Extras periodisch in den kuratierten
  `data.json` übernehmen — interessante spätere Option, hier nicht eingeplant.
- **Quarantäne auch für Medikamente:** per `isDrug`-Toggle trivial erweiterbar, bewusst nicht in
  diesem Scope.

---

## 12. Offene Validierungspunkte (vor Merge live prüfen — keine Fake-URLs)

Live gegen die echte Seite bestätigen; falls Such-Pattern unklar → stabile Sektions-Landing-URL:
- EUDA: Per-Substanz-Profil-Slug vs. Site-Search (`?text=`?).
- NIDA: Site-Search-/Drug-Facts-URL.
- saferparty.ch / mindzone.info / checkit.wien: Site-Search (`?s=`?) bzw. Substanz-Seiten.
- drugchecking.berlin / KnowDrugs: stabile Warnungs-/Info-Seite.

Bestätigt funktionsfähig (bereits im Code genutzt): PubChem `#query=`, DrugBank `unearth/q?query=`,
Wikipedia (aufgelöste Artikel-URL).


