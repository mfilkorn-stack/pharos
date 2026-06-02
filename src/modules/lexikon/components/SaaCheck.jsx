import { useMemo, useState, useEffect } from "react";
import saaData from "../data/saa.json";
import SlideOver from "./ui/SlideOver.jsx";
import Button from "./ui/Button.jsx";
import Badge from "./ui/Badge.jsx";
import { MedicalCrossIcon, CheckCircleIcon } from "./ui/icons.jsx";
import { aggregateCheck, sortBySeverity, summarize, triggerMatrixCompute } from "../lib/saaCheck.js";

const LEVEL = {
  absolut: { variant: "critical", label: "Absolute Kontraindikation", bar: "bg-critical" },
  vorsicht: { variant: "warning", label: "Vorsicht", bar: "bg-warning" },
};
const NAME_BY_ID = Object.fromEntries(saaData.entries.map((e) => [e.id, e.name]));

// matrix = { [normKey(name)]: { flags:[{saaId,level,reason}] } } (committet + Runtime, gemerged).
export default function SaaCheck({ patientMeds, matrix }) {
  const meds = (patientMeds || []).filter(Boolean);
  const medKey = meds.join("|");
  const [open, setOpen] = useState(false);

  const check = useMemo(() => aggregateCheck(meds, matrix, saaData.entries), [medKey, matrix]);

  // Fehlende Medis im Hintergrund nachberechnen lassen (für „nächstes Mal").
  useEffect(() => {
    if (check.pending.length) triggerMatrixCompute(check.pending);
  }, [check.pending.join("|")]);

  if (!meds.length) return null;

  const sorted = sortBySeverity(check.results);
  const flagged = sorted.filter((r) => r.level !== "ok");
  const sum = summarize(check.results);

  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      <Button variant="primary" size="md" onClick={() => setOpen(true)}>
        <MedicalCrossIcon className="h-4 w-4" />
        SAA-Check
      </Button>

      {/* Ergebnis-Zusammenfassung direkt neben dem Button (klickbar → Details) */}
      <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-1.5 cursor-pointer">
        {sum.absolut ? <Badge variant="critical" size="sm">{sum.absolut} absolut</Badge> : null}
        {sum.vorsicht ? <Badge variant="warning" size="sm">{sum.vorsicht} Vorsicht</Badge> : null}
        {!sum.total ? (
          <span className="inline-flex items-center gap-1 text-success text-sm">
            <CheckCircleIcon className="h-4 w-4" /> unkritisch
          </span>
        ) : null}
      </button>

      {check.pending.length ? (
        <span className="text-xs text-text-muted">{check.pending.length} wird geprüft …</span>
      ) : null}

      <SlideOver open={open} onClose={() => setOpen(false)} title="SAA-Check · Kontraindikationen">
        <div className="space-y-5">
          <div>
            <div className="font-mono text-[10px] tracking-wider uppercase text-text-muted mb-2">Patienten-Medikamente</div>
            <div className="flex flex-wrap gap-1.5">
              {meds.map((m, i) => (
                <span key={i} className="text-xs text-text-secondary bg-bg-secondary border border-border rounded-md px-2 py-1">{m}</span>
              ))}
            </div>
          </div>

          {flagged.length ? (
            <div className="space-y-2.5">
              {flagged.map((r) => {
                const lv = LEVEL[r.level] || LEVEL.vorsicht;
                return (
                  <div key={r.id} className="flex gap-3 p-3 border border-border bg-card rounded-lg">
                    <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${lv.bar}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-text-primary">{NAME_BY_ID[r.id] || r.id}</span>
                        <Badge variant={lv.variant} size="sm">{lv.label}</Badge>
                      </div>
                      {r.reason ? <p className="text-sm text-text-secondary leading-relaxed">{r.reason}</p> : null}
                      {r.triggers?.length ? <p className="text-xs text-text-muted mt-1">Auslöser: {r.triggers.join(", ")}</p> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2 border border-success/30 bg-success/5 px-3 py-3 rounded-lg">
              <CheckCircleIcon className="h-5 w-5 text-success flex-shrink-0" />
              <span className="text-sm text-text-primary">Keine Kontraindikationen gegen die SAA-Medikamente gefunden.</span>
            </div>
          )}

          {check.pending.length ? (
            <p className="text-xs text-text-muted">
              {check.pending.length} Medikament(e) noch nicht in der Matrix — vorläufig nur Text-Treffer; vollständige Prüfung läuft im Hintergrund.
            </p>
          ) : null}

          <p className="text-xs text-text-muted border-t border-border pt-3">
            Entscheidungsunterstützung — kein Ersatz für ärztliche Anordnung / gültige SAA-Freigabe.
          </p>
        </div>
      </SlideOver>
    </div>
  );
}
