import {
  MagnifyingGlassIcon,
  CameraIcon,
  FlaskIcon,
  StarIcon,
  ClipboardCheckIcon,
  SyringeIcon,
} from "../modules/lexikon/components/ui/icons.jsx";

// Sub-Navigation des MedScan-Moduls (Lexikon).
const MEDSCAN_TABS = [
  { key: "suche", label: "Suche", Icon: MagnifyingGlassIcon },
  { key: "scannen", label: "Scannen", Icon: CameraIcon },
  { key: "drogen", label: "Drogen", Icon: FlaskIcon },
  { key: "favoriten", label: "Favoriten", Icon: StarIcon },
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

// Feste Bottom-Tab-Bar (Mobile). Der letzte Tab wechselt ins ANDERE Modul
// (Pharos = App-Name, kein Navigationsziel). MedScan ↔ Übergabe.
export default function BottomTabBar({ mode, active, counts = {}, onNav, onMode }) {
  const navCls =
    "fixed bottom-0 inset-x-0 z-40 border-t border-border bg-bg-secondary/95 backdrop-blur-sm flex items-stretch";
  const safe = { paddingBottom: "env(safe-area-inset-bottom)" };

  if (mode === "trainer") {
    return (
      <nav className={navCls} style={safe}>
        <Tab Icon={ClipboardCheckIcon} label="Übergabe" active onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
        <Tab Icon={MagnifyingGlassIcon} label="MedScan" active={false} onClick={() => onMode?.("lexikon")} />
        <Tab Icon={SyringeIcon} label="Medigabe" active={false} onClick={() => onMode?.("medigabe")} />
      </nav>
    );
  }

  if (mode === "medigabe") {
    return (
      <nav className={navCls} style={safe}>
        <Tab Icon={SyringeIcon} label="Medigabe" active onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
        <Tab Icon={MagnifyingGlassIcon} label="MedScan" active={false} onClick={() => onMode?.("lexikon")} />
        <Tab Icon={ClipboardCheckIcon} label="Übergabe" active={false} onClick={() => onMode?.("trainer")} />
      </nav>
    );
  }

  // MedScan-Modus (Lexikon): Sub-Nav + Wechsel zur Übergabe + Medigabe.
  return (
    <nav className={navCls} style={safe}>
      {MEDSCAN_TABS.map((t) => (
        <Tab
          key={t.key}
          Icon={t.Icon}
          label={t.label}
          active={active === t.key}
          badge={counts[t.key]}
          onClick={() => onNav?.(t.key)}
        />
      ))}
      <Tab Icon={ClipboardCheckIcon} label="Übergabe" active={false} onClick={() => onMode?.("trainer")} />
      <Tab Icon={SyringeIcon} label="Medigabe" active={false} onClick={() => onMode?.("medigabe")} />
    </nav>
  );
}
