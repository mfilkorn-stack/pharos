import {
  MagnifyingGlassIcon,
  CameraIcon,
  UploadIcon,
  StarIcon,
  ClockIcon,
  FlaskIcon,
  ClipboardCheckIcon,
  SyringeIcon,
  WifiIcon,
  PharosLogo,
} from "../modules/lexikon/components/ui/icons.jsx";

const MODES = [
  { key: "lexikon", label: "MedScan", Icon: MagnifyingGlassIcon },
  { key: "medigabe", label: "Medigabe", Icon: SyringeIcon },
  { key: "trainer", label: "Übergabe", Icon: ClipboardCheckIcon },
];

const LEXIKON_NAV = [
  { key: "suche", label: "Suche", Icon: MagnifyingGlassIcon },
  { key: "scannen", label: "Scannen", Icon: CameraIcon },
  { key: "hochladen", label: "Hochladen", Icon: UploadIcon },
  { key: "drogen", label: "Drogen", Icon: FlaskIcon },
  { key: "favoriten", label: "Favoriten", Icon: StarIcon },
  { key: "verlauf", label: "Verlauf", Icon: ClockIcon },
];

function Row({ Icon, label, active, count, muted, onClick }) {
  const base = "w-full h-10 px-3 rounded-lg flex items-center gap-3 text-sm font-medium transition-colors cursor-pointer";
  const state = active
    ? "bg-accent/10 text-accent"
    : muted
    ? "text-text-secondary hover:bg-card-hover hover:text-text-primary"
    : "text-text-secondary hover:bg-card-hover hover:text-text-primary";
  return (
    <button type="button" onClick={onClick} className={`${base} ${state}`}>
      <Icon className={`h-4 w-4 flex-shrink-0 ${active ? "text-accent" : ""}`} />
      <span className="flex-1 text-left">{label}</span>
      {typeof count === "number" && count > 0 ? (
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${active ? "bg-accent/20 text-accent" : "bg-card text-text-muted"}`}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

// Desktop-Navigation (lg+): oben Modus-Umschalter, darunter modus-spezifische Punkte.
export default function DesktopSidebar({ mode, active, counts = {}, onNav, onMode, onHome }) {
  return (
    <aside className="w-[260px] h-screen sticky top-0 border-r border-border bg-bg-secondary flex flex-col p-4 gap-1 overflow-y-auto flex-shrink-0">
      {/* Logo → Home */}
      <button
        type="button"
        onClick={onHome}
        title="Zur Pharos-Startseite"
        className="flex items-center gap-3 py-2 mb-2 rounded-lg hover:bg-card-hover/50 transition-colors text-left px-2 -mx-1"
      >
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-accent to-info flex items-center justify-center flex-shrink-0">
          <PharosLogo className="h-5 w-5 text-bg-primary" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-text-primary leading-tight tracking-tight">Pharos</div>
          <div className="text-[11px] text-text-muted leading-tight mt-0.5">Werkzeuge für den Einsatz</div>
        </div>
      </button>

      {/* Modus-Umschalter */}
      <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-text-muted px-3 mt-2 mb-1">Modus</div>
      {MODES.map((m) => (
        <Row key={m.key} Icon={m.Icon} label={m.label} active={mode === m.key} onClick={() => onMode?.(m.key)} />
      ))}

      {/* Lexikon-Navigation */}
      {mode === "lexikon" ? (
        <>
          <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-text-muted px-3 mt-4 mb-1">MedScan</div>
          {LEXIKON_NAV.map((item) => (
            <Row
              key={item.key}
              Icon={item.Icon}
              label={item.label}
              active={active === item.key}
              count={counts[item.key]}
              onClick={() => onNav?.(item.key)}
            />
          ))}
        </>
      ) : null}

      <div className="mt-auto" />

      {/* Offline-Badge */}
      <div className="mt-2 bg-success/5 border border-success/20 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <WifiIcon className="h-4 w-4 text-success flex-shrink-0" />
          <div>
            <div className="text-xs font-semibold text-text-primary">
              {mode === "trainer" ? "Bewertung braucht Netz" : "Offline verfügbar"}
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">
              {mode === "trainer" ? "Üben & Diktat offline möglich" : "Daten lokal gespeichert"}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
