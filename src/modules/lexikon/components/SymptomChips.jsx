// Symptombasierte Schnellsuche: Klick auf ein Leitsymptom setzt die Suche.
// Findet über das erweiterte Such-Prädikat (App.jsx) alle Substanzen, deren
// Toxidrom dieses Leitsymptom listet — der Rückwärts-Workflow bei unbekannter Substanz.

const SYMPTOMS = [
  "Miosis",
  "Mydriasis",
  "Atemdepression",
  "Bewusstlosigkeit",
  "Hyperthermie",
  "Tachykardie",
  "Hypertonie",
  "Agitation",
  "Nystagmus",
  "Halluzinationen",
];

export default function SymptomChips({ onPick }) {
  return (
    <div>
      <div className="font-mono text-[10px] tracking-wider uppercase text-text-muted mb-1.5">
        Leitsymptom → Substanzklasse
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {SYMPTOMS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick?.(s)}
            className="inline-flex items-center h-8 px-3 rounded-lg border border-border bg-card text-sm text-text-secondary whitespace-nowrap transition-colors cursor-pointer flex-shrink-0 hover:border-amber-400/40 hover:text-text-primary"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
