// Entfernt Flags gegen nicht existierende SAA-Medikamente aus den Matrizen.
//
// Hintergrund: die Matrix wird von der KI befüllt. Sie hat IDs wie
// "saa:tramadol" erfunden — teils mit Level "absolut" und einem reason-Text,
// der die Substanz selbst als "nicht gelistet" bezeichnet. Im Client erschien
// das als ABSOLUTE KONTRAINDIKATION gegen ein Medikament, das gar nicht zum
// Abgabekatalog gehört. Client und Server filtern das jetzt; dieses Skript
// räumt die bereits gespeicherten Daten auf.
//
// Aufruf (im Projektverzeichnis):
//   node scripts/purge-saa-phantoms.mjs           # Vorschau, ändert nichts
//   node scripts/purge-saa-phantoms.mjs --write   # schreibt (mit .bak)

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SAA = join(ROOT, "src/modules/lexikon/data/saa.json");

// Beide Matrizen: die committete Seed-Matrix und der Runtime-Cache des Proxys.
const TARGETS = [
  join(ROOT, "src/modules/lexikon/data/saa-matrix.json"),
  join(ROOT, "public/data/saa-matrix-runtime.json"),
];

const write = process.argv.includes("--write");

const validIds = new Set(JSON.parse(readFileSync(SAA, "utf8")).entries.map((e) => e.id));
console.log(`Gültige SAA-IDs: ${validIds.size}\n`);

let totalDropped = 0;

for (const path of TARGETS) {
  if (!existsSync(path)) {
    console.log(`${path} — nicht vorhanden, übersprungen.`);
    continue;
  }
  const store = JSON.parse(readFileSync(path, "utf8"));
  const entries = store.entries || {};
  const dropped = new Map();
  let touchedKeys = 0;

  for (const rec of Object.values(entries)) {
    const before = rec.flags || [];
    const after = before.filter((f) => validIds.has(f.saaId));
    if (after.length === before.length) continue;
    for (const f of before) {
      if (!validIds.has(f.saaId)) dropped.set(f.saaId, (dropped.get(f.saaId) || 0) + 1);
    }
    rec.flags = after;
    touchedKeys++;
  }

  const n = [...dropped.values()].reduce((a, b) => a + b, 0);
  totalDropped += n;
  console.log(`${path}`);
  console.log(`  Matrix-Einträge: ${Object.keys(entries).length} · betroffen: ${touchedKeys} · Flags entfernt: ${n}`);
  for (const [id, count] of [...dropped].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${id.padEnd(20)} ${count}×`);
  }

  if (n && write) {
    copyFileSync(path, `${path}.bak`);
    writeFileSync(path, `${JSON.stringify(store, null, 2)}\n`);
    console.log(`  → geschrieben (Backup: ${path}.bak)`);
  }
  console.log("");
}

if (!totalDropped) {
  console.log("Nichts zu entfernen.");
} else if (!write) {
  console.log("Vorschau — nichts geschrieben. Mit --write anwenden.");
}
