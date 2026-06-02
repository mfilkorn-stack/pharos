import Badge from "./ui/Badge.jsx";
import {
  DropletIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  SyringeIcon,
  InfoIcon,
  MedicalCrossIcon,
  StarIcon,
  StarFilledIcon,
} from "./ui/icons.jsx";

const TINT = {
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  critical: "bg-critical/10 text-critical",
  accent: "bg-accent/10 text-accent",
};

function Section({ icon: Icon, tint, title, children }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <span className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 ${TINT[tint] || TINT.accent}`}>
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      </div>
      <div className="ml-9">{children}</div>
    </section>
  );
}

function Bullets({ items, className = "text-text-secondary" }) {
  return (
    <ul className={`text-sm space-y-1.5 ${className}`}>
      {items.map((x, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-text-muted flex-shrink-0">•</span>
          <span>{x}</span>
        </li>
      ))}
    </ul>
  );
}

// Detail-Layout speziell für SAA/BPR-Medikamente (source: "saa").
export default function SaaDetail({ item, isFavorite, onToggleFavorite }) {
  const s = item.saa || {};
  // Dosierung ist Freitext mit "|"-Trennern → als Liste rendern.
  const doses = String(s.dosierung || "").split("|").map((d) => d.trim()).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-text-primary">{item.wirkstoff}</h2>
          </div>
          {onToggleFavorite ? (
            <button
              type="button"
              onClick={() => onToggleFavorite(item.id)}
              aria-label={isFavorite ? "Favorit entfernen" : "Als Favorit markieren"}
              className={`h-9 w-9 inline-flex items-center justify-center rounded-md transition-colors flex-shrink-0 ${
                isFavorite ? "text-warning bg-warning/10 hover:bg-warning/15" : "text-text-muted hover:text-warning hover:bg-card-hover"
              }`}
            >
              {isFavorite ? <StarFilledIcon className="h-5 w-5" /> : <StarIcon className="h-5 w-5" />}
            </button>
          ) : null}
        </div>
        {s.gruppe ? <p className="text-sm text-accent font-medium mt-1.5">{s.gruppe}</p> : null}
        <Badge variant="accent" size="md" className="mt-3 inline-flex items-center gap-1">
          <MedicalCrossIcon className="h-3.5 w-3.5" /> SAA/BPR
        </Badge>
      </div>

      {s.konzentration ? (
        <Section icon={DropletIcon} tint="info" title="Konzentration">
          <p className="text-sm text-text-secondary leading-relaxed">{s.konzentration}</p>
        </Section>
      ) : null}

      {s.indikationen?.length ? (
        <Section icon={CheckCircleIcon} tint="success" title="Indikationen">
          <Bullets items={s.indikationen} />
        </Section>
      ) : null}

      {doses.length ? (
        <Section icon={SyringeIcon} tint="accent" title="Dosierung">
          <ul className="text-sm text-text-primary space-y-1.5">
            {doses.map((d, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-accent flex-shrink-0">›</span>
                <span className="font-mono text-[13px] leading-relaxed">{d}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {s.kontra?.length ? (
        <Section icon={AlertTriangleIcon} tint="critical" title="Absolute Kontraindikationen">
          <div className="space-y-2">
            {s.kontra.map((k, i) => (
              <div key={i} className="flex gap-3 items-start">
                <Badge variant="critical" size="sm" className="mt-0.5 flex-shrink-0">Absolut</Badge>
                <p className="text-sm text-text-primary leading-relaxed flex-1">{k}</p>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {s.relKontra?.length ? (
        <Section icon={AlertTriangleIcon} tint="warning" title="Relative Kontraindikationen">
          <div className="space-y-2">
            {s.relKontra.map((k, i) => (
              <div key={i} className="flex gap-3 items-start">
                <Badge variant="warning" size="sm" className="mt-0.5 flex-shrink-0">Vorsicht</Badge>
                <p className="text-sm text-text-primary leading-relaxed flex-1">{k}</p>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {s.uaw?.length ? (
        <Section icon={InfoIcon} tint="info" title="Unerwünschte Wirkungen (UAW)">
          <Bullets items={s.uaw} />
        </Section>
      ) : null}

      {s.besonderheiten ? (
        <Section icon={InfoIcon} tint="accent" title="Besonderheiten">
          <p className="text-sm text-text-secondary leading-relaxed">{s.besonderheiten}</p>
        </Section>
      ) : null}

      {s.alter ? (
        <Section icon={InfoIcon} tint="warning" title="Altersbeschränkung">
          <p className="text-sm text-text-secondary leading-relaxed">{s.alter}</p>
        </Section>
      ) : null}

      <p className="text-xs text-text-muted border-t border-border pt-3">
        SAA/BPR-Daten (Standardarbeitsanweisung / Behandlungspfade) — Entscheidungsunterstützung,
        kein Ersatz für ärztliche Anordnung oder gültige SAA-Freigabe.
      </p>
    </div>
  );
}
