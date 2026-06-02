import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { fetchDrugInfo } from "./wikipedia.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

function loadGroupMap() {
  try {
    return JSON.parse(readFileSync(join(ROOT, "src/data/atc_group_map.json"), "utf8"));
  } catch { return {}; }
}

function norm(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/\p{Mn}/gu, "").replace(/[^a-z0-9]/g, "");
}

function groupForAtc(atc, map) {
  if (!atc) return null;
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  for (const k of keys) if (atc.startsWith(k)) return map[k];
  return null;
}

const FULL_INSTRUCTION = (name) => [
  `Erstelle für den Wirkstoff, das Medikament oder die psychoaktive Substanz "${name}" einen vollständigen generischen Nachschlage-Eintrag basierend auf öffentlich verfügbarem medizinischen Allgemeinwissen.`,
  `Wenn "${name}" ein Handelsname ist, ermittle den enthaltenen Wirkstoff und liefere die Informationen für diesen Wirkstoff.`,
  `Wenn "${name}" eine illegale Droge oder ein Straßenname ist (z.B. "Crystal Meth", "Koks", "Liquid Ecstasy"), ermittle die zugrundeliegende Substanz und liefere die toxikologisch/notfallmedizinisch relevanten Informationen für Rettungspersonal — KEINE Konsum-, Dosierungs- oder Beschaffungshinweise.`,
  ``,
  `Felder (alle PFLICHT, leer-String oder leeres Array wenn nichts bekannt):`,
  `- "wirkstoff": kanonischer Substanzname auf Deutsch (z.B. "Acetylsalicylsäure" statt "Aspirin", "Methamphetamin" statt "Crystal Meth").`,
  `- "synonyms": Array von gängigen Handelsnamen, Straßennamen und Alternativbezeichnungen (max. 6).`,
  `- "atc": offizieller ATC-Code (z.B. "B01AC06"), oder leer falls unsicher oder nicht vorhanden (illegale Drogen haben i.d.R. keinen). Niemals raten — lieber leer.`,
  `- "gruppe": kurze Substanzgruppen-Bezeichnung auf Deutsch (z.B. "Thrombozytenaggregationshemmer", "Stimulans (Amphetamin-Typ)", "Illegales Opioid").`,
  `- "indikationen": Array typischer medizinischer Indikationen, je 2-5 Wörter; bei illegalen Drogen leeres Array.`,
  `- "notfall": Array notfallrelevanter Implikationen für Rettungspersonal (bei Drogen: Intoxikations-/Überdosis-Symptome, Antidot falls vorhanden). Maximal 3 Punkte, je ein knapper Satz. Format: [{"level":"hoch"|"mittel"|"info","text":"…"}].`,
  `- "kategorie": "medikament" wenn es ein zugelassenes Arzneimittel/Wirkstoff ist, "droge" wenn es primär eine illegale/Freizeit-Substanz (psychoaktive Droge) ist, "kein_wirkstoff" wenn "${name}" KEIN echter Wirkstoff/Medikament/Substanz ist, sondern eine Verpackungs-/Darreichungsform (z.B. "Blister", "Tablette", "Ampulle"), ein generischer Begriff oder ein nicht identifizierbares Fragment. Bei "kein_wirkstoff" alle übrigen Felder leer lassen.`,
  `- "drogenklasse": NUR wenn kategorie="droge" — eine von: "opioide", "stimulanzien", "halluzinogene", "cannabinoide", "dissoziativa", "dampfdrogen" (GHB/GBL), "inhalantien" (Lachgas/Poppers). Sonst leer/null. Im Zweifel die pharmakologisch passendste wählen.`,
  ``,
  `KEINE patientenindividuelle Empfehlung, KEINE Dosierung, KEIN Markdown, KEINE Erklärung außerhalb der Felder.`,
  `Gib NUR ein JSON-Objekt zurück, keine Codeblöcke, kein Text drumherum.`,
].join("\n");

