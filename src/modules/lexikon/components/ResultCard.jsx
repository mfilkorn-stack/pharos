import CategoryIcon from "./CategoryIcon.jsx";
import StatusPill from "./StatusPill.jsx";
import { ChevronRightIcon, StarIcon, StarFilledIcon } from "./ui/icons.jsx";
import Badge from "./ui/Badge.jsx";

function maxRiskLevel(notfall) {
  if (!notfall || !notfall.length) return "info";
  let level = "info";
  for (const n of notfall) {
    if (n.level === "hoch") return "hoch";
    if (n.level === "mittel") level = "mittel";
  }
  return level;
}

function getNotfallRelevanz(notfall) {
  const hasHighOrMittel = (notfall || []).some((n) => n.level === "hoch" || n.level === "mittel");
  return hasHighOrMittel
    ? { dot: "warning", label: "Wichtig" }
    : { dot: "info", label: "Relevant" };
}

const RISK_BAR_COLOR = {
  hoch: "bg-critical",
  mittel: "bg-warning",
  info: "bg-info",
};

const SOURCE_BADGE = {
  "0b": { variant: "neutral", label: "Gruppe" },
  ki: { variant: "critical", label: "KI" },
  unknown: { variant: "warning", label: "..." },
};

// KI-Karten zeigen den Verifizierungs-Status als Signal (Vertrauen auf einen Blick).
function kiBadge(item) {
  const st = item.verification?.status;
  const n = item.verification?.sourceCount || 0;
  if (st === "valide") return { variant: "success", label: `✓ ${n}` };
  if (st === "teilverifiziert") return { variant: "info", label: `KI ·${n}` };
  if (st === "widerspruch") return { variant: "critical", label: "⚠ KI" };
  return { variant: "critical", label: "KI" };
}

export default function ResultCard({ item, isActive, onOpen, isFavorite, onToggleFavorite }) {
  const risk = maxRiskLevel(item.notfall);
  const barColor = RISK_BAR_COLOR[risk] || RISK_BAR_COLOR.info;
  const notf = getNotfallRelevanz(item.notfall);
  const synonymStr = (item.synonyms || []).join(" · ");
  const firstNotfall = item.notfall?.[0]?.text || null;
  const sourceBadge = item.source === "ki" ? kiBadge(item) : (SOURCE_BADGE[item.source] || null);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group w-full flex items-stretch bg-card hover:bg-card-hover border rounded-xl overflow-hidden transition-all text-left cursor-pointer ${
        isActive
          ? "border-accent/40 bg-card-hover"
          : "border-border hover:border-accent/30"
      }`}
    >
      {/* Risk bar */}
      <div className={`w-1 ${barColor} flex-shrink-0`} />

      {/* Content */}
      <div className="flex-1 flex items-center gap-4 p-4 sm:p-5 min-w-0">
        {/* Category icon */}
        <CategoryIcon item={item} />

        {/* Main content grid */}
        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-4">
          {/* Left: name + synonyms + group + indikationen */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <h3 className="text-base font-semibold text-text-primary truncate">{item.wirkstoff}</h3>
              {item.atc ? (
                <span className="font-mono text-[11px] text-text-secondary border border-border rounded px-1.5 py-0.5 flex-shrink-0">
                  {item.atc}
                </span>
              ) : null}
              {sourceBadge ? (
                <Badge
                  variant={sourceBadge.variant}
                  size="sm"
                  className={`flex-shrink-0 ${item.source === "unknown" ? "animate-pulse" : ""}`}
                >
                  {sourceBadge.label}
                </Badge>
              ) : null}
            </div>

            {synonymStr ? (
              <p className="text-sm text-text-secondary mt-0.5 truncate">{synonymStr}</p>
            ) : null}

            <p className="text-sm text-accent font-medium mt-1.5">{item.gruppe}</p>

            {item.indikationen?.length ? (
              <div className="mt-3">
                <div className="font-mono text-[10px] tracking-wider uppercase text-text-muted mb-1.5">
                  Indikationen
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {item.indikationen.slice(0, 3).map((ind, i) => (
                    <span
                      key={i}
                      className="text-xs text-text-secondary bg-bg-secondary border border-border rounded-md px-2 py-1"
                    >
                      {ind}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Right: Notfallrelevanz + Snippet — auf Mobile gestapelt sichtbar (Trennlinie),
              ab sm in der rechten Spalte. Notfall-Info ist für die Triage zentral und
              darf nicht erst hinter dem Detail-Klick auftauchen. */}
          <div className="flex flex-col gap-3 min-w-0 sm:w-[200px] mt-3 pt-3 border-t border-border sm:mt-0 sm:pt-0 sm:border-t-0">
            <div>
              <div className="font-mono text-[10px] tracking-wider uppercase text-text-muted mb-1">
                Notfallrelevanz
              </div>
              <StatusPill dot={notf.dot}>{notf.label}</StatusPill>
            </div>
            {item.antidot?.length ? (
              <Badge variant="accent" size="sm" className="self-start">
                Antidot: {item.antidot[0].mittel}
              </Badge>
            ) : null}
            {firstNotfall ? (
              <p className="text-xs text-text-muted leading-relaxed line-clamp-2">{firstNotfall}</p>
            ) : null}
          </div>
        </div>

        {/* Favorite star + Chevron */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {onToggleFavorite ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.id); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onToggleFavorite(item.id); } }}
              aria-label={isFavorite ? "Favorit entfernen" : "Als Favorit markieren"}
              title={isFavorite ? "Favorit entfernen" : "Als Favorit markieren"}
              className={`h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                isFavorite
                  ? "text-warning hover:bg-card-hover"
                  : "text-text-muted hover:text-warning hover:bg-card-hover"
              }`}
            >
              {isFavorite ? <StarFilledIcon className="h-4 w-4" /> : <StarIcon className="h-4 w-4" />}
            </span>
          ) : null}
          <ChevronRightIcon className="h-5 w-5 text-text-muted group-hover:text-accent transition-colors" />
        </div>
      </div>
    </button>
  );
}
