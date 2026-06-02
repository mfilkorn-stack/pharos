import Badge from "./ui/Badge.jsx";
import {
  DropletIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  PillIcon,
  SparklesIcon,
  InfoIcon,
  StarIcon,
  StarFilledIcon,
  SyringeIcon,
  ShieldCheckIcon,
  LinkIcon,
} from "./ui/icons.jsx";

function maxRiskLevel(notfall) {
  if (!notfall || !notfall.length) return "info";
  let level = "info";
  for (const n of notfall) {
    if (n.level === "hoch") return "hoch";
    if (n.level === "mittel") level = "mittel";
  }
  return level;
}

const ICON_MAP = {
  droplet: DropletIcon,
  check: CheckCircleIcon,
  alert: AlertTriangleIcon,
  pill: PillIcon,
  sparkles: SparklesIcon,
  syringe: SyringeIcon,
  link: LinkIcon,
  shield: ShieldCheckIcon,
};

// Verifizierungs-Badge nach verification.status (Prio-2-Ergebnis).
const VERIFY_BADGE = {
  pending: { variant: "warning", label: "KI · ungeprüft" },
  teilverifiziert: { variant: "info", label: (n) => `KI · ${n} ${n === 1 ? "Quelle" : "Quellen"}` },
  valide: { variant: "success", label: (n) => `✓ KI-valide · ${n} Quellen` },
  widerspruch: { variant: "critical", label: "⚠ Quellen widersprüchlich" },
  fehlgeschlagen: { variant: "neutral", label: "KI · nicht verifizierbar" },
};

function VerificationBadge({ verification }) {
  const status = verification?.status || "pending";
  const n = verification?.sourceCount || 0;
  const cfg = VERIFY_BADGE[status] || VERIFY_BADGE.pending;
  const label = typeof cfg.label === "function" ? cfg.label(n) : cfg.label;
  return <Badge variant={cfg.variant} size="md" className="mt-3">{label}</Badge>;
}

function fmtDate(iso) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }); }
  catch { return ""; }
}

const TINT_CLASSES = {
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  accent: "bg-accent/10 text-accent",
  critical: "bg-critical/10 text-critical",
};