async function generateFullEntry(name, anthropic, model) {
  if (!anthropic) return null;
  try {
    const msg = await anthropic.messages.create({
      model: model || "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: FULL_INSTRUCTION(name) }],
    });
    const txt = (msg.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    const clean = txt.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
    if (process.env.DEBUG) console.log(`[enrich] Claude raw for "${name}":`, clean.slice(0, 500));
    let obj;
    try { obj = JSON.parse(clean); }
    catch (e) {
      console.error(`[enrich] JSON.parse failed for "${name}":`, e.message, "; raw:", clean.slice(0, 300));
      return null;
    }
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
      console.error(`[enrich] expected object, got ${Array.isArray(obj) ? "array" : typeof obj} for "${name}"`);
      return null;
    }
    const result = {
      wirkstoff: typeof obj.wirkstoff === "string" ? obj.wirkstoff.trim() : "",
      synonyms: Array.isArray(obj.synonyms) ? obj.synonyms.map((x) => String(x).trim()).filter(Boolean).slice(0, 6) : [],
      atc: typeof obj.atc === "string" ? obj.atc.trim() : "",
      gruppe: typeof obj.gruppe === "string" ? obj.gruppe.trim() : "",
      indikationen: Array.isArray(obj.indikationen) ? obj.indikationen.map((x) => String(x).trim()).filter(Boolean) : [],
      notfall: Array.isArray(obj.notfall)
        ? obj.notfall
            .filter((x) => x && typeof x === "object" && typeof x.text === "string")
            .map((x) => ({ level: ["hoch", "mittel", "info"].includes(x.level) ? x.level : "info", text: x.text.trim() }))
            .slice(0, 3)
        : [],
      kategorie: obj.kategorie === "droge" ? "droge" : obj.kategorie === "kein_wirkstoff" ? "kein_wirkstoff" : "medikament",
      drogenklasse: typeof obj.drogenklasse === "string" ? obj.drogenklasse.trim().toLowerCase() : "",
    };
    if (process.env.DEBUG) console.log(`[enrich] parsed for "${name}":`, JSON.stringify({ wirkstoff: result.wirkstoff, atc: result.atc, gruppe: result.gruppe, synCount: result.synonyms.length, indCount: result.indikationen.length, notfCount: result.notfall.length }));
    return result;
  } catch (e) {
    console.error("[enrich] full", e?.message || e);
    return null;
  }
}

// Vertrauenswürdige Quellen (Allowlist). `link(name, atc)` baut einen Deep-/Such-Link
// (reine URL-Konstruktion, KEIN Fetch → keine Latenz im Erkennungs-Pfad).
// Dieselbe Liste dient als allowed_domains für den Web-Search-Faktencheck (verify.mjs).
export const TRUSTED_SOURCES = [
  { domain: "gelbe-liste.de", publisher: "Gelbe Liste", link: (n) => `https://www.gelbe-liste.de/suche?term=${encodeURIComponent(n)}` },
  { domain: "fachinfo.de", publisher: "Fachinformation", link: (n) => `https://www.fachinfo.de/suche?q=${encodeURIComponent(n)}` },
  { domain: "embryotox.de", publisher: "Embryotox", link: (n) => `https://www.embryotox.de/arzneimittel/suche/?tx_solr%5Bq%5D=${encodeURIComponent(n)}` },
  { domain: "pubchem.ncbi.nlm.nih.gov", publisher: "PubChem", link: (n) => `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(n)}` },
  { domain: "go.drugbank.com", publisher: "DrugBank", link: (n) => `https://go.drugbank.com/unearth/q?searcher=drugs&query=${encodeURIComponent(n)}` },
  { domain: "whocc.no", publisher: "WHO ATC/DDD", link: (n, atc) => atc ? `https://www.whocc.no/atc_ddd_index/?code=${encodeURIComponent(atc)}` : "https://www.whocc.no/atc_ddd_index/" },
  { domain: "bfarm.de", publisher: "BfArM", link: (n) => `https://www.bfarm.de/SiteGlobals/Forms/Suche/DE/Servicesuche_Formular.html?templateQueryString=${encodeURIComponent(n)}` },
];

// Domains, die der Web-Search-Faktencheck als unabhängig & vertrauenswürdig zählt.
export const TRUST_DOMAINS = [
  "de.wikipedia.org", "en.wikipedia.org",
  ...TRUSTED_SOURCES.map((s) => s.domain),
];

// Prio-1-Quellen: echte Wikipedia-URL (falls vorhanden) + Nachschlage-Links zu Trust-DBs.
// corroborates=null → noch nicht faktengeprüft (das macht Prio 2 / verify.mjs).
function buildDeterministicSources(wirkstoff, atc, wiki) {
  const out = [];
  if (wiki?.url) {
    out.push({ url: wiki.url, title: `Wikipedia: ${wiki.wirkstoff || wirkstoff}`, publisher: "Wikipedia", domain: `${wiki.lang || "de"}.wikipedia.org`, kind: "deterministisch", corroborates: null });
  }
  for (const s of TRUSTED_SOURCES) {
    out.push({ url: s.link(wirkstoff, atc), title: `${s.publisher}: „${wirkstoff}" nachschlagen`, publisher: s.publisher, domain: s.domain, kind: "deterministisch", corroborates: null });
  }
  return out;
}

