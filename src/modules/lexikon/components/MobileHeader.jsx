import { PharosLogo } from "./ui/icons.jsx";
import StatusPill from "./StatusPill.jsx";
import SearchBar from "./SearchBar.jsx";
import QuickFilters from "./QuickFilters.jsx";
import ScanActions from "./ScanActions.jsx";

export default function MobileHeader({ stand, showTestMode, query, onQueryChange, activeFilter, onFilterChange, filterCounts, onScan, onUpload, onHome }) {
  return (
    <header className="sticky top-0 z-30 bg-bg-primary/95 backdrop-blur-md border-b border-border">
      {/* Brand row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onHome}
          title="Zur Startseite"
          className="flex items-center gap-3 rounded-lg hover:bg-card-hover/50 transition-colors -mx-1 px-1"
        >
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent to-info flex items-center justify-center flex-shrink-0">
            <PharosLogo className="h-4 w-4 text-bg-primary" />
          </div>
          <span className="text-sm font-bold text-text-primary tracking-tight">Pharos</span>
        </button>
        <div className="ml-auto flex items-center gap-2">
          <StatusPill dot="success">Datenstand: {stand}</StatusPill>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-2">
        <SearchBar value={query} onChange={onQueryChange} />
      </div>

      {/* Quick filters */}
      <div className="px-4 pb-2">
        <QuickFilters active={activeFilter} onChange={onFilterChange} counts={filterCounts} />
      </div>

      {/* Scan actions */}
      <div className="px-4 pb-3">
        <ScanActions onScan={onScan} onUpload={onUpload} />
      </div>
    </header>
  );
}
