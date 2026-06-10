// src/modules/medigabe/components/Step4Kontra.jsx
import { useEffect } from "react";
import { normKey, triggerMatrixCompute } from "../../lexikon/lib/saaCheck.js";
import { kontraMatchIndex } from "../lib/ki.js";
import { JaNeinRow, CheckRow } from "./bits.jsx";
import Badge from "../../lexikon/components/ui/Badge.jsx";
import { AlertTriangleIcon, CheckCircleIcon } from "../../lexikon/components/ui/icons.jsx";

const FERTILE = (p) => {
  const j = p.alterEinheit === "monate" ? Number(p.alter) / 12 : Number(p.alter);
  return p.geschlecht === "w" && j >= 12 && j <= 55;
};

export default function Step4Kontra({ punkte, rows, kombi, patient, answers, onAnswer, onAnswerMany }) {
  const flagged = rows.filter((r) => r.level !== "ok");
  // „Unbekannt" ist nicht „unkritisch": Medis ohne Matrix-Eintrag eigene Kategorie.
  const unknown = rows.filter((r) => r.pending && r.level === "ok");
  const okCount = rows.length - flagged.length - unknown.length;
  const pending = rows.filter((r) => r.pending).map((r) => r.med);
  useEffect(() => { if (pending.length) triggerMatrixCompute(pending); }, [pending.join("|")]);

  // Offizielle absolut-KI-Punkte, die eine geflaggte Substanz namentlich nennen → hervorheben.
  const highlightKeys = new Set();
  flagged.forEach((r) => {
    const i = kontraMatchIndex(r.med, punkte.abs.map((p) => p.text));
    if (i >= 0) highlightKeys.add(punkte.abs[i].key);
  });
  const fertile = FERTILE(patient);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-critical">Absolut — liegt das vor?</div>
          <button
            type="button"
            onClick={() => onAnswerMany(Object.fromEntries(punkte.abs.map((p) => [p.key, "nein"])))}
            className="h-9 px-3 rounded-lg border border-success/40 bg-success/5 text-success text-xs font-medium hover:bg-success/10 transition-colors flex-shrink-0"
          >
            Keine liegt vor — alle „Nein"
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {punkte.abs.map((p) => (
            <JaNeinRow
              key={p.key}
              text={kombi ? (
                <span>
                  {p.text}
                  <span className="ml-2 inline-flex gap-1 align-middle">
                    {p.meds.map((m) => <Badge key={m} variant="neutral" size="sm">{m}</Badge>)}
                  </span>
                </span>
              ) : p.text}
              value={answers[p.key]}
              onChange={(v) => onAnswer(p.key, v)}
              highlight={highlightKeys.has(p.key) || (fertile && /schwanger/i.test(p.text))}
            />
          ))}
        </div>
        {fertile ? (
          <p className="text-xs text-warning mt-2">Patientin im gebärfähigen Alter — Schwangerschafts-Punkte besonders prüfen.</p>
        ) : null}
      </section>

      {punkte.rel.length ? (
        <section>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-warning">Relativ — liegt das vor?</div>
            <button
              type="button"
              onClick={() => onAnswerMany(Object.fromEntries(punkte.rel.map((p) => [p.key, "nein"])))}
              className="h-9 px-3 rounded-lg border border-success/40 bg-success/5 text-success text-xs font-medium hover:bg-success/10 transition-colors flex-shrink-0"
            >
              Keine liegt vor — alle „Nein"
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {punkte.rel.map((p) => (
              <JaNeinRow
                key={p.key}
                text={kombi ? (
                  <span>
                    {p.text}
                    <span className="ml-2 inline-flex gap-1 align-middle">
                      {p.meds.map((m) => <Badge key={m} variant="neutral" size="sm">{m}</Badge>)}
                    </span>
                  </span>
                ) : p.text}
                value={answers[p.key]}
                onChange={(v) => onAnswer(p.key, v)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-text-muted mb-2">
          Dauermedikation <span className="normal-case tracking-normal">· KI-gestützter Abgleich</span>
        </div>
        {patient.dauerStatus === "keine" ? (
          <div className="flex items-center gap-2 border border-border bg-card rounded-lg px-3 py-3">
            <CheckCircleIcon className="h-5 w-5 text-success flex-shrink-0" />
            <span className="text-sm text-text-secondary">Keine Dauermedikation angegeben.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {flagged.map((r) => (
              <div key={r.med} className={`border rounded-lg p-3 ${r.level === "absolut" ? "border-critical/50 bg-critical/5" : "border-warning/40 bg-warning/5"}`}>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <AlertTriangleIcon className={`h-4 w-4 ${r.level === "absolut" ? "text-critical" : "text-warning"}`} />
                  <span className="text-sm font-semibold text-text-primary">{r.med}</span>
                  <Badge variant={r.level === "absolut" ? "critical" : "warning"} size="sm">
                    {r.level === "absolut" ? "Absolute KI" : "Vorsicht"}
                  </Badge>
                  {r.pending ? <Badge variant="neutral" size="sm">vorläufig</Badge> : null}
                </div>
                {r.gruende.map((g2, j) => (
                  <p key={j} className="text-sm text-text-secondary leading-relaxed mb-1">
                    {kombi ? <span className="font-semibold">{g2.medName}: </span> : null}{g2.reason}
                  </p>
                ))}
                {r.level === "absolut" ? (
                  <p className="text-xs text-critical mb-2">→ Entspricht einem absoluten KI-Punkt oben — dort entscheiden.</p>
                ) : null}
                <CheckRow tone="warning" checked={!!answers[`m:${normKey(r.med)}`]} onToggle={() => onAnswer(`m:${normKey(r.med)}`, !answers[`m:${normKey(r.med)}`])}>
                  Zur Kenntnis genommen / abgewogen
                </CheckRow>
              </div>
            ))}
            {unknown.length ? (
              <div className="flex items-center gap-2 border border-warning/30 bg-card rounded-lg px-3 py-2.5">
                <AlertTriangleIcon className="h-4 w-4 text-warning flex-shrink-0" />
                <span className="text-xs text-text-secondary">
                  {unknown.map((r) => r.med).join(", ")}: KI-Abgleich ausstehend — eigenständig prüfen.
                </span>
                <Badge variant="neutral" size="sm">vorläufig</Badge>
              </div>
            ) : null}
            {okCount ? (
              <div className="flex items-center gap-2 border border-border bg-card rounded-lg px-3 py-2.5">
                <CheckCircleIcon className="h-4 w-4 text-success flex-shrink-0" />
                <span className="text-xs text-text-secondary">{okCount} Medikament(e) unkritisch gegenüber der Auswahl.</span>
              </div>
            ) : null}
            {!rows.length ? (
              <p className="text-xs text-text-muted">Liste leer — in Schritt 3 übernehmen oder „keine" bestätigen.</p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
