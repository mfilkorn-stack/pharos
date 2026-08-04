// Backfill der Gruppen-Zuordnung in public/data/extras-runtime.json.
//
// Hintergrund: enrich.mjs hat die ATC→Gruppen-Map lange aus einem nicht
// existierenden Pfad geladen und den Fehler still geschluckt. Dadurch bekam
// jeder KI-angereicherte Eintrag `group: null` und tauchte in keinem
// Kategorie-Filter auf. Der Pfad ist gefixt — dieses Skript zieht die bereits
// gespeicherten Einträge nach.
//
// Aufruf (im Projektverzeichnis):
//   node scripts/backfill-extras-groups.mjs           # Vorschau, ändert nichts
//   node scripts/backfill-extras-groups.mjs --write   # schreibt (mit .bak)

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EXTRAS = join(ROOT, "public/data/extras-runtime.json");
const GROUP_MAP = join(ROOT, "src/modules/lexikon/data/atc_group_map.json");

const write = process.argv.includes("--write");

if (!existsSync(EXTRAS)) {
  console.error(`Keine extras-runtime.json unter ${EXTRAS} — nichts zu tun.`);
  process.exit(0);
}

const map = JSON.parse(readFileSync(GROUP_MAP, "utf8"));
// Längste Präfixe zuerst, damit z. B. C09A vor C09 greift.
const prefixes = Object.keys(map).sort((a, b) => b.length - a.length);

function groupForAtc(atc) {
  if (!atc) return null;
  const up = String(atc).toUpperCase();
  for (const p of prefixes) if (up.startsWith(p.toUpperCase())) return map[p];
  return null;
}

const store = JSON.parse(readFileSync(EXTRAS, "utf8"));
const entries = store.entries || [];

const changed = [];
const stillNone = [];

for (const e of entries) {
  if (e.group) continue; // bereits zugeordnet — nicht anfassen
  const g = groupForAtc(e.atc);
  if (g) {
    changed.push({ wirkstoff: e.wirkstoff, atc: e.atc, group: g });
    e.group = g;
  } else {
    stillNone.push({ wirkstoff: e.wirkstoff, atc: e.atc || "—" });
  }
}

console.log(`Einträge gesamt: ${entries.length}`);
console.log(`Zuordnung ergänzt: ${changed.length}`);
for (const c of changed) console.log(`  ${c.wirkstoff} (${c.atc}) → ${c.group}`);

if (stillNone.length) {
  console.log(`\nOhne Zuordnung (kein/unbekannter ATC): ${stillNone.length}`);
  for (const s of stillNone) console.log(`  ${s.wirkstoff} (ATC ${s.atc})`);
  console.log(`Diese bleiben ohne Gruppe und erscheinen im Filter "Andere".`);
}

if (!changed.length) {
  console.log("\nNichts zu ändern.");
  process.exit(0);
}

if (!write) {
  console.log(`\nVorschau — nichts geschrieben. Mit --write anwenden.`);
  process.exit(0);
}

copyFileSync(EXTRAS, `${EXTRAS}.bak`);
writeFileSync(EXTRAS, `${JSON.stringify(store, null, 2)}\n`);
console.log(`\nGeschrieben: ${EXTRAS}  (Backup: ${EXTRAS}.bak)`);
console.log("Der Client lädt die Datei direkt — kein Rebuild nötig, nur neu laden.");
