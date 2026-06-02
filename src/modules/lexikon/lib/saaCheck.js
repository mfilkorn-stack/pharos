// SAA/BPR-Kontraindikations-Check — Client-Logik.
// Schicht 1 (offline, deterministisch): Text-/Klassen-Treffer der Patienten-
// Medikamente im offiziellen Kontra-Text der SAA-Medikamente.
// Schicht 2 (online): KI-Tiefenprüfung via Proxy (saaCheck in kiClient) — gemerged.

import { saaCheck as saaCheckApi } from "../../../lib/kiClient.js";

function norm(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/\p{Mn}/gu, "");
}

// Patienten-Wirkstoff/-Marke → Wirkstoffklasse + Such-Tokens, die im SAA-Kontra-
// Text auftauchen können. Bewusst kompakt; reiner Vorfilter (die KI bewertet voll).
const CLASS_MAP = [
  { re: /(marcumar|phenprocoumon|warfarin|coumadin|apixaban|rivaroxaban|edoxaban|dabigatran|eliquis|xarelto|lixiana|pradaxa|clopidogrel|prasugrel|ticagrelor|heparin|enoxaparin|clexane|tinzaparin)/, klasse: "Antikoagulation/Plättchenhemmung", tokens: ["blutung", "gerinnung", "antikoagul", "hamorrhag", "cumarin", "diathese"] },
  { re: /(ibuprofen|diclofenac|naproxen|indometacin|nsar)/, klasse: "NSAR", tokens: ["nsar", "ulcus", "salicylat", "blutung"] },
  { re: /(methotrexat|\bmtx\b)/, klasse: "Methotrexat", tokens: ["methotrexat"] },
  { re: /(tranylcypromin|moclobemid|selegilin|rasagilin|mao-?hemmer)/, klasse: "MAO-Hemmer", tokens: ["mao-hemmer", "mao hemmer"] },
  { re: /(metoprolol|bisoprolol|atenolol|nebivolol|carvedilol|propranolol|sotalol|betablocker)/, klasse: "Betablocker", tokens: ["betablock", "bradykard"] },
  { re: /(amitriptylin|doxepin|clomipramin|nortriptylin|haloperidol|quetiapin|olanzapin|risperidon|promethazin|neuroleptik|antihistamin)/, klasse: "anticholinerg wirksam (Antidepressiva/Neuroleptika/Antihistaminika)", tokens: ["anticholinerg", "antidepressiva", "neuroleptik", "antihistaminik"] },
];

const RANK = { ok: 0, vorsicht: 1, absolut: 2 };

// Schicht 1: deterministischer Text-/Klassen-Abgleich. Liefert nur Treffer
// (absolut/vorsicht) als Map id -> { id, level, reason, triggers, det:true }.
export function deterministicCheck(patientMeds, saaEntries) {
  const pats = (patientMeds || []).map((m) => ({ raw: m, n: norm(m) })).filter((p) => p.n);
  const out = {};
  for (const e of saaEntries || []) {
    const kontraN = norm((e.kontra || []).join(" | "));
    const relN = norm((e.relKontra || []).join(" | "));
    const triggers = new Set();
    let level = "ok";
    let hitToken = "";
    for (const p of pats) {
      // Tokens: Patientenname selbst + Klassen-Tokens.
      const tokens = [p.n.split(/[^a-z0-9]+/)[0]].filter((t) => t && t.length >= 4);
      for (const c of CLASS_MAP) if (c.re.test(p.n)) tokens.push(...c.tokens);
      for (const t of tokens) {
        if (kontraN.includes(t)) { if (RANK.absolut > RANK[level]) { level = "absolut"; hitToken = t; } triggers.add(p.raw); }
        else if (relN.includes(t)) { if (RANK.vorsicht > RANK[level]) { level = "vorsicht"; hitToken = t; } triggers.add(p.raw); }
      }
    }
    if (level !== "ok") {
      out[e.id] = {
        id: e.id,
        level,
        reason: `Text-Treffer „${hitToken}" in den ${level === "absolut" ? "absoluten" : "relativen"} Kontraindikationen.`,
        triggers: [...triggers],
        det: true,
      };
    }
  }
  return out;
}

// Merge: höhere Stufe gewinnt; Begründungen/Trigger zusammenführen.
export function mergeResults(detMap, aiResults) {
  const byId = { ...detMap };
  for (const r of aiResults || []) {
    const prev = byId[r.id];
    if (!prev) { byId[r.id] = { ...r, ai: true }; continue; }
    const level = RANK[r.level] >= RANK[prev.level] ? r.level : prev.level;
    const triggers = [...new Set([...(prev.triggers || []), ...(r.triggers || [])])];
    const reason = r.reason && prev.reason ? `${r.reason} (Text: ${prev.reason})` : (r.reason || prev.reason);
    byId[r.id] = { id: r.id, level, reason, triggers, det: prev.det, ai: true };
  }
  return Object.values(byId);
}

// Voller Check: Schicht 1 sofort, Schicht 2 wenn online. saaEntries = Roh-SAA
// (id, name, kontra, relKontra, uaw, besonderheiten).
export async function runSaaCheck(patientMeds, saaEntries) {
  const detMap = deterministicCheck(patientMeds, saaEntries);
  if (!navigator.onLine) {
    return { online: false, results: Object.values(detMap) };
  }
  try {
    const saaMeds = saaEntries.map((e) => ({ id: e.id, name: e.name, kontra: e.kontra, relKontra: e.relKontra, uaw: e.uaw, besonderheiten: e.besonderheiten }));
    const { results } = await saaCheckApi({ patientMeds, saaMeds });
    return { online: true, results: mergeResults(detMap, results) };
  } catch (e) {
    // KI-Fehler → wenigstens deterministische Treffer zeigen.
    return { online: true, error: String(e?.message || e), results: Object.values(detMap) };
  }
}

export function sortBySeverity(results) {
  return [...results].sort((a, b) => (RANK[b.level] - RANK[a.level]) || a.id.localeCompare(b.id));
}
