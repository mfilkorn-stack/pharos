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

const RISK_BAR = {
  hoch: "bg-critical",
  mittel: "bg-warning",
  info: "bg-info",
};

const SOURCE_BADGE = {
  "0b": { variant: "neutral", label: "Gruppe" },
  ki: { variant: "critical", label: "KI" },
  unknown: { variant: "warning", label: "..." },
};

export default function ResultRow({ item, onOpen, isLast }) {
  const risk = maxRiskLevel(item.notfall);
  const barColor = RISK_BAR[risk] || RISK_BAR.info;
  const sourceBadge = SOURCE_BADGE[item.source] || null;
  const synonymStr = (item.synonyms || []).join(" · ");

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full flex items-stretch gap-3 py-3 px-4 sm:px-6 hover:bg-card-hover/60 active:bg-card-hover transition-colors text-left group ${!isLast ? "border-b border-border" : ""}`}
    >
      {/* Risk indicator bar */}
      <div className={`w-[3px] rounded-full flex-shrink-0 self-stretch ${barColor} opacity-70 group-hover:opacity-100 transition-opacity`} />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base font-semibold text-text-primary truncate min-w-0">{item.wirkstoff}</span>
          {sourceBadge ? (
            <Badge variant={sourceBadge.variant} size="sm" className={`flex-shrink-0 ${item.source === "unknown" ? "animate-pulse" : ""}`}>
              {sourceBadge.label}
            </Badge>
          ) : null}
        </div>
        {synonymStr ? (
          <p className="text-sm text-text-secondary truncate mt-0.5">{synonymStr}</p>
        ) : null}
      </div>

      {/* Right meta */}
      <div className="flex flex-col items-end justify-center gap-1 flex-shrink-0 min-w-0 max-w-[40%]">
        <span className="text-xs text-text-secondary truncate text-right max-w-full">{item.gruppe}</span>
        {item.atc ? (
          <span className="font-mono text-[10px] text-text-muted">{item.atc}</span>
        ) : null}
      </div>
    </button>
  );
}
