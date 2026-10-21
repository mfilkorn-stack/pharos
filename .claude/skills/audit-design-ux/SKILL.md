---
name: audit-design-ux
description: Design-, UX- und UI-Audit auf Lead-Designer-Niveau (24 Phasen, WCAG 2.2, Mobile, Dark Mode, Microcopy). Phasenweise laufen lassen, Findings in docs/audits/ festhalten, jeden Fund sofort fixen und verifizieren.
---

> Herkunft: MASTERPROMPT_DESIGN_UX_UI_AUDIT.md (Masterprompt-Bibliothek, V1.0 2026-04-08). Betrieb: eine Phase pro Session/Subagent, Findings-Dokument im Repo als Übergabe (`docs/audits/`). Severity-Skala projektweit: KRITISCH / HOCH / MITTEL / NIEDRIG / INFO. Für Pharos nicht zutreffende SaaS-Phasen (Pricing, Billing, Team, Notification-Center) werden als „Nicht zutreffend" markiert, nicht übersprungen.

# MASTERPROMPT: Design, UX & UI Audit — Lead-Designer-Level

> **Ziel:** Nach Abschluss dieses Audits ist die gesamte Anwendung visuell konsistent, intuitiv bedienbar, emotional ansprechend, barrierefrei und auf Premium-Niveau gestaltet. Jedes Pixel hat einen Zweck, jede Interaktion fühlt sich richtig an, jeder Screen leitet den User klar zum Ziel. Nichts wird übersprungen, nichts wird "später" gemacht. Jeder Fund wird sofort gefixt, verifiziert und dokumentiert.

---

## ROLLE

Du bist ein **Lead Product Designer mit 20+ Jahren Erfahrung** in Premium-SaaS-Produkten. Du vereinst:

- **Visual Designer** — Typografie, Farbe, Layout, Spacing, Ikonografie, Illustration, Branding-Systeme
- **UX Designer** — Informationsarchitektur, Task-Flows, Mental Models, User Research, Cognitive Walkthroughs
- **Interaction Designer** — Micro-Interactions, Transitions, Animationen, Feedback-Systeme, Gestural Design
- **Design System Architect** — Token-Systeme, Komponenten-Bibliotheken, Pattern Libraries, Design-Governance
- **Accessibility Specialist** — WCAG 2.2 AA/AAA, kognitive Barrierefreiheit, Screenreader, Motorik-Einschränkungen
- **UX Writer** — Microcopy, Fehlertexte, Leerstate-Texte, Onboarding-Copy, CTA-Texte, Tonalität
- **Mobile UX Expert** — Touch-Optimierung, Thumb Zones, Bottom Navigation, Responsive Patterns, Gesture Navigation
- **Design Psychologe** — Fitts's Law, Hick's Law, Miller's Law, Jakob's Law, Gestaltgesetze, Cognitive Load Theory

**Dein Mindset:**
- Du akzeptierst KEIN "sieht OK aus" — nur Premium-Level
- Du prüfst jede Interaktion aus der Perspektive eines First-Time-Users UND eines Power-Users
- Du denkst an den User, der gestresst ist und schnell eine Aufgabe erledigen will
- Du denkst an den User mit Sehschwäche, motorischen Einschränkungen oder kognitiven Herausforderungen
- Du denkst an den User auf einem 5-Zoll-Android im Sonnenlicht
- Du prüfst auf Konsistenz: Sieht jeder Screen aus, als gehöre er zur gleichen App?
- Du achtest auf Details: 1px-Misalignments, inkonsistente Spacing, falsche Schriftgewichte
- Du fixst sofort — kein "das ist nur kosmetisch"
- Gutes Design IST die Funktion

---

## ARBEITSWEISE

1. **Vollständig sehen** — Jeden Screen, jeden State, jeden Breakpoint anschauen bevor du anfasst
2. **User-Perspektive** — Jede Bewertung aus der Sicht realer User, nicht aus Designer-Ästhetik
3. **Heuristik + Evidenz** — Nielsen-Heuristiken als Framework, aber immer gegen echte Nutzungsdaten prüfen
4. **Fixen und Verifizieren** — Jeder Fix wird visuell geprüft (Browser + Mobile + Dark Mode)
5. **Kein Überspringen** — Jeder Punkt wird abgearbeitet oder explizit als "Nicht zutreffend" markiert
6. **Konsistenz über Ästhetik** — Ein konsistentes 8/10-Design schlägt ein inkonsistentes 10/10
7. **Performance ist UX** — Langsame UI ist schlechte UI, unabhängig vom Design
8. **Dokumentieren** — Jeder Fund im Abschluss-Report mit Severity, Screenshot/Beschreibung und Fix

---

## PHASE 1: DESIGN-SYSTEM-BESTANDSAUFNAHME

```
1.1 Design Tokens
    - Farb-Palette dokumentieren (Primary, Secondary, Neutral, Semantic: Success/Warning/Error/Info)
    - Farb-Tokens: Werden sie konsistent verwendet? (keine Hex-Hardcodes im Code)
    - Spacing-Scale dokumentieren (4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px)
    - Typografie-Scale dokumentieren (Sizes, Weights, Line-Heights, Letter-Spacing)
    - Border-Radius-Scale (none, sm, md, lg, full)
    - Shadow-Scale (none, sm, md, lg, xl)
    - Z-Index-Scale (definierte Layer: Base, Dropdown, Sticky, Modal, Toast, Tooltip)
    - Breakpoint-Definitionen (sm, md, lg, xl, 2xl)
    - Transition/Animation-Tokens (Duration, Easing)

1.2 Komponenten-Bibliothek
    - Alle UI-Komponenten inventarisieren (Button, Input, Select, Modal, Toast, Card, Table, etc.)
    - Redundante Varianten identifizieren (3 verschiedene Button-Stile für den gleichen Zweck?)
    - Undokumentierte/wilde Komponenten im Code finden (nicht im Design System)
    - Komponenten-States prüfen: Hat jede Komponente alle States?
      Default, Hover, Active/Pressed, Focus, Disabled, Loading, Error, Success
    - Dark-Mode-Varianten vorhanden?

1.3 Design-Figma/Sketch-vs-Code-Abgleich
    - Stimmen Design-Files mit der tatsächlichen Implementierung überein?
    - Abweichungen dokumentieren (Spacing, Farben, Typografie, Radius)
    - Veraltete Design-Files identifizieren
```

**Output:** Design-Token-Inventar + Komponenten-Katalog + Design-Code-Diff

---

## PHASE 2: VISUELLES DESIGN & BRANDING

```
2.1 Farbsystem
[ ] Primärfarbe hat genügend Kontrast als Button-Hintergrund (weiße Schrift lesbar?)
[ ] Sekundär-/Akzentfarbe differenziert sich klar von Primär
[ ] Semantische Farben konsistent: Rot=Error, Grün=Success, Gelb=Warning, Blau=Info
[ ] Keine Farbe für mehr als eine Bedeutung verwendet (Rot für Error UND Löschen UND Rabatt?)
[ ] Farben funktionieren in Dark Mode (nicht nur invertiert, sondern angepasst)
[ ] Farbpalette getestet für:
    - Deuteranopie (Rot-Grün-Schwäche, häufigste Form)
    - Protanopie (Rot-Schwäche)
    - Tritanopie (Blau-Gelb-Schwäche)
[ ] Keine Information wird nur durch Farbe kommuniziert (immer Label, Icon oder Pattern zusätzlich)
[ ] Neutral-Scale hat genügend Abstufungen (min. 8: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900)
[ ] Hintergrundfarben erzeugen klare Hierarchie (Page → Card → Element)

2.2 Typografie
[ ] Maximal 2 Schriftfamilien (1 für Headings, 1 für Body — oder 1 für alles)
[ ] Font lädt performant (WOFF2, font-display:swap, Subset falls möglich)
[ ] Typografie-Skala konsistent angewendet (keine willkürlichen px-Werte)
[ ] Heading-Hierarchie visuell klar (H1 > H2 > H3 > H4 — erkennbar ohne HTML)
[ ] Body-Text mindestens 16px Desktop / 14-15px Mobile
[ ] Zeilenlänge 45–75 Zeichen Desktop / 30–50 Zeichen Mobile (Sweet Spot: 66)
[ ] Zeilenhöhe (line-height) 1.3–1.5 für Body-Text
[ ] Absatzabstände konsistent
[ ] Schriftgewicht-Abstufungen sinnvoll (Regular, Medium, Semibold, Bold — nicht alle auf einmal)
[ ] Letter-Spacing bei Uppercase-Labels leicht erhöht (+0.02–0.05em)
[ ] Monospace-Schrift für Code-Blöcke, IDs, API-Keys

2.3 Ikonografie
[ ] Ein konsistentes Icon-Set (Lucide, Heroicons, Phosphor — nicht gemischt)
[ ] Icon-Größen standardisiert (16px, 20px, 24px — passend zur Text-Größe)
[ ] Icons haben konsistenten Stil (Outline vs. Filled — nicht gemischt im gleichen Kontext)
[ ] Icons mit Text: Vertikale Ausrichtung korrekt (mittig zum Text)
[ ] Standalone-Icons haben immer Tooltip oder aria-label
[ ] Icons als Buttons haben mindestens 44×44px Touch-Target

2.4 Branding-Konsistenz
[ ] Logo korrekt platziert und in korrekter Größe
[ ] Markenfarben konsistent angewendet
[ ] Tonalität einheitlich (Du vs. Sie, formell vs. casual — durchgehend)
[ ] Illustrationen/Grafiken im einheitlichen Stil
[ ] Favicon, Apple Touch Icon, OG-Image konsistent mit Branding
```

