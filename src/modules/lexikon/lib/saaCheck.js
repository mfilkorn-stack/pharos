// SAA/BPR-Kontraindikations-Check — matrix-first (schnell & offline).
// Der Check ist eine SOFORTIGE Aggregation aus der vorberechneten Matrix
// (committet + Runtime). Nur unbekannte Medis fallen auf den deterministischen
// Text-Matcher zurück und werden im Hintergrund nachberechnet (POST /saa-matrix).

import { saaMatrix as saaMatrixApi } from "../../../lib/kiClient.js";

export function normKey(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/\p{Mn}/gu, "").replace(/[^a-z0-9]/g, "");
}

const RANK = { ok: 0, vorsicht: 1, absolut: 2 };

// Deterministischer Text-/Klassen-Vorfilter (nur für Medis ohne Matrix-Eintrag).
const CLASS_MAP = [
  { re: /(marcumar|phenprocoumon|warfarin|coumadin|apixaban|rivaroxaban|edoxaban|dabigatran|eliquis|xarelto|lixiana|pradaxa|clopidogrel|prasugrel|ticagrelor|heparin|enoxaparin|clexane|tinzaparin)/, tokens: ["blutung", "gerinnung", "antikoagul", "hamorrhag", "cumarin", "diathese"] },
  { re: /(ibuprofen|diclofenac|naproxen|indometacin|nsar)/, tokens: ["nsar", "ulcus", "salicylat", "blutung"] },
  { re: /(methotrexat|\bmtx\b)/, tokens: ["methotrexat"] },
  { re: /(tranylcypromin|moclobemid|selegilin|rasagilin|mao-?hemmer)/, tokens: ["mao-hemmer", "mao hemmer"] },
  { re: /(metoprolol|bisoprolol|atenolol|nebivolol|carvedilol|propranolol|sotalol|betablocker)/, tokens: ["betablock", "bradykard"] },
  { re: /(amitriptylin|doxepin|clomipramin|nortriptylin|haloperidol|quetiapin|olanzapin|risperidon|promethazin|neuroleptik|antihistamin)/, tokens: ["anticholinerg", "antidepressiva", "neuroleptik", "antihistaminik"] },
];

function deterministicFlags(med, saaEntries) {
  const n = normKey(med);
  const tokens = [n.slice(0, Math.max(4, n.length))].filter((t) => t.length >= 4);
  for (const c of CLASS_MAP) if (c.re.test(med.toLowerCase())) tokens.push(...c.tokens);
  const flags = [];
  for (const e of saaEntries || []) {
    const k = (e.kontra || []).join(" | ").toLowerCase().normalize("NFD").replace(/\p{Mn}/gu, "");
    const r = (e.relKontra || []).join(" | ").toLowerCase().normalize("NFD").replace(/\p{Mn}/gu, "");
    for (const t of tokens) {
      if (k.includes(t)) { flags.push({ saaId: e.id, level: "absolut", reason: `Text-Treffer „${t}" (Kontraindikation)` }); break; }
      if (r.includes(t)) { flags.push({ saaId: e.id, level: "vorsicht", reason: `Text-Treffer „${t}" (relative KI)` }); break; }
    }
  }
  return flags;
}

// Sofortige Aggregation. matrix = { [normKey]: { flags:[{saaId,level,reason}] } }.
// saaEntries = Roh-SAA (für deterministischen Fallback). Gibt zurück:
//   { results:[{id,level,reason,triggers[]}], pending:[meds ohne Matrix], cachedCount }
export function aggregateCheck(patientMeds, matrix, saaEntries) {
  const meds = (patientMeds || []).filter(Boolean);
  const byId = {};
  const pending = [];
  let cachedCount = 0;

  const add = (saaId, level, med, reason) => {
    const cur = byId[saaId];
    if (!cur || RANK[level] > RANK[cur.level]) {
      byId[saaId] = { id: saaId, level, reason: reason || cur?.reason || "", triggers: new Set(cur?.triggers || []) };
    }
    byId[saaId].triggers.add(med);
  };

  for (const med of meds) {
    const rec = matrix?.[normKey(med)];
    if (rec) {
      cachedCount++;
      for (const f of rec.flags || []) add(f.saaId, f.level, med, f.reason);
    } else {
      pending.push(med);
      for (const f of deterministicFlags(med, saaEntries)) add(f.saaId, f.level, med, f.reason);
    }
  }

  const results = Object.values(byId).map((r) => ({ id: r.id, level: r.level, reason: r.reason, triggers: [...r.triggers] }));
  return { results, pending, cachedCount };
}

export function sortBySeverity(results) {
  return [...results].sort((a, b) => (RANK[b.level] - RANK[a.level]) || a.id.localeCompare(b.id));
}

export function summarize(results) {
  let absolut = 0, vorsicht = 0;
  for (const r of results) { if (r.level === "absolut") absolut++; else if (r.level === "vorsicht") vorsicht++; }
  return { absolut, vorsicht, total: results.length };
}

// Hintergrund: fehlende Medis zur Matrix-Berechnung anstoßen (fire-and-forget).
export function triggerMatrixCompute(meds) {
  if (!navigator.onLine) return;
  for (const m of meds || []) saaMatrixApi(m).catch(() => {});
}
