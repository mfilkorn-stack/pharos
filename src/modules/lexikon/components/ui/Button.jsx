const VARIANTS = {
  primary: "bg-accent text-bg-primary hover:bg-accent/90 border-transparent",
  ghost: "bg-transparent text-text-secondary border-border hover:bg-card hover:text-text-primary",
  subtle: "bg-card text-text-secondary border-border hover:bg-card-hover hover:text-text-primary",
  icon: "bg-transparent text-text-secondary border-transparent hover:bg-card hover:text-text-primary",
  danger: "bg-critical text-bg-primary hover:bg-critical/90 border-transparent",
};

// Touch-Ziele ≥ 44 px auf Touch-Geräten; ab lg (Maus) kompakter.
const SIZES = {
  sm: "h-11 lg:h-9 px-3 text-sm rounded-lg",
  md: "h-11 lg:h-10 px-4 text-sm rounded-lg",
  lg: "min-h-12 py-2 px-5 text-base font-semibold rounded-lg",
  icon: "h-11 w-11 rounded-lg",
};

export default function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  disabled,
  onClick,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 border font-medium transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none ${VARIANTS[variant] || VARIANTS.primary} ${SIZES[size] || SIZES.md} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