---

## PHASE 3: LAYOUT, SPACING & GRID

```
3.1 Grid-System
[ ] Konsistentes Grid-System verwendet (12-Column, CSS Grid, Flexbox-basiert)
[ ] Max-Width für Content definiert (z.B. 1200px, 1440px — kein Full-Width-Text)
[ ] Seitliche Padding auf Mobile konsistent (min. 16px, besser 20-24px)
[ ] Grid-Alignment: Alle Elemente rasten korrekt ein (keine willkürlichen Offset)

3.2 Spacing-Konsistenz
[ ] Spacing basiert auf einem 4px- oder 8px-Grid (nicht willkürlich)
[ ] Vertikale Abstände zwischen Sections konsistent (gleiche Sections = gleiche Abstände)
[ ] Innen-Padding in Cards/Containern konsistent
[ ] Abstände zwischen Labels und Inputs konsistent (4-8px)
[ ] Abstände zwischen Form-Feldern konsistent (16-24px)
[ ] Abstände in Listen konsistent (zwischen Items gleich)
[ ] Button-Padding konsistent (horizontal + vertikal, pro Größe)
[ ] Keine "halb-Pixel"-Werte (3px, 5px, 7px, 11px — außer bewusst)

3.3 Visuelle Hierarchie
[ ] Jeder Screen hat eine klare Hierarchie: Primär → Sekundär → Tertiär
[ ] Primäre Aktion ist sofort erkennbar (größter/farbigster Button)
[ ] Sekundäre Aktionen sind visuell untergeordnet (Outline, Ghost, Link)
[ ] Destruktive Aktionen (Löschen) sind visuell differenziert (Rot) und erfordern Bestätigung
[ ] Content-Dichte ist angemessen:
    - Nicht zu voll (overwhelm, kognitive Überlastung)
    - Nicht zu leer (wertvoller Viewport verschwendet)
[ ] White Space wird bewusst eingesetzt (Gruppierung nach Gestaltgesetz der Nähe)
[ ] Karten/Container trennen logische Einheiten (nicht alles in einer Fläche)

3.4 Alignment
[ ] Text-Alignment konsistent (Left-aligned für LTR, nicht centered für Fließtext)
[ ] Formular-Labels konsistent positioniert (Top-aligned bevorzugt, nicht Mixed)
[ ] Buttons in Formularen konsistent positioniert (links, rechts oder full-width — aber einheitlich)
[ ] Tabellen-Alignment: Text links, Zahlen rechts, Status center
[ ] Icon+Text-Alignment: Icons vertikal mittig zum Text
```

---

## PHASE 4: INFORMATIONSARCHITEKTUR & NAVIGATION

```
4.1 Navigationsstruktur
[ ] Primäre Navigation enthält max. 5-7 Top-Level-Items (Hick's Law)
[ ] Navigations-Labels sind aufgabenorientiert ("Projekte erstellen" statt "Verwaltung")
[ ] Navigations-Labels matchen die mentalen Modelle der User (nicht interne Terminologie)
[ ] Aktiver Navigations-State ist klar erkennbar (Farbe, Gewicht, Indicator)
[ ] Gleiche Begriffe für gleiche Konzepte überall ("Entfernen" vs. "Löschen" vs. "Papierkorb" — nur einer)
[ ] Navigation ist stabil (springt nicht bei Hover, verschwindet nicht unerwartet)
[ ] Wichtigste Features sind max. 2 Klicks entfernt
[ ] Hierarchie klar: Sidebar für Hauptnavigation, Tabs für Unterseiten, Breadcrumbs für Tiefe
[ ] Mobile Navigation: Hamburger-Menü oder Bottom-Nav (nicht beides)

4.2 Seitenstruktur
[ ] Jede Seite hat einen klaren Titel (was bin ich? was kann ich hier tun?)
[ ] Breadcrumbs bei Tiefe > 2 Level
[ ] Back-Button / Zurück-Navigation intuitiv
[ ] Zusammengehörige Aktionen sind gruppiert (Toolbar, Action-Bar)
[ ] Kontextuelle Aktionen nahe am Inhalt (Edit-Button am Card, nicht in globaler Toolbar)
[ ] Settings/Konfiguration logisch gruppiert (nach Funktion, nicht nach Technik)
[ ] Settings haben Suchfunktion (bei > 20 Einstellungen)

4.3 Findbarkeit & Suche
[ ] Globale Suche vorhanden und prominent (Cmd+K / Spotlight-Pattern)
[ ] Suche liefert Ergebnisse aus verschiedenen Bereichen (Projekte, User, Einstellungen)
[ ] Suchvorschläge / Autocomplete
[ ] Leere Suchergebnisse mit hilfreichen Vorschlägen ("Meintest du...?")
[ ] Letzte Suchen / häufig genutzte Ergebnisse
[ ] Filter und Sortierung logisch und sichtbar (nicht in verstecktem Menü)

4.4 Content-Strategie
[ ] Jeder Screen hat einen klaren Zweck (kein "Dashboard" das alles zeigt und nichts hilft)
[ ] Überschriften scanbar in < 5 Sekunden (User versteht worum es geht, ohne zu lesen)
[ ] Wichtige Informationen "above the fold" (ohne Scrollen sichtbar)
[ ] Progressive Disclosure: Komplexität schrittweise enthüllen (nicht alles auf einmal)
[ ] Miller's Law: Max. 7±2 Items pro Gruppe/Liste sichtbar (danach paginieren oder gruppieren)
```

---

## PHASE 5: INTERAKTIONSDESIGN & MICRO-INTERACTIONS

```
5.1 Button- & Klick-Verhalten
[ ] Jeder klickbare Bereich hat ein Hover-State (Cursor: Pointer + visuelles Feedback)
[ ] Buttons haben alle States: Default, Hover, Active/Pressed, Focus, Disabled, Loading
[ ] Disabled-Buttons erklären warum (Tooltip: "Bitte erst Name ausfüllen")
[ ] Loading-Buttons zeigen Spinner + deaktivieren Click (kein Double-Submit)
[ ] Fitts's Law: Primäre Buttons sind groß und zentral/prominent platziert
[ ] Touch-Targets: Mindestens 44×44px (Apple) / 48×48dp (Google)
[ ] Mindestens 8px Abstand zwischen Touch-Targets
[ ] Destruktive Aktionen erfordern Bestätigung (Custom Modal, kein Browser-Confirm)

5.2 Feedback & Responses
[ ] Jede User-Aktion hat sofortiges Feedback (< 100ms visuell)
[ ] Form-Submit: Button zeigt Loading → Success-Toast → ggf. Redirect
[ ] Fehler: Inline-Fehlermeldung direkt am Feld (nicht nur oben/unten zusammengefasst)
[ ] Erfolg: Toast/Snackbar mit kurzer Bestätigung (verschwindet nach 3-5s)
[ ] Copy-to-Clipboard: Visuelles Feedback ("Kopiert!" mit Checkmark-Animation)
[ ] Delete: Undo-Möglichkeit (Snackbar mit "Rückgängig" für 5s) statt Confirm-Dialog wo möglich
[ ] Realtime-Updates: Subtile Animation bei Datenänderung (nicht plötzliches Springen)

5.3 Transitionen & Animationen
[ ] Animationen haben einen funktionalen Zweck (Orientierung, Feedback, Verbindung — nicht Dekoration)
[ ] Transition-Dauer: 150-300ms (kürzer für Hover, länger für Modals/Pages)
[ ] Easing: ease-out für Einblenden, ease-in für Ausblenden (nicht linear)
[ ] Modals: Fade-in + Scale (von 95% auf 100%) — nicht abrupt erscheinen
[ ] Seitenübergänge: Dezent (Fade oder Slide), nicht spektakulär
[ ] Skeleton-Loader statt Spinner für Content-Bereiche
[ ] prefers-reduced-motion wird respektiert (Animationen deaktiviert oder reduziert)
[ ] Keine Animation dauert > 500ms (fühlt sich sonst träge an)
[ ] 60fps bei allen Animationen (keine Jank/Ruckler — GPU-accelerated)

5.4 Drag & Drop (falls vorhanden)
[ ] Visuelles Feedback beim Greifen (Element hebt sich, Schatten verstärkt)
[ ] Drop-Zone klar markiert (Highlight, Outline)
[ ] Ungültige Drop-Zones zeigen "Nicht erlaubt"-Cursor
[ ] Keyboard-Alternative vorhanden (Move-Up/Down-Buttons)
[ ] Touch-Geräte: Long-Press zum Aktivieren, kein versehentliches Drag beim Scrollen
```

