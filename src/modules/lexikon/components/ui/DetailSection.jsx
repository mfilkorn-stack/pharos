// Abschnitt im Wirkstoff-Detail (vorher doppelt in ResultDetail und SaaDetail).
const TINT = {
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  critical: "bg-critical/10 text-critical",
  accent: "bg-accent/10 text-accent",
};

export default function DetailSection({ icon: Icon, tint = "accent", title, children }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <span className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 ${TINT[tint] || TINT.accent}`}>
          {Icon ? <Icon className="h-4 w-4" /> : null}
        </span>
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      </div>
      <div className="ml-9">{children}</div>
    </section>
  );
}
