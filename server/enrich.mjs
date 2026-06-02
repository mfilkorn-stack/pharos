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
  `- "kategorie": "medikament" wenn es ein zugelassenes Arzneimittel/Wirkstoff ist, "droge" wenn es primär eine illegale/Freizeit-Substanz (psychoaktive Droge) ist.`,
  `- "drogenklasse": NUR wenn kategorie="droge" — eine von: "opioide", "stimulanzien", "halluzinogene", "cannabinoide", "dissoziativa", "dampfdrogen" (GHB/GBL), "inhalantien" (Lachgas/Poppers). Sonst leer/null. Im Zweifel die pharmakologisch passendste wählen.`,
  ``,
  `KEINE patientenindividuelle Empfehlung, KEINE Dosierung, KEIN Markdown, KEINE Erklärung außerhalb der Felder.`,
  `Gib NUR ein JSON-Objekt zurück, keine Codeblöcke, kein Text drumherum.`,
].join("\n");

async function generateFullEntry(name, anthropic) {
  if (!anthropic) return null;
  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: FULL_INSTRUCTION(name) }],
    });
    const txt = (msg.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    const clean = txt.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    console.log(`[enrich] Claude raw for "${name}":`, clean.slice(0, 500));
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
      kategorie: obj.kategorie === "droge" ? "droge" : "medikament",
      drogenklasse: typeof obj.drogenklasse === "string" ? obj.drogenklasse.trim().toLowerCase() : "",
    };
    console.log(`[enrich] parsed for "${name}":`, JSON.stringify({ wirkstoff: result.wirkstoff, atc: result.atc, gruppe: result.gruppe, synCount: result.synonyms.length, indCount: result.indikationen.length, notfCount: result.notfall.length }));
    return result;
  } catch (e) {
    console.error("[enrich] full", e?.message || e);
    return null;
  }
}

export async function enrich(name, { anthropic }) {
  if (!name || typeof name !== "string") return null;

  // Parallel: Wikipedia + Claude. Beide Quellen mergen, Wiki gewinnt für ATC (autoritativer),
  // Claude füllt alles, was Wiki nicht hat (insb. Notfall + Gruppen-Name + Indikationen).
  const [wiki, ai] = await Promise.all([
    fetchDrugInfo(name).catch(() => null),
    generateFullEntry(name, anthropic),
  ]);

  if (!wiki && !ai) return null;

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
  // Synonyme: Union, dedupliziert, gekürzt.
  const synSet = new Set();
  for (const s of [...(wiki?.synonyms || []), ...(ai?.synonyms || [])]) {
    const t = String(s).trim();
    if (t && !synSet.has(t.toLowerCase())) synSet.add(t.toLowerCase()) && (synSet.has(t.toLowerCase()));
  }
  // Use ordered array preserving first-seen
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
  };
}