function Section({ icon, tint, title, children }) {
  const tintCls = TINT_CLASSES[tint] || "bg-card text-text-secondary";
  const Icon = ICON_MAP[icon] || InfoIcon;
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <span className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 ${tintCls}`}>
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      </div>
      <div className="ml-9">{children}</div>
    </section>
  );
}

function mapNotfallLevel(level) {
  if (level === "hoch") return { variant: "critical", label: "Hoch" };
  if (level === "mittel") return { variant: "warning", label: "Mittel" };
  return { variant: "info", label: "Info" };
}

export default function ResultDetail({ item, isFavorite, onToggleFavorite }) {
  if (!item) return null;

  const synonymStr = (item.synonyms || []).join(" · ");
  const isPending = item.source === "unknown";
  const isRejected = item.source === "rejected";
  const isKI = item.source === "ki";
  const is0b = item.source === "0b";
  const isDrug = (item.group || "").startsWith("drogen_");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-start gap-2">
          <div className="flex-1 flex items-center gap-2 flex-wrap min-w-0">
            <h2 className="text-xl font-bold text-text-primary">{item.wirkstoff}</h2>
            {item.atc ? (
              <span className="font-mono text-xs text-text-secondary border border-border rounded px-1.5 py-0.5 flex-shrink-0">
                {item.atc}
              </span>
            ) : null}
          </div>
          {onToggleFavorite ? (
            <button
              type="button"
              onClick={() => onToggleFavorite(item.id)}
              aria-label={isFavorite ? "Favorit entfernen" : "Als Favorit markieren"}
              className={`h-9 w-9 inline-flex items-center justify-center rounded-md transition-colors flex-shrink-0 ${
                isFavorite
                  ? "text-warning bg-warning/10 hover:bg-warning/15"
                  : "text-text-muted hover:text-warning hover:bg-card-hover"
              }`}
            >
              {isFavorite ? <StarFilledIcon className="h-5 w-5" /> : <StarIcon className="h-5 w-5" />}
            </button>
          ) : null}
        </div>
        {synonymStr ? (
          <p className="text-sm text-text-secondary mt-1">{synonymStr}</p>
        ) : null}
        <p className="text-sm text-accent font-medium mt-1.5">{item.gruppe}</p>

        {/* Source badges */}
        {isPending ? (
          <div className="flex items-center gap-2 mt-3">
            <span className="inline-block h-2 w-2 rounded-full bg-warning animate-pulse" />
            <span className="text-sm text-warning font-mono">Wird via KI angereichert …</span>
          </div>
        ) : isRejected ? (
          <div className="flex items-center gap-2 mt-3">
            <span className="inline-block h-2 w-2 rounded-full bg-text-muted" />
            <span className="text-sm text-text-muted">Kein Wirkstoff/Medikament — nichts angelegt.</span>
          </div>
        ) : isKI ? (
          <VerificationBadge verification={item.verification} />
        ) : is0b ? (
          <Badge variant="neutral" size="md" className="mt-3">Generische Gruppeninfo</Badge>
        ) : null}
      </div>

      {/* Wirkung — synthetic; bei Drogen + Platzhalter/Reject ausgeblendet (kein echter Wirkstoff) */}
      {!isDrug && !isPending && !isRejected ? (
        <Section icon="droplet" tint="info" title="Wirkung">
          <p className="text-sm text-text-secondary leading-relaxed">
            Wirkstoff der Gruppe {item.gruppe}.
            {item.indikationen?.length
              ? ` Eingesetzt bei: ${item.indikationen.join(", ")}.`
              : ""}
          </p>
        </Section>
      ) : null}

      {/* Indikationen */}
      {item.indikationen?.length ? (
        <Section icon="check" tint="success" title="Indikationen">
          <ul className="text-sm text-text-secondary space-y-1.5">
            {item.indikationen.map((ind, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-text-muted flex-shrink-0">•</span>
                {ind}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* Toxidrom — Leitsyndrom für Rückwärts-Identifikation */}
      {item.toxidrom ? (
        <Section icon="alert" tint="warning" title={`Toxidrom · ${item.toxidrom.label}`}>
          {item.toxidrom.leitsymptome?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {item.toxidrom.leitsymptome.map((sym, i) => (
                <span
                  key={i}
                  className="text-xs text-warning border border-warning/30 bg-warning/5 rounded-md px-2 py-1"
                >
                  {sym}
                </span>
              ))}
            </div>
          ) : null}
        </Section>
      ) : null}

      {/* Antidot — sofortige Handlungsoption */}
      {item.antidot?.length ? (
        <Section icon="syringe" tint="success" title="Antidot">
          <div className="space-y-2">
            {item.antidot.map((a, i) => (
              <div key={i}>
                <p className="text-sm font-semibold text-text-primary">{a.mittel}</p>
                {a.hinweis ? (
                  <p className="text-sm text-text-secondary leading-relaxed">{a.hinweis}</p>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {/* Notfallrelevante Implikationen */}
      {item.notfall?.length ? (
        <Section icon="alert" tint="warning" title="Notfallrelevante Implikationen">
          <div className="space-y-2">
            {item.notfall.map((n, i) => {
              const { variant, label } = mapNotfallLevel(n.level);
              return (
                <div key={i} className="flex gap-3 items-start">
                  <Badge variant={variant} size="sm" className="mt-0.5 flex-shrink-0">
                    {label}
                  </Badge>
                  <p className="text-sm text-text-primary leading-relaxed flex-1">{n.text}</p>
                </div>
              );
            })}
          </div>
        </Section>
      ) : null}

      {/* Mischkonsum-Warnung */}
      {item.mischkonsum?.length ? (
        <Section icon="alert" tint="critical" title="Gefährlicher Mischkonsum">
          <div className="space-y-2">
            {item.mischkonsum.map((m, i) => {
              const { variant, label } = mapNotfallLevel(m.level);
              return (
                <div key={i} className="flex gap-3 items-start">
                  <Badge variant={variant} size="sm" className="mt-0.5 flex-shrink-0">
                    {label}
                  </Badge>
                  <p className="text-sm text-text-primary leading-relaxed flex-1">
                    <span className="font-semibold">{m.partner}:</span> {m.risiko}
                  </p>
                </div>
              );
            })}
          </div>
        </Section>
      ) : null}

      {/* Wirkdauer & Konsum */}
      {item.wirkdauer ? (
        <Section icon="droplet" tint="info" title="Wirkdauer & Konsum">
          <dl className="text-sm text-text-secondary space-y-1.5">
            {item.wirkdauer.onset ? (
              <div className="flex gap-2">
                <dt className="text-text-muted w-28 flex-shrink-0">Wirkeintritt</dt>
                <dd className="flex-1 text-text-primary">{item.wirkdauer.onset}</dd>
              </div>
            ) : null}
            {item.wirkdauer.dauer ? (
              <div className="flex gap-2">
                <dt className="text-text-muted w-28 flex-shrink-0">Wirkdauer</dt>
                <dd className="flex-1 text-text-primary">{item.wirkdauer.dauer}</dd>
              </div>
            ) : null}
            {item.wirkdauer.konsumform?.length ? (
              <div className="flex gap-2">
                <dt className="text-text-muted w-28 flex-shrink-0">Konsumform</dt>
                <dd className="flex-1 text-text-primary">{item.wirkdauer.konsumform.join(", ")}</dd>
              </div>
            ) : null}
          </dl>
        </Section>
      ) : null}

      {/* Handelsnamen / Straßennamen */}
      {item.synonyms?.length ? (
        <Section icon="pill" tint="accent" title={isDrug ? "Straßennamen / Synonyme" : "Handelsnamen"}>
          <div className="flex flex-wrap gap-1.5">
            {item.synonyms.map((s, i) => (
              <span
                key={i}
                className="text-xs text-accent border border-accent/30 bg-accent/5 rounded-md px-2 py-1"
              >
                {s}
              </span>
            ))}
          </div>
        </Section>
      ) : null}

      {/* Quellen zum Überprüfen (KI-Einträge) */}
      {isKI && item.sources?.length ? (
        <Section
          icon={item.verification?.status === "valide" ? "shield" : "link"}
          tint={item.verification?.status === "valide" ? "success" : "accent"}
          title={`Quellen${item.verification?.checkedAt ? ` · geprüft ${fmtDate(item.verification.checkedAt)}` : ""}`}
        >
          <ul className="space-y-2">
            {item.sources.map((s, i) => (
              <li key={i}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 text-sm text-accent hover:underline"
                >
                  <LinkIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span className="min-w-0">
                    <span className="font-medium">{s.publisher || s.domain}</span>
                    {s.corroborates === true ? (
                      <Badge variant="success" size="sm" className="ml-2 align-middle">bestätigt</Badge>
                    ) : s.corroborates === false ? (
                      <Badge variant="critical" size="sm" className="ml-2 align-middle">widerspricht</Badge>
                    ) : null}
                    <span className="block text-xs text-text-muted truncate">{s.domain}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* KI disclaimer */}
      {isKI ? (
        <p className="text-xs text-text-muted border-t border-border pt-3">
          {item.verification?.status === "valide"
            ? "Automatisch quervalidiert (≥5 unabhängige Quellen) — keine redaktionelle Freigabe, kein Ersatz für fachliche Prüfung."
            : "Automatisch via KI angereichert, nicht redaktionell geprüft. Quellen oben zum Verifizieren nutzen."}
        </p>
      ) : null}
    </div>
  );
}
