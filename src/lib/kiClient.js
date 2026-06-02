// Gemeinsamer Client fuer den Pharos-KI-Proxy (Express, server/ki-proxy.mjs).
// Loest die Proxy-Basis-URL eigenstaendig aus der Vite-Env auf, damit beide
// Module (Lexikon + Trainer) ohne Cross-Modul-Import darauf zugreifen koennen.

const KI_URL = import.meta.env.VITE_KI_PROXY_URL || "http://localhost:8787/ki";
// Basis = Proxy-URL ohne abschliessenden /ki-Pfad.
const BASE = KI_URL.replace(/\/ki(?:$|\?).*/, "");

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
  return data;
}

// Diktat-Transkript -> SINNHAFT-Sektionen.
export function uebergabeParse(transcript) {
  return post("/uebergabe/parse", { transcript });
}

// Uebergabe-Eingaben -> Score + strukturiertes Feedback.
export function uebergabeEvaluate({ scenario, startChecks, inputs }) {
  return post("/uebergabe/evaluate", { scenario, startChecks, inputs });
}

// SAA/BPR-Kontraindikations-Check: Patienten-Medis vs. SAA-Medikamente.
// -> { results: [{ id, level: "absolut"|"vorsicht"|"ok", reason, triggers[] }] }
export function saaCheck({ patientMeds, saaMeds }) {
  return post("/saa-check", { patientMeds, saaMeds });
}
