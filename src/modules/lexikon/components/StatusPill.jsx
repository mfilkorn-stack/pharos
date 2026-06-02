/**
 * StatusPill — small pill with optional colored dot.
 * Props:
 *   dot: "success" | "warning" | "critical" | "info" | "accent" — colored dot color
 *   variant: "default" | "warning" — background/border variant
 *   children: label text
 */
const DOT_COLORS = {
  success: "bg-success",
  warning: "bg-warning",
  critical: "bg-critical",
  info: "bg-info",
  accent: "bg-accent",
};

export default function StatusPill({ dot, variant = "default", children, className = "" }) {
  const base = "inline-flex items-center gap-2 h-7 px-3 rounded-lg border text-xs font-mono whitespace-nowrap";
  const variantCls =
    variant === "warning"
      ? "bg-warning/5 border-warning/20 text-warning"
      : "bg-card border-border text-text-secondary";

  return (
    <span className={`${base} ${variantCls} ${className}`}>
      {dot ? (
        <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${DOT_COLORS[dot] || "bg-text-muted"}`} />
      ) : null}
      {children}
    </span>
  );
}
