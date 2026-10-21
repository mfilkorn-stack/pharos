import Chip from "./ui/Chip.jsx";

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
    <div role="group" aria-labelledby="symptom-chips-label">
      <div id="symptom-chips-label" className="font-mono text-[10px] tracking-wider uppercase text-text-muted mb-1.5">
        Leitsymptom → Substanzklasse
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {SYMPTOMS.map((s) => (
          <Chip key={s} pressable={false} onClick={() => onPick?.(s)}>{s}</Chip>
        ))}
      </div>
    </div>
  );
}