---

## PHASE 6: FORMULARE & EINGABEN

```
6.1 Formular-Layout
[ ] Einspaltiges Layout (nachweislich schneller als mehrspaltig)
[ ] Labels immer über dem Feld (Top-aligned — nicht inline/floating als einzige Option)
[ ] Pflichtfelder klar markiert (Asterisk * ODER optionale Felder markiert)
[ ] Formular-Gruppen logisch zusammengefasst (mit Überschrift/Abschnitt)
[ ] CTA-Button mit klarem Label ("Projekt erstellen" statt "Absenden")
[ ] Sekundäre Aktion (Abbrechen) visuell untergeordnet (Link oder Ghost-Button)

6.2 Input-Felder
[ ] Alle Inputs haben sichtbare Borders (nicht nur bottom-border oder kein Border)
[ ] Focus-State klar erkennbar (farbiger Border, Outline, Glow — nicht nur Cursor)
[ ] Placeholder-Text ist Hilfe, nicht Label (verschwindet beim Tippen → Label muss bestehen bleiben)
[ ] Passende Input-Typen (email, tel, number, date — korrektes Keyboard auf Mobile)
[ ] Passende Autocomplete-Attribute (name, email, organization, etc.)
[ ] Textarea hat sinnvolle Mindest-/Maximalhöhe (auto-grow bevorzugt)
[ ] Passwort-Felder haben Show/Hide-Toggle

6.3 Validierung & Fehler
[ ] Inline-Validierung bei Field-Blur (nicht erst bei Submit)
[ ] Fehlermeldungen direkt unter dem fehlerhaften Feld (rot, mit Icon)
[ ] Fehlermeldungen sind spezifisch und hilfreich:
    ❌ "Ungültige Eingabe"
    ✅ "Bitte gib eine gültige E-Mail-Adresse ein (z.B. name@example.com)"
[ ] Erfolgreich validierte Felder zeigen Checkmark (optional, hilfreich bei komplexen Forms)
[ ] Formulare mit > 5 Feldern: Multi-Step-Wizard mit Fortschrittsanzeige
[ ] Schritt-Completion-Rate tracken (wo brechen User ab?)
[ ] Formular-Daten überleben Page-Reload (Draft-Auto-Save)
[ ] Enter-Taste submittet das Formular (oder geht zum nächsten Feld)

6.4 Smart Defaults & Reduktion
[ ] Intelligente Vorauswahl wo möglich (Land aus IP, Firma aus Email-Domain)
[ ] Jedes Feld rechtfertigt seine Existenz (jedes zusätzliche Feld = 1-3% weniger Conversion)
[ ] Optionale Felder klar als optional markiert
[ ] Toggle/Checkbox statt Dropdown wenn nur 2-3 Optionen
[ ] Date-Picker statt freie Texteingabe für Datumsfelder
[ ] Typeahead/Autocomplete für lange Listen (Länder, Zeitzonen, etc.)
```

---

## PHASE 7: LEERZUSTÄNDE, FEHLERZUSTÄNDE & EDGE CASES

```
7.1 Empty States
[ ] Jeder leere Bereich hat einen gestalteten Empty State (nicht nur "Keine Daten")
[ ] Empty State enthält:
    - Illustration oder Icon (emotional, nicht technisch)
    - Kurze Erklärung was hierher gehört
    - Primäre Aktion ("Erstelle dein erstes Projekt")
[ ] Empty States bei Suche: "Keine Ergebnisse für 'xyz'" + Vorschläge
[ ] Empty States bei Filter: "Keine Ergebnisse mit diesen Filtern" + Filter-Reset-Button
[ ] Erstnutzer-Empty-States sind besonders einladend (Onboarding-Charakter)
[ ] Empty States in Listen, Tabellen, Dashboards, Charts — überall geprüft

7.2 Error States
[ ] Globaler Error (500): Eigene Fehlerseite mit Branding, hilfreichem Text und Retry-Button
[ ] 404-Seite: Gestaltet, hilfreich ("Zurück zur Startseite" + Suche)
[ ] API-Timeout: Spezifische Meldung ("Server antwortet nicht — bitte erneut versuchen")
[ ] Offline: Klar kommuniziert ("Du bist offline. Änderungen werden gespeichert wenn du wieder online bist.")
[ ] Permission-Error: "Du hast keinen Zugriff" + hilfreicher Kontext (Wer kann Zugriff geben?)
[ ] Rate-Limit: "Zu viele Anfragen. Bitte warte einen Moment." (kein kryptischer 429)
[ ] Expired Session: Sanfter Redirect zum Login mit Info ("Deine Sitzung ist abgelaufen")
[ ] Alle Fehler sind verständlich, freundlich und actionable — keine technischen Error-Codes

7.3 Loading States
[ ] Skeleton-Loader für Content-Bereiche (Form der Inhalte andeuten)
[ ] Spinner NUR für kleine, isolierte Aktionen (Button, Inline-Refresh)
[ ] Kein Layout-Shift beim Laden (Platzhalter reservieren exakten Platz)
[ ] Progressive Loading: Oberer Content zuerst, Rest nachlädt
[ ] Timeout nach 10s: Error-State + Retry-Button (kein endloses Laden)
[ ] Optimistic UI wo sinnvoll (Aktion sofort im UI reflektieren, API im Hintergrund)

7.4 Edge Cases
[ ] Sehr lange Texte: Werden sauber truncated (Ellipsis + Tooltip/Expand)
[ ] Sehr lange Wörter: word-break oder overflow-wrap korrekt
[ ] Einzelnes Item in Liste: Layout bricht nicht (kein Pagination-Bug bei 1 Item)
[ ] 0 Items vs. null vs. Loading: Drei verschiedene States, nicht einer für alles
[ ] Internationalisierte Inhalte: Deutsche Strings 30-40% länger als englische — Layout überlebt das?
[ ] Extrem viele Items: Virtualisierung oder Pagination (kein 10.000-Item-DOM)
[ ] User mit extrem langem Namen: Truncation mit Tooltip
[ ] Avatar ohne Bild: Sinnvoller Fallback (Initialen, generischer Avatar)
```

---

## PHASE 8: DASHBOARD & DATENVISUALISIERUNG

```
8.1 Dashboard-Design
[ ] Dashboard hat klaren Fokus (was ist die EINE wichtigste Info?)
[ ] Wichtigste Metriken oben (KPI-Cards mit Trend-Indikator)
[ ] Daten sind aktuell (Timestamp: "Zuletzt aktualisiert: vor 5 Minuten")
[ ] Dashboard ist anpassbar (Widgets hinzufügen/entfernen/umsortieren — falls Feature)
[ ] Dashboard-Empty-State für neue User (keine leeren Charts, sondern Onboarding)
[ ] Zeitraum-Filter (Heute, 7 Tage, 30 Tage, Custom Range)
[ ] Responsive: Dashboard funktioniert auf Mobile (Cards statt Grid, Swipe statt Scroll)

8.2 Charts & Visualisierungen
[ ] Chart-Typ passt zur Datenart:
    - Trend → Line Chart
    - Vergleich → Bar Chart
    - Anteil → Pie/Donut (nur bei ≤ 5 Kategorien)
    - Korrelation → Scatter
[ ] Charts haben Achsen-Labels und Legende
[ ] Farben in Charts sind farbenblind-sicher (Deuteranopie-Test)
[ ] Hover/Tooltip zeigt exakte Werte
[ ] Leere Charts zeigen hilfreichen Empty State (nicht nur leere Achsen)
[ ] Charts sind responsive (keine abgeschnittenen Labels auf Mobile)
[ ] Chart-Animationen sind dezent (kein unnötiges Bouncing)
[ ] Große Zahlen sind formatiert (1.234.567 statt 1234567, "1,2 Mio." ab Schwellwert)

8.3 Tabellen
[ ] Tabellen-Header sticky bei langem Scroll
[ ] Sortierbare Spalten haben Pfeil-Indikator
[ ] Aktive Sortierung klar erkennbar
[ ] Hover-State auf Tabellenzeilen
[ ] Zeilen-Aktionen: Inline-Buttons oder Drei-Punkte-Menü (konsistent wählen)
[ ] Checkbox-Selektion für Bulk-Aktionen (Select-All + individuelle Selektion)
[ ] Bulk-Action-Bar erscheint bei Selektion (sticky am unteren Rand oder oben)
[ ] Responsive: Tabelle scrollt horizontal oder wird zu Card-Layout auf Mobile
[ ] Leere Tabelle: Gestalteter Empty State (nicht nur leere Zeilen)
[ ] Pagination oder Infinite Scroll (nicht 500 Zeilen auf einmal)
[ ] Zeilen-Dichte anpassbar (Compact, Default, Comfortable — optional)
```

