import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { enrich } from "./enrich.mjs";
import { verifyEntry } from "./verify.mjs";
import { saaCheck } from "./saa-check.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(HERE, "..");
const EXTRAS_PATH = join(ROOT_DIR, "public/data/extras-runtime.json");
const SAA_MATRIX_PATH = join(ROOT_DIR, "public/data/saa-matrix-runtime.json");

// 29 SAA/BPR-Medikamente (für die Matrix-Berechnung) einmalig laden.
const SAA_MEDS = (() => {
  try {
    const d = JSON.parse(readFileSync(join(ROOT_DIR, "src/modules/lexikon/data/saa.json"), "utf8"));
    return (d.entries || []).map((e) => ({ id: e.id, name: e.name, kontra: e.kontra, relKontra: e.relKontra, uaw: e.uaw, besonderheiten: e.besonderheiten }));
  } catch { return []; }
})();

function loadExtras() {
  try {
    return JSON.parse(readFileSync(EXTRAS_PATH, "utf8"));
  } catch {
    return { version: "runtime-1", entries: [] };
  }
}

function saveExtras(store) {
  mkdirSync(dirname(EXTRAS_PATH), { recursive: true });
  writeFileSync(EXTRAS_PATH, JSON.stringify(store, null, 2));
}

function normName(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/\p{Mn}/gu, "").replace(/[^a-z0-9]/g, "");
}

// Seed-DB einmalig laden, um Dubletten zu KI-Anreicherungen zu erkennen
// (gleicher ATC oder überschneidender Wirkstoffname/Synonym).
const SEED = (() => {
  try {
    const d = JSON.parse(readFileSync(join(ROOT_DIR, "src/data/data.json"), "utf8"));
    const atcs = new Set();
    const names = new Set();
    for (const s of d.substances || []) {
      if (s.atc) atcs.add(String(s.atc).toUpperCase());
      names.add(normName(s.wirkstoff));
      for (const syn of s.synonyms || []) { const k = normName(syn); if (k) names.add(k); }
    }
    return { atcs, names };
  } catch { return { atcs: new Set(), names: new Set() }; }
})();

// True, wenn der angereicherte Eintrag eine Dublette eines Seed-Eintrags ist.
function isSeedDuplicate(entry) {
  if (!entry) return false;
  if (entry.atc && SEED.atcs.has(String(entry.atc).toUpperCase())) return true;
  const keys = [entry.wirkstoff, ...(entry.synonyms || [])].map(normName).filter(Boolean);
  return keys.some((k) => SEED.names.has(k));
}

const PORT = Number(process.env.KI_PROXY_PORT || 8787);
const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

if (!KEY) {
  console.error("[ki-proxy] ANTHROPIC_API_KEY fehlt in .env.local — Server startet trotzdem, /ki gibt 503.");
}

const anthropic = KEY ? new Anthropic({ apiKey: KEY }) : null;

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://www.pharos.team";

const app = express();
app.set("trust proxy", 1); // hinter Caddy: echte Client-IP aus X-Forwarded-For
app.use(cors({ origin: [ALLOWED_ORIGIN, /^http:\/\/localhost:\d+$/] }));
app.use(express.json({ limit: "8mb" }));

// Rate-Limit für die kostenpflichtigen KI-Endpunkte (Schutz vor Kosten-/Denial-of-Wallet).
const kiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "rate_limited", message: "Zu viele Anfragen — bitte kurz warten." },
});
app.use(["/ki", "/enrich", "/saa-check", "/saa-matrix", "/uebergabe/parse", "/uebergabe/evaluate"], kiLimiter);

app.get("/health", (req, res) => {
  res.json({ ok: true, hasKey: Boolean(KEY) });
});

