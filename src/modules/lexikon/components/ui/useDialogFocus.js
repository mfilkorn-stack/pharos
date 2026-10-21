import { useEffect } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Modal-Verhalten für Dialoge: Esc schließt, Body-Scroll gesperrt, Fokus wandert
// in den Dialog, Tab bleibt drin (Focus-Trap) und kehrt beim Schließen zum
// auslösenden Element zurück (WCAG 2.4.3).
export function useDialogFocus(open, containerRef, onClose) {
  useEffect(() => {
    if (!open) return;
    const node = containerRef.current;
    const trigger = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const items = () => (node ? [...node.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement) : []);
    const first = items()[0];
    (first || node)?.focus({ preventScroll: true });

    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose?.(); return; }
      if (e.key !== "Tab" || !node) return;
      const list = items();
      if (!list.length) { e.preventDefault(); node.focus(); return; }
      const a = list[0], z = list[list.length - 1];
      if (e.shiftKey && (document.activeElement === a || !node.contains(document.activeElement))) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (trigger && typeof trigger.focus === "function" && document.contains(trigger)) trigger.focus({ preventScroll: true });
    };
    // onClose bewusst nicht in den Deps: ein neues Callback-Objekt pro Render
    // würde den Fokus sonst bei jedem Render zurücksetzen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
