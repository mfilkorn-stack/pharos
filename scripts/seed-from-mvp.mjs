import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MVP_PATH = "/Users/matthiasf/Downloads/WirkstoffLookup.jsx";
const OUT_DATA = resolve(__dirname, "../src/data/data.json");
const OUT_ATC_INDEX = resolve(__dirname, "../src/data/atc_index.json");
const OUT_ATC_GROUP_MAP = resolve(__dirname, "../src/data/atc_group_map.json");

const src = readFileSync(MVP_PATH, "utf8");

// Extract GROUPS object literal
const groupsMatch = src.match(/const GROUPS = (\{[\s\S]*?\n\};)/);
if (!groupsMatch) throw new Error("Could not find GROUPS in MVP file");
const GROUPS = eval("(" + groupsMatch[1].slice(0, -1) + ")"); // remove trailing ;

// Extract RAW array literal
const rawMatch = src.match(/const RAW = (\[[\s\S]*?\n\];)/);
if (!rawMatch) throw new Error("Could not find RAW in MVP file");
const RAW = eval("(" + rawMatch[1].slice(0, -1) + ")"); // remove trailing ;

const substances = RAW.map((item) => ({
  id: item.id,
  wirkstoff: item.wirkstoff,
  synonyms: item.handelsnamen,
  atc: item.atc,
  group: item.group,
  indikationen: item.indikationen,
  extra: item.extra || [],
  quelle: "MVP-Seed",
  stand: "2026-05",
}));

const output = {
  version: "2026.1-seed",
  groups: GROUPS,
  substances,
};

writeFileSync(OUT_DATA, JSON.stringify(output, null, 2), "utf8");
writeFileSync(OUT_ATC_INDEX, "[]", "utf8");
writeFileSync(OUT_ATC_GROUP_MAP, "{}", "utf8");

console.log(`Wrote ${substances.length} substances + ${Object.keys(GROUPS).length} groups → src/data/data.json`);
