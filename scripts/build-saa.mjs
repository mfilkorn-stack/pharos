// Einmal-/On-demand-Transform: liest die SAA/BPR-Notfallmedikamente (MEDICATIONS)
// aus dem NotsanTrainer-Projekt und schreibt sie als committetes saa.json in die App.
// Quelle (CommonJS, exportiert u.a. MEDICATIONS): NotsanTrainer2025/data.js (SAA/BPR 2025).
// Override des Quellpfads via SAA_SOURCE-Env möglich.

import { createRequire } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const SRC = process.env.SAA_SOURCE || "/Users/matthiasf/NotsanTrainer2025/data.js";
const OUT = join(ROOT, "src/modules/lexikon/data/saa.json");

const require = createRequire(import.meta.url);

let data;
try {
  data = require(SRC);
} catch (e) {
  console.error(`[build-saa] Quelle nicht lesbar: ${SRC}\n${e?.message || e}`);
  process.exit(1);
}

const meds = Array.isArray(data?.MEDICATIONS) ? data.MEDICATIONS : [];
if (!meds.length) {
  console.error("[build-saa] MEDICATIONS leer oder nicht gefunden — Abbruch.");
  process.exit(1);
}

const entries = meds.map((m) => ({
  id: "saa:" + String(m.id || "").toLowerCase(),
  name: m.name || "",
  gruppe: m.gruppe || "",
  konzentration: m.konzentration || "",
  indikationen: Array.isArray(m.indikationen) ? m.indikationen : [],
  kontra: Array.isArray(m.kontra) ? m.kontra : [],
  relKontra: Array.isArray(m.relKontra) ? m.relKontra : [],
  dosierung: m.dosierung || "",
  uaw: Array.isArray(m.uaw) ? m.uaw : [],
  besonderheiten: m.besonderheiten || "",
  alter: m.alter || "",
}));

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify({ version: "saa-1", source: "NotsanTrainer2025/data.js (SAA/BPR 2025)", count: entries.length, entries }, null, 2),
);
console.log(`[build-saa] ${entries.length} SAA-Medikamente → ${OUT}`);
