// src/modules/medigabe/Medigabe.jsx
// Medigabe nach SAA — geführter 8-Schritte-Wizard (SAA S. 41 Standardvorgehen).
import { useSyncExternalStore, useCallback } from "react";
import saa from "../lexikon/data/saa.json";
import dosing from "./data/dosing.json";
import { getWizard, patchWizard, subscribeWizard } from "./lib/wizard.js";
import { StepFrame } from "./components/bits.jsx";
import Step1Medikament from "./components/Step1Medikament.jsx";
import Step2Indikation from "./components/Step2Indikation.jsx";
import Button from "../lexikon/components/ui/Button.jsx";

export default function Medigabe({ onJumpToMedScan }) {
  const w = useSyncExternalStore(subscribeWizard, getWizard);
  const back = useCallback(() => patchWizard({ step: Math.max(1, getWizard().step - 1) }), []);
  const saaEntry = saa.entries.find((e) => e.id === w.medId) || null;
  const dosingEntry = dosing.entries.find((e) => e.id === w.medId) || null;
  const ind = dosingEntry?.indikationen.find((i) => i.id === w.indId) || null;

  const context = [];
  if (saaEntry) context.push(saaEntry.name);
  if (ind) context.push(ind.label);
  if (w.step > 3 && w.patient.kg) context.push(`${w.patient.kg} kg · ${w.patient.geschlecht || "?"} · ${w.patient.alter} ${w.patient.alterEinheit === "monate" ? "Mon" : "J"}`);

  let body = null;
  let footer = null;

  if (w.step === 1) {
    body = <Step1Medikament value={w.medId} onPick={(medId) => patchWizard({ medId, indId: null, ki: {}, dosier: { weg: null, prep: null } })} />;
    footer = <Button size="lg" className="w-full" disabled={!w.medId} onClick={() => patchWizard({ step: 2 })}>Weiter</Button>;
  } else if (w.step === 2) {
    body = <Step2Indikation medId={w.medId} value={w.indId} onPick={(indId) => patchWizard({ indId })} />;
    footer = <Button size="lg" className="w-full" disabled={!w.indId} onClick={() => patchWizard({ step: 3 })}>Weiter</Button>;
  } else {
    body = <p className="text-sm text-text-secondary">Schritt {w.step} — folgt.</p>;
  }

  return (
    <main className="flex-1 min-w-0 flex flex-col">
      <StepFrame step={w.step} context={context} onBack={back} footer={footer}>
        {body}
      </StepFrame>
    </main>
  );
}
