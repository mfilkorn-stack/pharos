import { useState, useMemo, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import data from "./data/data.json";
import atcIndex from "./data/atc_index.json";
import groupMap from "./data/atc_group_map.json";
import saaData from "./data/saa.json";
import saaMatrixSeed from "./data/saa-matrix.json";
import SearchBar from "./components/SearchBar.jsx";
import QuickFilters from "./components/QuickFilters.jsx";
import ScanActions from "./components/ScanActions.jsx";
import ResultCard from "./components/ResultCard.jsx";
import ResultDetail from "./components/ResultDetail.jsx";
import RightPanel from "./components/RightPanel.jsx";
import SlideOver from "./components/ui/SlideOver.jsx";
import StatusPill from "./components/StatusPill.jsx";
import CloudBanner from "./components/CloudBanner.jsx";
import Scanner from "./components/Scanner.jsx";
import SaaCheck from "./components/SaaCheck.jsx";
import Button from "./components/ui/Button.jsx";
import { SparklesIcon } from "./components/ui/icons.jsx";
import { lookup as lookupTier, unknownHit } from "./lib/lookup.js";
import { buildDedupedDB } from "./lib/dedupe.js";
import { enrichName } from "./lib/enrich.js";
import { prewarmOCR } from "./lib/ocr.js";
import { loadFavorites, saveFavorites, loadHistory, saveHistory, pushHistory, toggleFavorite as toggleFav } from "./lib/store.js";
import { TrashIcon, StarIcon, ClockIcon, FlaskIcon } from "./components/ui/icons.jsx";
import { config } from "./config.js";
import { matchesFilter } from "./components/QuickFilters.jsx";
import { CATEGORIES } from "./components/CategoryIcon.jsx";
import GiftnotrufBanner from "./components/GiftnotrufBanner.jsx";
import SymptomChips from "./components/SymptomChips.jsx";

// Build runtime DB entry: inherits group Notfall + appends extras
function materialize(entry, groups) {
  const g = groups[entry.group] || null;
  const gName = g ? g.gruppe : (entry.gruppe || "Nicht im Datenbestand");
  const groupNotfall = g ? g.notfall : [];
  return {
    id: entry.id,
    wirkstoff: entry.wirkstoff,
    synonyms: entry.synonyms || [],
    atc: entry.atc,
    group: entry.group,
    gruppe: gName,
    indikationen: entry.indikationen || [],
    notfall: [...(entry.notfall && entry.notfall.length ? entry.notfall : groupNotfall), ...(entry.extra || [])],
    toxidrom: entry.toxidrom || (g && g.toxidrom) || null,
    antidot: entry.antidot && entry.antidot.length ? entry.antidot : (g ? g.antidot || [] : []),
    mischkonsum: [...(entry.mischkonsum && entry.mischkonsum.length ? entry.mischkonsum : (g ? g.mischkonsum || [] : [])), ...(entry.mischkonsum_extra || [])],
    wirkdauer: entry.wirkdauer || null,
    source: entry.source || "0a",
    quelle: entry.quelle,
    stand: entry.stand,
    sources: entry.sources || [],
    verification: entry.verification || null,
  };
}

const SEED_DB = data.substances.map((e) => materialize(e, data.groups));

// SAA/BPR-Notfallmedikamente: eigener autoritativer Block (source "saa") mit
// Rich-Feldern unter `saa` für das eigene Detail-Layout + den Kontra-Check.
function materializeSaa(e) {
  return {
    id: e.id,
    wirkstoff: e.name,
    synonyms: [],
    atc: null,
    group: null,
    gruppe: e.gruppe || "SAA/BPR-Medikament",
    indikationen: e.indikationen || [],
    notfall: [],
    toxidrom: null,
    antidot: [],
    mischkonsum: [],
    source: "saa",
    quelle: "SAA/BPR 2025",
    stand: null,
    saa: {
      konzentration: e.konzentration || "",
      dosierung: e.dosierung || "",
      indikationen: e.indikationen || [],
      kontra: e.kontra || [],
      relKontra: e.relKontra || [],
      uaw: e.uaw || [],
      besonderheiten: e.besonderheiten || "",
      alter: e.alter || "",
      gruppe: e.gruppe || "",
    },
  };
}

const SAA_DB = (saaData.entries || []).map(materializeSaa);

// Rang für Sortierung nach Notfallrelevanz: hoch > mittel > info > keine.
function notfallRank(item) {
  const ns = item.notfall || [];
  if (ns.some((n) => n.level === "hoch")) return 3;
  if (ns.some((n) => n.level === "mittel")) return 2;
  if (ns.length) return 1;
  return 0;
}

function makeScanLookup(db, atcIdx, gMap, groups) {
  return (text) => {
    const lines = String(text || "").split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const matched = [];
    const unmatched = [];
    const seen = new Set();
    for (const line of lines) {
      const r = lookupTier(line, { db, atcIndex: atcIdx, groupMap: gMap, groups });
      if (r.hits.length && !seen.has(r.hits[0].id)) {
        seen.add(r.hits[0].id);
        matched.push(r.hits[0]);
      } else if (!r.hits.length) {
        unmatched.push(line);
      }
    }
    return { matched, unmatched };
  };
}

const Lexikon = forwardRef(function Lexikon({ onNavState }, ref) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [scanSource, setScanSource] = useState(null);
  const [planEntries, setPlanEntries] = useState([]);
  const [runtimeExtras, setRuntimeExtras] = useState([]);
  const [saaMatrixRuntime, setSaaMatrixRuntime] = useState({});
  const [searchEnriching, setSearchEnriching] = useState(false);
  const [searchEnrichError, setSearchEnrichError] = useState("");
  const [activeView, setActiveView] = useState("suche"); // suche | favoriten | verlauf
  const [favorites, setFavorites] = useState(() => loadFavorites());
  const [history, setHistory] = useState(() => loadHistory());
  const [detail, setDetail] = useState(null); // item currently selected
  const [isXl, setIsXl] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 1280px)").matches);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const handler = (e) => setIsXl(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Persist favorites and history on change
  useEffect(() => { saveFavorites(favorites); }, [favorites]);
  useEffect(() => { saveHistory(history); }, [history]);

  // When user opens a detail, push it into history
  const openDetail = useCallback((item) => {
    setDetail(item);
    if (item?.id) setHistory((prev) => pushHistory(prev, item.id));
  }, []);

  const handleToggleFavorite = useCallback((id) => {
    setFavorites((prev) => toggleFav(prev, id));
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  const goHome = useCallback(() => {
    setActiveView("suche");
    setActiveFilter("all");
    setQuery("");
    setPlanEntries([]);
    setDetail(null);
    setScanSource(null);
    setSearchEnrichError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Zentraler Sidebar-Navigationshandler: View wechseln und Such-/Filter-Zustand
  // sauber zurücksetzen (sonst bleibt z. B. ein Kategorie-Filter „hängen").
  const handleNav = useCallback((key) => {
    if (key === "scannen") { setScanSource("scan"); return; }
    if (key === "hochladen") { setScanSource("upload"); return; }
    if (key === "suche" || key === "favoriten" || key === "verlauf" || key === "drogen") {
      setActiveView(key);
      setActiveFilter("all");
      setQuery("");
      setPlanEntries([]);
      setDetail(null);
      setSearchEnrichError("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  // OCR-Modell vorwaermen (Consent ist auf Shell-Ebene bereits erteilt).
  useEffect(() => { prewarmOCR(); }, []);

  // ⌘K / Strg+K fokussiert das Suchfeld (passend zum Hint in der SearchBar).
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.querySelector('input[placeholder*="Suche"]')?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Navigation wird von der Pharos-Shell gesteuert: aktiven View + Zaehler melden,
  // Nav-Befehle (handleNav/goHome) per Ref nach aussen geben.
  useImperativeHandle(ref, () => ({ nav: handleNav, home: goHome }), [handleNav, goHome]);
  useEffect(() => {
    onNavState?.({ active: activeView, counts: { favoriten: favorites.length, verlauf: history.length } });
  }, [activeView, favorites.length, history.length, onNavState]);

  const reloadExtras = useCallback(async () => {
    try {
      const res = await fetch("/data/extras-runtime.json", { cache: "no-store" });
      if (!res.ok) return;
      const d = await res.json();
      setRuntimeExtras(d?.entries || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { reloadExtras(); }, [reloadExtras]);

  // Prio-2-Polling: solange KI-Einträge noch unverifiziert (pending / ohne
  // verification) sind, extras-runtime.json periodisch neu laden, damit der
  // Verifizierungs-Status nachläuft, ohne dass der Nutzer etwas tun muss.
  useEffect(() => {
    const hasPending = runtimeExtras.some((e) => !e.verification || e.verification.status === "pending");
    if (!hasPending) return;
    const t = setInterval(reloadExtras, 25000);
    return () => clearInterval(t);
  }, [runtimeExtras, reloadExtras]);

  const fullDB = useMemo(() => {
    const extras = runtimeExtras.map((e) => materialize(e, data.groups));
    // SAA-Block separat anhängen (NICHT gegen Seed deduplizieren — Protokoll-Sicht).
    return [...buildDedupedDB(SEED_DB, extras), ...SAA_DB];
  }, [runtimeExtras]);

  // SAA-Matrix: committet (saaMatrixSeed) + Runtime-Ergänzungen (gemerged nach normKey).
  const reloadSaaMatrix = useCallback(async () => {
    try {
      const res = await fetch("/data/saa-matrix-runtime.json", { cache: "no-store" });
      if (!res.ok) return;
      const d = await res.json();
      setSaaMatrixRuntime(d?.entries || {});
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { reloadSaaMatrix(); }, [reloadSaaMatrix]);
  const saaMatrix = useMemo(() => ({ ...(saaMatrixSeed.entries || {}), ...saaMatrixRuntime }), [saaMatrixRuntime]);

  const scanLookup = useMemo(
    () => makeScanLookup(fullDB, atcIndex, groupMap, data.groups),
    [fullDB]
  );

  const onQueryChange = (v) => {
    if (planEntries.length) setPlanEntries([]);
    if (searchEnrichError) setSearchEnrichError("");
    setQuery(v);
  };

  const enrichUnknownEntry = useCallback(async (name) => {
    const entry = await enrichName(name, { url: config.enrichProxyUrl });
    if (!entry) {
      // Kein echter Wirkstoff (z. B. Verpackungsform "Blister") oder nicht
      // auffindbar → Platzhalter als "nicht erkannt" markieren statt endlos zu spinnen.
      setPlanEntries((prev) => prev.map((p) =>
        (p.source === "unknown" && p.wirkstoff === String(name).trim())
          ? { ...p, source: "rejected", gruppe: "Nicht als Medikament erkannt" }
          : p));
      return null;
    }
    const enriched = materialize(entry, data.groups);
    setPlanEntries((prev) => prev.map((p) => (p.id === `unknown:${entry.id.replace(/^unknown:/, "")}` || p.wirkstoff === name) ? enriched : p));
    reloadExtras();
    return entry;
  }, [reloadExtras]);

  const handlePickUnknown = (name) => {
    setPlanEntries([unknownHit(name)]);
    setQuery("");
    setScanSource(null);
    enrichUnknownEntry(name);
  };

  const handlePickAll = (matched, unmatched) => {
    const placeholders = (unmatched || []).map(unknownHit);
    setPlanEntries([...(matched || []), ...placeholders]);
    setQuery("");
    setScanSource(null);
    for (const name of unmatched || []) enrichUnknownEntry(name);
  };

  const handleSearchEnrich = async () => {
    const term = query.trim();
    if (!term || searchEnriching) return;
    setSearchEnriching(true);
    setSearchEnrichError("");
    try {
      const entry = await enrichUnknownEntry(term);
      if (!entry) setSearchEnrichError(`Keine Daten für „${term}" gefunden — kein bekannter Wirkstoff oder Tippfehler.`);
    } finally {
      setSearchEnriching(false);
    }
  };

  const handlePick = (entry) => {
    if (entry.source === "0b" || entry.source === "ki" || entry.source === "unknown") {
      setPlanEntries([entry]);
      setQuery("");
    } else {
      setPlanEntries([]);
      setQuery(entry.wirkstoff);
    }
    setScanSource(null);
  };

  // Base set depending on view
  const baseSet = useMemo(() => {
    if (activeView === "favoriten") {
      const favSet = new Set(favorites);
      return fullDB.filter((d) => favSet.has(d.id));
    }
    if (activeView === "verlauf") {
      const map = new Map(fullDB.map((d) => [d.id, d]));
      return history.map((id) => map.get(id)).filter(Boolean);
    }
    if (activeView === "drogen") {
      return fullDB.filter((d) => matchesFilter(d, "drogen"));
    }
    return fullDB;
  }, [activeView, fullDB, favorites, history]);

  // Filter + search logic
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list;
    if (!q && activeView === "suche") {
      if (planEntries.length) list = planEntries;
      else if (!activeFilter || activeFilter === "all") list = baseSet;
      else list = baseSet.filter((d) => matchesFilter(d, activeFilter));
    } else if (!q) {
      list = baseSet;
    } else {
      const searched = baseSet.filter((d) =>
        [d.wirkstoff, d.gruppe, ...(d.synonyms || []), d.toxidrom?.label, ...(d.toxidrom?.leitsymptome || [])]
          .filter(Boolean).join(" ").toLowerCase().includes(q)
      );
      list = (activeView !== "suche" || !activeFilter || activeFilter === "all")
        ? searched
        : searched.filter((d) => matchesFilter(d, activeFilter));
    }
    // Grundsätzlich nach Notfallrelevanz sortieren (stabil). Verlauf bleibt
    // chronologisch ("Zuletzt geöffnet"), daher dort nicht umsortieren.
    if (activeView === "verlauf") return list;
    return [...list].sort((a, b) => notfallRank(b) - notfallRank(a));
  }, [query, planEntries, baseSet, activeFilter, activeView]);

  // Counts per filter for chips (using new CATEGORIES)
  const filterCounts = useMemo(() => {
    const counts = new Map();
    counts.set("all", fullDB.length);
    for (const cat of CATEGORIES) {
      counts.set(cat.key, fullDB.filter((d) => matchesFilter(d, cat.key)).length);
    }
    return counts;
  }, [fullDB]);

  const showTestMode = config.flags.cloudPackung || config.flags.cloudPlan;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Cloud-Banner (Test-Modus) */}
      {showTestMode ? <CloudBanner /> : null}

      {/* Content row: center + right panel */}
      <div className="flex flex-1 min-w-0">
          {/* Center column — pb fuer mobile Bottom-Tab-Bar */}
          <main className="flex-1 min-w-0 max-w-[920px] mx-auto w-full px-4 sm:px-6 py-4 sm:py-6 pb-28 lg:pb-6 space-y-4 sm:space-y-5">
            {/* Status */}
            <div className="flex items-center justify-end gap-3">
              <StatusPill dot="success">Datenstand: {data.version}</StatusPill>
            </div>

            {/* Suche + Scan (alle Groessen) */}
            <div className="space-y-3">
              <SearchBar value={query} onChange={onQueryChange} hint="⌘K" />
              <ScanActions onScan={() => setScanSource("scan")} onUpload={() => setScanSource("upload")} />
            </div>

            {/* Quick-Filter — in der Drogen-Ansicht ausgeblendet (Medikamenten-Kategorien) */}
            {activeView !== "drogen" ? (
              <QuickFilters active={activeFilter} onChange={setActiveFilter} counts={filterCounts} />
            ) : null}

            {/* Plan mode banner + SAA-Check gegen die Patienten-Medikamente */}
            {planEntries.length > 0 && !query.trim() ? (
              <div className="space-y-3 px-4 py-3 rounded-xl border border-accent/20 bg-accent/5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-accent font-semibold">Plan-Auswahl · {results.length} Wirkstoffe</span>
                  <Button variant="ghost" size="sm" onClick={() => setPlanEntries([])}>Zurücksetzen</Button>
                </div>
                <SaaCheck patientMeds={planEntries.filter((p) => p.source !== "unknown" && p.source !== "rejected").map((p) => p.wirkstoff)} matrix={saaMatrix} />
              </div>
            ) : null}

            {/* View-Header (Favoriten / Verlauf) */}
            {activeView === "favoriten" ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="h-9 w-9 rounded-lg bg-warning/10 text-warning flex items-center justify-center flex-shrink-0">
                    <StarIcon className="h-4 w-4" />
                  </span>
                  <div className="flex-1">
                    <h2 className="text-base font-semibold text-text-primary">Favoriten</h2>
                    <p className="text-xs text-text-muted">{favorites.length} markiert</p>
                  </div>
                </div>
                {/* SAA-Check gegen die als Favorit markierten Patienten-Medikamente (ohne SAA-Einträge selbst) */}
                {baseSet.some((d) => d.source !== "saa") ? (
                  <SaaCheck patientMeds={baseSet.filter((d) => d.source !== "saa").map((d) => d.wirkstoff)} matrix={saaMatrix} />
                ) : null}
              </div>
            ) : activeView === "verlauf" ? (
              <div className="flex items-center gap-3">
                <span className="h-9 w-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
                  <ClockIcon className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <h2 className="text-base font-semibold text-text-primary">Verlauf</h2>
                  <p className="text-xs text-text-muted">letzte {history.length} geöffnet</p>
                </div>
                {history.length > 0 ? (
                  <Button variant="ghost" size="sm" onClick={clearHistory}>
                    <TrashIcon className="h-4 w-4" />
                    Leeren
                  </Button>
                ) : null}
              </div>
            ) : (activeView === "drogen" || (activeView === "suche" && activeFilter === "drogen")) ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="h-9 w-9 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center flex-shrink-0">
                    <FlaskIcon className="h-4 w-4" />
                  </span>
                  <div className="flex-1">
                    <h2 className="text-base font-semibold text-text-primary">Drogen / Substanzen</h2>
                    <p className="text-xs text-text-muted">Suche per Name, Straßenname oder Symptom</p>
                  </div>
                </div>
                <GiftnotrufBanner />
                <SymptomChips onPick={onQueryChange} />
              </div>
            ) : null}

            {/* Meta row */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">{results.length} {activeView === "favoriten" ? "Favoriten" : activeView === "verlauf" ? "im Verlauf" : activeView === "drogen" ? "Substanzen" : "Einträge gefunden"}</span>
              <div className="hidden lg:flex items-center gap-2 text-text-muted text-xs">
                <span>Sortieren:</span>
                <span className="text-text-secondary">{activeView === "verlauf" ? "Zuletzt geöffnet" : "Notfallrelevanz"} ▼</span>
              </div>
            </div>

            {/* Results */}
            {results.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-16 px-4 text-center">
                {query.trim() ? (
                  <>
                    <p className="text-text-secondary text-base">Kein Treffer für „{query.trim()}"</p>
                    {query.trim().length >= 3 ? (
                      searchEnriching ? (
                        <div className="flex items-center gap-2 text-warning text-sm font-mono">
                          <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
                          Suche und ergänze via KI …
                        </div>
                      ) : searchEnrichError ? (
                        <div className="space-y-3">
                          <p className="text-sm text-critical">{searchEnrichError}</p>
                          <Button variant="subtle" size="md" onClick={handleSearchEnrich}>
                            <SparklesIcon className="h-4 w-4" />
                            Erneut versuchen
                          </Button>
                        </div>
                      ) : (
                        <Button variant="subtle" size="md" onClick={handleSearchEnrich}>
                          <SparklesIcon className="h-4 w-4" />
                          Mit KI suchen und ergänzen
                        </Button>
                      )
                    ) : (
                      <p className="text-sm text-text-muted">Mindestens 3 Zeichen für die KI-Ergänzung.</p>
                    )}
                  </>
                ) : activeView === "favoriten" ? (
                  <p className="text-text-secondary text-base">Noch keine Favoriten — tippe bei einem Eintrag auf den Stern.</p>
                ) : activeView === "verlauf" ? (
                  <p className="text-text-secondary text-base">Noch nichts geöffnet.</p>
                ) : activeView === "drogen" ? (
                  <p className="text-text-secondary text-base">Keine Substanz — suche per Name, Straßenname oder Symptom.</p>
                ) : (
                  <p className="text-text-secondary text-base">Tippe einen Wirkstoff oder Handelsnamen, um zu suchen.</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((item) => (
                  <ResultCard
                    key={item.id}
                    item={item}
                    isActive={detail?.id === item.id}
                    onOpen={() => openDetail(item)}
                    isFavorite={favorites.includes(item.id)}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            )}
          </main>

          {/* Desktop right panel (xl+) */}
          <div className="hidden xl:block">
            <RightPanel
              item={detail || results[0] || null}
              isFavorite={(detail || results[0])?.id ? favorites.includes((detail || results[0]).id) : false}
              onToggleFavorite={handleToggleFavorite}
            />
          </div>
        </div>

      {/* Footer disclaimer */}
      <footer className="bg-bg-primary/95 border-t border-border px-4 py-2.5 text-center mb-24 lg:mb-0">
        <span className="font-mono text-[10px] text-text-muted tracking-wide">
          Generische Wirkstoffinformation · kein Medizinprodukt · keine patientenbezogene Entscheidungsgrundlage
        </span>
      </footer>

      {/* Mobile slide-over (below xl) — open prop checks viewport to avoid body-lock on desktop */}
      <SlideOver
        open={detail !== null && !isXl}
        onClose={() => setDetail(null)}
        title={detail?.wirkstoff || ""}
      >
        {detail ? (
          <ResultDetail
            item={detail}
            isFavorite={favorites.includes(detail.id)}
            onToggleFavorite={handleToggleFavorite}
          />
        ) : null}
      </SlideOver>

      {/* Scanner overlay */}
      {scanSource ? (
        <Scanner
          source={scanSource}
          lookup={scanLookup}
          onClose={() => setScanSource(null)}
          onPick={handlePick}
          onPickUnknown={handlePickUnknown}
          onPickAll={handlePickAll}
        />
      ) : null}
    </div>
  );
});

export default Lexikon;
