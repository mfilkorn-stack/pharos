export default function Section({ kicker, count, children, className = "" }) {
  return (
    <section className={className}>
      {kicker ? (
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-text-muted">{kicker}</span>
          {typeof count === "number" ? (
            <span className="font-mono text-[10px] tracking-wider text-text-muted">·</span>
          ) : null}
          {typeof count === "number" ? (
            <span className="font-mono text-[10px] tracking-wider text-text-secondary">{count}</span>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
