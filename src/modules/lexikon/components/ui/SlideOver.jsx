import { useEffect } from "react";
import { XIcon } from "./icons.jsx";

export default function SlideOver({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-40 transition-opacity duration-200 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`absolute bg-bg-secondary border border-border shadow-2xl
          left-0 right-0 bottom-0 rounded-t-2xl max-h-[88vh]
          sm:top-0 sm:right-0 sm:bottom-0 sm:left-auto sm:w-[480px] sm:max-h-none sm:rounded-none sm:rounded-l-2xl sm:border-l
          flex flex-col
          transition-transform duration-250 ease-out
          ${open ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-y-0 sm:translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-base font-semibold text-text-primary truncate pr-4">{title}</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 flex-shrink-0 inline-flex items-center justify-center rounded-md text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors"
            aria-label="Schließen"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
