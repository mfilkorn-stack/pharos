import Button from "./ui/Button.jsx";
import { CameraIcon, SearchIcon, FlaskIcon } from "./ui/icons.jsx";

// Reihenfolge per Spec (§5.5)
const GROUP_ORDER = [
  "drogen_opioide",
  "drogen_stimulanzien",
  "drogen_halluzinogene",
  "drogen_cannabinoide",
  "drogen_dissoziativa",
  "drogen_dampfdrogen",
  "drogen_inhalantien",
];

/**
 * ToxidromeOverview — rein präsentational.
 *
 * Props:
 *   groups          — data.groups (alle Gruppen aus data.json)
 *   substanceCounts — { [groupId]: number }
 *   onPickClass(groupId) — Klick auf eine Klassenkarte
 *   onScan()             — "Substanz scannen"-Button
 *   onSearch()           — "Substanz suchen"-Button
 */
export default function ToxidromeOverview({ groups = {}, substanceCounts = {}, onPickClass, onScan, onSearch }) {
  const drogenGroups = GROUP_ORDER
    .filter((key) => key in groups)
    .map((key) => ({ key, ...groups[key] }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="h-9 w-9 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center flex-shrink-0">
          <FlaskIcon className="h-4 w-4" />
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-text-primary">Drogen / Toxidrome</h2>
          <p className="text-xs text-text-muted">
            Notfallmedizinische Identifikation — Toxidrom, Antidot, Mischkonsum
          </p>
        </div>
      </div>

      {/* CTA-Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="subtle" size="md" onClick={onScan}>
          <CameraIcon className="h-4 w-4" />
          Substanz scannen
        </Button>
        <Button variant="ghost" size="md" onClick={onSearch}>
          <SearchIcon className="h-4 w-4" />
          Substanz suchen
        </Button>
      </div>

      {/* 7 Klassenkarten */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {drogenGroups.map(({ key, toxidrom, antidot }) => {
          const count = substanceCounts[key] || 0;
          const label = toxidrom?.label || key;
          const leitsymptome = toxidrom?.leitsymptome || [];
          const hasAntidot = Array.isArray(antidot) && antidot.length > 0;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onPickClass?.(key)}
              className="w-full text-left rounded-xl border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 transition-all p-4 space-y-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:outline-none"
            >
              {/* Karten-Header */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-amber-400 leading-snug">{label}</h3>
                <span className="text-xs font-mono text-text-muted flex-shrink-0">
                  {count} {count === 1 ? "Substanz" : "Substanzen"}
                </span>
              </div>

              {/* Leitsymptome als Chips */}
              {leitsymptome.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {leitsymptome.map((sym) => (
                    <span
                      key={sym}
                      className="text-xs bg-amber-500/15 text-amber-300 border border-amber-500/20 rounded-md px-2 py-0.5"
                    >
                      {sym}
                    </span>
                  ))}
                </div>
              ) : null}

              {/* Antidot (hervorgehoben, nur wenn vorhanden) */}
              {hasAntidot ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono text-text-muted uppercase tracking-wider">Antidot:</span>
                  <span className="text-xs font-semibold text-amber-400 bg-amber-500/20 border border-amber-500/30 rounded px-2 py-0.5">
                    {antidot[0].mittel}
                  </span>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
