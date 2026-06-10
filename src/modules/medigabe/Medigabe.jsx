// src/modules/medigabe/Medigabe.jsx
// Medigabe nach SAA — geführter 8-Schritte-Wizard (SAA S. 41 Standardvorgehen).
import { useSyncExternalStore, useCallback } from "react";
import saa from "../lexikon/data/saa.json";
import dosing from "./data/dosing.json";
import { getWizard, patchWizard, resetWizard, subscribeWizard } from "./lib/wizard.js";
import { getCaseMeds, subscribeCaseMeds, caseMedNames } from "../../lib/caseMeds.js";
import { StepFrame } from "./components/bits.jsx";
import Step1Medikament from "./components/Step1Medikament.jsx";
import Step2Indikation from "./components/Step2Indikation.jsx";
import Step3Patient from "./components/Step3Patient.jsx";
import Step4Kontra from "./components/Step4Kontra.jsx";
import Step5Aufklaerung, { AUFKL_ITEMS } from "./components/Step5Aufklaerung.jsx";
import Step6Dosierung from "./components/Step6Dosierung.jsx";
import Button from "../lexikon/components/ui/Button.jsx";
import { kiOutcome, dauermedRows } from "./lib/ki.js";
import { normKey } from "../lexikon/lib/saaCheck.js";
import saaMatrixData from "../lexikon/data/saa-matrix.json";

export default function Medigabe({ onJumpToMedScan }) {
  const w = useSyncExternalStore(subscribeWizard, getWizard);
  const meds = useSyncExternalStore(subscribeCaseMeds, getCaseMeds);
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
  } else if (w.step === 3) {
    const p = w.patient;
    const kg = Number(p.kg);
    const alterJahre = p.alterEinheit === "monate" ? Number(p.alter) / 12 : Number(p.alter);
    const valid =
      p.geschlecht && p.alter !== "" && p.kg !== "" &&
      kg >= 1 && kg <= 250 && alterJahre >= 0 && alterJahre <= 120 &&
      (dosingEntry?.minKg == null || kg >= dosingEntry.minKg) &&
      // Status muss zur Liste passen: „keine" nur bei leerer Liste, „übernommen" nur mit Einträgen.
      (p.dauerStatus === "keine" ? meds.length === 0 : p.dauerStatus === "uebernommen" && meds.length > 0);
    body = (
      <Step3Patient
        patient={p}
        onPatch={(patch) => patchWizard({ patient: { ...getWizard().patient, ...patch } })}
        minKg={dosingEntry?.minKg}
        minKgHinweis={dosingEntry?.minKgHinweis}
        onJumpToMedScan={onJumpToMedScan}
      />
    );
    footer = <Button size="lg" className="w-full" disabled={!valid} onClick={() => patchWizard({ step: 4 })}>Weiter</Button>;
  } else if (w.step === 4 && saaEntry) {
    const medNames = w.patient.dauerStatus === "uebernommen" ? caseMedNames(meds) : [];
    const rows = dauermedRows({ meds: medNames, matrix: saaMatrixData.entries, saaEntry });
    const flaggedMeds = rows.filter((r) => r.level !== "ok").map((r) => normKey(r.med));
    const out = kiOutcome({ answers: w.ki, nAbs: saaEntry.kontra.length, nRel: saaEntry.relKontra.length, flaggedMeds });

    body = (
      <Step4Kontra
        saaEntry={saaEntry}
        patient={w.patient}
        medNames={medNames}
        answers={w.ki}
        onAnswer={(k, v) => patchWizard({ ki: { ...getWizard().ki, [k]: v } })}
      />
    );
    footer = out.stop ? (
      <div className="w-full border border-critical/50 bg-critical/10 rounded-lg p-4 text-center">
        <div className="text-sm font-semibold text-critical mb-1">Absolute Kontraindikation — keine Gabe</div>
        <p className="text-xs text-text-secondary mb-3">Vorgehen nach BPR (Alternativen / NA-Nachforderung). Wizard hier beenden.</p>
        <Button variant="subtle" size="lg" className="w-full" onClick={() => { resetWizard(); }}>Beenden &amp; zurücksetzen</Button>
      </div>
    ) : (
      <Button
        size="lg" className="w-full" disabled={!out.complete}
        onClick={() => {
          if (out.confirm && !window.confirm("Relative Kontraindikation(en) bzw. Dauermedikations-Hinweise liegen vor. Nutzen-Risiko abgewogen? Begründung dokumentieren.")) return;
          patchWizard({ step: 5 });
        }}
      >
        Weiter
      </Button>
    );
  } else if (w.step === 5) {
    const a = w.aufkl;
    const itemsOk = AUFKL_ITEMS.every((_, i) => a.items[i]);
    const verweigert = a.faehig === "ja" && a.einwilligung === "nein";
    const ok =
      (a.faehig === "ja" && a.einwilligung === "ja" && itemsOk) ||
      ((a.faehig === "nein" || a.faehig === "unklar") && a.mutmasslich);
    body = <Step5Aufklaerung aufkl={a} onPatch={(patch) => patchWizard({ aufkl: { ...getWizard().aufkl, ...patch } })} />;
    footer = verweigert ? (
      <Button variant="subtle" size="lg" className="w-full" onClick={() => resetWizard()}>Beenden — keine Gabe</Button>
    ) : (
      <Button size="lg" className="w-full" disabled={!ok} onClick={() => patchWizard({ step: 6 })}>Weiter</Button>
    );
  } else if (w.step === 6 && ind) {
    body = (
      <Step6Dosierung
        ind={ind}
        cave={dosingEntry.cave}
        patient={w.patient}
        dosier={w.dosier}
        onPatch={(patch) => patchWizard({ dosier: { ...getWizard().dosier, ...patch } })}
      />
    );
    footer = (
      <Button size="lg" className="w-full" disabled={w.dosier.weg == null || w.dosier.prep == null} onClick={() => patchWizard({ step: 7 })}>
        Weiter → 6-R-Regel
      </Button>
    );
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