---

## PHASE 9: MODALE, OVERLAYS & DIALOGE

```
9.1 Modals
[ ] Modals haben Overlay-Backdrop (leicht transparent, Fokus auf Modal)
[ ] Animation beim Öffnen: Fade + Scale (nicht abrupt)
[ ] Schließbar via: X-Button, ESC-Taste, Klick auf Backdrop
[ ] Focus Trap aktiv (Tab bleibt im Modal)
[ ] Focus wird beim Öffnen auf erstes interaktives Element gesetzt
[ ] Focus wird beim Schließen auf das auslösende Element zurückgesetzt
[ ] Modals nicht verschachteln (kein Modal-im-Modal)
[ ] Modals auf Mobile: Full-Screen oder Bottom-Sheet (nicht schwebend)
[ ] Destruktive Modals (Löschen) haben roten Bestätigungs-Button + Kontext ("Lösche 'Projektname'?")
[ ] Formular-Modals: Warnung bei ungespeicherten Änderungen

9.2 Bottom Sheets (Mobile)
[ ] Slide-Up-Animation von unten
[ ] Swipe-Down zum Schließen
[ ] Grab-Handle oben sichtbar
[ ] Verschiedene Snap-Points (halb offen, voll offen)
[ ] Kein Body-Scroll im Hintergrund

9.3 Dropdowns & Popovers
[ ] Öffnen sich in Leserichtung (nach unten, außer am Seitenende → nach oben flippen)
[ ] Klick außerhalb schließt
[ ] ESC schließt
[ ] Keyboard-navigierbar (Pfeiltasten + Enter)
[ ] Max-Height mit Scroll bei langen Listen
[ ] Aktuelle Auswahl markiert
[ ] Suche/Filter bei > 10 Einträgen

9.4 Tooltips
[ ] Erscheinen nach kurzer Verzögerung (300-500ms, nicht sofort)
[ ] Verschwinden nicht sofort wenn Maus zum Tooltip wandert
[ ] Kurz und knapp (max. 1-2 Sätze)
[ ] Positionierung: Nicht über das auslösende Element oder off-screen
[ ] Auf Touch-Geräten: Tap-to-Show oder gar nicht (kein Hover)
[ ] ARIA: role="tooltip" + aria-describedby
```

---

## PHASE 10: ONBOARDING & FIRST-TIME-EXPERIENCE

```
10.1 Erster Eindruck
[ ] Landing → Signup → First Screen: Maximale 3 Klicks
[ ] Erster Screen nach Login ist nicht leer (Willkommen + erste Aktion)
[ ] Kein Feature-Overload beim ersten Besuch (Progressive Disclosure)
[ ] Tonalität: Einladend, nicht überwältigend

10.2 Onboarding-Flow
[ ] Setup-Wizard: Maximal 3-4 Schritte (72% Completion vs. 16% bei 7+)
[ ] Fortschrittsanzeige (Step 2 of 3 oder Progress-Bar)
[ ] Jeder Schritt hat ein klar erkennbares Ziel
[ ] Skip-Option für erfahrene User
[ ] Illustration oder Bild pro Schritt (visuell einladend, nicht nur Text)
[ ] Letzter Schritt: Zusammenfassung + CTA zur Kernfunktion

10.3 Kontextuelle Hilfe
[ ] Tooltips auf komplexen Funktionen (nicht auf offensichtlichen)
[ ] "Was ist das?"-Links zu Help Center-Artikeln
[ ] Feature-Announcements bei neuen Features (dezent, nicht modal-bombardierend)
[ ] Leere Screens erklären sich selbst (Empty States mit Anleitung)

10.4 Wiederkehrende User
[ ] Dashboard/Startseite zeigt relevante Inhalte (nicht immer das gleiche Onboarding)
[ ] Letzte Aktivitäten / Kürzlich geöffnet
[ ] Keyboard-Shortcuts dokumentiert und auffindbar (Cmd+/ oder ?-Taste)
```

---

## PHASE 11: RESPONSIVE & MOBILE UX

```
11.1 Breakpoint-Test
Teste auf jedem Breakpoint:
- 320px  (iPhone SE, kleinstes relevantes Gerät)
- 375px  (iPhone Standard)
- 414px  (iPhone Plus/Max)
- 768px  (Tablet Portrait)
- 1024px (Tablet Landscape / kleiner Laptop)
- 1440px (Desktop Standard)
- 1920px (Full HD)

Prüfe jeweils:
[ ] Kein horizontales Scrolling
[ ] Text lesbar, keine Überlappungen
[ ] Navigation bedienbar
[ ] Touch-Targets ≥ 44×44px
[ ] Modals/Overlays bedienbar und schließbar
[ ] Formulare bedienbar
[ ] Tabellen responsiv
[ ] Charts lesbar
[ ] Sticky/Fixed Elemente verdecken keinen Content
[ ] Layout-Shift beim Laden minimal

11.2 Mobile-spezifisch
[ ] Thumb-Zone-Optimierung: Primäre Aktionen im unteren Drittel des Screens
[ ] Bottom Navigation für Haupt-Bereiche (max. 5 Items)
[ ] Swipe-Gesten als ERGÄNZUNG (nie als einzige Möglichkeit)
[ ] Pull-to-Refresh wo sinnvoll (Listen, Dashboard)
[ ] Numerische Tastatur bei Zahlen-Inputs (inputmode="numeric")
[ ] Kein kleiner Text der gezoomt werden muss (min. 14px)
[ ] Kein Double-Tap-to-Zoom nötig (viewport meta korrekt)
[ ] Safe Area Insets beachtet (iPhone Notch, Home-Indicator)
[ ] Landscape-Modus bricht Layout nicht

11.3 Desktop-spezifisch
[ ] Keyboard-Shortcuts für Power-User (Cmd+K Suche, Cmd+S Speichern, etc.)
[ ] Rechtsklick-Kontextmenü wo sinnvoll
[ ] Multi-Column-Layout nutzt verfügbaren Platz
[ ] Sidebar collapsible (mehr Platz für Content)
[ ] Resize-Handle bei Split-Views
[ ] Breite > 1920px: Content zentriert mit Max-Width (kein endloses Stretching)
```

---

## PHASE 12: DARK MODE

```
12.1 Farb-Anpassungen
[ ] Nicht einfach invertiert — bewusst designed
[ ] Hintergründe: Dunkelgrau (#121212–#1E1E1E), NICHT reines Schwarz (#000)
[ ] Text: Soft White (#E0E0E0–#F0F0F0), NICHT reines Weiß (#FFF) — reduziert Augen-Strain
[ ] Primärfarbe angepasst (oft etwas heller/gesättigter als im Light Mode)
[ ] Schatten funktionieren anders (dunkler + größer, oder durch leichte Borders ersetzen)
[ ] Erhöhte Flächen sind heller (nicht dunkler) als Basis (Material-Design-Principle)

12.2 Kontrast & Lesbarkeit
[ ] Text-Kontrast ≥ 4.5:1 für normalen Text
[ ] Text-Kontrast ≥ 3:1 für großen Text (≥18px bold oder ≥24px regular)
[ ] UI-Elemente (Borders, Icons, Dividers) haben ≥ 3:1 Kontrast zum Hintergrund
[ ] Kein "Halation" (leuchtender Text auf dunklem Grund bei Astigmatismus-Betroffenen)
[ ] Bilder/Illustrationen funktionieren auf dunklem Hintergrund (ggf. Hintergrund oder Outline)
[ ] Status-Farben (Rot, Grün, Gelb, Blau) angepasst für Dark Mode

12.3 Implementation
[ ] prefers-color-scheme Media Query implementiert (System-Preference respektieren)
[ ] Manueller Toggle vorhanden (in Settings oder Header)
[ ] Gewählte Preference wird gespeichert (nicht bei jedem Besuch zurückgesetzt)
[ ] Transition zwischen Modes: Sanfter Übergang (kein Flash)
[ ] JEDER Screen in Dark Mode geprüft (nicht nur die Haupt-Screens)
[ ] Third-Party-Embeds / Iframes in Dark Mode geprüft (kein weißer Flash)
[ ] Code-Blöcke haben eigenes Dark-Mode-Syntax-Highlighting
```

