// App-weite fixierte Aktions-Leiste: mobil über der Bottom-Tab-Leiste
// (Safe-Area eingerechnet), am Desktop neben der Sidebar. Primäre Aktionen
// bleiben damit immer im Daumenbereich — nie hinter dem Scroll.
export default function ActionBar({ children, maxWidthClass = "max-w-2xl" }) {
  return (
    <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] lg:bottom-0 inset-x-0 lg:left-[260px] z-30 border-t border-border bg-bg-secondary/95 backdrop-blur-sm">
      <div className={`${maxWidthClass} mx-auto px-4 py-3 flex items-center gap-3`}>
        {children}
      </div>
    </div>
  );
}
