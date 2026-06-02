import {
  HeartIcon,
  LungsIcon,
  DropletIcon,
  BrainIcon,
  AlertTriangleIcon,
  PillIcon,
  FlaskIcon,
} from "./ui/icons.jsx";

// Categories from the spec (matches mockup filter categories)
export const CATEGORIES = [
  {
    key: "kardio",
    label: "Kardio",
    emoji: "🫀",
    tint: "critical",
    Icon: HeartIcon,
    groups: new Set(["betablocker","acehemmer","sartan","ca_antagonist","schleifendiuretikum","thiazid","kalium_diuretikum","glykosid","antiarrhythmikum","statin","alphablocker"]),
  },
  {
    key: "atemwege",
    label: "COPD",
    emoji: "🫁",
    tint: "info",
    Icon: LungsIcon,
    groups: new Set(["saba","ics","lama"]),
  },
  {
    key: "antikoag",
    label: "Antikoag.",
    emoji: "🩸",
    tint: "critical",
    Icon: DropletIcon,
    groups: new Set(["doak","vka","tah","lmwh","heparin_unfrakt","vitamin_k","gerinnungsfaktor"]),
  },
  {
    key: "neuro",
    label: "Neurologie",
    emoji: "🧠",
    tint: "neuro",
    Icon: BrainIcon,
    groups: new Set(["antiepileptikum","parkinson","ssri","snri","trizyklisch","mirtazapin","benzodiazepin","z_substanz","triptan"]),
  },
  {
    key: "drogen",
    label: "Drogen",
    emoji: "🧪",
    tint: "drogen",
    Icon: FlaskIcon,
    groups: new Set(["drogen_opioide","drogen_stimulanzien","drogen_halluzinogene","drogen_cannabinoide","drogen_dissoziativa","drogen_dampfdrogen","drogen_inhalantien"]),
  },
  {
    key: "kritisch",
    label: "Kritisch",
    emoji: "⚠️",
    tint: "warning",
    Icon: AlertTriangleIcon,
    isCritical: true,
    groups: null,
  },
];

const TINT_CLASSES = {
  critical: "bg-critical/10 text-critical",
  info: "bg-info/10 text-info",
  accent: "bg-accent/10 text-accent",
  warning: "bg-warning/10 text-warning",
  neuro: "bg-purple-500/15 text-purple-400",
  drogen: "bg-amber-500/15 text-amber-400",
  neutral: "bg-card text-text-secondary",
};

/**
 * Returns the first matching category for an item, or null.
 */
export function categoryFor(item) {
  const isHighRisk = item.notfall?.some((n) => n.level === "hoch");

  // Check group-based categories first (excluding kritisch)
  for (const cat of CATEGORIES) {
    if (cat.isCritical) continue;
    if (cat.groups && cat.groups.has(item.group || "")) return cat;
  }

  // If high risk and no group match, use "kritisch"
  if (isHighRisk) return CATEGORIES.find((c) => c.isCritical) || null;

  return null;
}

/**
 * Colored icon box, 56×56, showing category icon.
 */
export default function CategoryIcon({ item, size = "md" }) {
  const cat = categoryFor(item);
  const Icon = cat ? cat.Icon : PillIcon;
  const tint = cat ? cat.tint : "neutral";
  const tintCls = TINT_CLASSES[tint] || TINT_CLASSES.neutral;

  const sizeClass = size === "sm" ? "h-12 w-12" : "h-14 w-14";

  return (
    <div className={`${sizeClass} rounded-2xl flex items-center justify-center flex-shrink-0 ${tintCls}`}>
      <Icon className="h-6 w-6" />
    </div>
  );
}