---

## PHASE 13: MICROCOPY & UX WRITING

```
13.1 Allgemeine Prinzipien
[ ] Tonalität konsistent (Du/Sie durchgehend, formell/casual durchgehend)
[ ] Texte sind scanbar (kurze Sätze, aktive Sprache)
[ ] Keine technischen Fachbegriffe für End-User (kein "Entity", "Payload", "Webhook")
[ ] Keine doppelten Negationen ("Möchtest du nicht nicht benachrichtigt werden?")
[ ] Positive Formulierung bevorzugt ("Angemeldet bleiben" statt "Nicht abmelden")

13.2 Button-Labels
[ ] Buttons beschreiben die Aktion ("Projekt erstellen" statt "Absenden")
[ ] Destruktive Buttons beschreiben was gelöscht wird ("Projekt löschen" statt "Löschen")
[ ] Konsistente Verben: Erstellen, Bearbeiten, Löschen, Speichern, Abbrechen — nicht synonym mischen
[ ] Keine generischen Labels ("OK", "Weiter", "Klicken") ohne Kontext

13.3 Fehlermeldungen
[ ] Formel: Was ist passiert + Warum + Was kann der User tun
    ✅ "Die E-Mail-Adresse ist bereits registriert. Du kannst dich anmelden oder das Passwort zurücksetzen."
    ❌ "Error: Duplicate entry"
[ ] Kein Schuldzuweisung ("Du hast einen Fehler gemacht" → "Bitte prüfe deine Eingabe")
[ ] Keine kryptischen Codes (Error 422 → verständliche Meldung)
[ ] Humor vorsichtig einsetzen (404-Seite OK, Zahlungsfehler NICHT)

13.4 Leere States & Bestätigungen
[ ] Empty-State-Texte sind einladend und handlungsorientiert
[ ] Success-Messages sind spezifisch ("Projekt 'Marketing Q4' erstellt" statt "Erfolgreich!")
[ ] Bestätigungs-Dialoge erklären Konsequenz ("Wenn du löschst, verlierst du alle X Einträge")
[ ] Tooltips erklären Nutzen, nicht Funktion ("Schneller finden" statt "Öffnet die Suchfunktion")

13.5 Zahlen & Einheiten
[ ] Große Zahlen formatiert (1.234 statt 1234)
[ ] Relative Zeiten ("vor 3 Stunden" statt "14:23 UTC+2")
[ ] Prozente mit Kontext ("32% der Besucher" statt nur "32%")
[ ] Geldbeträge mit Währungssymbol und korrekter Formatierung
```

---

## PHASE 14: ACCESSIBILITY (a11y) — TIEFENAUDIT

```
14.1 Keyboard-Navigation
[ ] JEDES interaktive Element per Tab erreichbar
[ ] Tab-Reihenfolge ist logisch (links→rechts, oben→unten, wie visuelles Layout)
[ ] Focus-Indicator auf JEDEM Element sichtbar (nicht display:none auf Outline!)
[ ] Focus-Indicator hat ≥ 3:1 Kontrast zum Hintergrund
[ ] Custom Focus-Style konsistent (z.B. 2px solid blue Outline + 2px Offset)
[ ] Skip-to-Content-Link als erstes Element (sichtbar bei Focus)
[ ] ESC schließt Overlays/Modals
[ ] Enter/Space aktiviert Buttons und Links
[ ] Pfeiltasten navigieren in Tabs, Menüs, Dropdowns
[ ] Keine Keyboard-Traps (User kommt aus jedem Element wieder raus)

14.2 Screen Reader
[ ] Sinnvolle Lesereihenfolge (DOM-Order = visuelle Reihenfolge)
[ ] Landmarks korrekt: <header>, <nav>, <main>, <aside>, <footer>
[ ] Genau ein <main> pro Seite
[ ] aria-label auf Navigation-Landmarks die sich wiederholen ("Hauptnavigation", "Footer-Navigation")
[ ] Bilder: Informative haben beschreibendes alt, dekorative haben alt=""
[ ] Icons als Buttons: aria-label beschreibt die Aktion ("Schließen", "Bearbeiten", "Löschen")
[ ] Live Regions: Toast-Nachrichten mit aria-live="polite"
[ ] Fehler-Zusammenfassung mit aria-live="assertive"
[ ] Formulare: Label, Error und Hilfstext korrekt verknüpft (aria-describedby)
[ ] Tabellen: <th> mit scope="col"/"row", <caption> für Tabellenzweck
[ ] Dynamische Inhalte: Screen Reader wird über Änderungen informiert
[ ] Keine "Click here" oder "Read more" Links (Link-Text beschreibt Ziel)

14.3 Visuell
[ ] Text-Kontrast ≥ 4.5:1 (WCAG AA) — auf ALLEN Hintergrundfarben prüfen
[ ] Großer Text (≥18px bold, ≥24px regular) ≥ 3:1
[ ] UI-Komponenten und grafische Objekte ≥ 3:1 gegen angrenzende Farben
[ ] Text ist auf 200% zoombar ohne Verlust (kein Overflow, kein Abschneiden)
[ ] Keine Information nur durch Farbe (immer Label, Icon oder Pattern zusätzlich)
[ ] Focus-Indicator ≥ 2px dick und ≥ 3:1 Kontrast

14.4 Kognitive Accessibility
[ ] Konsistente Patterns auf allen Seiten (gleiche Aktion = gleiche Stelle = gleiches Aussehen)
[ ] Klare, einfache Sprache (kein Jargon, kurze Sätze)
[ ] Keine Zeitlimits ohne Möglichkeit der Verlängerung
[ ] Auto-Play-Inhalte können pausiert werden
[ ] Keine mehr als 3 Blinks pro Sekunde (Epilepsie-Risiko)
[ ] prefers-reduced-motion wird respektiert
[ ] prefers-contrast wird respektiert (falls High-Contrast-Mode unterstützt)
[ ] Error-Recovery ist einfach (Undo, Zurück, kein Datenverlust)
[ ] Hilfe ist kontextuell verfügbar (nicht nur in externem Help Center)

14.5 Motorische Einschränkungen
[ ] Alle Funktionen per Tastatur bedienbar (keine reine Maus-/Touch-Abhängigkeit)
[ ] Drag & Drop hat Tastatur-Alternative
[ ] Keine Hover-only-Informationen (Hover ist Ergänzung, nicht einziger Zugang)
[ ] Kein Doppelklick nötig für Kernfunktionen
[ ] Touch-Targets groß genug (≥ 44×44px)
[ ] Genügend Abstand zwischen Touch-Targets (≥ 8px)
```

---

## PHASE 15: SAAS-SPEZIFISCHE UX-PATTERNS

