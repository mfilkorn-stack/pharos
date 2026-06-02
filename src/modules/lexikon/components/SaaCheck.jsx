import { useState } from "react";
import saaData from "../data/saa.json";
import SlideOver from "./ui/SlideOver.jsx";
import Button from "./ui/Button.jsx";
import Badge from "./ui/Badge.jsx";
import { MedicalCrossIcon, AlertTriangleIcon, CheckCircleIcon, WifiIcon } from "./ui/icons.jsx";
import { runSaaCheck, sortBySeverity } from "../lib/saaCheck.js";

const LEVEL = {
  absolut: { variant: "critical", label: "Absolute Kontraindikation", bar: "bg-critical" },
  vorsicht: { variant: "warning", label: "Vorsicht", bar: "bg-warning" },
  ok: { variant: "success", label: "Unkritisch", bar: "bg-success" },
};

const NAME_BY_ID = Object.fromEntries(saaData.entries.map((e) => [e.id, e.name]));

export default function SaaCheck({ patientMeds }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null); // { online, results, error }

  const meds = (patientMeds || []).filter(Boolean);
  if (!meds.length) return null;

  const run = async () => {
    setOpen(true);
    setLoading(true);
    setData(null);
    const r = await runSaaCheck(meds, saaData.entries);
    setData(r);
    setLoading(false);
  };

  const results = data ? sortBySeverity(data.results) : [];
  const flagged = results.filter((r) => r.level !== "ok");
  const okCount = data?.online ? results.length - flagged.length : null;

  return (
    <>
      <Button variant="primary" size="md" onClick={run} className="w-full sm:w-auto">
        <MedicalCrossIcon className="h-4 w-4" />
        SAA-Check gegen {meds.length} Patienten-{meds.length === 1 ? "Medikament" : "Medikamente"}
      </Button>

      <SlideOver open={open} onClose={() => setOpen(false)} title="SAA-Check · Kontraindikationen">
        <div className="space-y-5">
          {/* Patienten-Medis */}
          <div>
            <div className="font-mono text-[10px] tracking-wider uppercase text-text-muted mb-2">Patienten-Medikamente</div>
            <div className="flex flex-wrap gap-1.5">
              {meds.map((m, i) => (
                <span key={i} className="text-xs text-text-secondary bg-bg-secondary border border-border rounded-md px-2 py-1">{m}</span>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-warning text-sm font-mono py-6">
              <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
              Prüfe SAA-Medikamente …
            </div>
          ) : data ? (
            <>
              {!data.online ? (
                <div className="flex items-start gap-2 border border-warning/30 bg-warning/5 px-3 py-2.5 rounded-lg">
                  <WifiIcon className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-warning/90 leading-relaxed">
                    Offline — nur deterministische Text-Treffer. Die vollständige Interaktionsprüfung (KI) benötigt Internet.
                  </span>
                </div>
              ) : null}
              {data.error ? (
                <div className="text-xs text-critical border border-critical/30 bg-critical/10 p-2.5 rounded-lg">
                  KI-Prüfung fehlgeschlagen ({data.error}) — es werden nur Text-Treffer angezeigt.
                </div>
              ) : null}

              {flagged.length ? (
                <div className="space-y-2.5">
                  {flagged.map((r) => {
                    const lv = LEVEL[r.level] || LEVEL.ok;
                    return (
                      <div key={r.id} className="flex gap-3 p-3 border border-border bg-card rounded-lg">
                        <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${lv.bar}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap mb-1">
                            <span className="text-sm font-semibold text-text-primary">{NAME_BY_ID[r.id] || r.id}</span>
                            <Badge variant={lv.variant} size="sm">{lv.label}</Badge>
                          </div>
                          {r.reason ? <p className="text-sm text-text-secondary leading-relaxed">{r.reason}</p> : null}
                          {r.triggers?.length ? (
                            <p className="text-xs text-text-muted mt-1">Auslöser: {r.triggers.join(", ")}</p>
                          ) : null}
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

              {okCount != null && flagged.length ? (
                <p className="text-xs text-text-muted">{okCount} weitere SAA-Medikamente unkritisch.</p>
              ) : null}

              <p className="text-xs text-text-muted border-t border-border pt-3">
                Entscheidungsunterstützung — kein Ersatz für ärztliche Anordnung / gültige SAA-Freigabe.
                {data.online ? "" : " Offline-Ergebnis unvollständig."}
              </p>
            </>
          ) : null}
        </div>
      </SlideOver>
    </>
  );
}
