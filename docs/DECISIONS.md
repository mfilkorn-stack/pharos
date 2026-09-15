# Entscheidungen

Eine Zeile je Entscheidung. Später ergänzen, nie löschen.

2026-09-15 · Claude-Setup · CLAUDE.md, .claude/settings.json und diese Datei aus dem Ist-Stand des Repos erzeugt (kein Interview, Projekt war die Quelle) · Projekt lief seit 2026-06 ohne Setup-Doku, README und DEPLOY-Dateien waren nach dem Modul-Refactoring auf veraltete Pfade gelaufen.
2026-09-15 · Datenquelle Medigabe · SAA und BPR 2025 (6-Länder-AG, Stand 30.04.2025) als harte Regel festgeschrieben, inkl. Pflichtfelder saaSeite und verifiziert · belegt durch src/modules/medigabe/data/dosing.json und die Batch-Commits 6f0a676 bis 4df547d.
2026-09-15 · Datenquelle Lexikon · data.json/atc_index.json/atc_group_map.json sind reiner Pipeline-Output, Änderungen nur über scripts/seed.json und npm run data; zusätzlich als Edit-Deny in settings.json abgesichert · belegt durch scripts/README.md und scripts/build-data.mjs.
2026-09-15 · Architektur-Default · Die persönliche Single-File-Vorgabe (app.jsx) gilt für Pharos nicht; die modulare Struktur src/modules/<modul>/ mit Vite-Build bleibt · drei getrennte Module mit eigenem Zustand und ~9.200 Zeilen Quellcode.
2026-09-15 · Erweiterungen · Kein Test-Hook, kein code-reviewer-Agent, kein Deploy-Skill angelegt · bewusste Entscheidung, Pflegeaufwand und Kontextverbrauch niedrig halten; bei wachsender Dosis-Logik ist der code-reviewer-Agent der erste Kandidat.
2026-09-15 · Einsatzkontext · Offen gelassen (privat / DRK-intern / MadforMed-Produkt) · CLAUDE.md enthält nur die im Code belegten Compliance-Sätze (kein Medizinprodukt, Datensparsamkeit, Key serverseitig). Lizenz, Impressum und AVV mit Anthropic sind erst mit dem Kontext entscheidbar.
