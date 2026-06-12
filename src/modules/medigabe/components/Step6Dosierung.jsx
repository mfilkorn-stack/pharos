// src/modules/medigabe/components/Step6Dosierung.jsx
import { useEffect } from "react";
import { computeDose, computeVolume, fmt, alterInJahren } from "../lib/dose.js";
import { SegPick } from "./bits.jsx";
import Badge from "../../lexikon/components/ui/Badge.jsx";
import { AlertTriangleIcon, DropletIcon } from "../../lexikon/components/ui/icons.jsx";

export default function Step6Dosierung({ ind, cave, patient, dosier, onPatch }) {
  const route = dosier.weg != null ? ind.routen[dosier.weg] : null;
  const prep = route && dosier.prep != null ? route.preps[dosier.prep] : null;
  const kg = Number(patient.kg);
  const alterJahre = alterInJahren(patient);
  const eingabenOk = Number.isFinite(kg) && kg > 0 && alterJahre != null;
  const einheit = route?.einheit || "mg";
  // Routen-Altersgrenze (z. B. Dimenhydrinat i.v. erst ab 6 J — darunter rectal).
  const routeOk = (r) => r.minAlterMonate == null || (alterJahre != null && alterJahre * 12 >= r.minAlterMonate);
  const routeGesperrt = route ? !routeOk(route) : false;

  useEffect(() => {
    if (dosier.weg != null) return;
    const valid = ind.routen.map((r, i) => ({ r, i })).filter(({ r }) => routeOk(r));
    if (valid.length === 1) {
      const { r, i } = valid[0];
      onPatch({ weg: i, prep: r.preps.length === 1 ? 0 : null });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ind.routen.map((r) => r.weg).join(","), alterJahre]);

  let dose = null, vol = null;
  if (route && prep && eingabenOk && !routeGesperrt) {
    dose = computeDose({ dosis: route.dosis, kg, alterJahre, maxMgProKg: route.maxMgProKg, maxMgAbsolut: route.maxMgAbsolut, einheit });
    // mgPerMl null = Darreichung ohne ml-Rechnung (Tablette, Hub, Inhalation).
    vol = prep.mgPerMl != null ? computeVolume({ mg: dose.mg, mgPerMl: prep.mgPerMl, maxMg: dose.maxMg, einheit }) : null;
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-xs text-text-muted mb-2">Applikationsweg</div>
        <SegPick
          options={ind.routen.map((r, i) => ({ value: i, label: r.weg, disabled: !routeOk(r) }))}
          value={dosier.weg}
          onChange={(weg) => onPatch({ weg, prep: ind.routen[weg].preps.length === 1 ? 0 : null })}
        />
        {ind.routen.filter((r) => !routeOk(r) && r.minAlterHinweis).map((r, i) => (
          <p key={i} className="text-xs text-warning mt-2">{r.weg}: {r.minAlterHinweis}</p>
        ))}
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

      {route && dosier.prep == null ? (
        <div className="border-2 border-dashed border-accent/40 rounded-xl bg-accent/5 p-4 text-center">
          <p className="text-sm font-medium text-accent">Ampulle wählen, um die Dosis zu berechnen.</p>
        </div>
      ) : null}

      {route && routeGesperrt ? (
        <p className="text-sm text-critical">{route.minAlterHinweis || "Dieser Applikationsweg ist für das Patientenalter nicht zugelassen."} — anderen Weg wählen.</p>
      ) : null}

      {route && prep && !eingabenOk && !routeGesperrt ? (
        <p className="text-sm text-critical">Patientendaten unvollständig — zurück zu Schritt 3.</p>
      ) : null}

      {route && prep && dose ? (
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
              <span className="text-3xl font-bold text-text-primary leading-none">{fmt(vol ? vol.mgEffektiv : dose.mg)}</span>
              <span className="text-base text-text-secondary">{einheit}</span>
              {dose.gekappt ? <Badge variant="warning" size="sm">gekappt</Badge> : null}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <DropletIcon className="h-5 w-5 text-accent" />
              {vol ? (
                <>
                  <span className="text-lg font-semibold text-accent">{fmt(vol.ml)} ml</span>
                  <span className="text-xs text-text-muted">aus {prep.ergebnis} aufziehen</span>
                </>
              ) : (
                <span className="text-sm font-semibold text-accent">{prep.ergebnis}</span>
              )}
            </div>
          </div>

          <div className="border border-border bg-bg-secondary rounded-lg p-3 font-mono text-xs leading-relaxed text-text-secondary">
            {[...dose.schritte, ...(vol ? vol.schritte : [])].map((s, i) => (<div key={i}>{s}</div>))}
          </div>

          {(() => { const repetition = dose?.stufe?.repetition ?? route.repetition; return repetition ? <p className="text-xs text-text-secondary"><span className="font-semibold">Repetition:</span> {repetition}</p> : null; })()}
          {dose?.stufe?.hinweis ? <p className="text-xs text-warning">{dose.stufe.hinweis}</p> : null}
          {route.hinweise?.map((h, i) => (<p key={i} className="text-xs text-text-secondary">• {h}</p>))}
        </>
      ) : null}
    </div>
  );
}