export async function enrich(name, { anthropic, model }) {
  if (!name || typeof name !== "string") return null;

  // Parallel: Wikipedia + Claude. Beide Quellen mergen, Wiki gewinnt für ATC (autoritativer),
  // Claude füllt alles, was Wiki nicht hat (insb. Notfall + Gruppen-Name + Indikationen).
  const [wiki, ai] = await Promise.all([
    fetchDrugInfo(name).catch(() => null),
    generateFullEntry(name, anthropic, model),
  ]);

  if (!wiki && !ai) return null;

  // Claude hat "${name}" als Nicht-Wirkstoff klassifiziert (Verpackungsform wie
  // "Blister", generischer Begriff, unleserliches Fragment). Nicht anlegen —
  // ein Blister ist eine Verpackung, kein Medikament.
  if (ai?.kategorie === "kein_wirkstoff") {
    console.warn(`[enrich] "${name}": kein echter Wirkstoff/Medikament (z. B. Verpackungsform) — verworfen.`);
    return null;
  }

  // Useful-Check: wenn weder ATC noch Notfall noch Indikationen vorhanden,
  // ist der Eintrag nutzlos (z.B. Fantasie-Wirkstoffname). Nicht persistieren.
  const aiHasContent = ai && (
    (ai.atc && ai.atc.length) ||
    (ai.notfall && ai.notfall.length) ||
    (ai.indikationen && ai.indikationen.length)
  );
  const wikiHasContent = wiki && (
    wiki.atc ||
    (wiki.indikationen && wiki.indikationen.length)
  );
  if (!aiHasContent && !wikiHasContent) {
    console.warn(`[enrich] "${name}": weder Wiki noch Claude haben verwertbare Daten — übersprungen.`);
    return null;
  }

  // Wirkstoff: Claude bevorzugt (kennt kanonische deutsche Bezeichnung),
  // Wiki nur als Fallback (kann auf falschen Artikel landen, z.B. Pflanze statt Wirkstoff).
  const wirkstoff = (ai?.wirkstoff || wiki?.wirkstoff || name).trim();
  // ATC: Wiki gewinnt (verifizierte Quelle), Claude als Fallback.
  const atc = wiki?.atc || ai?.atc || null;
  // Synonyme: Union, dedupliziert (first-seen-Reihenfolge).
  const synonyms = [];
  const seen = new Set();
  for (const s of [...(wiki?.synonyms || []), ...(ai?.synonyms || [])]) {
    const t = String(s).trim();
    const k = t.toLowerCase();
    if (t && !seen.has(k)) { seen.add(k); synonyms.push(t); }
  }
  // Den ursprünglich angefragten/gescannten Begriff (z. B. Handelsname wie
  // "Soventol") als Synonym voranstellen, damit der Eintrag später unter genau
  // diesem Namen gefunden wird — auch wenn KI/Wiki ihn nicht von sich aus listen.
  // Vorne einfügen → überlebt das slice(0, 6)-Limit unten.
  const qn = String(name || "").trim();
  if (qn) {
    const qk = norm(qn);
    const known = qk === norm(wirkstoff) || synonyms.some((s) => norm(s) === qk);
    if (qk && !known) synonyms.unshift(qn);
  }
  // Indikationen: Claude bevorzugt (kuratiert + kurz), Wiki nur als Fallback.
  const indikationen = (ai?.indikationen && ai.indikationen.length) ? ai.indikationen : (wiki?.indikationen || []);

  const groupMap = loadGroupMap();
  let group = groupForAtc(atc, groupMap); // groupId aus Map, oder null
  const gruppeText = ai?.gruppe || null;     // freier Text von Claude (Anzeige-Fallback)

  const notfall = ai?.notfall || [];

  // Drogen-Klassifikation: ohne ATC-Gruppe einer Drogen-Klassengruppe zuordnen,
  // damit der Eintrag in der Drogen-Kategorie landet und Klassen-Infos (Toxidrom/
  // Antidot/Notfall) via materialize() erbt.
  const DRUG_CLASSES = ["opioide", "stimulanzien", "halluzinogene", "cannabinoide", "dissoziativa", "dampfdrogen", "inhalantien"];
  const isDroge = ai?.kategorie === "droge";
  if (isDroge && !group && DRUG_CLASSES.includes(ai?.drogenklasse)) {
    group = "drogen_" + ai.drogenklasse;
  }

  // Gegenprüfung: eine Droge nur persistieren, wenn sie einer gültigen Klasse
  // zugeordnet werden konnte UND mindestens einen Notfall-Punkt hat. Sonst ist
  // die Klassifikation unsicher (z. B. Fantasiebegriff) → verwerfen.
  if (isDroge && (!group || !group.startsWith("drogen_") || !notfall.length)) {
    console.warn(`[enrich] "${name}": als Droge erkannt, aber Klasse/Notfall unzureichend — verworfen.`);
    return null;
  }

  return {
    id: norm(wirkstoff),
    wirkstoff,
    synonyms: synonyms.slice(0, 6),
    atc,
    group,                  // id für Gruppen-Vererbung (kann null sein)
    gruppe: gruppeText,     // Anzeige-Text, falls group=null
    indikationen,
    extra: [],
    notfall,
    quelle: "Wikipedia + Claude (auto)",
    stand: new Date().toISOString().slice(0, 10),
    source: "ki",
    // Prio 1: Quellen zum Prüfen sofort dabei (≥1). Prio 2 (verify.mjs) ergänzt
    // websearch-Quellen + setzt verification.status/sourceCount zeitversetzt.
    sources: buildDeterministicSources(wirkstoff, atc, wiki),
    verification: { status: "pending", sourceCount: 0, checkedAt: null, attempts: 0 },
  };
}
