# Design-Audit-Report: Pharos

**Datum:** 2026-10-21
**Auditor:** Claude, Masterprompt „Design, UX & UI Audit — Lead-Designer-Level" (V1.0, Skill `.claude/skills/audit-design-ux`)
**Stand:** `main` @ `77e095f`
**Status vor Audit:** Solides Token-System im Lexikon, aber Trainer und Teile der Shell außerhalb des Systems. Kontrast der Sekundärtexte unter WCAG AA, mobil keine Startseite und kein Verlauf erreichbar, PWA ohne Icons, Fonts von Google ohne Offline-Cache, Dialoge ohne Fokus-Management.
**Status nach Audit:** DESIGN-READY mit dokumentierten Restpunkten (siehe „Offen"). Keine offenen KRITISCH- oder HOCH-Funde im UI-Scope.

Severity-Skala projektübergreifend: **KRITISCH / HOCH / MITTEL / NIEDRIG / INFO**.

## Zusammenfassung

| Kennzahl | Wert |
|---|---|
| Geprüfte Phasen | 24 von 24 (6 als „Nicht zutreffend" markiert) |
| Geprüfte Screens | 9 (Consent, Start, MedScan Suche/Detail/Verlauf/Drogen, Medigabe, Übergabe Start/Üben) |
| Geprüfte Breakpoints | 375 px (Touch) und 1440 px; 1024 px für Dialog-Fokus |
| Geprüfte Komponenten-Dateien | 35 (Bestand) |
| Gefundene Issues | 41 |
| Behobene Issues | 35 |
| Offene Issues | 6 (bewusste Entscheidungen bzw. außerhalb UI-Scope) |

Verifikation: `npm test` 268/268 grün (davon 5 neue a11y-Tests), `npm run build` grün, Playwright/Chromium mit axe-core 4 (`wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`, `best-practice`) auf allen 17 Screen/Breakpoint-Kombinationen: **0 Verstöße, 0 px horizontaler Overflow**. Vor den Fixes meldete derselbe Lauf u. a. Heading-Order- und Landmark-Verstöße; die Kontrastwerte unten sind rechnerisch geprüft.

## Accessibility Summary

| Kriterium | Ergebnis |
|---|---|
| WCAG AA Compliance | bestanden (axe, alle geprüften Screens) |
| Keyboard-Navigation | vollständig: Skip-Link, Fokus-Trap, Esc, Fokus-Rückgabe verifiziert |
| Screen-Reader-Semantik | Landmarks, je Screen ein `h1`, Live-Regions, `aria-current`, `role=checkbox`/`aria-pressed` |
| Farbkontrast | alle Text-Tokens ≥ 4.5:1 auf allen Flächen |
| Focus-Management | korrekt (SlideOver, Scanner, ConfirmDialog) |

Kontrast vorher → nachher (schlechteste Fläche `card-hover`):

| Token | vorher | nachher |
|---|---|---|
| `text-muted` | 3.42:1 (#64748B) | 4.70:1 (#7C8BA1) |
| `critical` als Text | 4.32:1 (#EF4444) | 5.88:1 (#F87171) |
| `info` als Text | 4.42:1 (#3B82F6) | 6.40:1 (#60A5FA) |
| Diktat-Button weiß auf rot | 3.76:1 | 7.21:1 (dunkel auf rot) |

## Design System Health

| Kennzahl | Wert |
|---|---|
| Hex-Hardcodes in JSX | vorher 10 Stellen (Trainer, Startseite) → 0 |
| Rohe Tailwind-Paletten (`amber-*`, `purple-*`) | vorher 11 Stellen → 0 (Tokens `drogen`, `neuro`) |
| Redundante Komponenten | vorher 4 (2× Detail-Section, Search/MagnifyingGlass-Icon, Inline-Chips statt `ui/Chip`) → 0 |
| Trainer auf `ui/Button` | vorher 0 von 14 Buttons → 12 (Rest: Hero-Karte und Checklisten-Zeilen, bewusst eigene Form) |

## Issue-Tabelle

| # | Phase | Screen | Issue | Severity | Status |
|---|---|---|---|---|---|
| 1 | P13 Microcopy | Medigabe, Start | „KI" bedeutete in Medigabe *Kontraindikation*, im Rest der App *Künstliche Intelligenz* („Absolute KI", „KI-Check", „KI-gestützter Abgleich" im selben Screen). Verwechslungsgefahr in einem sicherheitsrelevanten Flow | KRITISCH | ✅ Fixed |
| 2 | P14 a11y | alle | `text-muted` 3.4–4.2:1, `critical`/`info` als Text < 4.5:1 | KRITISCH | ✅ Fixed |
| 3 | P14 a11y | MedScan | Ergebniskarte `div[role=button]` mit Stern-/Plus-Buttons darin: verschachtelte interaktive Elemente, Tab-Reihenfolge unzuverlässig (Altbefund P2-6) | KRITISCH | ✅ Fixed (Stretched-Button-Pattern) |
| 4 | P9/P14 | MedScan | Geschlossenes SlideOver blieb per Tab erreichbar und für Screenreader sichtbar; kein Fokus-Trap, keine Fokus-Rückgabe, kein `role=dialog` | KRITISCH | ✅ Fixed (`inert`, `useDialogFocus`) |
| 5 | P4/P11 | alle (mobil) | Startseite mobil nicht erreichbar; Verlauf mobil nicht erreichbar | HOCH | ✅ Fixed |
| 6 | P4/P19 | alle (mobil) | Bottom-Tabs wechselten je Modul Anzahl (3/6) und Reihenfolge (aktives Modul rückte nach vorn); 6 Tabs > 5 | HOCH | ✅ Fixed (feste 4 Tabs) |
| 7 | P9/P16 | Medigabe Schritt 4 | Abwägung relativer Kontraindikationen per `window.confirm`: unstylebar, „OK/Abbrechen", in iOS-PWA teils unterdrückt | HOCH | ✅ Fixed (`ConfirmDialog`) |
| 8 | P16 | Medigabe Schritt 3/8 | „Liste verwerfen" und „Neuer Patient — alles zurücksetzen" löschten ohne Rückfrage | HOCH | ✅ Fixed |
| 9 | P5/P11 | alle | Icon-Buttons 32–36 px (Stern, Plus, Mikrofon, Löschen, Schließen), Chips 32–36 px, Sortier-Select ~24 px | HOCH | ✅ Fixed (≥ 44 px Touch, kompakt ab `lg`) |
| 10 | P2/P18 | alle | Inter/JetBrains Mono von Google Fonts: offline nicht gecacht (PWA-Versprechen „offline"), IP-Übermittlung an Google | HOCH | ✅ Fixed (self-hosted, Latin im Precache) |
| 11 | P2 | PWA | Manifest mit `icons: []`, kein Favicon, kein Apple-Touch-Icon → nicht sauber installierbar; zwei konkurrierende Manifeste, `theme-color` uneinheitlich | HOCH | ✅ Fixed |
| 12 | P7 | alle | Kein Error-Boundary: Renderfehler = leerer Bildschirm | HOCH | ✅ Fixed |
| 13 | P14 | Medigabe | Eingabefelder Alter/Gewicht ohne `label`, Fehler ohne `aria-describedby`/`role=alert`; Segment-Auswahlen ohne Gruppenlabel | HOCH | ✅ Fixed |
| 14 | P14 | Übergabe | Textareas ohne verknüpftes Label; Start-Checkliste als Button im `label` | HOCH | ✅ Fixed |
| 15 | P19 | Übergabe | Trainer umging das Design-System (eigene Button-Stile, Hex-Farben, eigener Hintergrund) — Altbefund P2-1/P2-8 | HOCH | ✅ Fixed |
| 16 | P11 | MedScan (mobil) | `autoFocus` im Suchfeld öffnete bei jedem Modulwechsel die Tastatur und verdeckte die Liste | MITTEL | ✅ Fixed (nur bei Maus/Trackpad) |
| 17 | P14 | alle | Kein Skip-Link, kein `h1` in MedScan/Medigabe, Überschriften-Hierarchie h1→h3 | MITTEL | ✅ Fixed |
| 18 | P14 | alle | Statuswechsel (Trefferzahl, Erkennung, Dosis-Ergebnis, Fehler) ohne Live-Region | MITTEL | ✅ Fixed |
| 19 | P22 | alle | `prefers-reduced-motion` nicht berücksichtigt | MITTEL | ✅ Fixed |
| 20 | P12 | alle | Kein `color-scheme: dark`: native `select`-Popups/Scrollbars hell | MITTEL | ✅ Fixed |
| 21 | P7 | Scanner Upload | Wird der Datei-Dialog abgebrochen, gab es keinen Weg, ihn erneut zu öffnen | MITTEL | ✅ Fixed |
| 22 | P2.3 | MedScan | Kategorie-Chips mit Emoji (plattformabhängig, Stilbruch zu Monoline-Icons) — Altbefund P2-15 | MITTEL | ✅ Fixed |
| 23 | P19 | Lexikon | `QuickFilters`/`SymptomChips` mit Inline-Chips statt `ui/Chip`, zwei „Section"-Implementierungen — Altbefund P2-13/P2-19 | MITTEL | ✅ Fixed |
| 24 | P11 | Übergabe (mobil) | `h1` 60 px auf 375 px, SINNHAFT-Labels 8 px und abgeschnitten | MITTEL | ✅ Fixed |
| 25 | P11 | MedScan (mobil) | Ergebniskarte: Kategorie-Icon nahm ~25 % der Breite, Wirkstoffgruppe brach dreizeilig | MITTEL | ✅ Fixed |
| 26 | P13 | Medigabe | „Medikament(e)"-Klammerplural | MITTEL | ✅ Fixed |
| 27 | P20 | MedScan Detail | Abschnitt „Wirkung: Wirkstoff der Gruppe X." — synthetischer Platzhalter ohne Information | MITTEL | ✅ Fixed (entfernt) |
| 28 | P21 | Medigabe | Kein Print-Stylesheet für die Doku-Zusammenfassung | MITTEL | ✅ Fixed (Navigation/Aktionsleisten ausgeblendet, helles Papier) |
| 29 | P13 | diverse | Copy: „…" als Badge, „Auto-Parse", „Gesperrt", „Klicke auf …" auf Touch-Geräten, Fehler ohne Ausweg | NIEDRIG | ✅ Fixed |
| 30 | P9 | SlideOver | Kein Grab-Handle als Bottom-Sheet-Signal | NIEDRIG | ✅ Fixed |
| 31 | P2.3 | Icons | `MagnifyingGlassIcon` = `SearchIcon` doppelt definiert (Altbefund P2-18) | NIEDRIG | ✅ Fixed |
| 32 | P24 | Lexikon | `BottomTabBar`-Badge per `calc()` positioniert (Altbefund P2-16) | NIEDRIG | ✅ Entfallen (Badge-Tabs entfernt) |
| 33 | P5 | ResultDetail | Externe Links ohne Hinweis „neuer Tab" | NIEDRIG | ✅ Fixed |
| 34 | P7 | App | Consent-Check rendert `null` (Flash) | NIEDRIG | ✅ Fixed |
| 35 | P14 | Trainer | Score nur als Ring ohne Textalternative | NIEDRIG | ✅ Fixed |
| 36 | P12 | alle | **Kein Light-Mode.** Dunkel ist für Nachtdienst richtig, im direkten Sonnenlicht (Einsatzstelle, RTW-Heck) aber schwächer ablesbar | MITTEL | ⏸ Offen — Entscheidung |
| 37 | P18 | alle | Haupt-Bundle 984 kB (188 kB gzip): Daten-JSON und alle Module im Initial-Chunk | MITTEL | ⏸ Offen |
| 38 | P11 | alle | Real-Device-Test (iOS Safari, Android Chrome, Handschuh, Sonnenlicht) nicht durchführbar in dieser Umgebung | MITTEL | ⏸ Offen — manuell |
| 39 | P7 | Scanner | Tesseract-Worker wird von `cdn.jsdelivr.net` geladen (nicht offline, Drittland-Request) | HOCH | ⏸ Offen — außerhalb UI-Scope, separater Task |
| 40 | P13 | DesktopSidebar | „Offline verfügbar" ist statisch, nicht an `navigator.onLine` gekoppelt | NIEDRIG | ⏸ Offen |
| 41 | P24 | alle | Cross-Browser (Safari, Firefox, Edge) nicht automatisiert geprüft, nur Chromium | NIEDRIG | ⏸ Offen — manuell |

## Nicht zutreffend

P8 Dashboard/Charts, P15 SaaS-Patterns (Pricing, Billing, Team, Upgrade), P16.3 Notification-Center, P17.1 globale Mehrbereichssuche, P23.3 RTL, P10.2 Setup-Wizard — Pharos hat keine Konten, keine Zahlungen und keine Charts. Onboarding (P10) ist die Nutzungsvereinbarung plus Startseite mit vier Kacheln und wurde geprüft.

## UX-Readiness-Scorecard

| Bereich | Status | Score |
|---|---|---|
| Design System & Tokens | ✅ | 9/10 |
| Visuelles Design & Branding | ✅ | 8/10 |
| Layout, Spacing & Hierarchie | ✅ | 8/10 |
| Informationsarchitektur | ✅ | 8/10 |
| Interaktionsdesign | ✅ | 8/10 |
| Formulare & Eingaben | ✅ | 8/10 |
| States (Empty/Error/Loading) | ✅ | 8/10 |
| Daten & Dashboard-Design | — | n/a |
| Modale & Overlays | ✅ | 9/10 |
| Onboarding & First-Time UX | ✅ | 7/10 |
| Responsive & Mobile | ✅ | 8/10 |
| Dark Mode | ⚠️ | 7/10 (nur Dark, siehe #36) |
| Microcopy & UX Writing | ✅ | 8/10 |
| Accessibility (WCAG 2.2) | ✅ | 9/10 |
| SaaS-spezifische Patterns | — | n/a |
| Konsistenz | ✅ | 9/10 |
| Design-Psychologie | ✅ | 8/10 |
| Animation & Motion | ✅ | 8/10 |
| Performance als UX | ⚠️ | 6/10 (Bundle, siehe #37) |

## Empfehlungen für die offenen Punkte

**#36 Light-Mode / Hochkontrast:** Kein vollständiges zweites Theme bauen. Wirkungsvoller und billiger ist ein „Tageslicht"-Schalter, der nur die drei Flächen-Tokens und `text-secondary` auf hell umstellt — die Token-Struktur trägt das jetzt. Erst nach einem Feldtest am RTW entscheiden.

**#37 Bundle:** Trainer und Medigabe per `React.lazy` splitten, `data.json` als eigenen Chunk laden. Erwartung: Initial-Chunk etwa halbiert, relevant für den Kaltstart auf schwachem Netz.

**#39 Tesseract-Worker:** `workerPath`/`corePath` in `src/modules/lexikon/lib/ocr.js` auf lokale Assets setzen — betrifft Offline-Versprechen und Datenschutz, nicht das UI.

## Änderungsprotokoll dieses Audits

Neue Bausteine: `ui/useDialogFocus.js`, `ui/ConfirmDialog.jsx`, `ui/DetailSection.jsx`, `shell/ErrorBoundary.jsx`, App-Icons unter `public/icons/`, Tests `tests/ui-a11y.test.jsx`. Entfernt: `public/manifest.webmanifest` (Duplikat zum Vite-PWA-Manifest), Google-Fonts-Einbindung. Neue Abhängigkeiten: `@fontsource-variable/inter`, `@fontsource/jetbrains-mono`.
