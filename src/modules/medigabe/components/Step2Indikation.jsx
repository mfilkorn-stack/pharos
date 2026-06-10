// src/modules/medigabe/components/Step2Indikation.jsx
import saa from "../../lexikon/data/saa.json";
import dosing from "../data/dosing.json";

export default function Step2Indikation({ gaben, onPick }) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-text-muted">Nur die in der SAA genannten Indikationen sind wählbar.</p>
      {gaben.map((g, gi) => {
        const entry = dosing.entries.find((e) => e.id === g.medId);
        const name = saa.entries.find((e) => e.id === g.medId)?.name || g.medId;
        if (!entry) return null;
        return (
          <section key={g.medId}>
            {gaben.length > 1 ? (
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-text-muted mb-2">{name}</div>
            ) : null}
            <div className="flex flex-col gap-2">
              {entry.indikationen.map((ind) => (
                <button
                  key={ind.id}
                  type="button"
                  onClick={() => onPick(gi, ind.id)}
                  aria-pressed={g.indId === ind.id}
                  className={`min-h-[56px] px-4 py-3 rounded-lg border text-left text-sm font-medium transition-colors ${
                    g.indId === ind.id ? "border-accent bg-accent/10 text-text-primary" : "border-border bg-card text-text-secondary hover:bg-card-hover"
                  }`}
                >
                  {ind.label}
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
