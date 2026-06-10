// src/modules/medigabe/components/Step5Aufklaerung.jsx
import { CheckRow, SegPick } from "./bits.jsx";

export const AUFKL_ITEMS = [
  "Grund der Maßnahme erklärt",
  "Eigene Qualifikation genannt",
  "Erwarteter Nutzen und mögliche Risiken erläutert",
  "Alternativen genannt",
  "Nachteile einer Ablehnung erläutert",
  "Für den Patienten verständlich erklärt",
];

export default function Step5Aufklaerung({ aufkl, onPatch, onToggleItem }) {
  return (
    <div className="flex flex-col gap-5">
      <section>
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-text-muted mb-2">Situationsgerechte Aufklärung (BPR S. 14)</div>
        <div className="flex flex-col gap-2">
          {AUFKL_ITEMS.map((text, i) => (
            <CheckRow key={i} checked={!!aufkl.items[i]} onToggle={() => onToggleItem(i)}>
              {text}
            </CheckRow>
          ))}
        </div>
      </section>

      <section>
        <div className="text-xs text-text-muted mb-2">Einwilligungsfähigkeit vorhanden?</div>
        <SegPick
          options={[{ value: "ja", label: "Ja" }, { value: "nein", label: "Nein" }, { value: "unklar", label: "Unklar" }]}
          value={aufkl.faehig}
          onChange={(faehig) => onPatch({ faehig, einwilligung: null, mutmasslich: false })}
        />
      </section>

      {aufkl.faehig === "ja" ? (
        <section>
          <div className="text-xs text-text-muted mb-2">Einwilligung in die Maßnahme?</div>
          <SegPick
            options={[{ value: "ja", label: "Erteilt" }, { value: "nein", label: "Verweigert" }]}
            value={aufkl.einwilligung}
            onChange={(einwilligung) => onPatch({ einwilligung })}
          />
          {aufkl.einwilligung === "nein" ? (
            <div className="mt-3 border border-critical/40 bg-critical/10 rounded-lg p-3 text-sm">
              <span className="font-semibold text-critical">Ablehnung akzeptieren.</span>{" "}
              <span className="text-text-secondary">Weiter nach BPR „Behandlungs-/Transportverweigerung" (Formblatt, Zeugen, Doku) — keine Gabe.</span>
            </div>
          ) : null}
        </section>
      ) : null}

      {aufkl.faehig === "nein" || aufkl.faehig === "unklar" ? (
        <section className="border border-warning/40 bg-warning/5 rounded-lg p-3">
          <p className="text-sm text-text-secondary mb-2">
            Versorgung nach mutmaßlichem Patientenwillen gemäß SAA/BPR. NA / TNA hinzuziehen. Umfang und Gründe dokumentieren.
          </p>
          <CheckRow tone="warning" checked={aufkl.mutmasslich} onToggle={() => onPatch({ mutmasslich: !aufkl.mutmasslich })}>
            Nach mutmaßlichem Willen — NA/TNA-Kontakt veranlasst
          </CheckRow>
        </section>
      ) : null}
    </div>
  );
}
