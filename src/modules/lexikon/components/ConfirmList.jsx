import Section from "./ui/Section.jsx";
import Button from "./ui/Button.jsx";

export default function ConfirmList({ matched, unmatched, codeNote, onPick, onPickUnknown, onPickAll, onClose, onRetry }) {
  const totalCount = (matched?.length || 0) + (unmatched?.length || 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-text-muted">Vorschlag – bitte prüfen</div>

      {codeNote ? (
        <p className="text-sm text-text-secondary">{codeNote}</p>
      ) : null}

      {matched && matched.length > 0 ? (
        <Section kicker="Im Datenbestand" count={matched.length}>
          <div className="flex flex-col border border-border rounded-lg overflow-hidden">
            {matched.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="flex items-center gap-3 px-3 py-2.5 text-left hover:bg-card-hover transition-colors border-b border-border last:border-b-0"
                onClick={() => onPick(entry)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text-primary">{entry.wirkstoff}</div>
                  {entry.synonyms?.length ? (
                    <div className="text-xs text-text-muted truncate">{entry.synonyms.join(" · ")}</div>
                  ) : null}
                </div>
                <span className="text-xs text-success font-mono flex-shrink-0">✓</span>
              </button>
            ))}
          </div>
        </Section>
      ) : null}

      {unmatched && unmatched.length > 0 ? (
        <Section kicker="Nicht im Datenbestand" count={unmatched.length}>
          <div className="flex flex-col border border-warning/20 rounded-lg overflow-hidden bg-warning/5">
            {unmatched.map((name, i) => (
              <button
                key={`u:${name}:${i}`}
                type="button"
                className="flex items-center gap-3 px-3 py-2.5 text-left hover:bg-warning/10 transition-colors border-b border-warning/20 last:border-b-0"
                onClick={() => onPickUnknown(name)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text-primary">{name}</div>
                  <div className="text-xs text-warning">wird via KI angereichert</div>
                </div>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-warning animate-pulse flex-shrink-0" />
              </button>
            ))}
          </div>
        </Section>
      ) : null}

      {totalCount === 0 && !codeNote ? (
        <p className="text-sm text-text-muted text-center py-4">
          Nichts erkannt – bitte erneut versuchen oder Namen manuell suchen.
        </p>
      ) : null}

      {/* Sticky im Modal-Scroll: Übernehmen/Abbrechen bleiben bei langen
          Scan-Listen (Medikationsplan) sichtbar, ohne ans Ende zu scrollen. */}
      <div className="sticky bottom-0 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 px-5 sm:px-6 py-3 bg-bg-secondary border-t border-border flex flex-col gap-2">
        {totalCount > 1 ? (
          <Button variant="primary" size="md" onClick={() => onPickAll(matched || [], unmatched || [])}>
            Alle {totalCount} übernehmen
          </Button>
        ) : null}
        <div className="flex gap-2">
          {onRetry ? (
            <Button variant="ghost" size="md" onClick={onRetry} className="flex-1">
              Neu aufnehmen
            </Button>
          ) : null}
          <Button variant="ghost" size="md" onClick={onClose} className="flex-1">
            Abbrechen
          </Button>
        </div>
      </div>
    </div>
  );
}
