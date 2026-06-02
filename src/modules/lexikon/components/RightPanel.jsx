import ResultDetail from "./ResultDetail.jsx";

export default function RightPanel({ item, isFavorite, onToggleFavorite }) {
  return (
    <aside className="w-[400px] flex-shrink-0 h-screen sticky top-0 border-l border-border bg-bg-secondary overflow-y-auto">
      {item ? (
        <div className="p-6">
          <ResultDetail item={item} isFavorite={isFavorite} onToggleFavorite={onToggleFavorite} />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="h-12 w-12 rounded-2xl bg-card border border-border flex items-center justify-center mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6 text-text-muted" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
            </svg>
          </div>
          <p className="text-sm font-medium text-text-secondary">Wirkstoff auswählen</p>
          <p className="text-xs text-text-muted mt-1">Klicke auf einen Eintrag links für Details</p>
        </div>
      )}
    </aside>
  );
}
