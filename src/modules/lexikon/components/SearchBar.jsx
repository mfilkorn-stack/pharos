import { useEffect, useRef, useState } from "react";
import { SearchIcon, XIcon, MicIcon } from "./ui/icons.jsx";
import { isSpeechSupported, startDictation } from "../lib/speech.js";

const ERROR_MESSAGES = {
  "not-allowed": "Mikrofon-Zugriff verweigert. Browser-Einstellungen und macOS Systemeinstellungen → Datenschutz → Mikrofon prüfen.",
  "service-not-allowed": "Spracherkennungs-Dienst blockiert. Browser-Einstellungen prüfen.",
  "no-speech": "Nichts gehört. Erneut versuchen.",
  "audio-capture": "Kein Mikrofon gefunden.",
  "network": "Netzwerk-Fehler. Spracherkennung braucht Internet.",
  "aborted": null, // Nutzer hat gestoppt, kein Fehler
};

export default function SearchBar({ value, onChange, hint }) {
  const stopRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [supported] = useState(() => isSpeechSupported());
  const [error, setError] = useState("");

  // Aufräumen, falls Komponente während Diktat unmountet
  useEffect(() => () => { if (stopRef.current) stopRef.current(); }, []);

  // Error nach 5 Sekunden automatisch ausblenden
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 5000);
    return () => clearTimeout(t);
  }, [error]);

  const toggleDictation = () => {
    if (listening) {
      if (stopRef.current) stopRef.current();
      stopRef.current = null;
      setListening(false);
      return;
    }
    setError("");
    setListening(true);
    stopRef.current = startDictation({
      lang: "de-DE",
      onInterim: (t) => onChange(t),
      onFinal: (t) => onChange(t),
      onEnd: () => { setListening(false); stopRef.current = null; },
      onError: (err) => {
        const code = err?.message || String(err);
        const msg = ERROR_MESSAGES[code];
        console.warn("[dictation]", code, err);
        if (msg) setError(msg);
        else if (msg !== null) setError(`Spracherkennung fehlgeschlagen: ${code}`);
        setListening(false);
        stopRef.current = null;
      },
    });
  };

  const showClear = Boolean(value);
  const showMic = supported;
  const showHint = hint && !value && !listening;

  return (
    <div className="space-y-2">
    <div className="relative flex items-center">
      <span className="absolute left-4 text-text-muted pointer-events-none flex items-center">
        <SearchIcon className="h-5 w-5" />
      </span>
      <input
        type="text"
        inputMode="search"
        placeholder={listening ? "Sprechen … (klick auf Mikrofon zum Stoppen)" : "Suche Wirkstoff oder Handelsname…"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus
        className="w-full h-12 bg-card border border-border rounded-xl pl-12 pr-28 text-base text-text-primary placeholder:text-text-muted outline-none transition-colors duration-150 focus:border-accent/50 focus:bg-card-hover"
      />

      <div className="absolute right-2 flex items-center gap-1">
        {showClear ? (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Suche löschen"
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-card-hover transition-colors"
          >
            <XIcon className="h-4 w-4" />
          </button>
        ) : null}

        {showMic ? (
          <button
            type="button"
            onClick={toggleDictation}
            aria-label={listening ? "Diktat stoppen" : "Per Stimme suchen"}
            title={listening ? "Diktat stoppen" : "Per Stimme suchen (DE)"}
            className={`h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors ${
              listening
                ? "bg-critical/15 text-critical animate-pulse"
                : "text-text-muted hover:text-accent hover:bg-card-hover"
            }`}
          >
            <MicIcon className="h-4 w-4" />
          </button>
        ) : null}

        {showHint ? (
          <kbd className="hidden sm:inline-flex items-center h-6 px-1.5 ml-1 rounded-md bg-bg-secondary border border-border text-[10px] font-mono text-text-muted pointer-events-none">
            {hint}
          </kbd>
        ) : null}
      </div>
    </div>
    {error ? (
      <div className="text-xs text-critical px-1 leading-relaxed">{error}</div>
    ) : null}
    </div>
  );
}
