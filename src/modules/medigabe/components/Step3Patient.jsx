// src/modules/medigabe/components/Step3Patient.jsx
import { useState, useSyncExternalStore } from "react";
import { getCaseMeds, addCaseMed, removeCaseMed, clearCaseMeds, subscribeCaseMeds, caseMedNames } from "../../../lib/caseMeds.js";
import { alterInJahren } from "../lib/dose.js";
import { SegPick } from "./bits.jsx";
import Button from "../../lexikon/components/ui/Button.jsx";
import Badge from "../../lexikon/components/ui/Badge.jsx";
import { CameraIcon, MagnifyingGlassIcon, XIcon } from "../../lexikon/components/ui/icons.jsx";

const PRESETS = [
  { label: "Mann", sub: "1,80 m · 80 kg · 50 J", geschlecht: "m", kg: "80", alter: "50" },
  { label: "Frau", sub: "1,66 m · 70 kg · 45 J", geschlecht: "w", kg: "70", alter: "45" },
];

export default function Step3Patient({ patient, onPatch, minKg, minKgHinweis, minAlterMonate, minAlterHinweis, onJumpToMedScan }) {
  const meds = useSyncExternalStore(subscribeCaseMeds, getCaseMeds);
  const [medInput, setMedInput] = useState("");
  const names = caseMedNames(meds);

  const addManual = () => {
    const t = medInput.trim();
    if (!t) return;
    addCaseMed({ wirkstoff: t, source: "medigabe" });
    setMedInput("");
    if (patient.dauerStatus === "keine") onPatch({ dauerStatus: null });
  };

  const kg = Number(patient.kg);
  const alterJahre = alterInJahren(patient);
  const kgInvalid = patient.kg !== "" && (!(kg > 0) || kg < 1 || kg > 250);
  const alterInvalid = patient.alter !== "" && (alterJahre == null || alterJahre < 0 || alterJahre > 120);
  const unterMinKg = minKg != null && patient.kg !== "" && kg >= 1 && kg < minKg;
  const unterMinAlter = minAlterMonate != null && alterJahre != null && alterJahre * 12 < minAlterMonate;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-xs text-text-muted mb-2">Geschlecht</div>
        <SegPick
          options={[{ value: "m", label: "männlich" }, { value: "w", label: "weiblich" }, { value: "d", label: "divers" }]}
          value={patient.geschlecht}
          onChange={(geschlecht) => onPatch({ geschlecht })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-text-muted mb-2">Alter (Jahre)</div>
          <input
            type="number" inputMode="numeric" min="0"
            value={patient.alter}
            onChange={(e) => onPatch({ alter: e.target.value })}
            className="w-full h-12 px-3 bg-card border border-border rounded-lg text-sm text-text-primary"
            placeholder="Jahre"
          />
          {alterInvalid ? <p className="text-xs text-critical mt-1">Unplausibel (0–120 Jahre).</p> : null}
        </div>
        <div>
          <div className="text-xs text-text-muted mb-2">Gewicht (kg)</div>
          <input
            type="number" inputMode="decimal" min="1" max="250"
            value={patient.kg}
            onChange={(e) => onPatch({ kg: e.target.value })}
            className="w-full h-12 px-3 bg-card border border-border rounded-lg text-sm text-text-primary"
            placeholder="kg"
          />
          {kgInvalid ? <p className="text-xs text-critical mt-1">Unplausibel (1–250 kg).</p> : null}
        </div>
      </div>
      <div className="flex gap-2 -mt-2">
        {PRESETS.map((p) => {
          const active = patient.geschlecht === p.geschlecht && String(patient.kg) === p.kg && String(patient.alter) === p.alter;
          return (
            <button key={p.label} type="button"
              onClick={() => onPatch({ geschlecht: p.geschlecht, kg: p.kg, alter: p.alter })}
              className={`flex-1 flex flex-col items-center py-2.5 rounded-lg border text-xs transition-colors ${active ? "border-accent text-accent bg-accent/10" : "border-border text-text-muted hover:text-text-secondary"}`}>
              <span className="font-medium">{p.label}</span>
              <span className="opacity-70 mt-0.5">{p.sub}</span>
            </button>
          );
        })}
      </div>

      {unterMinKg ? (
        <div className="border border-critical/40 bg-critical/10 rounded-lg p-3 text-sm text-text-primary">
          <span className="font-semibold text-critical">Gewichtsgrenze: </span>{minKgHinweis}
        </div>
      ) : null}

      {unterMinAlter ? (
        <div className="border border-critical/40 bg-critical/10 rounded-lg p-3 text-sm text-text-primary">
          <span className="font-semibold text-critical">Altersgrenze: </span>{minAlterHinweis}
        </div>
      ) : null}

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-text-muted">Dauermedikation</div>
          {meds.length ? (
            <button type="button" onClick={() => { clearCaseMeds(); onPatch({ dauerStatus: null }); }} className="text-xs text-text-muted hover:text-critical">
              Liste verwerfen
            </button>
          ) : null}
        </div>

        {meds.length ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1.5">
              {meds.map((m) => (
                <span key={m.wirkstoff} className="inline-flex items-center gap-1.5 text-xs text-text-primary bg-card border border-border rounded-md pl-2 pr-1 py-1">
                  {m.wirkstoff}
                  {m.source !== "medigabe" ? <Badge variant="accent" size="sm">MedScan</Badge> : null}
                  <button type="button" aria-label={`${m.wirkstoff} entfernen`} onClick={() => removeCaseMed(m.wirkstoff)} className="p-1 text-text-muted hover:text-critical">
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <Button
              variant={patient.dauerStatus === "uebernommen" ? "primary" : "subtle"}
              size="lg" className="w-full"
              onClick={() => onPatch({ dauerStatus: "uebernommen" })}
            >
              {patient.dauerStatus === "uebernommen" ? `✓ ${names.length} Medikament(e) übernommen` : `${names.length} Medikament(e) übernehmen`}
            </Button>
          </div>
        ) : (
          <Button
            variant={patient.dauerStatus === "keine" ? "primary" : "subtle"}
            size="lg" className="w-full"
            onClick={() => onPatch({ dauerStatus: "keine" })}
          >
            {patient.dauerStatus === "keine" ? "✓ Keine Dauermedikation" : "Keine Dauermedikation (bestätigen)"}
          </Button>
        )}

        <div className="flex gap-2 mt-3">
          <input
            value={medInput}
            onChange={(e) => setMedInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addManual(); }}
            placeholder="Medikament ergänzen …"
            autoComplete="off"
            className="flex-1 h-11 px-3 bg-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted"
          />
          <Button variant="subtle" size="md" onClick={addManual} disabled={!medInput.trim()}>Hinzufügen</Button>
        </div>
        <div className="flex gap-2 mt-2">
          <Button variant="ghost" size="md" className="flex-1" onClick={() => onJumpToMedScan("scannen")}>
            <CameraIcon className="h-4 w-4" /> Scannen
          </Button>
          <Button variant="ghost" size="md" className="flex-1" onClick={() => onJumpToMedScan("suche")}>
            <MagnifyingGlassIcon className="h-4 w-4" /> Suchen
          </Button>
        </div>
        <p className="text-[11px] text-text-muted mt-2">Scan/Suche öffnet MedScan — der Wizard bleibt erhalten, zurück über die Tab-Leiste.</p>
      </div>
    </div>
  );
}
