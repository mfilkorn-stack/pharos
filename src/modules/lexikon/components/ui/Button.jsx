const VARIANTS = {
  primary: "bg-accent text-bg-primary hover:bg-accent/90 border-transparent",
  ghost: "bg-transparent text-text-secondary border-border hover:bg-card hover:text-text-primary",
  subtle: "bg-card text-text-secondary border-border hover:bg-card-hover hover:text-text-primary",
  icon: "bg-transparent text-text-secondary border-transparent hover:bg-card hover:text-text-primary",
};

const SIZES = {
  sm: "h-8 px-3 text-sm rounded-lg",
  md: "h-10 px-4 text-sm rounded-lg",
  lg: "h-11 px-5 text-base font-semibold rounded-lg",
  icon: "h-9 w-9 rounded-lg",
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
      className={`inline-flex items-center justify-center gap-2 border font-medium transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none ${VARIANTS[variant] || VARIANTS.primary} ${SIZES[size] || SIZES.md} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
