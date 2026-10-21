import {
  MagnifyingGlassIcon,
  ClipboardCheckIcon,
  SyringeIcon,
  PharosLogo,
} from "../modules/lexikon/components/ui/icons.jsx";

// Feste Modul-Reihenfolge — vorher sprang das aktive Modul an Position 1 und die
// Tabs wechselten je Modus Zahl und Position (Jakob's Law, Muskelgedächtnis).
// „Start" macht die Startseite mobil erreichbar (vorher nur per Desktop-Logo).
const TABS = [
  { key: "home", label: "Start", Icon: PharosLogo },
  { key: "lexikon", label: "MedScan", Icon: MagnifyingGlassIcon },
  { key: "medigabe", label: "Medigabe", Icon: SyringeIcon },
  { key: "trainer", label: "Übergabe", Icon: ClipboardCheckIcon },
];

export default function BottomTabBar({ mode, onMode, onHome }) {
  return (
    <nav
      aria-label="Module"
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-bg-secondary/95 backdrop-blur-sm flex items-stretch print:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map(({ key, label, Icon }) => {
        const active = mode === key;
        return (
          <button
            key={key}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => {
              if (key === "home") onHome?.();
              else if (active) window.scrollTo({ top: 0, behavior: "smooth" });
              else onMode?.(key);
            }}
            // min-h 56 px: daumen-/handschuhtauglich
            className={`relative flex-1 min-h-[56px] flex flex-col items-center justify-center gap-1 px-1 transition-colors ${
              active ? "text-accent" : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {active ? <span className="absolute top-0 inset-x-6 h-0.5 rounded-full bg-accent" aria-hidden="true" /> : null}
            <Icon className="h-6 w-6" />
            <span className="text-[11px] font-medium">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
