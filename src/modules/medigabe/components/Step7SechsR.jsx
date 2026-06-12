// src/modules/medigabe/components/Step7SechsR.jsx
import { CheckRow } from "./bits.jsx";

// Sechs R mit den konkreten Werten dieses Durchlaufs (SAA S. 41).
// ml ist null bei Darreichungen ohne ml-Rechnung (Tablette, Hub, Inhalation).
export function sechsRItems({ saaEntry, ind, route, prep, patient, mgEffektiv, ml, einheit = "mg" }) {
  const alterTxt = `${patient.alter} ${patient.alterEinheit === "monate" ? "Monate" : "Jahre"}`;
  return [
    { titel: "Richtiger Patient?", wert: `${patient.geschlecht || "?"} · ${alterTxt} · ${patient.kg} kg` },
    { titel: "Richtiges Medikament?", wert: `${saaEntry.name} — Ampulle ${prep.ampulle}` },
    { titel: "Richtige Dosierung?", wert: ml != null ? `${mgEffektiv} ${einheit} = ${ml} ml` : `${mgEffektiv} ${einheit}` },
    { titel: "Richtiger Zeitpunkt?", wert: `Jetzt indiziert: ${ind.label}` },
    { titel: "Richtige Konzentration?", wert: prep.ergebnis },
    { titel: "Richtige Applikationsart?", wert: route.weg },
  ];
}

export default function Step7SechsR({ items, sechsR, onToggle, onAll }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onAll}
          className="h-9 px-3 rounded-lg border border-accent/40 bg-accent/5 text-accent text-xs font-medium hover:bg-accent/10 transition-colors"
        >
          Alle abhaken
        </button>
      </div>
      {items.map((it, i) => (
        <CheckRow key={i} checked={!!sechsR[i]} onToggle={() => onToggle(i)}>
          <span className="font-semibold">{it.titel}</span>
          <span className="block text-text-secondary text-xs mt-0.5">{it.wert}</span>
        </CheckRow>
      ))}
    </div>
  );
}
