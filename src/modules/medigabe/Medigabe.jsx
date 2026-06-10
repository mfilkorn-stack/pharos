// src/modules/medigabe/Medigabe.jsx
// Medigabe nach SAA — geführter 8-Schritte-Wizard (SAA S. 41 Standardvorgehen).
import { useSyncExternalStore, useCallback } from "react";
import { getWizard, patchWizard, subscribeWizard } from "./lib/wizard.js";
import { StepFrame } from "./components/bits.jsx";

export default function Medigabe({ onJumpToMedScan }) {
  const w = useSyncExternalStore(subscribeWizard, getWizard);
  const back = useCallback(() => patchWizard({ step: Math.max(1, getWizard().step - 1) }), []);

  return (
    <main className="flex-1 min-w-0 flex flex-col">
      <StepFrame step={w.step} onBack={back} footer={null}>
        <p className="text-sm text-text-secondary">Schritt {w.step} — wird in Tasks 8–13 implementiert.</p>
      </StepFrame>
    </main>
  );
}
