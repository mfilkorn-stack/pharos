// Build-time-Vorberechnung der SAA-Kontraindikations-Matrix (committet).
// Für jede Katalog-Substanz (data.json) Flags gegen die 29 SAA/BPR-Medikamente.
// → Laufzeit-Check = reiner, sofortiger, offline-fähiger Lookup.
//
// LEAN: mehrere Patienten-Medis pro KI-Call (BATCH) — der 29-SAA-Kontext wird
// geteilt, das spart Input-Tokens drastisch (Rate-Limit-freundlich). Resumable
// (vorhandene Keys werden übersprungen), Backoff bei 429, Concurrency-begrenzt.
//
// Lauf:  ANTHROPIC_API_KEY=… node scripts/build-saa-matrix.mjs   (BATCH=8 CONCURRENCY=2 LIMIT=0)

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const DATA = join(ROOT, "src/modules/lexikon/data/data.json");
const SAA = join(ROOT, "src/modules/lexikon/data/saa.json");
const OUT = join(ROOT, "src/modules/lexikon/data/saa-matrix.json");

const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
const BATCH = Number(process.env.BATCH || 8);
const CONCURRENCY = Number(process.env.CONCURRENCY || 2);
const LIMIT = Number(process.env.LIMIT || 0);

if (!KEY) { console.error("[saa-matrix] ANTHROPIC_API_KEY fehlt."); process.exit(1); }
const anthropic = new Anthropic({ apiKey: KEY });

const normKey = (s) => (s || "").toLowerCase().normalize("NFD").replace(/\p{Mn}/gu, "").replace(/[^a-z0-9]/g, "");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LEVELS = new Set(["absolut", "vorsicht"]);

const saaMeds = JSON.parse(readFileSync(SAA, "utf8")).entries.map((e) => ({ id: e.id, name: e.name, kontra: e.kontra, relKontra: e.relKontra }));
const SAA_BLOCK = saaMeds.map((m) => `### ${m.id} — ${m.name}\nAbsolute KI: ${(m.kontra || []).join("; ") || "—"}\nRelative KI: ${(m.relKontra || []).join("; ") || "—"}`).join("\n\n");
const substances = JSON.parse(readFileSync(DATA, "utf8")).substances || [];

const store = existsSync(OUT)
  ? JSON.parse(readFileSync(OUT, "utf8"))
  : { version: "saa-matrix-1", generatedAt: null, model: MODEL, count: 0, entries: {} };
store.entries = store.entries || {};

let work = substances.map((s) => ({ name: s.wirkstoff, key: normKey(s.wirkstoff), synonyms: s.synonyms || [] })).filter((w) => w.key && !store.entries[w.key]);
if (LIMIT) work = work.slice(0, LIMIT);
const batches = [];
for (let i = 0; i < work.length; i += BATCH) batches.push(work.slice(i, i + BATCH));
console.log(`[saa-matrix] ${work.length} Substanzen in ${batches.length} Batches (BATCH ${BATCH}, Concurrency ${CONCURRENCY})`);

function extractJSON(t) {
  t = String(t || "").trim();
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a === -1 || b <= a) return null;
  try { return JSON.parse(t.slice(a, b + 1)); } catch { return null; }
}

function prompt(names) {
  return `Du bist erfahrener Notfallmediziner/klinischer Pharmakologe. Bewerte für JEDES der folgenden Patienten-Medikamente, ob bei einem Patienten, der es einnimmt, gegenüber den unten genannten SAA/BPR-Notfallmedikamenten eine Kontraindikation/Interaktion besteht — auf Basis der angegebenen offiziellen Kontraindikationen und bekannter Pharmakologie.

Patienten-Medikamente:
${names.map((n) => `- ${n}`).join("\n")}

SAA/BPR-Notfallmedikamente:
${SAA_BLOCK}

Stufen: "absolut" (absolute KI / gefährliche Interaktion), "vorsicht" (relative KI / aufpassen). NUR relevante Konflikte ausgeben (kein "ok").
Antworte AUSSCHLIESSLICH mit JSON: { "<Patienten-Medikament exakt wie oben>": [ {"saaId":"saa:...","level":"absolut|vorsicht","reason":"kurz, deutsch"} ], ... }. Medikamente ohne Konflikt: leeres Array.`;
}

async function callBatch(names, attempt = 0) {
  try {
    const resp = await anthropic.messages.create({ model: MODEL, max_tokens: 3500, messages: [{ role: "user", content: prompt(names) }] });
    const text = (resp.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    const obj = extractJSON(text);
    if (!obj) throw new Error("no_json");
    return obj;
  } catch (e) {
    const msg = String(e?.message || e);
    if (attempt < 4 && /429|rate|overloaded|529|timeout/i.test(msg)) {
      const wait = 8000 * (attempt + 1);
      console.log(`  … retry in ${wait / 1000}s (${msg.slice(0, 40)})`);
      await sleep(wait);
      return callBatch(names, attempt + 1);
    }
    throw e;
  }
}

let done = 0;
function save() { store.count = Object.keys(store.entries).length; writeFileSync(OUT, JSON.stringify(store, null, 2)); }

async function processBatch(batch) {
  const names = batch.map((w) => w.name);
  try {
    const obj = await callBatch(names);
    for (const w of batch) {
      const raw = Array.isArray(obj[w.name]) ? obj[w.name] : [];
      const flags = raw.filter((x) => x && LEVELS.has(x.level) && typeof x.saaId === "string").map((x) => ({ saaId: x.saaId, level: x.level, reason: String(x.reason || "").trim() }));
      store.entries[w.key] = { name: w.name, flags };
      for (const syn of w.synonyms) { const k = normKey(syn); if (k && !store.entries[k]) store.entries[k] = { name: w.name, alias: true, flags }; }
    }
    console.log(`  ✓ Batch [${names[0]} … ${names[names.length - 1]}]`);
  } catch (e) {
    console.error(`  ✗ Batch [${names[0]} …]: ${e?.message || e}`);
  } finally {
    done++;
    save();
    if (done % 5 === 0) console.log(`[saa-matrix] ${done}/${batches.length} Batches, ${store.count} Keys`);
  }
}

let bi = 0;
async function worker() { while (bi < batches.length) { const b = batches[bi++]; await processBatch(b); } }
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batches.length) }, worker));
store.generatedAt = new Date().toISOString();
save();
console.log(`[saa-matrix] fertig. ${store.count} Keys → ${OUT}`);
