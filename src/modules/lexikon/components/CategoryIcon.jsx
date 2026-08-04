import {
  HeartIcon,
  LungsIcon,
  DropletIcon,
  BrainIcon,
  AlertTriangleIcon,
  PillIcon,
  FlaskIcon,
  SyringeIcon,
  MedicalCrossIcon,
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
    // Label bewusst "Neuro/Psyche": die Kategorie enthielt schon immer
    // Antidepressiva und Benzodiazepine, jetzt zusätzlich Antipsychotika,
    // Lithium und Psychostimulanzien — "Neurologie" allein war irreführend.
    key: "neuro",
    label: "Neuro/Psyche",
    emoji: "🧠",
    tint: "neuro",
    Icon: BrainIcon,
    groups: new Set(["antiepileptikum","parkinson","ssri","snri","trizyklisch","mirtazapin","benzodiazepin","z_substanz","triptan","antipsychotikum","lithium","psychostimulans"]),
  },
  {
    key: "schmerz",
    label: "Schmerz",
    emoji: "🩹",
    tint: "warning",
    Icon: PillIcon,
    groups: new Set(["opioid","nsar","nonopioid_analget"]),
  },
  {
    key: "diabetes",
    label: "Diabetes",
    emoji: "🍬",
    tint: "accent",
    Icon: SyringeIcon,
    groups: new Set(["insulin","biguanid","sulfonylharnstoff","sglt2","dpp4","glp1_ra"]),
  },
  {
    key: "infekt",
    label: "Infekt",
    emoji: "🦠",
    tint: "info",
    Icon: FlaskIcon,
    groups: new Set(["penicillin","cephalosporin","makrolid","fluorchinolon","tetracyclin","sulfonamid","nitroimidazol","azol_antimykot"]),
  },
  {
    key: "allergie",
    label: "Allergie",
    emoji: "🤧",
    tint: "neuro",
    Icon: DropletIcon,
    groups: new Set(["h1_antihist2","antihistaminikum1","glukokortikoid"]),
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
  {
    key: "saa",
    label: "SAA/BPR",
    emoji: "🚑",
    tint: "accent",
    Icon: MedicalCrossIcon,
    isSaa: true,
    groups: null,
  },
  // Auffangkategorie, bewusst als letzter Chip. Sie greift für alles, dessen
  // `group` in keiner der Gruppen-Kategorien oben steht — inklusive Einträgen
  // ganz ohne Gruppe (group=null). Damit ist jeder Eintrag über mindestens
  // einen Filter erreichbar, auch wenn die Datenbasis später neue Gruppen
  // bekommt, für die es hier noch keine eigene Kategorie gibt.
  {
    key: "andere",
    label: "Andere",
    emoji: "💊",
    tint: "neutral",
    Icon: PillIcon,
    isOther: true,
    groups: null,
  },
];

// Alle Gruppen-IDs, die von einer Kategorie oben abgedeckt sind. Basis für die
// Auffangkategorie — aus CATEGORIES abgeleitet, damit beides nicht auseinanderläuft.
export const CATEGORIZED_GROUPS = new Set(
  CATEGORIES.filter((c) => c.groups).flatMap((c) => [...c.groups])
);

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
  if (item.source === "saa") return CATEGORIES.find((c) => c.isSaa) || null;
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
