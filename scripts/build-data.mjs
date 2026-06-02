#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import AdmZip from "adm-zip";
import { parse as parseCsv } from "csv-parse/sync";

const ROOT = process.cwd();
const IN = join(ROOT, "scripts/input");
const OUT = join(ROOT, "src/data");
const VERSION = "2026.1";

const GROUPS_SEED = JSON.parse(readFileSync(join(ROOT, "scripts/seed.json"), "utf8")).groups;

function norm(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/\p{Mn}/gu, "").replace(/[^a-z0-9]/g, "");
}

function loadAtcIndex() {
  const zipPath = join(IN, "wido-atc.zip");
  if (!existsSync(zipPath)) {
    console.warn(`[atc] ${zipPath} nicht gefunden — atc_index.json bleibt leer.`);
    return [];
  }
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries().filter((e) => /\.(csv|txt)$/i.test(e.entryName));
  if (!entries.length) throw new Error("Keine CSV/TXT im WIdO-ZIP gefunden.");
  const raw = entries[0].getData().toString("latin1");
  const rows = parseCsv(raw, { delimiter: ";", relax_column_count: true, skip_empty_lines: true });
  const atcRe = /^[A-Z]\d{2}([A-Z]{1,2}(\d{1,2})?)?$/;
  const out = [];
  const seen = new Set();
  for (const row of rows) {
    const atc = row.find((c) => atcRe.test((c || "").trim()));
    if (!atc) continue;
    const idx = row.indexOf(atc);
    const name = (row[idx + 1] || row[idx - 1] || "").trim();
    if (!name) continue;
    const key = `${atc}::${norm(name)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ atc: atc.trim(), wirkstoff: name });
  }
  return out.sort((a, b) => a.atc.localeCompare(b.atc) || a.wirkstoff.localeCompare(b.wirkstoff));
}

function loadTop250() {
  const p = join(IN, "top250.csv");
  if (!existsSync(p)) {
    console.warn(`[top250] ${p} nicht gefunden — nur Seed-Substanzen werden verwendet.`);
    return [];
  }
  const raw = readFileSync(p, "utf8");
  const rows = parseCsv(raw, { columns: true, skip_empty_lines: true, trim: true });
  return rows.map((r) => ({ wirkstoff: r.wirkstoff, atc: r.atc || null }));
}

function loadExtras() {
  const p = join(IN, "extras.json");
  if (!existsSync(p)) return {};
  return JSON.parse(readFileSync(p, "utf8"));
}

// Optional: KI-angereicherte Runtime-Einträge aus public/data/extras-runtime.json
// als Promotion-Kandidaten einlesen. Sie werden behandelt wie Top-250-Einträge
// (Seed wins on conflict).
function loadRuntimeExtras() {
  const p = join(ROOT, "public/data/extras-runtime.json");
  if (!existsSync(p)) return [];
  try {
    const store = JSON.parse(readFileSync(p, "utf8"));
    return Array.isArray(store?.entries) ? store.entries : [];
  } catch {
    console.warn(`[runtime] ${p} nicht parsebar — übersprungen.`);
    return [];
  }
}

function groupForAtc(atc, map) {
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  for (const k of keys) if (atc.startsWith(k)) return map[k];
  return null;
}

function mergeSubstances(seedSubs, top250, atcIndex, extras, groupMap, runtimeExtras = []) {
  const byNorm = new Map(seedSubs.map((s) => [norm(s.wirkstoff), s]));
  for (const t of top250) {
    const k = norm(t.wirkstoff);
    if (byNorm.has(k)) continue;
    const atc = t.atc || (atcIndex.find((a) => norm(a.wirkstoff) === k) || {}).atc;
    if (!atc) {
      console.warn(`[top250] kein ATC für "${t.wirkstoff}" — übersprungen.`);
      continue;
    }
    const group = groupForAtc(atc, groupMap);
    if (!group) {
      console.warn(`[top250] keine Gruppe für ATC ${atc} (${t.wirkstoff}) — übersprungen.`);
      continue;
    }
    const id = k;
    const xs = extras[id] || [];
    byNorm.set(k, {
      id, wirkstoff: t.wirkstoff, synonyms: [], atc, group,
      indikationen: [], extra: xs, quelle: "Top250+WIdO", stand: "2026-05",
    });
  }
  // Runtime-extras (KI-angereichert): nur übernehmen, wenn nicht schon im Bestand
  // und wenn die Pipeline-Pflicht-Felder (atc + group) erfüllt sind.
  for (const r of runtimeExtras) {
    const k = norm(r.wirkstoff);
    if (byNorm.has(k)) continue;
    if (!r.atc || !r.group) {
      console.warn(`[runtime] ${r.wirkstoff}: atc/group fehlt — als Promotion-Kandidat übersprungen.`);
      continue;
    }
    byNorm.set(k, {
      id: r.id || k,
      wirkstoff: r.wirkstoff,
      synonyms: r.synonyms || [],
      atc: r.atc,
      group: r.group,
      indikationen: r.indikationen || [],
      extra: r.notfall || [],
      quelle: r.quelle || "runtime-ki",
      stand: r.stand || "runtime",
    });
  }
  return [...byNorm.values()].sort((a, b) => a.wirkstoff.localeCompare(b.wirkstoff));
}

function validate(data, atcIndex, groupMap) {
  const errs = [];
  for (const v of Object.values(groupMap)) {
    if (!data.groups[v]) errs.push(`atc_group_map referenziert unbekannte Gruppe "${v}".`);
  }
  const atcSet = new Set(atcIndex.map((x) => x.atc));
  for (const s of data.substances) {
    if (!s.id || !s.wirkstoff || !s.atc || !s.group) errs.push(`Pflichtfeld fehlt: ${JSON.stringify(s)}`);
    if (!data.groups[s.group]) errs.push(`Substanz ${s.id}: Gruppe ${s.group} nicht in groups.`);
    if (atcIndex.length && !atcSet.has(s.atc)) console.warn(`[validate] ${s.id} ATC ${s.atc} nicht in atc_index (Hinweis).`);
  }
  const ids = data.substances.map((s) => s.id);
  if (new Set(ids).size !== ids.length) errs.push("Dublette in substance.id");
  const norms = data.substances.map((s) => norm(s.wirkstoff));
  if (new Set(norms).size !== norms.length) errs.push("Dublette in norm(wirkstoff)");
  return errs;
}

function main() {
  mkdirSync(OUT, { recursive: true });
  const groupMapSrc = JSON.parse(readFileSync(join(ROOT, "scripts/atc_group_map.source.json"), "utf8"));
  const atcIndex = loadAtcIndex();
  const top250 = loadTop250();
  const extras = loadExtras();
  const runtimeExtras = loadRuntimeExtras();
  const seed = JSON.parse(readFileSync(join(ROOT, "scripts/seed.json"), "utf8"));
  const substances = mergeSubstances(seed.substances, top250, atcIndex, extras, groupMapSrc, runtimeExtras);

  const data = { version: VERSION, groups: GROUPS_SEED, substances };
  const errs = validate(data, atcIndex, groupMapSrc);
  if (errs.length) {
    console.error("Validation failed:\n - " + errs.join("\n - "));
    process.exit(1);
  }
  writeFileSync(join(OUT, "data.json"), JSON.stringify(data, null, 2));
  writeFileSync(join(OUT, "atc_index.json"), JSON.stringify(atcIndex, null, 2));
  writeFileSync(join(OUT, "atc_group_map.json"), JSON.stringify(groupMapSrc, null, 2));
  console.log(`OK · ${substances.length} substances · ${atcIndex.length} atc_index · ${Object.keys(groupMapSrc).length} group_map entries · ${runtimeExtras.length} runtime-extras`);
}

main();
