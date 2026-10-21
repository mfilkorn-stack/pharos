# Build-Pipeline

## Inputs (manuell beschaffen, in `scripts/input/`)

- `wido-atc.zip` — WIdO-ATC-Index ZIP (frei verfügbar).
- `top250.csv` — Top-250 nach DDD. CSV-Format mit Header: `wirkstoff,atc?` pro Zeile.
- `extras.json` (optional) — substanzspezifische Notfallhinweise:
  `{ "<id>": [{ "level": "hoch"|"mittel"|"info", "text": "…" }] }`

## Lauf

```bash
npm run data
```

Erzeugt: `src/modules/lexikon/data/data.json`, `src/modules/lexikon/data/atc_index.json`, `src/modules/lexikon/data/atc_group_map.json`. Validiert hart; Exit ≠ 0 bei Verstoß.

## Seed

`scripts/seed.json` ist der kanonische Input für `groups` und die Seed-Substanzen (aktuell 259, inkl. Drogen-Seed). Die Pipeline liest daraus beim Start; `src/modules/lexikon/data/data.json` ist reines Output und wird von der Pipeline niemals gelesen. Wer die Seed-Substanzen oder Gruppen anpassen will, ändert `scripts/seed.json` — nie direkt `src/modules/lexikon/data/data.json`.

## Idempotenz

Bei identischen Inputs identische Outputs (deterministische Sortierung).
