import "dotenv/config";
import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { enrich } from "./enrich.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(HERE, "..");
const EXTRAS_PATH = join(ROOT_DIR, "public/data/extras-runtime.json");

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

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "20mb" }));

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
    const clean = txt.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
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
  try {
    const store = loadExtras();
    const key = normName(name);
    const existing = store.entries.find((e) => normName(e.wirkstoff) === key);
    if (existing) return res.json({ entry: existing, cached: true });
    const entry = await enrich(name, { anthropic });
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
  await runTrainerPrompt(res, buildParsePrompt(transcript), 1500);
});

app.post("/uebergabe/evaluate", async (req, res) => {
  if (!anthropic) return res.status(503).json({ error: "no_api_key" });
  const { scenario, startChecks, inputs } = req.body || {};
  if (!inputs) return res.status(400).json({ error: "inputs benötigt" });
  await runTrainerPrompt(res, buildEvaluatePrompt(scenario || null, startChecks || {}, inputs), 2500);
});

app.listen(PORT, () => {
  console.log(`[ki-proxy] http://localhost:${PORT}  (key: ${KEY ? "ja" : "FEHLT"}, model: ${MODEL})`);
});
