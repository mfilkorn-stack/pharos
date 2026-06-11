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
import { computeDose, computeVolume, fmt, alterInJahren } from "./lib/dose.js";
import { kiOutcome, dauermedRowsMulti, kiPunkte } from "./lib/ki.js";
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
      gaben: cur.gaben.map((g) => ({ ...g, sechsR: {} })),
      freigabeZeit: null,
    });
  }, [medsKey]);

  // Vollständige Ableitung pro Gabe — eine Quelle für Schritte 6–8 und Kontext.
  const gabenInfo = w.gaben.map((g, gi) => {
    const saaEntry = saa.entries.find((e) => e.id === g.medId) || null;
    const dosingEntry = dosing.entries.find((e) => e.id === g.medId) || null;
    const ind = dosingEntry?.indikationen.find((i) => i.id === g.indId) || null;
    return { g, gi, saaEntry, dosingEntry, ind };
  });

  const context = [];
  gabenInfo.forEach(({ saaEntry, ind }) => {
    if (saaEntry) context.push(saaEntry.name + (ind ? ` · ${ind.label}` : ""));
  });
  if (w.step > 3 && w.patient.kg) context.push(`${w.patient.kg} kg · ${w.patient.geschlecht || "?"} · ${w.patient.alter} ${w.patient.alterEinheit === "monate" ? "Mon" : "J"}`);

  let body = null;
  let footer = null;

  // Sicherheitsregel: Jede Änderung an Werten, die in spätere Bestätigungen einfließen
  // (Medikament, Indikation, Patient, Ampulle/Weg), verwirft die nachgelagerten 6-R-Haken
  // und die Freigabe; der Medikamentenwechsel zusätzlich KI-Antworten und Aufklärung.
  if (w.step === 1) {
    body = (
      <Step1Medikament
        values={w.gaben.map((g) => g.medId)}
        onToggle={(medId) => {
          const cur = getWizard().gaben;
          const next = cur.some((g) => g.medId === medId)
            ? cur.filter((g) => g.medId !== medId)
            : cur.length >= 3 ? cur : [...cur, { medId, indId: null, dosier: { weg: null, prep: null }, sechsR: {} }];
          patchWizard({
            gaben: next,
            ki: {},
            aufkl: { items: {}, faehig: null, einwilligung: null, mutmasslich: false },
            durchf: {}, freigabeZeit: null,
          });
        }}
      />
    );
    footer = (
      <Button size="lg" className="w-full" disabled={!w.gaben.length} onClick={() => patchWizard({ step: 2 })}>
        {w.gaben.length > 1 ? `Weiter (${w.gaben.length} Medikamente)` : "Weiter"}
      </Button>
    );
  } else if (w.step === 2) {
    body = (
      <Step2Indikation
        gaben={w.gaben}
        onPick={(gi, indId) => patchWizard({
          gaben: getWizard().gaben.map((g, i) => (i === gi ? { ...g, indId, dosier: { weg: null, prep: null }, sechsR: {} } : g)),
          ki: {}, freigabeZeit: null,
        })}
      />
    );
    footer = <Button size="lg" className="w-full" disabled={!w.gaben.length || w.gaben.some((g) => !g.indId)} onClick={() => patchWizard({ step: 3 })}>Weiter</Button>;
  } else if (w.step === 3) {
    const p = w.patient;
    const kg = Number(p.kg);
    const alterJahre = alterInJahren(p);
    // Strengste Gewichts- und Altersgrenzen über alle Gaben aggregieren.
    let effMinKg = null, effMinKgHinweis = null, minAlterMonate = null, minAlterHinweis = null;
    for (const g of w.gaben) {
      const de = dosing.entries.find((e) => e.id === g.medId);
      const gi = de?.indikationen.find((i) => i.id === g.indId);
      const mk = Math.max(de?.minKg ?? 0, gi?.minKg ?? 0) || null;
      if (mk != null && (effMinKg == null || mk > effMinKg)) {
        effMinKg = mk;
        effMinKgHinweis = (gi?.minKg ?? 0) >= (de?.minKg ?? 0) ? (gi?.minKgHinweis ?? de?.minKgHinweis) : (de?.minKgHinweis ?? gi?.minKgHinweis);
      }
      if (de?.minAlterMonate != null && (minAlterMonate == null || de.minAlterMonate > minAlterMonate)) {
        minAlterMonate = de.minAlterMonate;
        minAlterHinweis = de.minAlterHinweis;
      }
    }
    const valid =
      p.geschlecht && p.alter !== "" && p.kg !== "" &&
      kg >= 1 && kg <= 250 && alterJahre != null && alterJahre >= 0 && alterJahre <= 120 &&
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
          patchWizard({
            patient: { ...getWizard().patient, ...patch },
            medsFingerprint: fp,
            gaben: getWizard().gaben.map((g) => ({ ...g, sechsR: {} })),
            freigabeZeit: null,
          });
        }}
        minKg={effMinKg}
        minKgHinweis={effMinKgHinweis}
        minAlterMonate={minAlterMonate}
        minAlterHinweis={minAlterHinweis}
        onJumpToMedScan={onJumpToMedScan}
      />
    );
    footer = <Button size="lg" className="w-full" disabled={!valid} onClick={() => patchWizard({ step: 4 })}>Weiter</Button>;
  } else if (w.step === 4 && w.gaben.length) {
    const kiGaben = gabenInfo.filter((x) => x.saaEntry).map(({ saaEntry, ind }) => ({ saaEntry, ind }));
    const punkte = kiPunkte(kiGaben);
    const medNames = w.patient.dauerStatus === "uebernommen" ? caseMedNames(meds) : [];
    const rows = dauermedRowsMulti({ meds: medNames, matrix: saaMatrix, saaEntries: kiGaben.map((x) => x.saaEntry) });
    const flaggedMeds = rows.filter((r) => r.level !== "ok").map((r) => normKey(r.med));
    const out = kiOutcome({ answers: w.ki, absKeys: punkte.abs.map((p) => p.key), relKeys: punkte.rel.map((p) => p.key), flaggedMeds });

    body = (
      <Step4Kontra
        punkte={punkte}
        rows={rows}
        kombi={w.gaben.length > 1}
        patient={w.patient}
        answers={w.ki}
        onAnswer={(k, v) => patchWizard({ ki: { ...getWizard().ki, [k]: v } })}
        onAnswerMany={(patch) => patchWizard({ ki: { ...getWizard().ki, ...patch } })}
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
        onAllItems={() => {
          // Alle Punkte in EINEM Patch setzen (kein Lost-Update wie bei n Einzel-Toggles).
          const cur = getWizard().aufkl;
          patchWizard({ aufkl: { ...cur, items: Object.fromEntries(AUFKL_ITEMS.map((_, i) => [i, true])) } });
        }}
      />
    );
    footer = verweigert ? (
      <Button variant="subtle" size="lg" className="w-full" onClick={() => resetWizard()}>Beenden — keine Gabe</Button>
    ) : (
      <Button size="lg" className="w-full" disabled={!ok} onClick={() => patchWizard({ step: 6 })}>Weiter</Button>
    );
  } else if (w.step === 6 && gabenInfo.length && gabenInfo.every((x) => x.ind)) {
    body = (
      <div className="flex flex-col gap-8">
        {gabenInfo.map(({ g, gi, saaEntry, dosingEntry, ind }) => (
          <section key={g.medId}>
            {w.gaben.length > 1 ? (
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-accent mb-3">{saaEntry?.name}</div>
            ) : null}
            <Step6Dosierung
              ind={ind}
              cave={dosingEntry?.cave}
              patient={w.patient}
              dosier={g.dosier}
              onPatch={(patch) => patchWizard({
                gaben: getWizard().gaben.map((x, i) => (i === gi ? { ...x, dosier: { ...x.dosier, ...patch }, sechsR: {} } : x)),
                freigabeZeit: null,
              })}
            />
          </section>
        ))}
      </div>
    );
    const fertig = w.gaben.every((g) => g.dosier.weg != null && g.dosier.prep != null);
    footer = <Button size="lg" className="w-full" disabled={!fertig} onClick={() => patchWizard({ step: 7 })}>Weiter → 6-R-Regel</Button>;
  } else if ((w.step === 7 || w.step === 8) && gabenInfo.length && gabenInfo.every((x) => x.ind && x.g.dosier.weg != null && x.g.dosier.prep != null)) {
    const kg = Number(w.patient.kg);
    const alterJahre = alterInJahren(w.patient);
    const berechnet = gabenInfo.map(({ g, gi, saaEntry, ind }) => {
      const route = ind.routen[g.dosier.weg];
      const prep = route.preps[g.dosier.prep];
      const dose = computeDose({ dosis: route.dosis, kg, alterJahre, maxMgProKg: route.maxMgProKg, maxMgAbsolut: route.maxMgAbsolut });
      const vol = computeVolume({ mg: dose.mg, mgPerMl: prep.mgPerMl, maxMg: dose.maxMg });
      const items = sechsRItems({ saaEntry, ind, route, prep, patient: w.patient, mgEffektiv: fmt(vol.mgEffektiv), ml: fmt(vol.ml) });
      return { g, gi, saaEntry, ind, route, prep, dose, vol, items };
    });

    if (w.step === 7) {
      const all = berechnet.every((b) => b.items.every((_, i) => b.g.sechsR[i]));
      body = (
        <div className="flex flex-col gap-8">
          {berechnet.map((b) => (
            <section key={b.g.medId}>
              {w.gaben.length > 1 ? (
                <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-accent mb-3">{b.saaEntry?.name}</div>
              ) : null}
              <Step7SechsR
                items={b.items}
                sechsR={b.g.sechsR}
                onToggle={(i) => patchWizard({
                  gaben: getWizard().gaben.map((x, idx) => (idx === b.gi ? { ...x, sechsR: { ...x.sechsR, [i]: !x.sechsR[i] } } : x)),
                })}
              />
            </section>
          ))}
        </div>
      );
      footer = (
        <Button size="lg" className="w-full" disabled={!all}
          onClick={() => patchWizard({ step: 8, freigabeZeit: new Date().toISOString() })}>
          {w.gaben.length > 1 ? `${w.gaben.length * 6}× Ja — Freigabe zur Durchführung` : "6× Ja — Freigabe zur Durchführung"}
        </Button>
      );
    } else {
      const zeit = w.freigabeZeit ? new Date(w.freigabeZeit).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "—";
      const zusammenfassung = [
        ["Patient", `${w.patient.geschlecht || "?"} · ${w.patient.alter} ${w.patient.alterEinheit === "monate" ? "Monate" : "Jahre"} · ${w.patient.kg} kg`],
        ...berechnet.flatMap((b) => [
          [b.saaEntry?.name || b.g.medId, `${fmt(b.vol.mgEffektiv)} mg = ${fmt(b.vol.ml)} ml ${b.route.weg} (${b.prep.ampulle})`],
          ["· Indikation", b.ind.label],
          ["· Lösung", b.prep.ergebnis],
          ["· Repetition", (b.dose?.stufe?.repetition ?? b.route.repetition) || "—"],
        ]),
        ["6-R bestätigt", `${zeit} Uhr`],
        ["UAW beachten", [...new Set(berechnet.flatMap((b) => b.saaEntry?.uaw || []))].join(", ")],
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
