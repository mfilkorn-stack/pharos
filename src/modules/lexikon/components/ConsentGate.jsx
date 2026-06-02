import { useState } from "react";
import { config } from "../config.js";
import { accept } from "../lib/consent.js";
import { PharosLogo, CheckIcon } from "./ui/icons.jsx";
import Button from "./ui/Button.jsx";

export const CONSENT_TEXT = `
Diese App ist ein generisches fachliches Nachschlagewerk zu Arzneistoffen für Rettungsfachpersonal zu Aus- und Fortbildungszwecken. Sie ist kein Medizinprodukt und keine Grundlage für Entscheidungen am Patienten.
Ich gebe keine patientenbezogenen Daten ein (Namen, Geburtsdaten, Befunde, Fotos).
Ich nutze die App nur zum Nachschlagen allgemeiner Wirkstoffinformationen.
Mir ist bewusst, dass die Inhalte allgemeiner Natur sind und keine fachliche Beurteilung im Einzelfall ersetzen.
`.trim();

const REQUIREMENTS = [
  "Kein Medizinprodukt — keine patientenbezogene Entscheidungsgrundlage",
  "Keine patientenbezogenen Daten eingeben (Namen, Geburtsdaten, Befunde, Fotos)",
  "Nur zur allgemeinen Wirkstoffinformation für Rettungsfachpersonal",
  "Inhalte sind allgemeiner Natur — kein Ersatz für fachliche Beurteilung",
];

export default function ConsentGate({ onAccept }) {
  const [denied, setDenied] = useState(false);

  if (denied) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-card-hover/40 border border-border rounded-2xl p-8 sm:p-10 text-center">
          <span className="font-mono text-xs tracking-[0.14em] uppercase text-critical">Gesperrt</span>
          <p className="mt-4 text-text-secondary text-sm leading-relaxed">
            Ohne Zustimmung zur Nutzungsvereinbarung ist die App nicht nutzbar.
          </p>
          <Button variant="ghost" size="md" onClick={() => setDenied(false)} className="mt-6">
            Zurück
          </Button>
        </div>
      </div>
    );
  }

  const handleAccept = async () => {
    await accept(config.consentVersion, CONSENT_TEXT);
    onAccept();
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-card-hover/40 border border-border rounded-2xl p-8 sm:p-10">
        {/* Header */}
        <div className="flex flex-col items-start gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-accent to-info flex items-center justify-center">
              <PharosLogo className="h-6 w-6 text-bg-primary" />
            </div>
            <div>
              <div className="text-lg font-bold text-text-primary tracking-tight leading-none">Pharos</div>
              <div className="text-[11px] text-text-muted mt-1">Wirkstoff-Lexikon für den Einsatz</div>
            </div>
          </div>
          <div className="mt-2">
            <h1 className="text-xl font-bold text-text-primary tracking-tight">Nutzungsvereinbarung</h1>
            <p className="text-xs text-text-muted font-mono mt-1">v{config.consentVersion}</p>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">
            Pharos ist ein generisches Nachschlagewerk für Rettungsfachpersonal — kein Medizinprodukt.
          </p>
        </div>

        {/* Requirements */}
        <ul className="flex flex-col gap-3 mb-8">
          {REQUIREMENTS.map((req, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 h-5 w-5 rounded-full bg-success/10 border border-success/30 inline-flex items-center justify-center mt-0.5">
                <CheckIcon className="h-3 w-3 text-success" />
              </span>
              <span className="text-sm text-text-secondary leading-relaxed">{req}</span>
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="ghost" size="md" onClick={() => setDenied(true)} className="sm:flex-1">
            Ablehnen
          </Button>
          <Button variant="primary" size="md" onClick={handleAccept} className="sm:flex-[2]">
            Verstanden und einverstanden
          </Button>
        </div>
      </div>
    </div>
  );
}