const INSTRUCTION = [
  "Du erhältst ein Bild oder PDF einer Medikamentenpackung, eines Medikationsplans ODER eines Fundes psychoaktiver Substanzen (Drogen).",
  "Liste JEDES sichtbare Medikamenten-Produkt einzeln auf — auch wenn mehrere denselben Wirkstoff haben (z. B. Doliprane UND Efferalgan = beide Paracetamol → BEIDE auflisten).",
  "Pro Produkt: liefere den Wirkstoffnamen, sofern lesbar (wichtig für den Datenbank-Abgleich).",
  "Liefere ZUSÄTZLICH den gut lesbaren Handels-/Markennamen als EIGENEN Listeneintrag, sofern vorhanden (z. B. \"Soventol\", \"Fenistil\", \"Aspirin\") — Nutzer suchen meist nach der Marke. Ist nur eines von beidem lesbar, liefere dieses.",
  "Erfasse zur notfallmedizinischen Identifikation auch sichtbare illegale/Freizeit-Drogen: Ecstasy-/MDMA-Tabletten (oft mit Logo/Prägung), LSD-Blotter (bedrucktes Löschpapier), Pulver/Kristalle (Kokain, Amphetamin/Speed, Methamphetamin/Crystal Meth, Ketamin), Pflanzenmaterial (Cannabis, Pilze), Heroin, GHB/GBL-Flüssigkeit, Lachgas-Kartuschen/Ballons, Poppers-Fläschchen sowie Drug-Checking-/Analysebefunde.",
  "Wenn eine Droge nicht eindeutig identifizierbar ist, aber Prägung/Logo, Farbe/Form oder ein Begleittext (z. B. Drug-Checking-Befund) den Substanznamen nennt, liefere den Substanznamen (z. B. \"MDMA\", \"Kokain\", \"LSD\").",
  "Auch Produkte am Bildrand, schräg, teilweise verdeckt oder kleingedruckt sollen erfasst werden, sofern der Name bzw. die Substanz eindeutig erkennbar ist.",
  "Liefere AUSSCHLIESSLICH echte Wirkstoff-, Handels-/Marken- oder Substanznamen. Gib NIEMALS reine Verpackungs- oder Darreichungsformen oder generische Begriffe als Eintrag zurück (z. B. \"Blister\", \"Tablette\", \"Kapsel\", \"Ampulle\", \"Durchstechflasche\", \"Tropfen\", \"Spritze\", \"Pflaster\", \"Pulver\", \"Salbe\", \"Zäpfchen\", \"Beipackzettel\") — sie sind kein Medikament. Ist nur eine solche Form lesbar, aber kein Substanz-/Markenname, lasse den Eintrag weg.",
  "Rate NICHT bei reinen Pulvern/Tabletten ohne identifizierende Merkmale — im Zweifel weglassen statt erfinden.",
  "Dedupliziere NICHT nach Wirkstoff — wenn fünf verschiedene Packungen Paracetamol enthalten, liefere fünf Einträge.",
  "Ignoriere strikt: Patientennamen, Geburtsdaten, Adressen, Telefonnummern, Diagnosen, Indikationen, Dosierungen, Mengenangaben, Einnahmezeiten und alle sonstigen Angaben.",
  "Gib NUR ein JSON-Array von Strings zurück. Keine Erklärung, kein Markdown, keine Codeblöcke.",
  'Beispiel-Output: ["Doliprane", "Efferalgan", "Kardegic", "Acetylsalicylsäure", "MDMA"]',
].join(" ");

app.post("/ki", async (req, res) => {
  if (!anthropic) return res.status(503).json({ error: "no_api_key" });
  const { mediaType, dataBase64, source } = req.body || {};
  if (!mediaType || !dataBase64) return res.status(400).json({ error: "missing_media" });

  const isPdf = mediaType === "application/pdf";
  const media = isPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: dataBase64 } }
    : { type: "image", source: { type: "base64", media_type: mediaType, data: dataBase64 } };

  try {
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: [media, { type: "text", text: INSTRUCTION + (source ? ` Kontext: ${source}.` : "") }] }],
    });
    const txt = (msg.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    const clean = txt.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
    let arr;
    try { arr = JSON.parse(clean); } catch { arr = []; }
    if (!Array.isArray(arr)) arr = [];
    const names = arr.map((x) => String(x).trim()).filter(Boolean);
    res.json({ names });
  } catch (err) {
    console.error("[ki-proxy]", err?.message || err);
    res.status(502).json({ error: "upstream", message: String(err?.message || err) });
  }
});