```
15.1 Pricing & Checkout
[ ] Plan-Vergleich auf einen Blick scanbar (Feature-Grid mit Checkmarks)
[ ] Empfohlener Plan hervorgehoben ("Beliebt" / "Empfohlen"-Badge)
[ ] Preis klar und prominent (Monatspreis UND Jahresersparnis sichtbar)
[ ] Toggle für monatlich/jährlich sofort sichtbar (nicht versteckt)
[ ] CTA-Buttons klar: "Jetzt starten", "Kostenlos testen", "Upgrade"
[ ] Enterprise-Plan: "Kontakt aufnehmen" statt Preis
[ ] Checkout-Flow: Minimal Fields, kein Ablenkung, Progress-Indicator
[ ] Bezahlformular vertrauenswürdig (SSL-Badge, Stripe-Badge, Lock-Icon)

15.2 Settings & Konfiguration
[ ] Settings logisch gruppiert (Profil, Team, Billing, Integrationen, Sicherheit)
[ ] Jede Änderung wird sofort gespeichert ODER es gibt ein explizites "Speichern" (nicht mischen)
[ ] Dangerous Settings (Löschen, Deaktivieren) am Ende, visuell abgesetzt (Danger Zone)
[ ] Settings-Suche bei > 20 Optionen
[ ] Jede Setting erklärt was sie tut (Beschreibung unter Label)
[ ] Settings-Änderungen zeigen Impact ("Betrifft alle 12 Teammitglieder")

15.3 Billing & Subscription UI
[ ] Aktueller Plan klar sichtbar
[ ] Nächstes Zahlungsdatum sichtbar
[ ] Upgrade/Downgrade-Button prominent
[ ] Zahlungsmethode ändern (Self-Service)
[ ] Rechnungshistorie mit Download
[ ] Trial-Countdown in der App sichtbar (aber nicht aufdringlich)
[ ] Dunning-Banner bei fehlgeschlagener Zahlung (persistent, nicht dismissable)

15.4 Team-Management UI
[ ] Mitgliederliste mit Rollen-Badge, Status-Indikator, Avatar
[ ] Einladungs-Flow visuell geführt (Email eingeben → Rolle wählen → Senden)
[ ] Rollen-Änderung mit Dropdown direkt in der Liste
[ ] Seat-Counter sichtbar ("5 von 10 Seats verwendet")
[ ] Entfernen-Aktion mit Bestätigung ("User X aus dem Team entfernen?")

15.5 Upgrade-Prompts
[ ] Nicht aufdringlich (kein volles Modal bei jedem Login)
[ ] Kontextuell: Erscheinen nur wenn Feature benötigt wird
[ ] Zeigen konkreten Nutzen ("Upgrade für unbegrenzte Projekte")
[ ] Dismissable und merkt sich Dismissal (nicht jedes Mal wieder)
[ ] Visuell klar als Promotion erkennbar (nicht wie ein Fehler)
```

---

## PHASE 16: NOTIFICATION & FEEDBACK-DESIGN

```
16.1 Toast/Snackbar
[ ] Position konsistent (Bottom-Center oder Top-Right — einheitlich)
[ ] Auto-Dismiss nach 3-5 Sekunden (oder persistent bei Errors)
[ ] Dismiss-Button (X) vorhanden
[ ] Undo-Button bei destruktiven Aktionen (5s Fenster)
[ ] Maximal 1-2 Toasts gleichzeitig (Stacking, kein Spam)
[ ] Visuell differenziert: Success (grün), Error (rot), Warning (gelb), Info (blau)
[ ] Nicht über kritische UI-Elemente gelegt

16.2 Inline-Feedback
[ ] Form-Validierung inline am Feld (nicht nur im Toast)
[ ] Erfolgreiche Speicherung: Kurzes visuelles Feedback am Element (Checkmark, Flash)
[ ] Status-Änderungen: Badge/Label aktualisiert sich sofort (Optimistic UI)
[ ] Progress-Indicator bei lang laufenden Operationen (Upload, Export, AI-Generierung)

16.3 Notification-Center (In-App)
[ ] Klar strukturiert (Ungelesen oben, gelesen unten oder separater Tab)
[ ] Ungelesene-Count auf Bell-Icon (Badge)
[ ] Notification-Typ visuell differenziert (Icon + Farbe)
[ ] Timestamp relativ ("vor 3 Stunden")
[ ] Klick auf Notification navigiert zum Kontext (Deep-Link)
[ ] "Alle als gelesen markieren" vorhanden
[ ] Leerer Notification-State: "Alles erledigt!" (nicht nur leer)

16.4 Destructive Actions
[ ] Confirmation-Dialog mit konkretem Text ("Lösche Projekt 'Marketing Q4'?")
[ ] Beschreibung der Konsequenzen ("Alle 23 Aufgaben werden unwiderruflich gelöscht")
[ ] Bestätigungs-Button ist rot und beschreibend ("Projekt löschen" nicht "OK")
[ ] Abbrechen-Button ist prominent und einfach erreichbar
[ ] Type-to-Confirm bei hochkritischen Aktionen (Team/Org löschen: "Tippe 'LÖSCHEN' ein")
```

---

## PHASE 17: SUCHE & FILTER

```
17.1 Globale Suche
[ ] Prominent platziert (Header) oder über Keyboard-Shortcut (Cmd+K)
[ ] Sofortige Ergebnisse beim Tippen (< 300ms Debounce)
[ ] Ergebnisse nach Typ gruppiert (Projekte, User, Einstellungen, Hilfe-Artikel)
[ ] Suchbegriff hervorgehoben in Ergebnissen (Bold/Highlight)
[ ] Keyboard-Navigation in Ergebnisliste (Pfeiltasten + Enter)
[ ] Letzte Suchen / häufig genutzte Ergebnisse beim leeren Feld
[ ] Leere Ergebnisse: Hilfreiche Nachricht + alternative Aktionen
[ ] Suche funktioniert auch mit Tippfehlern (Fuzzy Search)

17.2 Listen-Filter
[ ] Filter sind sichtbar und verständlich (nicht versteckt in Dropdown)
[ ] Aktive Filter klar erkennbar (Badges, Tags, farbliche Hervorhebung)
[ ] Filter-Kombination möglich (UND/ODER)
[ ] "Filter zurücksetzen" prominent verfügbar
[ ] Filter-State in URL gespeichert (Deep-Linkable, shareable)
[ ] Ergebnis-Count aktualisiert sich live bei Filter-Änderung ("23 Ergebnisse")

17.3 Sortierung
[ ] Standard-Sortierung ist sinnvoll (neueste zuerst oder relevanteste)
[ ] Sortier-Richtung visuell erkennbar (Pfeil hoch/runter)
[ ] Multi-Level-Sortierung wo sinnvoll ("Sortiere nach Status, dann nach Datum")
```

---

## PHASE 18: PERFORMANCE ALS UX

```
18.1 Wahrgenommene Performance
[ ] Interaktionen fühlen sich sofort an (< 100ms visuelles Feedback)
[ ] Skeleton-Loader statt leerer Screens
[ ] Optimistic UI: Aktionen werden sofort reflektiert (Toggle-Switch, Like-Button)
[ ] Above-the-Fold Content lädt zuerst
[ ] Lazy Loading für Below-the-Fold Content und Bilder
[ ] Infinite Scroll statt "Seite 2" wo sinnvoll (aber mit "Zurück zum Anfang"-Button)

18.2 Render-Performance
[ ] Kein Layout-Shift (CLS < 0.1) — Platzhalter für Bilder, Ads, dynamische Inhalte
[ ] Animationen bei 60fps (GPU-beschleunigt: transform + opacity, nicht width/height)
[ ] Kein Jank beim Scrollen (Event Listener passiv)
[ ] Keine UI-Freezes bei Datenverarbeitung (Web Worker für teure Operationen)
[ ] Virtualisierung für lange Listen (> 100 Items)

18.3 Loading-Strategie
[ ] Kritische Resources preloaded (Fonts, Hero-Image, CSS)
[ ] Code-Splitting: Routen laden nur ihren eigenen Code
[ ] Prefetch: Wahrscheinliche nächste Seite wird vorab geladen
[ ] Bilder: Responsive Sizes, WebP/AVIF, Lazy Loading
[ ] Third-Party-Scripts: Async/Defer, ggf. auf Interaction laden
```

---

## PHASE 19: DESIGN-KONSISTENZ-AUDIT

```
19.1 Cross-Screen-Konsistenz
Prüfe diese Elemente auf JEDER Seite der App:
[ ] Header/Navbar: Gleiche Höhe, gleiche Elemente, gleiche Position
[ ] Sidebar: Gleiche Breite, gleiche Styles, gleicher Collapse-Behavior
[ ] Page-Title: Gleiche Typografie, gleiche Position, gleiche Hierarchie
[ ] Content-Container: Gleiche Max-Width, gleiche Padding
[ ] Cards: Gleicher Radius, gleiche Shadows, gleiche Padding
[ ] Buttons: Gleiche Styles für gleiche Aktionen (Primär, Sekundär, Destruktiv)
[ ] Formulare: Gleiche Input-Styles, gleiche Label-Position, gleiche Spacing
[ ] Tabellen: Gleiche Row-Height, gleiche Header-Style, gleiche Alignment
[ ] Modals: Gleiche Breite, gleiche Animation, gleiche Struktur
[ ] Toasts: Gleiche Position, gleiche Duration, gleiche Styles
[ ] Empty States: Gleicher Stil (Illustration, Text, CTA)
[ ] Error States: Gleicher Stil und gleiche Sprache
[ ] Loading States: Gleicher Skeleton/Spinner-Stil

19.2 Wortwahlkonsistenz
[ ] Glossar erstellen: Wird "Workspace" oder "Team" oder "Organisation" verwendet?
[ ] Aktionen: "Erstellen" vs. "Anlegen" vs. "Hinzufügen" — nur EIN Verb pro Konzept
[ ] Lösch-Aktionen: "Löschen" vs. "Entfernen" vs. "Archivieren" — klar differenziert
[ ] Navigations-Labels: Gleiche Terminologie in Navbar, Breadcrumbs, Page-Titles
[ ] CTAs: Gleicher Wortlaut für gleiche Aktionen auf verschiedenen Screens

19.3 Visuelles System
[ ] Nur definierte Token-Werte im Code (keine Hex-Hardcodes, keine willkürlichen px-Werte)
[ ] Konsistente Border-Radien (nicht 4px auf einem Element und 8px auf dem nächsten ohne Grund)
[ ] Konsistente Schatten (gleiche Elevations-Stufen überall)
[ ] Konsistente Divider-Styles (1px solid neutral-200, nicht mal Borders, mal Schatten, mal Spacing)
[ ] Icon-Größen konsistent pro Kontext (16px inline, 20px in Buttons, 24px standalone)
```

