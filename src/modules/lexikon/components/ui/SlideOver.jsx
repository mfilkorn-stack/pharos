import { useId, useRef } from "react";
import { XIcon } from "./icons.jsx";
import { useDialogFocus } from "./useDialogFocus.js";

export default function SlideOver({ open, onClose, title, children }) {
  const panelRef = useRef(null);
  const titleId = useId();
  useDialogFocus(open, panelRef, onClose);

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-200 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      // inert: geschlossene Panels sind sonst per Tab erreichbar und für Screenreader sichtbar.
      inert={!open}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`absolute bg-bg-secondary border border-border shadow-2xl outline-none
          left-0 right-0 bottom-0 rounded-t-2xl max-h-[88vh]
          sm:top-0 sm:right-0 sm:bottom-0 sm:left-auto sm:w-[480px] sm:max-h-none sm:rounded-none sm:rounded-l-2xl sm:border-l
          flex flex-col
          transition-transform duration-250 ease-out
          ${open ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-y-0 sm:translate-x-full"}`}
      >
        {/* Grab-Handle signalisiert mobil das Bottom-Sheet */}
        <div className="sm:hidden flex justify-center pt-2" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-border-strong" />
        </div>
        <div className="flex items-center justify-between pl-5 pr-3 py-2 sm:py-3 border-b border-border flex-shrink-0">
          <h2 id={titleId} className="text-base font-semibold text-text-primary truncate pr-4">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-11 flex-shrink-0 inline-flex items-center justify-center rounded-lg text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors"
            aria-label="Schließen"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
