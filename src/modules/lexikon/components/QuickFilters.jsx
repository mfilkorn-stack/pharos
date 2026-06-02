import { CATEGORIES } from "./CategoryIcon.jsx";

// Maps category display name -> set of groupIds from data.json#groups
// Keep the OLD FILTER_CATEGORIES export for backward compat with App.jsx imports
export const FILTER_CATEGORIES_LEGACY = [
  {
    key: "antikoagulation",
    label: "Antikoagulation",
    groups: new Set(["doak","vka","tah","lmwh","heparin_unfrakt","vitamin_k","gerinnungsfaktor"]),
  },
  {
    key: "herz",
    label: "Herz-Kreislauf",
    groups: new Set(["betablocker","acehemmer","sartan","ca_antagonist","schleifendiuretikum","thiazid","kalium_diuretikum","glykosid","antiarrhythmikum","statin","alphablocker"]),
  },
  {
    key: "diabetes",
    label: "Diabetes",
    groups: new Set(["insulin","biguanid","sulfonylharnstoff","sglt2","dpp4","glp1_ra"]),
  },
  {
    key: "atemwege",
    label: "Atemwege",
    groups: new Set(["saba","ics","lama"]),
  },
  {
    key: "schmerz",
    label: "Schmerz",
    groups: new Set(["opioid","nsar","nonopioid_analget","triptan"]),
  },
  {
    key: "zns",
    label: "ZNS",
    groups: new Set(["antiepileptikum","ssri","snri","trizyklisch","mirtazapin","benzodiazepin","z_substanz","parkinson"]),
  },
  {
    key: "antibiotika",
    label: "Antibiotika",
    groups: new Set(["makrolid","penicillin","cephalosporin","fluorchinolon","tetracyclin","sulfonamid","nitroimidazol","azol_antimykot"]),
  },
  {
    key: "andere",
    label: "Andere",
    groups: null, // catch-all
  },
];

// Use the new mockup categories as the primary export
export const FILTER_CATEGORIES = CATEGORIES;

const KNOWN_GROUPS = new Set(
  FILTER_CATEGORIES_LEGACY.filter((c) => c.groups !== null).flatMap((c) => [...c.groups])
);

export function matchesFilter(item, filterKey) {
  if (!filterKey || filterKey === "all") return true;

  // Check new CATEGORIES (mockup style)
  const newCat = CATEGORIES.find((c) => c.key === filterKey);
  if (newCat) {
    if (newCat.isSaa) return item.source === "saa";
    if (newCat.isCritical) {
      return (item.notfall || []).some((n) => n.level === "hoch");
    }
    return newCat.groups ? newCat.groups.has(item.group || "") : false;
  }

  // Fallback to legacy for backward compat
  const legacyCat = FILTER_CATEGORIES_LEGACY.find((c) => c.key === filterKey);
  if (!legacyCat) return true;
  if (legacyCat.groups === null) {
    return !KNOWN_GROUPS.has(item.group || "");
  }
  return legacyCat.groups.has(item.group || "");
}

export default function QuickFilters({ active, onChange, counts }) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
      {/* "Alle" chip */}
      <button
        type="button"
        onClick={() => onChange("all")}
        className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border text-sm font-medium whitespace-nowrap transition-all cursor-pointer flex-shrink-0 ${
          !active || active === "all"
            ? "bg-accent text-bg-primary border-transparent"
            : "bg-card text-text-secondary border-border hover:border-border-strong hover:text-text-primary"
        }`}
      >
        Alle
        {counts?.get("all") != null ? (
          <span className="text-[11px] opacity-70">({counts.get("all")})</span>
        ) : null}
      </button>

      {/* Category chips */}
      {CATEGORIES.map((cat) => {
        const isActive = active === cat.key;
        const count = counts?.get(cat.key);
        return (
          <button
            key={cat.key}
            type="button"
            onClick={() => onChange(cat.key)}
            className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border text-sm font-medium whitespace-nowrap transition-all cursor-pointer flex-shrink-0 ${
              isActive
                ? "bg-accent text-bg-primary border-transparent"
                : "bg-card text-text-primary border-border hover:border-border-strong"
            }`}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
            {count != null ? (
              <span className="text-[11px] opacity-60">({count})</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
