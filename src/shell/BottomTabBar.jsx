import {
  MagnifyingGlassIcon,
  CameraIcon,
  FlaskIcon,
  StarIcon,
  ClipboardCheckIcon,
  PharosLogo,
} from "../modules/lexikon/components/ui/icons.jsx";

const LEXIKON_TABS = [
  { key: "suche", label: "Suche", Icon: MagnifyingGlassIcon },
  { key: "scannen", label: "Scannen", Icon: CameraIcon },
  { key: "drogen", label: "Drogen", Icon: FlaskIcon },
  { key: "favoriten", label: "Favoriten", Icon: StarIcon },
];

const TRAINER_TABS = [
  { key: "trainer", label: "Übergabe", Icon: ClipboardCheckIcon },
];

function Tab({ Icon, label, active, badge, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      // min-h ≥ 56px Touch-Target, daumen-/handschuhtauglich
      className={`relative flex-1 min-h-[56px] flex flex-col items-center justify-center gap-1 px-1 transition-colors ${
        active ? "text-accent" : "text-text-muted hover:text-text-secondary"
      }`}
    >
      <Icon className="h-6 w-6" />
      <span className="text-[10px] font-medium tracking-wide">{label}</span>
      {typeof badge === "number" && badge > 0 ? (
        <span className="absolute top-1.5 right-[calc(50%-1.25rem)] text-[9px] font-mono px-1 rounded bg-accent/20 text-accent">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

// Feste Bottom-Tab-Bar fuer Mobile. Kontextabhaengig pro Modus; "Pharos" wechselt
// zurueck zum Home-Launcher (Moduswechsel).
export default function BottomTabBar({ mode, active, counts = {}, onNav, onHome }) {
  const tabs = mode === "trainer" ? TRAINER_TABS : LEXIKON_TABS;
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-bg-secondary/95 backdrop-blur-sm flex items-stretch"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map((t) => (
        <Tab
          key={t.key}
          Icon={t.Icon}
          label={t.label}
          active={mode === "trainer" ? true : active === t.key}
          badge={counts[t.key]}
          onClick={() => (mode === "trainer" ? window.scrollTo({ top: 0, behavior: "smooth" }) : onNav?.(t.key))}
        />
      ))}
      <Tab Icon={PharosLogo} label="Pharos" active={false} onClick={onHome} />
    </nav>
  );
}
