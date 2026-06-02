const VARIANTS = {
  critical: "bg-critical/10 text-critical border-critical/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  info: "bg-info/10 text-info border-info/30",
  success: "bg-success/10 text-success border-success/30",
  neutral: "bg-border text-text-secondary border-border-strong",
  accent: "bg-accent/10 text-accent border-accent/30",
};

const SIZES = {
  sm: "text-[10px] px-1.5 py-0.5 tracking-wider",
  md: "text-xs px-2 py-1 tracking-wide",
};

export default function Badge({ variant = "neutral", size = "sm", children, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border font-mono font-semibold uppercase ${VARIANTS[variant] || VARIANTS.neutral} ${SIZES[size] || SIZES.sm} ${className}`}>
      {children}
    </span>
  );
}
