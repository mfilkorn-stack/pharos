import { useState } from "react";
import { PhoneIcon, AlertTriangleIcon, ChevronDownIcon } from "./ui/icons.jsx";
import giftnotruf from "../data/giftnotruf.json";

// Telefonnummer für tel:-Link normalisieren (Leerzeichen raus).
function telHref(tel) {
  return "tel:" + tel.replace(/\s+/g, "");
}

export default function GiftnotrufBanner() {
  const [open, setOpen] = useState(false);
  const { notruf, giz } = giftnotruf;

  return (
    <div className="rounded-xl border border-critical/25 bg-critical/5 overflow-hidden">
      {/* Notruf 112 — primär */}
      <div className="flex items-center gap-3 p-3">
        <span className="h-9 w-9 rounded-lg bg-critical/10 text-critical flex items-center justify-center flex-shrink-0">
          <AlertTriangleIcon className="h-4 w-4" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-text-primary">{notruf.label} {notruf.tel}</div>
          <div className="text-[11px] text-text-muted">{notruf.hinweis}</div>
        </div>
        <a
          href={telHref(notruf.tel)}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-critical text-bg-primary text-sm font-semibold transition-opacity hover:opacity-90 flex-shrink-0"
        >
          <PhoneIcon className="h-4 w-4" />
          {notruf.tel}
        </a>
      </div>

      {/* Giftnotruf-Zentralen — einklappbar */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 border-t border-critical/15 text-sm text-text-secondary hover:text-text-primary hover:bg-card-hover/50 transition-colors cursor-pointer"
      >
        <span>Giftinformationszentralen (regional)</span>
        <ChevronDownIcon className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <ul className="px-3 pb-3 pt-1 space-y-1">
          {giz.map((g) => (
            <li key={g.tel}>
              <a
                href={telHref(g.tel)}
                className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 hover:bg-card-hover transition-colors"
              >
                <span className="min-w-0">
                  <span className="block text-sm text-text-primary truncate">{g.ort}</span>
                  <span className="block text-[11px] text-text-muted truncate">{g.region}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-sm font-mono text-accent flex-shrink-0">
                  <PhoneIcon className="h-3.5 w-3.5" />
                  {g.tel}
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
