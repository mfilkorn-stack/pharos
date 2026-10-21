// Filter-/Auswahl-Chip. Einheitlich für Kategorie-Filter und Symptom-Schnellsuche.
export default function Chip({ active, onClick, children, count, Icon, pressable = true }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressable ? !!active : undefined}
      className={`inline-flex items-center gap-1.5 h-11 lg:h-9 px-3.5 rounded-lg border text-sm font-medium whitespace-nowrap transition-colors select-none cursor-pointer flex-shrink-0 ${
        active
          ? "bg-accent text-bg-primary border-transparent"
          : "bg-card text-text-secondary border-border hover:border-border-strong hover:text-text-primary"
      }`}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
      {typeof count === "number" ? (
        <span className={`text-[11px] font-mono ${active ? "text-bg-primary/80" : "text-text-muted"}`}>{count}</span>
      ) : null}
    </button>
  );
}
