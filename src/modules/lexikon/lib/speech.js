// Speech-Recognition Helper. Verwendet die native Web Speech API (Chrome, Safari, Edge).
// Firefox unterstützt das aktuell nicht — `isSupported()` deckt das ab.

export function isSpeechSupported() {
  return typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

// Startet eine Diktier-Session. Ruft `onInterim(text)` während des Sprechens
// und `onFinal(text)` mit dem End-Ergebnis. Gibt eine `stop()`-Funktion zurück.
export function startDictation({ lang = "de-DE", onInterim, onFinal, onEnd, onError }) {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) {
    onError && onError(new Error("SpeechRecognition nicht verfügbar"));
    return () => {};
  }
  const rec = new Ctor();
  rec.lang = lang;
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;

  let finalText = "";
  rec.onresult = (ev) => {
    let interim = "";
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const r = ev.results[i];
      if (r.isFinal) finalText += r[0].transcript;
      else interim += r[0].transcript;
    }
    if (interim && onInterim) onInterim(interim.trim());
    if (finalText && onFinal) onFinal(finalText.trim());
  };
  rec.onerror = (ev) => {
    onError && onError(new Error(ev.error || "unknown speech error"));
  };
  rec.onend = () => {
    onEnd && onEnd(finalText.trim());
  };

  try { rec.start(); } catch (e) { onError && onError(e); }

  return () => {
    try { rec.stop(); } catch { /* noop */ }
  };
}