app.post("/enrich", async (req, res) => {
  if (!anthropic) return res.status(503).json({ error: "no_api_key" });
  const { name } = req.body || {};
  if (!name || typeof name !== "string") return res.status(400).json({ error: "missing_name" });
  if (name.length > 120) return res.status(400).json({ error: "name_too_long" });
  try {
    const store = loadExtras();
    const key = normName(name);
    const existing = store.entries.find((e) => normName(e.wirkstoff) === key);
    if (existing) return res.json({ entry: existing, cached: true });
    const entry = await enrich(name, { anthropic, model: MODEL });
    if (!entry) return res.status(502).json({ error: "enrich_failed" });
    // Dublettenprüfung: nicht persistieren, wenn der Eintrag eine Dublette eines
    // Seed-Eintrags (gleicher ATC/Name) oder eines bestehenden Extras ist —
    // sonst wächst extras-runtime.json mit Duplikaten (z. B. „Metoprololsuccinat").
    const isExtraDupe = store.entries.some((e) =>
      e.id === entry.id ||
      (entry.atc && e.atc && String(e.atc).toUpperCase() === String(entry.atc).toUpperCase()) ||
      normName(e.wirkstoff) === normName(entry.wirkstoff)
    );
    if (!isSeedDuplicate(entry) && !isExtraDupe) {
      store.entries.push(entry);
      saveExtras(store);
      queueVerify(entry.id); // Prio 2: zeitversetzt verifizieren (blockiert die Antwort nicht)
      queueSaaMatrix(entry.wirkstoff); // Prio 2: SAA-Kontra-Matrix im Hintergrund vorberechnen
    } else {
      console.log(`[enrich] "${name}" ist Dublette — nicht persistiert.`);
    }
    res.json({ entry, cached: false });
  } catch (err) {
    console.error("[enrich]", err?.message || err);
    res.status(500).json({ error: "internal", message: String(err?.message || err) });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Prio-2-Verifizierung: In-Process-Queue (Concurrency 1) + periodischer Sweep.
// Blockiert nie den Erkennungs-/Enrich-Pfad. Status wird in extras-runtime.json
// persistiert; der Client pollt die Datei und aktualisiert den Badge.
// ─────────────────────────────────────────────────────────────────────────
const VERIFY_MAX_ATTEMPTS = 3;
const VERIFY_SWEEP_MS = 4 * 60 * 1000;
const verifyQueue = [];
const queued = new Set();
let verifyRunning = false;

function queueVerify(id) {
  if (!id || queued.has(id) || !anthropic) return;
  queued.add(id);
  verifyQueue.push(id);
  runVerifyWorker();
}

async function runVerifyWorker() {
  if (verifyRunning || !anthropic) return;
  verifyRunning = true;
  try {
    while (verifyQueue.length) {
      const id = verifyQueue.shift();
      queued.delete(id);
      try { await verifyOne(id); } catch (e) { console.error("[verify] worker", e?.message || e); }
    }
  } finally {
    verifyRunning = false;
  }
}

function computeStatus(result, attempts) {
  if (!result.ok) return attempts >= VERIFY_MAX_ATTEMPTS ? "fehlgeschlagen" : "pending";
  if (result.contradiction) return "widerspruch";
  if (result.sourceCount >= 5) return "valide";
  if (result.sourceCount >= 1) return "teilverifiziert";
  return attempts >= VERIFY_MAX_ATTEMPTS ? "fehlgeschlagen" : "pending";
}

async function verifyOne(id) {
  const pre = loadExtras();
  const entry = pre.entries.find((e) => e.id === id);
  if (!entry || entry.source !== "ki") return;

  const result = await verifyEntry(entry, { anthropic, model: MODEL });

  // Store nach dem await neu laden (könnte sich geändert haben), dann mutieren.
  const store = loadExtras();
  const e2 = store.entries.find((x) => x.id === id);
  if (!e2) return;
  const attempts = (e2.verification?.attempts || 0) + 1;

  if (result.ok && result.sources?.length) {
    const existing = Array.isArray(e2.sources) ? e2.sources : [];
    const seen = new Set(existing.map((s) => s.url));
    for (const s of result.sources) if (!seen.has(s.url)) { seen.add(s.url); existing.push(s); }
    e2.sources = existing;
  }
  e2.verification = {
    status: computeStatus(result, attempts),
    sourceCount: result.ok ? result.sourceCount : (e2.verification?.sourceCount || 0),
    checkedAt: new Date().toISOString(),
    attempts,
  };
  saveExtras(store);
  console.log(`[verify] "${e2.wirkstoff}" → ${e2.verification.status} (${e2.verification.sourceCount} Quellen, Versuch ${attempts})`);
}

// Sweep: offene Einträge (pending / Altbestand ohne verification) erneut einreihen.
function sweepVerify() {
  if (!anthropic) return;
  const store = loadExtras();
  for (const e of store.entries) {
    if (e.source !== "ki") continue;
    const status = e.verification?.status;
    if (!e.verification || status === "pending") queueVerify(e.id);
  }
}

// Manueller Trigger (Prio-2 on demand, z. B. „Jetzt prüfen").
app.post("/verify", (req, res) => {
  if (!anthropic) return res.status(503).json({ error: "no_api_key" });
  const { id } = req.body || {};
  if (!id || typeof id !== "string") return res.status(400).json({ error: "missing_id" });
  queueVerify(id);
  res.json({ ok: true, queued: true });
});

// ─────────────────────────────────────────────────────────────────────────
// Übergabe-Trainer (SINNHAFT) — portiert aus sinnhaft/src/app/api/claude/route.js
// ─────────────────────────────────────────────────────────────────────────

// Robuste JSON-Extraktion aus KI-Antworten (greift erstes {...}-Objekt).
function extractJSON(text) {
  const trimmed = String(text || "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Keine JSON-Struktur. KI sagte: "${trimmed.slice(0, 200)}"`);
  }
  return JSON.parse(trimmed.slice(start, end + 1));
}

function buildParsePrompt(transcript) {
  return `Du bist Experte für SINNHAFT-strukturierte Übergaben (Gräff et al. 2023) im deutschen Rettungsdienst. Du erhältst ein automatisch transkribiertes Übergabe-Transkript (kann Erkennungsfehler enthalten, besonders bei Fachsprache) und klassifizierst die Inhalte in SINNHAFT-Sender-Sektionen.

Transkript einer gesprochenen Übergabe:
"${transcript}"

Aufgabe:
1. Korrigiere offensichtliche Spracherkennungs-Fehler bei Fachbegriffen (z.B. "GTS" → "GCS", "Markumar" → "Marcumar", "ABC DE" → "ABCDE", "Apixiban" → "Apixaban").
2. Klassifiziere die Inhalte in die fünf inhaltlichen SINNHAFT-Sender-Sektionen.
3. Bei fehlendem Inhalt: leerer String.
4. Bewahre Originalformulierungen so weit möglich.
5. Erkenne, ob "Start" am Anfang gesagt wurde.

Antworte AUSSCHLIESSLICH mit diesem JSON, kein Text davor oder danach, keine Codefences:

{"startSaid":true,"sections":{"identifikation":"...","notfallereignis":"...","notfallprioritaet":"...","handlung":"...","anamnese":"..."}}`;
}

function buildEvaluatePrompt(scenario, startChecks, inputs) {
  const startStatus = [
    "Manipulationen am Patienten gestoppt",
    "Face-to-Face Position zum aufnehmenden Team",
    '"Start" laut ausgesprochen',
  ]
    .map((item, i) => `- ${item}: ${startChecks[i] ? "ja" : "nein"}`)
    .join("\n");

  const userInputs = [
    ["I", "Identifikation", inputs.identifikation],
    ["N", "Notfallereignis", inputs.notfallereignis],
    ["N", "Notfallpriorität", inputs.notfallprioritaet],
    ["H", "Handlung", inputs.handlung],
    ["A", "Anamnese", inputs.anamnese],
  ]
    .map(([letter, label, val]) => `[${letter} – ${label}]\n${(val || "(leer)").trim()}`)
    .join("\n\n");

  const scenarioContext = scenario
    ? `
SZENARIO-REALITÄT
Titel: ${scenario.title} (${scenario.category})
Einsatzort: ${scenario.einsatzort}
Übergabe an: ${scenario.transport}
Patient: ${scenario.patient}
Situation: ${scenario.situation}
Anamnese: ${scenario.anamnese}
Befund ABCDE:
  A: ${scenario.befund.A}
  B: ${scenario.befund.B}
  C: ${scenario.befund.C}
  D: ${scenario.befund.D}
  E: ${scenario.befund.E}
Arbeitsdiagnose: ${scenario.verdacht}
Maßnahmen: ${scenario.massnahmen.join(" | ")}
Bewusst unterlassen: ${scenario.bewusstUnterlassen}
Aktueller Verlauf: ${scenario.verlauf}`.trim()
    : "FREIE ÜBERGABE — kein vorgegebenes Szenario. Bewerte ausschließlich nach SINNHAFT-Struktur, Vollständigkeit und klinischer Plausibilität. Kein Abgleich mit Musterlösung.";

  return `Du bist ein erfahrener leitender Notarzt und Ausbilder für Notfallsanitäter in Deutschland. Du bewertest präklinische Patientenübergaben STRIKT nach dem SINNHAFT-Schema (Gräff et al. 2023).

SINNHAFT: S=Start, I=Identifikation, N=Notfallereignis, N=Notfallpriorität (ABCDE), H=Handlung, A=Anamnese (SAMPLER+), F=Fazit (Empfänger), T=Teamfragen (Empfänger).

## Kontext (Szenario-Realität)
${scenarioContext}

## Übergabe des Auszubildenden

### S — Start (Checkliste)
${startStatus}

### Sender-Inhalte
${userInputs}

## Aufgabe
Bewerte die Sender-Sektionen (S, I, N, N, H, A) und SIMULIERE das aufnehmende Team (F=Fazit, T=Teamfragen) wie ein erfahrenes ZNA-/Schockraum-Team.

Antworte AUSSCHLIESSLICH mit diesem JSON, kein Text davor oder danach, keine Codefences:

{
  "score": <0-100>,
  "verdict": "<max 20 Wörter Gesamteindruck>",
  "strengths": ["<S1>", "<S2>"],
  "improvements": ["<V1>", "<V2>", "<V3>"],
  "sectionFeedback": [
    {"key": "start", "rating": "gut|teilweise|fehlt", "comment": "<max 25 Wörter>"},
    {"key": "identifikation", "rating": "...", "comment": "..."},
    {"key": "notfallereignis", "rating": "...", "comment": "..."},
    {"key": "notfallprioritaet", "rating": "...", "comment": "..."},
    {"key": "handlung", "rating": "...", "comment": "..."},
    {"key": "anamnese", "rating": "...", "comment": "..."}
  ],
  "simulatedFazit": "<Closed-Loop des aufnehmenden Teams, 2-3 Sätze, beginnt mit 'Verstanden:'>",
  "simulatedTeamfragen": ["<Q1>", "<Q2>", "<Q3>"],
  "topTip": "<umsetzbarer Tipp, max 30 Wörter>"
}

Bewertungskriterien: Vollständigkeit aller SINNHAFT-Sektionen, Korrektheit gegen die Realität, ABCDE-Strukturierung bei der Notfallpriorität, Nennung bewusst unterlassener Maßnahmen, klinische Priorisierung (was muss das aufnehmende Team ZUERST wissen?), Dauer ≤120s, stakkato-artig, keine Redundanzen. Bei den simulierten Teamfragen: Lücken in der Übergabe gezielt adressieren.`;
}

async function runTrainerPrompt(res, prompt, maxTokens) {
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });
    const text = (response.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
    res.json(extractJSON(text));
  } catch (err) {
    console.error("[uebergabe]", err?.message || err);
    res.status(502).json({ error: String(err?.message || err) });
  }
}

app.post("/uebergabe/parse", async (req, res) => {
  if (!anthropic) return res.status(503).json({ error: "no_api_key" });
  const { transcript } = req.body || {};
  if (!transcript || typeof transcript !== "string") {
    return res.status(400).json({ error: "transcript fehlt" });
  }
  if (transcript.length > 8000) return res.status(400).json({ error: "transcript_too_long" });
  await runTrainerPrompt(res, buildParsePrompt(transcript), 1500);
});

// ─────────────────────────────────────────────────────────────────────────
// SAA-Matrix (Prio-1-Geschwindigkeit): pro Patienten-Medikament EINMAL gegen die
// 29 SAA-Medis rechnen, in saa-matrix-runtime.json cachen. Der Client-Check liest
// dann nur noch aus der Matrix (sofort, offline). KI läuft hier im Hintergrund.
// ─────────────────────────────────────────────────────────────────────────
function loadMatrix() {
  try { return JSON.parse(readFileSync(SAA_MATRIX_PATH, "utf8")); }
  catch { return { version: "saa-matrix-runtime-1", entries: {} }; }
}
function saveMatrix(store) {
  mkdirSync(dirname(SAA_MATRIX_PATH), { recursive: true });
  writeFileSync(SAA_MATRIX_PATH, JSON.stringify(store, null, 2));
}

const matrixQueue = [];
const matrixQueued = new Set();
let matrixRunning = false;

function queueSaaMatrix(name) {
  const key = normName(name);
  if (!key || matrixQueued.has(key) || !anthropic || !SAA_MEDS.length) return;
  // Schon gecacht? dann nicht erneut.
  if (loadMatrix().entries[key]) return;
  matrixQueued.add(key);
  matrixQueue.push(name);
  runMatrixWorker();
}

async function runMatrixWorker() {
  if (matrixRunning || !anthropic) return;
  matrixRunning = true;
  try {
    while (matrixQueue.length) {
      const name = matrixQueue.shift();
      matrixQueued.delete(normName(name));
      try { await computeMatrixOne(name); } catch (e) { console.error("[saa-matrix] worker", e?.message || e); }
    }
  } finally {
    matrixRunning = false;
  }
}

async function computeMatrixOne(name) {
  const key = normName(name);
  if (!key) return;
  const r = await saaCheck({ patientMeds: [name], saaMeds: SAA_MEDS }, { anthropic, model: MODEL });
  if (!r.ok) return;
  const flags = (r.results || []).filter((x) => x.level !== "ok").map((x) => ({ saaId: x.id, level: x.level, reason: x.reason }));
  const store = loadMatrix();
  store.entries[key] = { name, flags, checkedAt: new Date().toISOString() };
  saveMatrix(store);
  console.log(`[saa-matrix] "${name}" → ${flags.length} Flag(s) gecacht`);
}

// Trigger: Matrix für ein Med berechnen (fire-and-forget). Liefert evtl. bereits gecachte Flags.
app.post("/saa-matrix", (req, res) => {
  if (!anthropic) return res.status(503).json({ error: "no_api_key" });
  const { name } = req.body || {};
  if (!name || typeof name !== "string") return res.status(400).json({ error: "missing_name" });
  if (name.length > 120) return res.status(400).json({ error: "name_too_long" });
  const cached = loadMatrix().entries[normName(name)];
  if (!cached) queueSaaMatrix(name);
  res.json({ cached: Boolean(cached), flags: cached?.flags || null });
});

app.post("/saa-check", async (req, res) => {
  if (!anthropic) return res.status(503).json({ error: "no_api_key" });
  const { patientMeds, saaMeds } = req.body || {};
  const r = await saaCheck({ patientMeds, saaMeds }, { anthropic, model: MODEL });
  if (!r.ok) return res.status(r.error === "no_patient_meds" || r.error === "no_saa_meds" ? 400 : 502).json({ error: r.error });
  res.json({ results: r.results });
});

app.post("/uebergabe/evaluate", async (req, res) => {
  if (!anthropic) return res.status(503).json({ error: "no_api_key" });
  const { scenario, startChecks, inputs } = req.body || {};
  if (!inputs) return res.status(400).json({ error: "inputs benötigt" });
  await runTrainerPrompt(res, buildEvaluatePrompt(scenario || null, startChecks || {}, inputs), 2500);
});

app.listen(PORT, () => {
  console.log(`[ki-proxy] http://localhost:${PORT}  (key: ${KEY ? "ja" : "FEHLT"}, model: ${MODEL})`);
  // Prio-2-Verifizierung: initialer Sweep (greift Altbestand/pending auf) + Intervall.
  if (anthropic) {
    setTimeout(sweepVerify, 10_000);
    setInterval(sweepVerify, VERIFY_SWEEP_MS);
  }
});