---

## PHASE 20: DESIGN-PSYCHOLOGIE-CHECK

```
20.1 Cognitive Load minimieren
[ ] Jeder Screen hat einen primären Fokus (nicht 5 gleichwertige CTAs)
[ ] Hick's Law: Entscheidungspunkte haben max. 3-5 Optionen (darüber: Progressive Disclosure)
[ ] Miller's Law: Sichtbare Items pro Gruppe max. 7±2
[ ] Informationen sind gechunked (Abschnitte, Karten, Tabs — nicht endloser Fließtext)
[ ] Kognitive Last wird durch Konsistenz reduziert (bekannte Patterns wiederverwenden)

20.2 Vertrauen aufbauen
[ ] Professionelle visuelle Qualität (keine Placeholder, kein Lorem Ipsum in Production)
[ ] Social Proof sichtbar (Logos, Testimonials, User-Count)
[ ] Security-Signale im Checkout (SSL, Stripe, Trust-Badges)
[ ] Transparenz bei Datenverarbeitung (was passiert mit meinen Daten?)
[ ] Menschlichkeit: Echte Fotos statt Stock, echte Testimonials mit Namen

20.3 Motivation & Engagement
[ ] Micro-Rewards: Visuelles Feedback bei Fortschritt (Checkmarks, Progress-Bars)
[ ] Completion-Indicators: "Dein Profil ist zu 70% vollständig"
[ ] Sinnvolle Defaults reduzieren Aufwand
[ ] Quick-Wins in Onboarding (erste Erfolgserlebnisse in < 2 Minuten)
[ ] Power-User-Accelerators sichtbar aber nicht aufdringlich (Shortcuts, Bulk-Actions)

20.4 Frustration vermeiden
[ ] Fitts's Law: Klick-Ziele sind groß und nahe an Ausgangspunkten
[ ] Kein Datenverlust bei Navigation oder Browser-Crash (Auto-Save, Drafts)
[ ] Keine Dead Ends (jeder Error-State hat einen Ausweg)
[ ] Keine unerwarteten Konsequenzen (Delete-ohne-Warnung, irreversible Aktionen)
[ ] Wartezeiten werden kommuniziert (Fortschrittsanzeige, geschätzte Dauer)
[ ] Jakob's Law: Interfaces verhalten sich wie User es von anderen Apps erwarten
```

---

## PHASE 21: PRINT & EXPORT-DESIGN

```
[ ] Print-Stylesheet vorhanden (@media print)
[ ] Navigations-Elemente ausgeblendet beim Drucken
[ ] Hintergrundfarben optional (nicht kritisch für Information)
[ ] Links werden als URLs angezeigt beim Drucken
[ ] Seitenumbrüche an sinnvollen Stellen (page-break-before/after)
[ ] PDF-Export hat sauberes Layout (nicht Screenshot, sondern generiertes PDF)
[ ] PDF-Export hat Branding (Logo, Farben)
[ ] Excel/CSV-Export hat saubere Datenstruktur
[ ] Export-Inhalte sind vollständig (nicht abgeschnitten)
```

---

## PHASE 22: ANIMATION & MOTION DESIGN

```
22.1 Motion-Prinzipien
[ ] Jede Animation hat einen Zweck:
    - Feedback (Button-Press, Toggle-Switch)
    - Orientierung (woher kommt ein Modal? wohin verschwindet es?)
    - Aufmerksamkeit (neue Notification, wichtige Änderung)
    - Verbindung (Element transformiert sich zu anderem Element)
[ ] Keine dekorativen Animationen ohne Funktion
[ ] Animation-Dauer: 150ms (Micro) → 200ms (Small) → 300ms (Medium) → 500ms (Large/Page)
[ ] Easing: ease-out für Einblenden, ease-in für Ausblenden, ease-in-out für Zustandswechsel
[ ] KEINE lineares Easing (fühlt sich robotisch an)

22.2 Spezifische Animationen
[ ] Page-Transition: Dezentes Fade (150-200ms)
[ ] Modal: Fade + Scale von 95%→100% (200ms)
[ ] Dropdown: Slide-Down + Fade (150ms)
[ ] Toast: Slide-In von Seite oder Fade von unten (200ms)
[ ] Skeleton → Content: Crossfade (nicht abrupt)
[ ] Toggle/Switch: Smooth Slide (150ms)
[ ] Hover-Effekte: Sofort (< 100ms)
[ ] Delete-Animation: Item collapsed/fades (200ms), Nachfolger rücken nach

22.3 Motion Accessibility
[ ] prefers-reduced-motion: Animationen reduziert oder deaktiviert
[ ] Keine blinkenden Elemente (> 3 Blinks/Sekunde)
[ ] Keine großflächigen Parallax-Effekte (Vestibulare Störungen)
[ ] Auto-Play-Videos pausierbar
[ ] Karussells haben Pause-Button und manuelle Navigation
```

---

## PHASE 23: MULTI-LANGUAGE & KULTURELLE UX

```
23.1 Text-Expansion
[ ] Deutsche Texte (30-40% länger als Englisch) brechen Layout nicht
[ ] Buttons wachsen mit Text oder haben Mindestbreite
[ ] Tabellen-Header kürzen sinnvoll ab
[ ] Navigation items passen auch in längster Sprache

23.2 Kulturelle Anpassungen
[ ] Datumsformat korrekt (DD.MM.YYYY für DE, MM/DD/YYYY für US)
[ ] Zahlenformat korrekt (1.234,56 für DE, 1,234.56 für US)
[ ] Währungsformat korrekt (€1.234,56 für DE, $1,234.56 für US)
[ ] Adress-Formular-Felder passen sich an Land an (PLZ-Position, Bundesland, etc.)

23.3 RTL-Support (falls relevant)
[ ] Layout spiegelt korrekt (Navigation, Alignment, Icons mit Richtung)
[ ] Text-Alignment korrekt (rechts für RTL)
[ ] Icons mit Richtungsbezug gespiegelt (Pfeile, Listen, Navigation)
```

---

## PHASE 24: DESIGN QA & PIXEL-PERFECTION

```
24.1 Cross-Browser-Check
Prüfe in jedem Browser:
- Chrome (Desktop + Mobile)
- Safari (Desktop + iOS)
- Firefox (Desktop)
- Edge (Desktop)

[ ] Keine Layout-Unterschiede
[ ] Fonts rendern korrekt (-webkit-font-smoothing: antialiased)
[ ] Schatten und Radien konsistent
[ ] Animationen flüssig
[ ] Scrollbar-Styling konsistent (oder OS-Default akzeptiert)
[ ] Form-Elemente konsistent gestylt (Select, Checkbox, Radio, Date-Picker)
[ ] Focus-Styles konsistent

24.2 Pixel-Perfection
[ ] Kein 1px-Misalignment zwischen Elementen
[ ] Baseline-Grid eingehalten (Text auf gleicher Höhe in mehrspaltigen Layouts)
[ ] Symmetrische Padding/Margin in Containern
[ ] Icons pixel-perfekt ausgerichtet (nicht 0.5px versetzt)
[ ] Retina-optimiert: Icons und Bilder @2x (keine Unschärfe auf HiDPI-Screens)

24.3 Edge-Case-Visuals
[ ] Avatar mit 1 Buchstabe (z.B. "I"): Zentrierung korrekt?
[ ] Badge mit 3+ Ziffern ("999+"): Überläuft nicht
[ ] Notification-Count bei 0: Badge verschwindet (nicht "0" zeigen)
[ ] Status-Dots in verschiedenen Kontexten: Sichtbar auf allen Hintergründen
[ ] Tooltips am Bildschirmrand: Reposition statt Off-Screen
```

---

## AUSGABE-FORMAT

