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

Erzeugt: `src/data/data.json`, `src/data/atc_index.json`, `src/data/atc_group_map.json`. Validiert hart; Exit ≠ 0 bei Verstoß.

## Seed

`scripts/seed.json` ist der kanonische Input für `groups` und die 48 Seed-Substanzen. Die Pipeline liest daraus beim Start; `src/data/data.json` ist reines Output und wird von der Pipeline niemals gelesen. Wer die Seed-Substanzen oder Gruppen anpassen will, ändert `scripts/seed.json` — nie direkt `src/data/data.json`.

## Idempotenz

Bei identischen Inputs identische Outputs (deterministische Sortierung).
