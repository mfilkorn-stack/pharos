// src/modules/medigabe/components/Step6Dosierung.jsx
import { computeDose, computeVolume, fmt } from "../lib/dose.js";
import { SegPick } from "./bits.jsx";
import Badge from "../../lexikon/components/ui/Badge.jsx";
import { AlertTriangleIcon, DropletIcon } from "../../lexikon/components/ui/icons.jsx";

export default function Step6Dosierung({ ind, cave, patient, dosier, onPatch }) {
  const route = dosier.weg != null ? ind.routen[dosier.weg] : null;
  const prep = route && dosier.prep != null ? route.preps[dosier.prep] : null;
  const kg = Number(patient.kg);
  const alterJahre = patient.alterEinheit === "monate" ? Number(patient.alter) / 12 : Number(patient.alter);
  const eingabenOk = Number.isFinite(kg) && kg > 0 && Number.isFinite(alterJahre);

  let dose = null, vol = null;
  if (route && prep && eingabenOk) {
    dose = computeDose({ dosis: route.dosis, kg, alterJahre, maxMgProKg: route.maxMgProKg, maxMgAbsolut: route.maxMgAbsolut });
    vol = computeVolume({ mg: dose.mg, mgPerMl: prep.mgPerMl, maxMg: dose.maxMg });
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-xs text-text-muted mb-2">Applikationsweg</div>
        <SegPick
          options={ind.routen.map((r, i) => ({ value: i, label: r.weg }))}
          value={dosier.weg}
          onChange={(weg) => onPatch({ weg, prep: ind.routen[weg].preps.length === 1 ? 0 : null })}
        />
      </div>

      {route ? (
        <div>
          <div className="text-xs text-text-muted mb-2">Ampulle / Konzentration</div>
          <div className="flex flex-col gap-2">
            {route.preps.map((p, i) => (
              <button
                key={i} type="button" onClick={() => onPatch({ prep: i })} aria-pressed={dosier.prep === i}
                className={`min-h-[56px] px-3 py-2.5 rounded-lg border text-left transition-colors ${
                  dosier.prep === i ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"
                }`}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-text-primary">{p.ampulle}</span>
                  {p.quelle === "praxis" ? <Badge variant="info" size="sm">Praxis-Schema</Badge> : null}
                </div>
                <div className="text-xs text-text-secondary mt-0.5">
                  {p.zugabe ? `+ ${p.zugabe} → ` : ""}{p.ergebnis}
                </div>
              </button>
            ))}
          </div>
          {/* Cave direkt bei der Ampullen-Wahl — Verwechslungswarnungen müssen VOR dem Griff zur Ampulle sichtbar sein. */}
          {cave?.length ? (
            <div className="mt-2 border border-warning/40 bg-warning/5 rounded-lg p-3 flex flex-col gap-1.5">
              {cave.map((c, i) => (
                <div key={i} className="flex items-start gap-2">
                  <AlertTriangleIcon className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-text-primary leading-snug">{c}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {route && prep && !eingabenOk ? (
        <p className="text-sm text-critical">Patientendaten unvollständig — zurück zu Schritt 3.</p>
      ) : null}

      {route && prep && dose && vol ? (
        <>
          {prep.zugabe ? (
            <div className="border border-border bg-card rounded-lg p-3">
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-text-muted mb-1.5">Vorbereitung</div>
              <p className="text-sm text-text-primary leading-relaxed">
                {prep.ampulle} <span className="text-text-muted">+</span> {prep.zugabe} <span className="text-text-muted">→</span>{" "}
                <span className="font-semibold">{prep.ergebnis}</span>
              </p>
            </div>
          ) : null}

          <div className="border-2 border-accent rounded-xl bg-card p-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-text-primary leading-none">{fmt(vol.mgEffektiv)}</span>
              <span className="text-base text-text-secondary">mg</span>
              {dose.gekappt ? <Badge variant="warning" size="sm">gekappt</Badge> : null}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <DropletIcon className="h-5 w-5 text-accent" />
              <span className="text-lg font-semibold text-accent">{fmt(vol.ml)} ml</span>
              <span className="text-xs text-text-muted">aus {prep.ergebnis} aufziehen</span>
            </div>
          </div>

          <div className="border border-border bg-bg-secondary rounded-lg p-3 font-mono text-xs leading-relaxed text-text-secondary">
            {[...dose.schritte, ...vol.schritte].map((s, i) => (<div key={i}>{s}</div>))}
          </div>

          {(() => { const repetition = dose?.stufe?.repetition ?? route.repetition; return repetition ? <p className="text-xs text-text-secondary"><span className="font-semibold">Repetition:</span> {repetition}</p> : null; })()}
          {dose?.stufe?.hinweis ? <p className="text-xs text-warning">{dose.stufe.hinweis}</p> : null}
          {route.hinweise?.map((h, i) => (<p key={i} className="text-xs text-text-secondary">• {h}</p>))}
        </>
      ) : null}
    </div>
  );
}
