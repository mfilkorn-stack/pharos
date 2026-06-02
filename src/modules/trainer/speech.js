// Speech-Recognition Helper. Verwendet die native Web Speech API (Chrome, Safari, Edge).
// Firefox unterstützt das aktuell nicht — `isSpeechSupported()` deckt das ab.
// Angepasst fuer Langtext-Diktat: continuous=true, neuer Text wird an `baseText`
// angehaengt (nicht ueberschrieben), damit Sprechpausen den Verlauf nicht loeschen.

export function isSpeechSupported() {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
}

// Startet eine Diktier-Session.
// - baseText: bereits im Feld stehender Text, an den angehaengt wird.
// - onUpdate(text): waehrend des Sprechens (baseText + Finals + Interim).
// - onEnd(): Session beendet (manuell oder durch Stille).
// - onError(err): Fehler (err.message enthaelt den Speech-Error-Code).
// Gibt eine `stop()`-Funktion zurueck.
export function startDictation({ lang = 'de-DE', baseText = '', onUpdate, onEnd, onError }) {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) {
    onError && onError(new Error('SpeechRecognition nicht verfügbar'));
    return () => {};
  }
  const rec = new Ctor();
  rec.lang = lang;
  rec.interimResults = true;
  rec.continuous = true;
  rec.maxAlternatives = 1;

  const base = baseText && !baseText.endsWith(' ') ? baseText + ' ' : baseText;
  let sessionFinal = '';
  let stopped = false;

  rec.onresult = (ev) => {
    let interim = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const r = ev.results[i];
      if (r.isFinal) sessionFinal += r[0].transcript;
      else interim += r[0].transcript;
    }
    if (onUpdate) onUpdate((base + sessionFinal + interim).trimStart());
  };

  rec.onerror = (ev) => {
    onError && onError(new Error(ev.error || 'unknown speech error'));
  };

  rec.onend = () => {
    // Chrome beendet bei Stille von selbst. Solange der Nutzer nicht
    // gestoppt hat, neu starten, damit langes Diktat durchlaeuft.
    if (!stopped) {
      try {
        rec.start();
        return;
      } catch {
        /* fall through to onEnd */
      }
    }
    onEnd && onEnd((base + sessionFinal).trimStart());
  };

  try {
    rec.start();
  } catch (e) {
    onError && onError(e);
  }

  return () => {
    stopped = true;
    try {
      rec.stop();
    } catch {
      /* noop */
    }
  };
}
