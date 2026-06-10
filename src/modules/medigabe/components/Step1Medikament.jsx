// src/modules/medigabe/components/Step1Medikament.jsx
import { useMemo, useState } from "react";
import saa from "../../lexikon/data/saa.json";
import dosing from "../data/dosing.json";
import Badge from "../../lexikon/components/ui/Badge.jsx";

// Medikament wählbar = Dosis-Datensatz vorhanden UND alle Preps freigegeben.
const READY = new Set(
  dosing.entries
    .filter((e) => e.indikationen.every((i) => i.routen.every((r) => r.preps.every((p) => p.freigegeben))))
    .map((e) => e.id)
);

export default function Step1Medikament({ value, onPick }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const all = [...saa.entries].sort((a, b) => Number(READY.has(b.id)) - Number(READY.has(a.id)) || a.name.localeCompare(b.name));
    return t ? all.filter((e) => e.name.toLowerCase().includes(t)) : all;
  }, [q]);

  return (
    <div>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Medikament suchen …"
        autoComplete="off"
        className="w-full h-12 px-4 mb-4 bg-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {list.map((e) => {
          const ready = READY.has(e.id);
          const active = value === e.id;
          return (
            <button
              key={e.id}
              type="button"
              disabled={!ready}
              onClick={() => onPick(e.id)}
              className={`min-h-[56px] px-3 py-2.5 rounded-lg border text-left transition-colors ${
                active ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-card-hover"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-text-primary">{e.name}</span>
                {!ready ? <Badge variant="neutral" size="sm">folgt</Badge> : null}
              </div>
              <div className="text-xs text-text-muted mt-0.5 truncate">{e.gruppe}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