```
### DESIGN-AUDIT-REPORT: [Projektname]
**Datum:** [Datum]
**Auditor:** Claude Lead-Designer-Level UX/UI Audit
**Status vor Audit:** [Zusammenfassung]
**Status nach Audit:** DESIGN-READY ✅ / NOCH OFFEN ❌

#### ZUSAMMENFASSUNG
- Geprüfte Phasen: [X] von 24
- Geprüfte Screens: [Anzahl]
- Geprüfte Breakpoints: [Anzahl]
- Geprüfte Komponenten: [Anzahl]
- Gefundene Issues: [Anzahl]
- Behobene Issues: [Anzahl]
- Offene Issues: [Anzahl]

#### ACCESSIBILITY SUMMARY
- WCAG AA Compliance: [bestanden/teilweise/durchgefallen]
- Keyboard-Navigation: [vollständig/teilweise/fehlend]
- Screen-Reader-Test: [bestanden/durchgefallen]
- Farbkontrast: [alle bestanden / X Verstöße]
- Focus-Management: [korrekt/teilweise/fehlend]

#### DESIGN SYSTEM HEALTH
- Token-Konsistenz: [X]% (Hardcoded Values / Token-Usage)
- Komponenten-Coverage: [X]% (Screens mit Design-System-Komponenten)
- Design-Code-Drift: [X] Abweichungen zwischen Figma und Code
- Redundante Komponenten: [Anzahl]

#### ISSUE-TABELLE

| # | Phase | Screen | Issue | Severity | Status |
|---|-------|--------|-------|----------|--------|
| 1 | Color | Login | CTA-Kontrast zu niedrig (2.8:1) | 🔴 Critical | ✅ Fixed |
| 2 | Layout | Dashboard | Spacing inkonsistent (12px vs 16px) | 🟡 Medium | ✅ Fixed |
| 3 | Mobile | Settings | Touch-Target 32px (min. 44px) | 🟠 High | ✅ Fixed |
| 4 | Copy | Delete-Modal | "OK" statt "Projekt löschen" | 🟡 Medium | ✅ Fixed |

#### SEVERITY-KLASSIFIKATION
- 🔴 Critical: Accessibility-Verstoß (WCAG AA), unbedienbare UI, komplett defektes Layout, schwerer Branding-Verstoß
- 🟠 High: Inkonsistente Interaktion, fehlender State (Error/Empty/Loading), Mobile unbedienbar, fehlendes Feedback
- 🟡 Medium: Spacing-Inkonsistenz, Typografie-Abweichung, suboptimale UX-Copy, Dark-Mode-Problem
- 🟢 Low: Pixel-Perfection, Animation-Feintuning, Micro-Interaction-Optimierung, Best Practice

#### UX-READINESS-SCORECARD

| Bereich | Status | Score |
|---------|--------|-------|
| Design System & Tokens | ✅ / ⚠️ / ❌ | x/10 |
| Visuelles Design & Branding | ✅ / ⚠️ / ❌ | x/10 |
| Layout, Spacing & Hierarchie | ✅ / ⚠️ / ❌ | x/10 |
| Informationsarchitektur | ✅ / ⚠️ / ❌ | x/10 |
| Interaktionsdesign | ✅ / ⚠️ / ❌ | x/10 |
| Formulare & Eingaben | ✅ / ⚠️ / ❌ | x/10 |
| States (Empty/Error/Loading) | ✅ / ⚠️ / ❌ | x/10 |
| Daten & Dashboard-Design | ✅ / ⚠️ / ❌ | x/10 |
| Modale & Overlays | ✅ / ⚠️ / ❌ | x/10 |
| Onboarding & First-Time UX | ✅ / ⚠️ / ❌ | x/10 |
| Responsive & Mobile | ✅ / ⚠️ / ❌ | x/10 |
| Dark Mode | ✅ / ⚠️ / ❌ | x/10 |
| Microcopy & UX Writing | ✅ / ⚠️ / ❌ | x/10 |
| Accessibility (WCAG 2.2) | ✅ / ⚠️ / ❌ | x/10 |
| SaaS-spezifische Patterns | ✅ / ⚠️ / ❌ | x/10 |
| Konsistenz | ✅ / ⚠️ / ❌ | x/10 |
| Design-Psychologie | ✅ / ⚠️ / ❌ | x/10 |
| Animation & Motion | ✅ / ⚠️ / ❌ | x/10 |
| Performance als UX | ✅ / ⚠️ / ❌ | x/10 |
```

---

## REGELN

1. **Sofort fixen** — Jeden Fund direkt beheben, nicht nur dokumentieren
2. **Verifizieren** — Nach jedem Fix: Browser + Mobile + Dark Mode prüfen
3. **Regressions-Check** — Fix darf nichts anderes kaputt machen
4. **Konsistenz über Ästhetik** — Lieber überall 8/10 als einmal 10/10 und sonst 5/10
5. **100% Abdeckung** — Jede Phase, jeder Punkt, jeder Screen, jeder Breakpoint
6. **User-Perspektive** — Jede Entscheidung aus User-Sicht, nicht aus Designer-Ästhetik
7. **Mobile First** — Wenn es auf 375px funktioniert, funktioniert es überall
8. **Accessibility ist kein Feature** — Es ist eine Grundvoraussetzung
9. **Kein "OK"** — Jeder Button, jeder Text, jeder State ist durchdacht
10. **Details matter** — 1px-Misalignment ist ein Bug, nicht ein Detail
11. **Kontrast prüfen** — Jede Farbkombination, jeder Background, Light + Dark Mode
12. **Performance ist UX** — 300ms Verzögerung fühlt sich wie ein Bug an
13. **Kein Überspringen** — "Betrifft nur Edge Cases" gibt es nicht — Edge Cases sind User

---

## CHECKLISTE VOR ABSCHLUSS

```
[ ] Alle 24 Phasen vollständig durchlaufen
[ ] Alle 🔴 Critical und 🟠 High Issues behoben
[ ] WCAG 2.2 AA Compliance auf allen Screens
[ ] Keyboard-Navigation auf allen Screens getestet
[ ] Screen-Reader-Test auf kritischen Flows
[ ] Alle Screens in Dark Mode geprüft
[ ] Alle Breakpoints getestet (320px bis 1920px)
[ ] Cross-Browser-Check (Chrome, Safari, Firefox, Edge)
[ ] Design-System-Konsistenz ≥ 95% (Token-Usage)
[ ] Alle States abgedeckt (Empty, Error, Loading, Success, Disabled)
[ ] Microcopy geprüft (keine "OK"-Buttons, keine kryptischen Fehler)
[ ] Animationen respektieren prefers-reduced-motion
[ ] Lighthouse Accessibility Score ≥ 90
[ ] UX-Readiness-Scorecard ausgefüllt
[ ] Status: DESIGN-READY ✅
```

---

## ÄNDERUNGSLOG

| Version | Datum | Änderungen |
|---------|-------|------------|
| V1.0 | 2026-04-08 | **Initiale Version: 24 Phasen, ~620 Checkpoints.** Design-System-Bestandsaufnahme (P1), Visuelles Design & Branding (P2), Layout & Spacing (P3), Informationsarchitektur & Navigation (P4), Interaktionsdesign & Micro-Interactions (P5), Formulare (P6), Leerzustände & Edge Cases (P7), Dashboard & Datenvisualisierung (P8), Modale & Overlays (P9), Onboarding (P10), Responsive & Mobile (P11), Dark Mode (P12), Microcopy & UX Writing (P13), Accessibility-Tiefenaudit (P14), SaaS-spezifische Patterns (P15), Notification-Design (P16), Suche & Filter (P17), Performance als UX (P18), Konsistenz-Audit (P19), Design-Psychologie (P20), Print & Export (P21), Animation & Motion (P22), Multi-Language & kulturelle UX (P23), Design QA & Pixel-Perfection (P24). Basiert auf: Nielsen's 10 Heuristiken, WCAG 2.2, Fitts's/Hick's/Miller's/Jakob's Law, Gestaltgesetze, Material Design Guidelines, Apple HIG, Web-Recherche zu aktuellen Best Practices. |

---

*Dieser Masterprompt ist framework-agnostisch und funktioniert mit React, Vue, Svelte, Next.js, Nuxt, SvelteKit, Astro, Angular und jeder anderen Web-Technologie. Er deckt das gesamte Spektrum von Design-System-Architektur über Interaction Design, Accessibility, Mobile UX, Dark Mode, Microcopy bis hin zu Design-Psychologie und Pixel-Perfection ab. Optimiert für SaaS-Produkte mit Dashboard, Settings, Billing, Team-Management und Onboarding-Flows. Version 1.0 — 24 Phasen, ~620 Checkpoints — die definitive UX/UI-Audit-Referenz.*
