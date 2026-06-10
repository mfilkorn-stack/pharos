// src/modules/medigabe/components/Step8Doku.jsx
import { CheckRow } from "./bits.jsx";
import Button from "../../lexikon/components/ui/Button.jsx";

const DURCHF = [
  { key: "divi", text: "Spritze eindeutig gekennzeichnet (DIVI-ISO-Aufkleber)" },
  { key: "augen", text: "Doppelkontrolle / 4-Augen-Prinzip durchgeführt" },
  { key: "komm", text: "Anordnung mündlich wiederholt (gesicherte Kommunikation)" },
];

export default function Step8Doku({ zusammenfassung, durchf, onToggle, onNeuerPatient }) {
  return (
    <div className="flex flex-col gap-5">
      <section>
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-text-muted mb-2">Vor der Gabe</div>
        <div className="flex flex-col gap-2">
          {DURCHF.map((d) => (
            <CheckRow key={d.key} checked={!!durchf[d.key]} onToggle={() => onToggle(d.key)}>{d.text}</CheckRow>
          ))}
        </div>
      </section>

      <section className="border border-border bg-card rounded-lg p-4">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-text-muted mb-2">Doku-Zusammenfassung</div>
        <dl className="text-sm leading-relaxed">
          {zusammenfassung.map(([k, v]) => (
            <div key={k} className="flex gap-3 py-0.5">
              <dt className="w-32 flex-shrink-0 text-text-muted text-xs pt-0.5">{k}</dt>
              <dd className="text-text-primary">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-[11px] text-text-muted mt-3">
          Ins Einsatzprotokoll übernehmen — inkl. Befunde, Aufklärung/Einwilligung, Wirkungskontrolle. Verlaufskontrolle: gewünschte Wirkung erreicht? Sonst Folgemaßnahmen/Repetition gemäß SAA.
        </p>
      </section>

      <Button variant="subtle" size="lg" className="w-full" onClick={onNeuerPatient}>
        Neuer Patient — alles zurücksetzen
      </Button>
    </div>
  );
}
