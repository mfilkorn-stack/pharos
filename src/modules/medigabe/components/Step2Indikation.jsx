// src/modules/medigabe/components/Step2Indikation.jsx
import dosing from "../data/dosing.json";

export default function Step2Indikation({ medId, value, onPick }) {
  const entry = dosing.entries.find((e) => e.id === medId);
  if (!entry) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-text-muted mb-1">Nur die in der SAA genannten Indikationen sind wählbar.</p>
      {entry.indikationen.map((ind) => (
        <button
          key={ind.id}
          type="button"
          onClick={() => onPick(ind.id)}
          aria-pressed={value === ind.id}
          className={`min-h-[56px] px-4 py-3 rounded-lg border text-left text-sm font-medium transition-colors ${
            value === ind.id ? "border-accent bg-accent/10 text-text-primary" : "border-border bg-card text-text-secondary hover:bg-card-hover"
          }`}
        >
          {ind.label}
        </button>
      ))}
    </div>
  );
}
