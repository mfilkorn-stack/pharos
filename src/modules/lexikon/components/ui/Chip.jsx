export default function Chip({ active, onClick, children, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-sm font-medium whitespace-nowrap transition-colors select-none cursor-pointer
        ${active
          ? "bg-accent text-bg-primary border-transparent"
          : "bg-card text-text-secondary border-border hover:border-border-strong hover:text-text-primary"
        }`}
    >
      {children}
      {typeof count === "number" ? (
        <span className={`text-xs font-mono rounded-full px-1 ${active ? "bg-bg-primary/20 text-bg-primary" : "bg-card-hover text-text-muted"}`}>
          {count}
        </span>
      ) : null}
    </button>
  );
}
