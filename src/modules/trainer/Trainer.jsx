import { useState, useEffect, useRef } from 'react';
import { SZENARIEN } from './data/szenarien';
import { SINNHAFT } from './data/sinnhaft';
import { isSpeechSupported, startDictation as startSpeech } from './speech';
import { uebergabeParse, uebergabeEvaluate } from '../../lib/kiClient';

const SPEECH_ERRORS = {
  'not-allowed': 'Mikrofon-Zugriff verweigert. Browser- und macOS-Systemeinstellungen → Datenschutz → Mikrofon prüfen.',
  'service-not-allowed': 'Spracherkennungs-Dienst blockiert. Browser-Einstellungen prüfen.',
  'no-speech': 'Nichts gehört. Erneut versuchen.',
  'audio-capture': 'Kein Mikrofon gefunden.',
  network: 'Netzwerk-Fehler. Spracherkennung braucht Internet.',
  aborted: null,
};

export default function Trainer() {
  const [view, setView] = useState('home');
  const [scenario, setScenario] = useState(null);
  const [inputs, setInputs] = useState({});
  const [startChecks, setStartChecks] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);
  const [elapsed, setElapsed] = useState(0);

  const [parsingState, setParsingState] = useState('idle'); // idle | parsing
  const [transcript, setTranscript] = useState('');
  const [parseError, setParseError] = useState(null);
  const [showDictHint, setShowDictHint] = useState(false);
  const [dictInstruction, setDictInstruction] = useState('');
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const stopSpeechRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const textareaRef = useRef(null);
  const [playingId, setPlayingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) {
      setDictInstruction('Tastatur öffnet sich → Mikrofon-Taste antippen und sprechen.');
    } else if (/Android/i.test(ua)) {
      setDictInstruction('Tastatur öffnet sich → Mikrofon-Taste (Gboard) antippen und sprechen.');
    } else if (/Mac/i.test(navigator.platform || ua)) {
      setDictInstruction('Jetzt Fn Fn drücken → Diktat starten → fertig nochmal Fn drücken.');
    } else if (/Win/i.test(ua)) {
      setDictInstruction('Jetzt Win + H drücken → Diktat starten → Mikrofon-Symbol zum Stoppen.');
    } else {
      setDictInstruction('Systemdiktat aktivieren und in das Feld sprechen.');
    }
    setSpeechSupported(isSpeechSupported());
  }, []);

  // Diktat stoppen, wenn Komponente unmountet
  useEffect(() => () => { if (stopSpeechRef.current) stopSpeechRef.current(); }, []);

  // Speech-Fehler nach 6 Sekunden ausblenden
  useEffect(() => {
    if (!speechError) return;
    const t = setTimeout(() => setSpeechError(''), 6000);
    return () => clearTimeout(t);
  }, [speechError]);

  useEffect(() => {
    if (view !== 'home') {
      window.speechSynthesis?.cancel();
      setPlayingId(null);
    }
    if (view !== 'practice' && stopSpeechRef.current) {
      stopSpeechRef.current();
      stopSpeechRef.current = null;
      setListening(false);
    }
  }, [view]);

  useEffect(() => {
    if (view === 'practice') {
      const start = Date.now();
      setElapsed(0);
      timerRef.current = setInterval(
        () => setElapsed(Math.floor((Date.now() - start) / 1000)),
        500
      );
      return () => clearInterval(timerRef.current);
    }
  }, [view]);

  const startScenario = (sc) => {
    window.speechSynthesis?.cancel();
    setPlayingId(null);
    setExpandedId(null);
    setScenario(sc);
    setInputs({});
    setStartChecks({});
    setFeedback(null);
    setError(null);
    setTranscript('');
    setParseError(null);
    setParsingState('idle');
    finalTranscriptRef.current = '';
    setView('brief');
  };

  const startFreeMode = () => {
    window.speechSynthesis?.cancel();
    setPlayingId(null);
    setScenario(null);
    setInputs({});
    setStartChecks({});
    setFeedback(null);
    setError(null);
    setTranscript('');
    setParseError(null);
    setParsingState('idle');
    finalTranscriptRef.current = '';
    setView('practice');
  };

  const playExample = (sc) => {
    window.speechSynthesis.cancel();
    if (playingId === sc.id) {
      setPlayingId(null);
      return;
    }
    const utt = new SpeechSynthesisUtterance(sc.modelHandover);
    utt.lang = 'de-DE';
    utt.rate = 0.92;
    utt.onend = () => setPlayingId(null);
    utt.onerror = () => setPlayingId(null);
    window.speechSynthesis.speak(utt);
    setPlayingId(sc.id);
    setExpandedId(sc.id);
  };

  const stopDictation = () => {
    if (stopSpeechRef.current) stopSpeechRef.current();
    stopSpeechRef.current = null;
    setListening(false);
  };

  const startDictation = () => {
    // Kein nativer Support (z. B. Firefox) → System-Diktat-Hinweis wie bisher.
    if (!speechSupported) {
      textareaRef.current?.focus();
      setShowDictHint(true);
      return;
    }
    if (listening) {
      stopDictation();
      return;
    }
    setSpeechError('');
    setShowDictHint(false);
    setListening(true);
    stopSpeechRef.current = startSpeech({
      lang: 'de-DE',
      baseText: transcript,
      onUpdate: (text) => {
        finalTranscriptRef.current = text;
        setTranscript(text);
      },
      onEnd: (text) => {
        finalTranscriptRef.current = text;
        setTranscript(text);
        setListening(false);
        stopSpeechRef.current = null;
      },
      onError: (err) => {
        const code = err?.message || String(err);
        const msg = SPEECH_ERRORS[code];
        console.warn('[dictation]', code, err);
        if (msg) setSpeechError(msg);
        else if (msg !== null) setSpeechError(`Spracherkennung fehlgeschlagen: ${code}`);
        setListening(false);
        stopSpeechRef.current = null;
      },
    });
  };

  const resetTranscript = () => {
    stopDictation();
    setTranscript('');
    setParseError(null);
    setParsingState('idle');
    setShowDictHint(false);
    setSpeechError('');
    finalTranscriptRef.current = '';
  };

  // ─── KI-Proxy calls (server/ki-proxy.mjs) ───
  const parseTranscript = async () => {
    if (!transcript.trim()) return;
    if (!navigator.onLine) {
      setParseError('Auto-Parse benötigt Internet. Du kannst die Felder unten auch manuell ausfüllen.');
      return;
    }
    if (stopSpeechRef.current) { stopSpeechRef.current(); stopSpeechRef.current = null; setListening(false); }
    setParsingState('parsing');
    setParseError(null);
    try {
      const parsed = await uebergabeParse(transcript);
      setInputs({
        identifikation: parsed.sections?.identifikation || '',
        notfallereignis: parsed.sections?.notfallereignis || '',
        notfallprioritaet: parsed.sections?.notfallprioritaet || '',
        handlung: parsed.sections?.handlung || '',
        anamnese: parsed.sections?.anamnese || '',
      });
      if (parsed.startSaid) {
        setStartChecks((prev) => ({ ...prev, 2: true }));
      }
      setParsingState('done');
    } catch (e) {
      setParseError(e.message);
      setParsingState('idle');
    }
  };

  const handleSubmit = async () => {
    if (!navigator.onLine) {
      setError('Die Bewertung benötigt Internet. Deine Eingaben bleiben erhalten — bewerte erneut, sobald du wieder online bist.');
      return;
    }
    setView('evaluating');
    setError(null);
    try {
      const parsed = await uebergabeEvaluate({ scenario, startChecks, inputs });
      setFeedback(parsed);
      setView('feedback');
    } catch (e) {
      setError(e.message);
      setView('practice');
    }
  };

  const reset = () => {
    window.speechSynthesis?.cancel();
    setPlayingId(null);
    setScenario(null);
    setInputs({});
    setStartChecks({});
    setFeedback(null);
    setError(null);
    setTranscript('');
    setParseError(null);
    setParsingState('idle');
    finalTranscriptRef.current = '';
    setView('home');
  };

  return (
    <div
      className="min-h-screen w-full text-text-primary relative overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at top left, #0B1220 0%, #070b16 55%, #050816 100%)',
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative max-w-5xl mx-auto px-6 py-10 pb-28 sm:px-10 sm:py-14 lg:pb-14">
        <header className="mb-12 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] tracking-[0.3em] text-text-muted uppercase mb-2 font-mono">
              Pharos · Übergabe-Training
            </div>
            <h1 className="text-5xl sm:text-6xl leading-[0.95] tracking-tight font-bold">
              Übergabe<span className="text-accent">.</span>
              <br />
              <span className="text-text-secondary font-semibold">nach SINNHAFT</span>
            </h1>
          </div>
          {view !== 'home' && (
            <button
              onClick={reset}
              className="text-xs tracking-wider uppercase text-text-secondary hover:text-accent transition border-b border-border-strong hover:border-accent pb-1 font-mono"
            >
              ← Neu starten
            </button>
          )}
        </header>

        {view === 'home' && (
          <div>
            <p className="text-text-secondary text-lg max-w-2xl mb-3 leading-relaxed">
              Strukturiere deine nächste Übergabe nach{' '}
              <span className="text-accent font-semibold">SINNHAFT</span> — sprich oder tippe, KI sortiert automatisch ins Schema und gibt dir Feedback.
            </p>
            <p className="font-mono text-text-muted text-xs mb-10 max-w-2xl">
              Schema: Gräff, Ehlers &amp; Schacher (2023), Notfall+Rettungsmedizin 27(1).
            </p>

            <div className="mb-10 grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {SINNHAFT.map((f) => (
                <div
                  key={f.key}
                  className="aspect-square border border-border bg-card rounded-lg flex flex-col items-center justify-center hover:border-accent/40 hover:bg-card-hover transition"
                  title={f.label}
                >
                  <span className={`font-bold text-3xl ${f.type === 'simulated' ? 'text-text-muted' : 'text-accent'}`}>
                    {f.letter}
                  </span>
                  <span className="font-mono text-[8px] tracking-widest uppercase text-text-muted mt-1">
                    {f.label}
                  </span>
                </div>
              ))}
            </div>

            {/* ── Hero: Eigene Übergabe ── */}
            <button
              onClick={startFreeMode}
              className="group relative w-full text-left p-8 rounded-xl border border-accent/30 hover:border-accent/60 bg-accent/5 hover:bg-accent/10 transition-all duration-300 overflow-hidden mb-12"
            >
              <div className="absolute top-0 left-0 w-full h-[2px] transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 bg-accent" />
              <div className="flex items-center justify-between gap-6 flex-wrap">
                <div>
                  <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-accent/70 mb-3">
                    Eigene Übergabe vorbereiten
                  </div>
                  <div className="font-semibold text-3xl sm:text-4xl mb-3 leading-tight tracking-tight text-text-primary">
                    Deine nächste Übergabe
                  </div>
                  <div className="text-sm text-text-secondary leading-relaxed max-w-xl">
                    Sprich oder tippe frei — KI parst in S·I·N·N·H·A und bewertet Vollständigkeit, Struktur und klinische Priorisierung.
                  </div>
                </div>
                <div className="font-mono text-xs tracking-wider uppercase border border-accent/40 text-accent px-5 py-3 group-hover:bg-accent group-hover:text-bg-primary transition-all rounded-lg shrink-0">
                  Starten →
                </div>
              </div>
            </button>

            {/* ── Beispiel-Übergaben ── */}
            <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-text-muted mb-4">
              Beispiel-Übergaben · Gut gemachte SINNHAFT-Übergaben zum Anhören
            </div>

            <div className="space-y-3 mb-12">
              {SZENARIEN.map((sc) => {
                const isPlaying = playingId === sc.id;
                const isExpanded = expandedId === sc.id;
                return (
                  <div
                    key={sc.id}
                    className="rounded-xl border overflow-hidden transition-colors duration-300"
                    style={{ borderColor: isExpanded ? sc.accent + '55' : 'rgba(148, 163, 184, 0.1)' }}
                  >
                    {/* Karten-Header */}
                    <div className="relative p-5 bg-card flex items-center gap-4 flex-wrap">
                      <div
                        className="absolute top-0 left-0 h-full w-[3px]"
                        style={{ backgroundColor: isPlaying ? sc.accent : 'transparent' }}
                      />
                      <span className="text-3xl ml-2" style={{ color: sc.accent }}>{sc.glyph}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-text-muted">{sc.category}</div>
                        <div className="font-semibold text-lg leading-tight text-text-primary">{sc.title}</div>
                        <div className="text-xs text-text-muted">{sc.patient}</div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => playExample(sc)}
                          className="font-mono flex items-center gap-2 px-3 py-2 rounded-lg transition tracking-wider uppercase text-xs border"
                          style={isPlaying
                            ? { backgroundColor: sc.accent + '22', borderColor: sc.accent, color: sc.accent }
                            : { borderColor: 'rgba(148, 163, 184, 0.2)', color: '#94A3B8' }
                          }
                        >
                          {isPlaying
                            ? <><span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: sc.accent }} />Stoppen</>
                            : <><span style={{ color: sc.accent }}>▶</span>Anhören</>
                          }
                        </button>
                        <button
                          onClick={() => startScenario(sc)}
                          className="font-mono px-3 py-2 rounded-lg border border-border hover:border-border-strong text-text-secondary hover:text-text-primary transition tracking-wider uppercase text-xs"
                        >
                          Üben →
                        </button>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : sc.id)}
                          className="font-mono px-2 py-2 rounded-lg border border-border hover:border-border-strong text-text-muted hover:text-text-secondary transition text-xs"
                          title="Schema anzeigen"
                        >
                          {isExpanded ? '▲' : '▼'}
                        </button>
                      </div>
                    </div>

                    {/* SINNHAFT-Schema-Panel */}
                    {isExpanded && (
                      <div className="border-t px-6 py-5 space-y-4 bg-bg-secondary" style={{ borderColor: sc.accent + '33' }}>
                        {isPlaying && (
                          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
                            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: sc.accent }} />
                            <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: sc.accent }}>Musterübergabe läuft</span>
                          </div>
                        )}
                        {[
                          { letter: 'S', label: 'Start', content: 'Manipulationen gestoppt · Face-to-Face · „Start" aussprechen' },
                          { letter: 'I', label: 'Identifikation', content: sc.patient },
                          { letter: 'N', label: 'Notfallereignis', content: sc.situation },
                          { letter: 'N', label: 'Notfallpriorität', content: Object.entries(sc.befund).map(([k, v]) => `${k}: ${v}`).join(' · ') },
                          { letter: 'H', label: 'Handlung', content: sc.massnahmen.join(' · ') + (sc.bewusstUnterlassen ? ' · Unterlassen: ' + sc.bewusstUnterlassen : '') },
                          { letter: 'A', label: 'Anamnese', content: sc.anamnese },
                        ].map((row) => (
                          <div key={row.letter} className="flex gap-4">
                            <span className="font-bold text-xl w-5 shrink-0 pt-0.5" style={{ color: sc.accent }}>{row.letter}</span>
                            <div>
                              <div className="font-mono text-[9px] tracking-widest uppercase text-text-muted mb-0.5">{row.label}</div>
                              <div className="text-sm text-text-secondary leading-relaxed">{row.content}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-8 border-t border-border grid sm:grid-cols-3 gap-8 text-sm text-text-secondary">
              <div>
                <div className="font-mono text-accent/80 text-xs tracking-widest uppercase mb-2">1 — Eingeben</div>
                Sprich deine Übergabe frei ein oder tippe sie. Diktat über das native Diktat deines Geräts.
              </div>
              <div>
                <div className="font-mono text-accent/80 text-xs tracking-widest uppercase mb-2">2 — Parsen</div>
                KI sortiert automatisch in S·I·N·N·H·A. Felder sind editierbar, Ziel: unter 120 Sekunden.
              </div>
              <div>
                <div className="font-mono text-accent/80 text-xs tracking-widest uppercase mb-2">3 — Feedback</div>
                Simuliertes ZNA-Team: Closed-Loop-Fazit, Rückfragen, Bewertung pro Sektion.
              </div>
            </div>
          </div>
        )}

        {view === 'brief' && scenario && (
          <div>
            <div className="flex items-baseline gap-4 mb-2">
              <span className="text-3xl" style={{ color: scenario.accent }}>
                {scenario.glyph}
              </span>
              <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-text-muted">
                {scenario.category}
              </div>
            </div>
            <h2 className="font-bold text-4xl sm:text-5xl mb-8 leading-tight tracking-tight">{scenario.title}</h2>

            <div className="grid sm:grid-cols-2 gap-6 mb-8">
              <InfoBlock label="Patient" value={scenario.patient} />
              <InfoBlock label="Einsatzort" value={scenario.einsatzort} />
              <InfoBlock label="Übergabe an" value={scenario.transport} accent={scenario.accent} />
              <InfoBlock label="Arbeitsdiagnose" value={scenario.verdacht} accent={scenario.accent} />
            </div>

            <Section title="Notfallereignis">{scenario.situation}</Section>

            <Section title="Befund (ABCDE)">
              <div className="grid gap-2 mt-3">
                {Object.entries(scenario.befund).map(([k, v]) => (
                  <div key={k} className="flex border-b border-border py-2">
                    <span
                      className="font-bold w-8 shrink-0 text-base pt-0.5"
                      style={{ color: scenario.accent }}
                    >
                      {k}
                    </span>
                    <span className="font-mono text-text-primary text-sm">{v}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Anamnese (SAMPLER & Soziales)">{scenario.anamnese}</Section>

            <Section title="Durchgeführte Maßnahmen">
              <ul className="mt-3 space-y-2">
                {scenario.massnahmen.map((m, i) => (
                  <li key={i} className="flex gap-3 text-sm text-text-secondary">
                    <span style={{ color: scenario.accent }}>›</span>
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-3 border-t border-border text-sm text-text-secondary">
                <span className="font-mono text-text-muted text-xs tracking-widest uppercase mr-2">
                  Bewusst unterlassen:
                </span>
                {scenario.bewusstUnterlassen}
              </div>
            </Section>

            <Section title="Aktueller Verlauf / Status">{scenario.verlauf}</Section>

            <div className="mt-12 flex items-center gap-4 flex-wrap">
              <button
                onClick={() => setView('practice')}
                className="font-mono px-8 py-4 bg-accent text-bg-primary rounded-lg hover:bg-accent/90 transition tracking-wider uppercase text-sm font-semibold active:scale-[0.98]"
              >
                Übergabe starten →
              </button>
              <div className="font-mono text-xs text-text-muted">
                Du sprichst zur Schichtleitung der {scenario.transport.split(' ').slice(0, 2).join(' ')}.
              </div>
            </div>
          </div>
        )}

        {view === 'practice' && (
          <div>
            <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
              <div>
                <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-text-muted">
                  {scenario
                    ? `SINNHAFT · Übergabe an ${scenario.transport.split(' ').slice(0, 2).join(' ')}`
                    : 'SINNHAFT · Eigene Übergabe'}
                </div>
                <h2 className="font-bold text-3xl mt-1 tracking-tight">Deine Übergabe</h2>
              </div>
              <Timer seconds={elapsed} />
            </div>

            <div className="mb-8 border border-border rounded-xl bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-text-muted">
                  Übergabe einsprechen oder tippen
                </div>
                <div className="text-text-secondary text-sm mt-1">
                  Sprich frei nach SINNHAFT, dann „Auto-Parse" — KI sortiert in die Felder.
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <button
                    onClick={startDictation}
                    aria-label={listening ? 'Diktat stoppen' : 'Diktat starten'}
                    className={`font-mono flex items-center gap-2 px-4 py-2 rounded-lg transition tracking-wider uppercase text-xs ${
                      listening
                        ? 'bg-critical hover:bg-critical/90 text-white'
                        : 'bg-critical/90 hover:bg-critical text-white'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 bg-white rounded-full ${listening ? 'animate-pulse' : ''}`} />
                    {listening ? 'Diktat läuft – stoppen' : 'Diktat starten'}
                  </button>
                  {parsingState === 'parsing' && (
                    <div className="flex items-center gap-3 text-text-secondary">
                      <span className="text-xl animate-pulse text-accent">◌</span>
                      <span className="font-mono text-sm">KI sortiert in SINNHAFT-Sektionen …</span>
                    </div>
                  )}
                </div>

                {showDictHint && !transcript && (
                  <div className="mb-3 flex items-start gap-3 border border-accent/30 bg-accent/5 px-4 py-3 rounded-lg">
                    <span className="text-accent mt-0.5">→</span>
                    <span className="font-mono text-xs text-accent/80 leading-relaxed">{dictInstruction}</span>
                  </div>
                )}

                {listening && (
                  <div className="mb-3 flex items-center gap-3 border border-critical/30 bg-critical/5 px-4 py-3 rounded-lg">
                    <span className="w-2 h-2 bg-critical rounded-full animate-pulse" />
                    <span className="font-mono text-xs text-critical/90 leading-relaxed">Sprechen … (Button erneut klicken zum Stoppen)</span>
                  </div>
                )}

                {speechError && (
                  <div className="mb-3 text-xs text-critical border border-critical/30 bg-critical/10 p-3 rounded-lg leading-relaxed">
                    {speechError}
                  </div>
                )}

                {parseError && (
                  <div className="mb-3 text-xs text-critical border border-critical/30 bg-critical/10 p-3 rounded-lg leading-relaxed">
                    {parseError}
                  </div>
                )}

                <textarea
                  ref={textareaRef}
                  value={transcript}
                  onChange={(e) => {
                    finalTranscriptRef.current = e.target.value;
                    setTranscript(e.target.value);
                    if (e.target.value) setShowDictHint(false);
                  }}
                  rows={5}
                  className="w-full bg-bg-secondary border border-border hover:border-border-strong focus:border-accent/60 rounded-lg p-4 text-sm text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 transition resize-y leading-relaxed"
                  placeholder='Tippen oder Diktat starten. Beginne idealerweise mit „Start." …'
                />

                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  <button
                    onClick={parseTranscript}
                    disabled={!transcript.trim() || parsingState === 'parsing'}
                    className="font-mono flex items-center gap-2 px-5 py-3 bg-accent hover:bg-accent/90 disabled:opacity-30 disabled:cursor-not-allowed text-bg-primary rounded-lg transition tracking-wider uppercase text-xs font-semibold active:scale-[0.98]"
                  >
                    Auto-Parse in SINNHAFT-Felder →
                  </button>
                  {transcript && (
                    <button
                      onClick={resetTranscript}
                      className="font-mono text-xs tracking-wider uppercase text-text-secondary hover:text-text-primary transition"
                    >
                      ↺ Leeren
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              {SINNHAFT.map((f) => {
                if (f.type === 'checklist') {
                  return (
                    <div key={f.key} className="border border-border rounded-xl p-4 bg-card">
                      <label className="flex items-baseline gap-3 mb-3">
                        <span
                          className="font-bold text-2xl"
                          style={{ color: scenario?.accent || '#22D3EE' }}
                        >
                          {f.letter}
                        </span>
                        <span className="text-text-primary text-base font-semibold">{f.label}</span>
                        <span className="text-text-muted text-xs">— {f.hint}</span>
                      </label>
                      <div className="space-y-2 ml-9">
                        {f.items.map((item, i) => (
                          <label key={i} className="flex items-center gap-3 cursor-pointer group">
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={!!startChecks[i]}
                              aria-label={item}
                              onClick={() => setStartChecks({ ...startChecks, [i]: !startChecks[i] })}
                              className={`w-5 h-5 border rounded-md flex items-center justify-center transition ${
                                startChecks[i]
                                  ? 'bg-accent border-accent'
                                  : 'border-border-strong hover:border-text-muted'
                              }`}
                            >
                              {startChecks[i] && <span className="text-bg-primary text-xs">✓</span>}
                            </button>
                            <span
                              className={`text-sm transition ${
                                startChecks[i] ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'
                              }`}
                            >
                              {item}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                }
                if (f.type === 'simulated') {
                  return (
                    <div key={f.key} className="border-l-2 border-border-strong pl-4 py-2 opacity-60">
                      <div className="flex items-baseline gap-3">
                        <span className="font-bold text-2xl text-text-muted">{f.letter}</span>
                        <span className="text-text-secondary text-base font-semibold">{f.label}</span>
                        <span className="font-mono text-[10px] tracking-widest uppercase text-text-muted ml-auto">
                          ↘ {f.who}
                        </span>
                      </div>
                      <div className="text-xs text-text-muted mt-1 ml-9">
                        {f.hint} — KI simuliert in der Auswertung.
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={f.key}>
                    <label className="flex items-baseline gap-3 mb-2 flex-wrap">
                      <span
                        className="font-bold text-2xl"
                        style={{ color: scenario?.accent || '#22D3EE' }}
                      >
                        {f.letter}
                      </span>
                      <span className="text-text-primary text-base font-semibold">{f.label}</span>
                      <span className="text-text-muted text-xs">— {f.hint}</span>
                    </label>
                    <textarea
                      value={inputs[f.key] || ''}
                      onChange={(e) => setInputs({ ...inputs, [f.key]: e.target.value })}
                      rows={f.rows}
                      className={`w-full bg-bg-secondary border border-border hover:border-border-strong focus:border-accent/60 rounded-lg p-3 text-sm text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 transition resize-y ${
                        f.key === 'notfallprioritaet' ? 'font-mono' : ''
                      }`}
                      placeholder={
                        f.key === 'notfallprioritaet'
                          ? 'A: … · B: … · C: … · D: … · E: …'
                          : 'Hier deine Übergabe formulieren …'
                      }
                    />
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="mt-6 border border-critical/30 bg-critical/10 text-critical text-sm p-3 rounded-lg">
                Fehler beim Bewerten: {error}
              </div>
            )}

            <div className="mt-10 flex items-center gap-4 flex-wrap">
              <button
                onClick={handleSubmit}
                disabled={Object.values(inputs).every((v) => !v?.trim())}
                title={Object.values(inputs).every((v) => !v?.trim()) ? "Mindestens eine Sektion ausfüllen" : undefined}
                className="font-mono px-8 py-4 bg-accent text-bg-primary rounded-lg hover:bg-accent/90 disabled:opacity-30 disabled:cursor-not-allowed transition tracking-wider uppercase text-sm font-semibold active:scale-[0.98]"
              >
                Übergabe abgeben →
              </button>
              {Object.values(inputs).every((v) => !v?.trim()) ? (
                <span className="font-mono text-xs text-text-muted">Mindestens eine Sektion ausfüllen.</span>
              ) : null}
              {scenario && (
                <button
                  onClick={() => setView('brief')}
                  className="font-mono text-xs tracking-wider uppercase text-text-secondary hover:text-text-primary transition"
                >
                  ← Briefing nochmal
                </button>
              )}
            </div>
          </div>
        )}

        {view === 'evaluating' && (
          <div className="py-32 text-center">
            <div className="inline-block">
              <div className="text-6xl animate-pulse" style={{ color: scenario?.accent || '#22D3EE' }}>
                ◌
              </div>
              <div className="mt-6 text-text-secondary">
                Aufnehmendes Team prüft deine Übergabe …
              </div>
              <div className="font-mono mt-2 text-xs text-text-muted">
                Bewertung pro Sektion · Closed-Loop-Fazit · Teamfragen
              </div>
            </div>
          </div>
        )}

        {view === 'feedback' && feedback && (
          <div>
            <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-text-muted mb-3">
              Auswertung · {scenario ? scenario.title : 'Eigene Übergabe'}
            </div>

            <div className="grid sm:grid-cols-[auto_1fr] gap-8 items-start mb-12">
              <ScoreRing score={feedback.score} accent={scenario?.accent || '#22D3EE'} />
              <div>
                <div className="font-mono text-text-muted text-xs tracking-widest uppercase mb-2">Gesamteindruck</div>
                <div className="font-semibold text-2xl leading-snug text-text-primary">
                  „{feedback.verdict}"
                </div>
              </div>
            </div>

            <div className="mb-12">
              <h3 className="font-mono text-text-secondary text-xs tracking-[0.3em] uppercase mb-4">
                Sender-Sektionen
              </h3>
              <div className="space-y-2">
                {SINNHAFT.filter((f) => f.type !== 'simulated').map((f) => {
                  const sf = feedback.sectionFeedback?.find((s) => s.key === f.key);
                  const color =
                    sf?.rating === 'gut' ? '#10B981' : sf?.rating === 'teilweise' ? '#F59E0B' : '#EF4444';
                  return (
                    <div
                      key={f.key}
                      className="flex gap-4 p-4 border border-border bg-card rounded-lg"
                    >
                      <div className="w-1 self-stretch rounded-full" style={{ backgroundColor: color }} />
                      <div className="flex-1">
                        <div className="flex items-baseline gap-3 mb-1 flex-wrap">
                          <span className="font-bold" style={{ color }}>
                            {f.letter}
                          </span>
                          <span className="text-text-primary text-sm font-semibold">{f.label}</span>
                          {sf && (
                            <span
                              className="font-mono text-[10px] tracking-widest uppercase ml-auto"
                              style={{ color }}
                            >
                              {sf.rating}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-text-secondary leading-relaxed">
                          {sf?.comment || 'Keine Bewertung verfügbar.'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mb-10 border border-accent/30 bg-accent/5 p-6 rounded-xl">
              <div className="flex items-baseline gap-3 mb-3">
                <span className="font-bold text-3xl text-accent">F</span>
                <span className="text-text-primary font-semibold">
                  Fazit · Closed-Loop des aufnehmenden Teams
                </span>
              </div>
              <div className="text-text-secondary leading-relaxed text-base">
                {feedback.simulatedFazit}
              </div>
            </div>

            <div className="mb-12 border border-border-strong p-6 rounded-xl bg-card">
              <div className="flex items-baseline gap-3 mb-4">
                <span className="font-bold text-3xl text-text-secondary">T</span>
                <span className="text-text-primary font-semibold">
                  Teamfragen · was das aufnehmende Team nachfragt
                </span>
              </div>
              <ul className="space-y-3">
                {feedback.simulatedTeamfragen?.map((q, i) => (
                  <li key={i} className="flex gap-3 text-text-secondary">
                    <span className="font-mono text-text-muted text-xs pt-1">0{i + 1}</span>
                    <span className="text-sm leading-relaxed">{q}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-3 border-t border-border text-xs text-text-muted">
                Diese Fragen wurden gestellt, weil entsprechende Infos fehlten oder unklar waren.
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6 mb-12">
              <div>
                <h3 className="font-mono text-success text-xs tracking-[0.3em] uppercase mb-3">Stärken</h3>
                <ul className="space-y-2">
                  {feedback.strengths?.map((s, i) => (
                    <li key={i} className="text-sm text-text-secondary flex gap-2">
                      <span className="text-success">+</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-mono text-accent text-xs tracking-[0.3em] uppercase mb-3">
                  Verbesserungen
                </h3>
                <ul className="space-y-2">
                  {feedback.improvements?.map((s, i) => (
                    <li key={i} className="text-sm text-text-secondary flex gap-2">
                      <span className="text-accent">›</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="border-l-2 border-accent pl-6 py-2 mb-12">
              <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-accent mb-2">
                Mitnehmen für die nächste Übergabe
              </div>
              <div className="font-semibold text-xl leading-snug text-text-primary">{feedback.topTip}</div>
            </div>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => {
                  setInputs({});
                  setStartChecks({});
                  setFeedback(null);
                  setTranscript('');
                  setParseError(null);
                  setParsingState('idle');
                  finalTranscriptRef.current = '';
                  setView('practice');
                }}
                className="font-mono px-6 py-3 bg-accent text-bg-primary rounded-lg hover:bg-accent/90 transition tracking-wider uppercase text-xs font-semibold active:scale-[0.98]"
              >
                Nochmal üben
              </button>
              <button
                onClick={reset}
                className="font-mono px-6 py-3 border border-border-strong hover:border-text-muted text-text-secondary hover:text-text-primary rounded-lg transition tracking-wider uppercase text-xs"
              >
                Neues Szenario
              </button>
            </div>
          </div>
        )}

        <footer className="font-mono mt-24 pt-8 border-t border-border text-[10px] tracking-widest uppercase text-text-muted">
          Prototyp · Schema nach Gräff et al. 2023 · Kein Ersatz für reale Ausbildung · Pharos
        </footer>
      </div>
    </div>
  );
}

function InfoBlock({ label, value, accent }) {
  return (
    <div className="border-l border-border-strong pl-4">
      <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-text-muted mb-1">{label}</div>
      <div className="text-base leading-snug font-semibold" style={{ color: accent || '#F8FAFC' }}>
        {value}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mt-8">
      <h3 className="font-mono text-text-secondary text-xs tracking-[0.3em] uppercase mb-1">{title}</h3>
      <div className="text-text-primary text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function Timer({ seconds }) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  const warn = seconds > 90;
  const crit = seconds > 120;
  return (
    <div className="font-mono flex items-baseline gap-2 border border-border px-4 py-2 rounded-lg bg-card">
      <span
        className={`w-2 h-2 rounded-full ${crit ? 'bg-critical' : warn ? 'bg-warning' : 'bg-success'} animate-pulse`}
      />
      <span className="text-[10px] tracking-widest uppercase text-text-muted">Zeit</span>
      <span className={`text-base ${crit ? 'text-critical' : warn ? 'text-warning' : 'text-text-primary'}`}>
        {m}:{s}
      </span>
      <span className="text-[10px] text-text-muted ml-1">/ 2:00</span>
    </div>
  );
}

function ScoreRing({ score, accent }) {
  const r = 50;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div className="relative w-[140px] h-[140px]">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#172033" strokeWidth="6" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={accent}
          strokeWidth="6"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-bold text-4xl">{score}</span>
        <span className="font-mono text-[10px] tracking-widest uppercase text-text-muted mt-1">/ 100</span>
      </div>
    </div>
  );
}
