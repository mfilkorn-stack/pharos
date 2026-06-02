// SAA/BPR-Kontraindikations-Check: bewertet, ob die vom Patienten eingenommenen
// Medikamente gegenüber den SAA/BPR-Notfallmedikamenten eine absolute
// Kontraindikation (rot) oder Vorsicht (gelb) bedeuten. STRENG gegroundet im
// mitgelieferten offiziellen Kontra-Text + pharmakologischer Plausibilität.
// Entscheidungsunterstützung — keine ärztliche Anordnung.

function extractJSON(text) {
  const t = String(text || "").trim();
  // Array bevorzugt, sonst erstes {...}
  const aStart = t.indexOf("[");
  const aEnd = t.lastIndexOf("]");
  if (aStart !== -1 && aEnd > aStart) {
    try { return JSON.parse(t.slice(aStart, aEnd + 1)); } catch { /* fall through */ }
  }
  const oStart = t.indexOf("{");
  const oEnd = t.lastIndexOf("}");
  if (oStart !== -1 && oEnd > oStart) {
    try { const o = JSON.parse(t.slice(oStart, oEnd + 1)); return o.results || o.ergebnisse || o; } catch { /* */ }
  }
  return null;
}

function buildPrompt(patientMeds, saaMeds) {
  const pat = patientMeds.map((m) => `- ${m}`).join("\n") || "(keine angegeben)";
  const saa = saaMeds
    .map((m) => {
      const k = (m.kontra || []).join("; ") || "—";
      const rk = (m.relKontra || []).join("; ") || "—";
      const bes = m.besonderheiten ? ` | Besonderheiten: ${m.besonderheiten}` : "";
      return `### ${m.id} — ${m.name}\nAbsolute KI: ${k}\nRelative KI: ${rk}${bes}`;
    })
    .join("\n\n");

  return `Du bist erfahrener Notfallmediziner/klinischer Pharmakologe. Ein Patient nimmt folgende Dauermedikation:
${pat}

Prüfe für JEDES der folgenden SAA/BPR-Notfallmedikamente, ob bei DIESEM Patienten eine Kontraindikation oder ein Vorsichtsgrund besteht — auf Basis (a) der unten je Medikament angegebenen offiziellen Kontraindikationen und (b) bekannter pharmakologischer Interaktionen/Risiken.

Stufen:
- "absolut": absolute Kontraindikation / hochrelevante gefährliche Interaktion (würde Gabe verbieten).
- "vorsicht": relative Kontraindikation / Interaktion, bei der man aufpassen/überwachen muss.
- "ok": kein relevanter Konflikt mit der Dauermedikation.

SAA/BPR-Medikamente:
${saa}

Regeln: Beziehe dich auf die genannten Patienten-Medikamente. Erfinde keine Kontraindikationen, die weder im offiziellen Text stehen noch pharmakologisch klar belegt sind. "reason" kurz, deutsch, konkret (was + warum). "triggers" = Liste der auslösenden Patienten-Medikamente (leer bei "ok").

Antworte AUSSCHLIESSLICH mit einem JSON-Array, kein Text/Markdown drumherum:
[{"id":"saa:ass","level":"vorsicht","reason":"…","triggers":["Marcumar"]}]`;
}

const LEVELS = new Set(["absolut", "vorsicht", "ok"]);

export async function saaCheck({ patientMeds, saaMeds }, { anthropic, model }) {
  if (!anthropic) return { ok: false, error: "no_api_key" };
  if (!Array.isArray(patientMeds) || !patientMeds.length) return { ok: false, error: "no_patient_meds" };
  if (!Array.isArray(saaMeds) || !saaMeds.length) return { ok: false, error: "no_saa_meds" };
  try {
    const resp = await anthropic.messages.create({
      model,
      max_tokens: 3500,
      messages: [{ role: "user", content: buildPrompt(patientMeds, saaMeds) }],
    });
    const text = (resp.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    const arr = extractJSON(text);
    if (!Array.isArray(arr)) return { ok: false, error: "no_json" };
    const results = arr
      .filter((r) => r && typeof r.id === "string")
      .map((r) => ({
        id: r.id,
        level: LEVELS.has(r.level) ? r.level : "ok",
        reason: typeof r.reason === "string" ? r.reason.trim() : "",
        triggers: Array.isArray(r.triggers) ? r.triggers.map((x) => String(x).trim()).filter(Boolean) : [],
      }));
    return { ok: true, results };
  } catch (e) {
    console.error("[saa-check]", e?.message || e);
    return { ok: false, error: String(e?.message || e) };
  }
}
