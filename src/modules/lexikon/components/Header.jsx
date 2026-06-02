import { PharosLogo } from "./ui/icons.jsx";

export default function Header({ stand }) {
  return (
    <div className="flex items-center gap-3 px-4 sm:px-6 py-3">
      <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent to-info flex items-center justify-center flex-shrink-0">
        <PharosLogo className="h-4 w-4 text-bg-primary" />
      </div>
      <span className="font-semibold text-text-primary tracking-tight">Pharos</span>
      <span className="ml-auto font-mono text-[11px] text-text-muted whitespace-nowrap">v1.1 · Daten {stand}</span>
    </div>
  );
}
