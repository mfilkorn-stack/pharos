import {
  MagnifyingGlassIcon,
  CameraIcon,
  UploadIcon,
  StarIcon,
  ClockIcon,
  GridIcon,
  CogIcon,
  InfoIcon,
  WifiIcon,
  FlaskIcon,
  PharosLogo,
} from "./ui/icons.jsx";

const NAV_ITEMS = [
  { key: "suche", label: "Suche", Icon: MagnifyingGlassIcon },
  { key: "scannen", label: "Scannen", Icon: CameraIcon },
  { key: "hochladen", label: "Hochladen", Icon: UploadIcon },
  { key: "drogen", label: "Drogen", Icon: FlaskIcon },
  { key: "favoriten", label: "Favoriten", Icon: StarIcon },
  { key: "verlauf", label: "Verlauf", Icon: ClockIcon },
  { key: "kategorien", label: "Kategorien", Icon: GridIcon, disabled: true },
];

const BOTTOM_ITEMS = [
  { key: "einstellungen", label: "Einstellungen", Icon: CogIcon, disabled: true },
  { key: "ueber", label: "Über", Icon: InfoIcon, disabled: true },
];

function NavItem({ item, active, onClick, count }) {
  const isActive = active === item.key;
  const baseCls = "w-full h-10 px-3 rounded-lg flex items-center gap-3 text-sm font-medium transition-colors";
  const activeCls = isActive ? "bg-accent/10 text-accent" : "text-text-secondary hover:bg-card-hover hover:text-text-primary";

  return (
    <button
      type="button"
      onClick={item.disabled ? undefined : onClick}
      title={item.disabled ? "Bald verfügbar" : item.label}
      className={`${baseCls} ${activeCls} ${item.disabled ? "opacity-50 cursor-default" : "cursor-pointer"}`}
    >
      <item.Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-accent" : ""}`} />
      <span className="flex-1 text-left">{item.label}</span>
      {typeof count === "number" && count > 0 ? (
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isActive ? "bg-accent/20 text-accent" : "bg-card text-text-muted"}`}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

export default function Sidebar({ active = "suche", onNav, onHome, counts = {} }) {
  return (
    <aside className="w-[260px] h-screen sticky top-0 border-r border-border bg-bg-secondary flex flex-col p-4 gap-1 overflow-y-auto flex-shrink-0">
      {/* Logo + Title (clickable → home) */}
      <button
        type="button"
        onClick={onHome}
        title="Zur Startseite"
        className="flex items-center gap-3 px-1 py-2 mb-2 rounded-lg hover:bg-card-hover/50 transition-colors text-left -mx-1 px-2"
      >
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-accent to-info flex items-center justify-center flex-shrink-0">
          <PharosLogo className="h-5 w-5 text-bg-primary" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-text-primary leading-tight tracking-tight">Pharos</div>
          <div className="text-[11px] text-text-muted leading-tight mt-0.5">Wirkstoff-Lexikon für den Einsatz</div>
        </div>
      </button>

      {/* Nav items */}
      {NAV_ITEMS.map((item) => (
        <NavItem
          key={item.key}
          item={item}
          active={active}
          count={counts[item.key]}
          onClick={() => onNav?.(item.key)}
        />
      ))}

      {/* Spacer */}
      <div className="mt-auto" />

      {/* Bottom items */}
      <div className="border-t border-border pt-2 mt-2">
        {BOTTOM_ITEMS.map((item) => (
          <NavItem
            key={item.key}
            item={item}
            active={active}
            onClick={() => onNav?.(item.key)}
          />
        ))}
      </div>

      {/* Offline badge */}
      <div className="mt-2 bg-success/5 border border-success/20 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <WifiIcon className="h-4 w-4 text-success flex-shrink-0" />
          <div>
            <div className="text-xs font-semibold text-text-primary">Offline verfügbar</div>
            <div className="text-[11px] text-text-muted mt-0.5">Daten lokal gespeichert</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
