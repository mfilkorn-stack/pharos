import { useId, useRef } from "react";
import Button from "./Button.jsx";
import { AlertTriangleIcon } from "./icons.jsx";
import { useDialogFocus } from "./useDialogFocus.js";

// Bestätigungsdialog im App-Design (ersetzt window.confirm: unstylebar,
// auf iOS-PWA teils unterdrückt, Button-Labels „OK/Abbrechen" ohne Aussage).
export default function ConfirmDialog({ open, title, children, confirmLabel, cancelLabel = "Zurück", tone = "warning", onConfirm, onCancel }) {
  const ref = useRef(null);
  const titleId = useId();
  const descId = useId();
  useDialogFocus(open, ref, onCancel);
  if (!open) return null;
  const toneCls = tone === "danger" ? "bg-critical/10 text-critical" : "bg-warning/10 text-warning";

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4" role="presentation">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className="relative w-full max-w-md bg-bg-secondary border border-border rounded-2xl shadow-2xl p-5 outline-none"
      >
        <div className="flex items-start gap-3">
          <span className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${toneCls}`}>
            <AlertTriangleIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-text-primary">{title}</h2>
            <div id={descId} className="text-sm text-text-secondary leading-relaxed mt-1">{children}</div>
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 mt-5">
          <Button variant="ghost" size="lg" className="sm:flex-1" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} size="lg" className="sm:flex-[2]" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
