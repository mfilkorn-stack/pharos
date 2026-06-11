// src/modules/medigabe/components/bits.jsx
// Kleine geteilte Bausteine des Medigabe-Wizards.
import Button from "../../lexikon/components/ui/Button.jsx";
import { ChevronLeftIcon } from "../../lexikon/components/ui/icons.jsx";
import ActionBar from "../../../shell/ActionBar.jsx";

export const STEP_LABELS = ["Medikament", "Indikation", "Patient", "Kontraindikationen", "Aufklärung", "Dosierung", "6-R-Regel", "Durchführung"];

// Rahmen jedes Schritts: Fortschritt, Kontext-Chip, Inhalt — und die Aktions-Leiste
// FIXIERT am unteren Rand (mobil über der Tab-Leiste inkl. Safe-Area, Desktop neben
// der Sidebar): Weiter/Stopp/Freigabe liegen immer im Daumenbereich, nie hinterm Scroll.
export function StepFrame({ step, context, children, onBack, footer }) {
  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 pb-48 w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-text-muted">Schritt {step} / 8</span>
        <span className="text-xs text-text-secondary">{STEP_LABELS[step - 1]}</span>
      </div>
      <div className="flex gap-1 mb-4" aria-hidden="true">
        {STEP_LABELS.map((_, i) => (
          <span key={i} className={`flex-1 h-1 rounded-full ${i < step ? "bg-accent" : "bg-border"}`} />
        ))}
      </div>
      {context && context.length ? (
        <div className="flex flex-wrap items-center gap-1.5 mb-4 text-xs text-text-secondary">
          {context.map((c, i) => (
            <span key={i} className="bg-card border border-border rounded-md px-2 py-1">{c}</span>
          ))}
        </div>
      ) : null}
      {children}
      <p className="mt-6 text-xs text-text-muted border-t border-border pt-3">
        Entscheidungsunterstützung — kein Ersatz für ärztliche Anordnung / gültige SAA-Freigabe.
      </p>

      <ActionBar>
        {step > 1 ? (
          <Button variant="ghost" size="lg" onClick={onBack}>
            <ChevronLeftIcon className="h-4 w-4" /> Zurück
          </Button>
        ) : null}
        <div className="flex-1">{footer}</div>
      </ActionBar>
    </div>
  );
}

// Auswahl-Zeile (Checkliste): Touch-Target ≥ 56 px.
// Tone-Klassen statisch (Tailwind kann keine dynamisch zusammengesetzten Klassen).
const CHECK_TONES = {
  accent: "border-accent text-accent",
  warning: "border-warning text-warning",
};
export function CheckRow({ checked, onToggle, children, tone = "accent" }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className="w-full min-h-[56px] flex items-center gap-3 px-3 py-2.5 bg-card border border-border rounded-lg text-left hover:bg-card-hover transition-colors"
    >
      <span className={`h-6 w-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${checked ? CHECK_TONES[tone] : "border-border-strong text-transparent"}`}>
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 8.5l3.5 3.5L13 4" /></svg>
      </span>
      <span className="text-sm text-text-primary leading-snug">{children}</span>
    </button>
  );
}

// Ja/Nein-Zeile für KI-Punkte: „Nein" = liegt nicht vor (ok), „Ja" = liegt vor.
export function JaNeinRow({ text, value, onChange, highlight }) {
  const seg = (v, label, activeCls) => (
    <button
      type="button"
      onClick={() => onChange(v)}
      aria-pressed={value === v}
      className={`h-11 px-4 rounded-lg border text-sm font-medium transition-colors ${
        value === v ? activeCls : "border-border text-text-muted hover:text-text-secondary"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className={`flex flex-wrap items-center gap-3 px-3 py-2.5 bg-card border rounded-lg ${highlight ? "border-critical/60" : "border-border"}`}>
      <span className="flex-1 min-w-[55%] text-sm text-text-primary leading-snug break-words [overflow-wrap:anywhere]">{text}</span>
      <div className="flex gap-1.5 flex-shrink-0 ml-auto">
        {seg("nein", "Nein", "border-success/50 bg-success/10 text-success")}
        {seg("ja", "Ja", "border-critical/50 bg-critical/10 text-critical")}
      </div>
    </div>
  );
}

// Segment-Auswahl (z. B. Applikationsweg, Geschlecht).
export function SegPick({ options, value, onChange }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`min-h-[44px] px-4 rounded-lg border text-sm font-medium transition-colors ${
            value === o.value
              ? "bg-accent text-bg-primary border-transparent"
              : "bg-card text-text-secondary border-border hover:bg-card-hover"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
