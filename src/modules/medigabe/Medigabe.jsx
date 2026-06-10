// src/modules/medigabe/Medigabe.jsx
// Medigabe nach SAA — geführter 8-Schritte-Wizard (SAA S. 41 Standardvorgehen).
import { useSyncExternalStore, useCallback, useEffect } from "react";
import saa from "../lexikon/data/saa.json";
import dosing from "./data/dosing.json";
import { getWizard, patchWizard, resetWizard, subscribeWizard } from "./lib/wizard.js";
import { getCaseMeds, subscribeCaseMeds, caseMedNames, clearCaseMeds } from "../../lib/caseMeds.js";
import { StepFrame } from "./components/bits.jsx";
import Step1Medikament from "./components/Step1Medikament.jsx";
import Step2Indikation from "./components/Step2Indikation.jsx";
import Step3Patient from "./components/Step3Patient.jsx";
import Step4Kontra from "./components/Step4Kontra.jsx";
import Step5Aufklaerung, { AUFKL_ITEMS } from "./components/Step5Aufklaerung.jsx";
import Step6Dosierung from "./components/Step6Dosierung.jsx";
import Step7SechsR, { sechsRItems } from "./components/Step7SechsR.jsx";
import Step8Doku from "./components/Step8Doku.jsx";
import Button from "../lexikon/components/ui/Button.jsx";
import { computeDose, computeVolume, fmt } from "./lib/dose.js";
import { kiOutcome, dauermedRows, kiListen } from "./lib/ki.js";
import { normKey } from "../lexikon/lib/saaCheck.js";
import { useSaaMatrix } from "../../lib/saaMatrix.js";

