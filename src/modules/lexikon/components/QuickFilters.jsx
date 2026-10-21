import Chip from "./ui/Chip.jsx";
import { CATEGORIES, CATEGORIZED_GROUPS } from "./CategoryIcon.jsx";

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
    // Auffangkategorie: alles ohne abgedeckte Gruppe. SAA-Einträge haben einen
    // eigenen Chip und sind hier ausgenommen, sonst stünden sie doppelt.
    if (newCat.isOther) {
      return item.source !== "saa" && !CATEGORIZED_GROUPS.has(item.group || "");
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
  const isAll = !active || active === "all";
  return (
    <div role="group" aria-label="Kategorie-Filter" className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
      <Chip active={isAll} onClick={() => onChange("all")} count={counts?.get("all")}>Alle</Chip>
      {CATEGORIES.map((cat) => (
        <Chip key={cat.key} Icon={cat.Icon} active={active === cat.key} onClick={() => onChange(cat.key)} count={counts?.get(cat.key)}>
          {cat.label}
        </Chip>
      ))}
    </div>
  );
}
