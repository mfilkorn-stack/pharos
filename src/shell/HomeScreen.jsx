import { PharosLogo, MagnifyingGlassIcon, ClipboardCheckIcon, SyringeIcon, ArrowRightIcon, WifiIcon } from "../modules/lexikon/components/ui/icons.jsx";

const TILES = [
  {
    key: "lexikon",
    title: "MedScan",
    desc: "Wirkstoffe nachschlagen, Packung scannen, Drogen & Toxidrome — offline verfügbar.",
    Icon: MagnifyingGlassIcon,
    tag: "Nachschlagen",
  },
  {
    key: "medigabe",
    title: "Medigabe",
    desc: "SAA-konform durch die Medikamentengabe — Indikation, KI-Check, Dosis, 6-R.",
    Icon: SyringeIcon,
    tag: "Durchführen",
  },
  {
    key: "trainer",
    title: "Übergabe",
    desc: "SINNHAFT-Übergabe einsprechen, KI parst & bewertet wie das ZNA-Team.",
    Icon: ClipboardCheckIcon,
    tag: "Trainieren",
    span: true,
  },
];

export default function HomeScreen({ onPick }) {
  return (
    <div
      className="min-h-screen w-full text-text-primary"
      style={{ background: "radial-gradient(ellipse at top left, #0B1220 0%, #070b16 55%, #050816 100%)" }}
    >
      <div className="max-w-3xl mx-auto px-6 py-16 sm:py-24">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-12">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-accent to-info flex items-center justify-center flex-shrink-0">
            <PharosLogo className="h-7 w-7 text-bg-primary" />
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight leading-none">Pharos</div>
            <div className="text-xs text-text-muted mt-1">Werkzeuge für den Einsatz</div>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-3">
          Was brauchst du<span className="text-accent">?</span>
        </h1>
        <p className="text-text-secondary text-base mb-10 max-w-xl leading-relaxed">
          Drei Werkzeuge, ein Ort. Wähle, womit du startest — du kannst jederzeit wechseln.
        </p>

        {/* Tiles */}
        <div className="grid sm:grid-cols-2 gap-4">
          {TILES.map((t) => (
            <button
              key={t.key}
              onClick={() => onPick(t.key)}
              className={`group relative text-left min-h-[160px] p-6 rounded-2xl border border-border bg-card hover:border-accent/50 hover:bg-card-hover transition-all duration-300 flex flex-col${t.span ? " sm:col-span-2" : ""}`}
            >
              <div className="h-12 w-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-4 group-hover:bg-accent/20 transition">
                <t.Icon className="h-6 w-6" />
              </div>
              <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-text-muted mb-1">{t.tag}</div>
              <div className="text-xl font-bold tracking-tight mb-2">{t.title}</div>
              <div className="text-sm text-text-secondary leading-relaxed flex-1">{t.desc}</div>
              <div className="mt-4 flex items-center gap-2 text-accent font-mono text-xs tracking-wider uppercase">
                Öffnen <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ))}
        </div>

        {/* Offline note */}
        <div className="mt-10 flex items-center gap-2 text-text-muted text-xs">
          <WifiIcon className="h-4 w-4 text-success flex-shrink-0" />
          <span>MedScan läuft offline. Übergabe-Bewertung benötigt Internet.</span>
        </div>

        <footer className="mt-12 pt-6 border-t border-border font-mono text-[10px] tracking-wide text-text-muted">
          Generische Fachinformation · kein Medizinprodukt · keine patientenbezogene Entscheidungsgrundlage
        </footer>
      </div>
    </div>
  );
}