export default function Medigabe({ onJumpToMedScan }) {
  const w = useSyncExternalStore(subscribeWizard, getWizard);
  const meds = useSyncExternalStore(subscribeCaseMeds, getCaseMeds);
  const { matrix: saaMatrix } = useSaaMatrix();
  const back = useCallback(() => patchWizard({ step: Math.max(1, getWizard().step - 1) }), []);

  // Wächter: Weicht die Einsatz-Medikationsliste vom bestätigten Stand ab (z. B. Scan
  // in MedScan mitten im Wizard — auch während Medigabe unmounted war), verfällt die
  // Übernahme: zurück zu Schritt 3, 6-R und Freigabe verworfen. Sonst umginge das
  // neue Medikament den KI-Check. Vergleichsbasis ist der im Store gespeicherte
  // Fingerprint, damit der Check auch beim Re-Mount greift.
  const medsKey = caseMedNames(meds).map(normKey).sort().join("|");
  useEffect(() => {
    const cur = getWizard();
    if (cur.patient.dauerStatus == null) return; // noch nichts bestätigt — nichts zu verwerfen
    if (medsKey === (cur.medsFingerprint ?? "")) return;
    patchWizard({
      step: Math.min(cur.step, 3),
      patient: { ...cur.patient, dauerStatus: null },
      medsFingerprint: null,
      sechsR: {},
      freigabeZeit: null,
    });
  }, [medsKey]);
  const saaEntry = saa.entries.find((e) => e.id === w.medId) || null;
  const dosingEntry = dosing.entries.find((e) => e.id === w.medId) || null;
  const ind = dosingEntry?.indikationen.find((i) => i.id === w.indId) || null;

  const context = [];
  if (saaEntry) context.push(saaEntry.name);
  if (ind) context.push(ind.label);
  if (w.step > 3 && w.patient.kg) context.push(`${w.patient.kg} kg · ${w.patient.geschlecht || "?"} · ${w.patient.alter} ${w.patient.alterEinheit === "monate" ? "Mon" : "J"}`);

  let body = null;
  let footer = null;

  // Sicherheitsregel: Jede Änderung an Werten, die in spätere Bestätigungen einfließen
  // (Medikament, Indikation, Patient, Ampulle/Weg), verwirft die nachgelagerten 6-R-Haken
  // und die Freigabe; der Medikamentenwechsel zusätzlich KI-Antworten und Aufklärung.
  if (w.step === 1) {
    body = (
      <Step1Medikament
        value={w.medId}
        onPick={(medId) => patchWizard({
          medId, indId: null, ki: {}, dosier: { weg: null, prep: null },
          aufkl: { items: {}, faehig: null, einwilligung: null, mutmasslich: false },
          sechsR: {}, durchf: {}, freigabeZeit: null,
        })}
      />
    );
    footer = <Button size="lg" className="w-full" disabled={!w.medId} onClick={() => patchWizard({ step: 2 })}>Weiter</Button>;
  } else if (w.step === 2) {
    body = <Step2Indikation medId={w.medId} value={w.indId} onPick={(indId) => patchWizard({ indId, ki: {}, dosier: { weg: null, prep: null }, sechsR: {}, freigabeZeit: null })} />;
    footer = <Button size="lg" className="w-full" disabled={!w.indId} onClick={() => patchWizard({ step: 3 })}>Weiter</Button>;
  } else if (w.step === 3) {
    const p = w.patient;
    const kg = Number(p.kg);
    const alterJahre = p.alterEinheit === "monate" ? Number(p.alter) / 12 : Number(p.alter);
    const effMinKg = Math.max(dosingEntry?.minKg ?? 0, ind?.minKg ?? 0) || null;
    const effMinKgHinweis = (ind?.minKg ?? 0) >= (dosingEntry?.minKg ?? 0)
      ? (ind?.minKgHinweis ?? dosingEntry?.minKgHinweis)
      : (dosingEntry?.minKgHinweis ?? ind?.minKgHinweis);
    const minAlterMonate = dosingEntry?.minAlterMonate ?? null;
    const valid =
      p.geschlecht && p.alter !== "" && p.kg !== "" &&
      kg >= 1 && kg <= 250 && alterJahre >= 0 && alterJahre <= 120 &&
      (effMinKg == null || kg >= effMinKg) &&
      (minAlterMonate == null || alterJahre * 12 >= minAlterMonate) &&
      // Status muss zur Liste passen: „keine" nur bei leerer Liste, „übernommen" nur mit Einträgen.
      (p.dauerStatus === "keine" ? meds.length === 0 : p.dauerStatus === "uebernommen" && meds.length > 0);
    body = (
      <Step3Patient
        patient={p}
        onPatch={(patch) => {
          // Bestätigung der Dauermedikation pinnt den Listen-Fingerprint im Store.
          const fp = patch.dauerStatus === "uebernommen" ? medsKey : patch.dauerStatus === "keine" ? "" : getWizard().medsFingerprint;
          patchWizard({ patient: { ...getWizard().patient, ...patch }, medsFingerprint: fp, sechsR: {}, freigabeZeit: null });
        }}
        minKg={effMinKg}
        minKgHinweis={effMinKgHinweis}
        minAlterMonate={minAlterMonate}
        minAlterHinweis={dosingEntry?.minAlterHinweis}
        onJumpToMedScan={onJumpToMedScan}
      />
    );
    footer = <Button size="lg" className="w-full" disabled={!valid} onClick={() => patchWizard({ step: 4 })}>Weiter</Button>;
  } else if (w.step === 4 && saaEntry) {
    const medNames = w.patient.dauerStatus === "uebernommen" ? caseMedNames(meds) : [];
    const rows = dauermedRows({ meds: medNames, matrix: saaMatrix, saaEntry });
    const flaggedMeds = rows.filter((r) => r.level !== "ok").map((r) => normKey(r.med));
    const { kontra, relKontra } = kiListen(saaEntry, ind);
    const out = kiOutcome({ answers: w.ki, nAbs: kontra.length, nRel: relKontra.length, flaggedMeds });

    body = (
      <Step4Kontra
        saaEntry={saaEntry}
        kontra={kontra}
        relKontra={relKontra}
        patient={w.patient}
        medNames={medNames}
        matrix={saaMatrix}
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
    body = (
      <Step5Aufklaerung
        aufkl={a}
        onPatch={(patch) => patchWizard({ aufkl: { ...getWizard().aufkl, ...patch } })}
        onToggleItem={(i) => {
          // Immer vom frischen Store spreaden — Render-Closure würde schnelle Folge-Toggles verlieren.
          const cur = getWizard().aufkl;
          patchWizard({ aufkl: { ...cur, items: { ...cur.items, [i]: !cur.items[i] } } });
        }}
      />
    );
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
        onPatch={(patch) => patchWizard({ dosier: { ...getWizard().dosier, ...patch }, sechsR: {}, freigabeZeit: null })}
      />
    );
    footer = (
      <Button size="lg" className="w-full" disabled={w.dosier.weg == null || w.dosier.prep == null} onClick={() => patchWizard({ step: 7 })}>
        Weiter → 6-R-Regel
      </Button>
    );
  } else if ((w.step === 7 || w.step === 8) && ind && w.dosier.weg != null && w.dosier.prep != null) {
    const route = ind.routen[w.dosier.weg];
    const prep = route.preps[w.dosier.prep];
    const kg = Number(w.patient.kg);
    const alterJahre = w.patient.alterEinheit === "monate" ? Number(w.patient.alter) / 12 : Number(w.patient.alter);
    const dose = computeDose({ dosis: route.dosis, kg, alterJahre, maxMgProKg: route.maxMgProKg, maxMgAbsolut: route.maxMgAbsolut });
    const vol = computeVolume({ mg: dose.mg, mgPerMl: prep.mgPerMl, maxMg: dose.maxMg });
    const items = sechsRItems({ saaEntry, ind, route, prep, patient: w.patient, mgEffektiv: fmt(vol.mgEffektiv), ml: fmt(vol.ml) });

    if (w.step === 7) {
      const all = items.every((_, i) => w.sechsR[i]);
      body = <Step7SechsR items={items} sechsR={w.sechsR} onToggle={(i) => patchWizard({ sechsR: { ...getWizard().sechsR, [i]: !getWizard().sechsR[i] } })} />;
      footer = (
        <Button size="lg" className="w-full" disabled={!all}
          onClick={() => patchWizard({ step: 8, freigabeZeit: new Date().toISOString() })}>
          6× Ja — Freigabe zur Durchführung
        </Button>
      );
    } else {
      const zeit = w.freigabeZeit ? new Date(w.freigabeZeit).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "—";
      const zusammenfassung = [
        ["Medikament", `${saaEntry.name} (${prep.ampulle})`],
        ["Indikation", ind.label],
        ["Patient", items[0].wert],
        ["Dosis", `${fmt(vol.mgEffektiv)} mg = ${fmt(vol.ml)} ml ${route.weg}`],
        ["Lösung", prep.ergebnis],
        ["Repetition", route.repetition || "—"],
        ["6-R bestätigt", `${zeit} Uhr`],
        ["UAW beachten", (saaEntry.uaw || []).join(", ")],
      ];
      body = (
        <Step8Doku
          zusammenfassung={zusammenfassung}
          durchf={w.durchf}
          onToggle={(k) => patchWizard({ durchf: { ...getWizard().durchf, [k]: !getWizard().durchf[k] } })}
          onNeuerPatient={() => { clearCaseMeds(); resetWizard(); }}
        />
      );
      footer = null;
    }
  }

  return (
    <main className="flex-1 min-w-0 flex flex-col">
      <StepFrame step={w.step} context={context} onBack={back} footer={footer}>
        {body}
      </StepFrame>
    </main>
  );
}
