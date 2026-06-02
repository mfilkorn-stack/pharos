// Prio-2-Verifizierung: prüft einen KI-Eintrag zeitversetzt gegen unabhängige,
// vertrauenswürdige Quellen via Claude Web-Search-Tool (allowed_domains = TRUST_DOMAINS).
// Liefert ein Ergebnis-Objekt zurück; der Aufrufer (ki-proxy) wendet es auf den
// Eintrag an und verwaltet attempts/Status — so bleibt verify.mjs zustandslos.

import { TRUST_DOMAINS } from "./enrich.mjs";

// Registrierbare Domain (für Unabhängigkeits-Zählung): letzte zwei Labels,
// www. entfernt. Reicht für unsere Allowlist (wikipedia.org, gelbe-liste.de,
// nih.gov, …) — Subdomains derselben Quelle zählen NICHT doppelt.
export function registrableDomain(host) {
  const parts = String(host || "").toLowerCase().replace(/^www\./, "").split(".").filter(Boolean);
  if (parts.length <= 2) return parts.join(".");
  return parts.slice(-2).join(".");
}

function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

function extractJSON(text) {
  const t = String(text || "").trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(t.slice(start, end + 1)); } catch { return null; }
}

function buildPrompt(entry) {
  const notfall = (entry.notfall || []).map((n) => `- ${n.text}`).join("\n") || "(keine)";
  return [
    `Verifiziere die folgenden Angaben zu einem Arzneistoff/einer Substanz gegen unabhängige, vertrauenswürdige Fachquellen. Nutze die Websuche.`,
    ``,
    `Zu prüfen:`,
    `- Wirkstoff/Substanz: "${entry.wirkstoff}"`,
    `- ATC-Code: ${entry.atc || "(keiner angegeben)"}`,
    `- Notfallrelevante Kernaussagen:`,
    notfall,
    ``,
    `Aufgabe: Finde Quellen, die diese Kernaussagen (Identität des Wirkstoffs, ATC, notfallmedizinische Implikationen) BESTÄTIGEN oder WIDERLEGEN. Suche gezielt bei Fachquellen.`,
    `Bewerte je Quelle: corroborates=true (bestätigt die Kernaussagen), false (widerspricht einer Kernaussage), oder null (nur erwähnt, ohne Bestätigung/Widerspruch).`,
    ``,
    `Antworte AUSSCHLIESSLICH mit diesem JSON (kein Text davor/danach, keine Codeblöcke):`,
    `{"sources":[{"url":"https://…","publisher":"Gelbe Liste","corroborates":true,"fakt":"kurz, welche Aussage geprüft wurde"}],"widerspruch":false}`,
    `Nimm nur Quellen auf, die du tatsächlich über die Websuche aufgerufen hast. "widerspruch"=true nur, wenn eine Kernaussage einer seriösen Quelle klar widerspricht.`,
  ].join("\n");
}

// Führt die Verifizierung aus. Gibt zurück:
//   { ok:true, sources:[…websearch…], sourceCount, contradiction }
//   { ok:false, error }
export async function verifyEntry(entry, { anthropic, model }) {
  if (!anthropic) return { ok: false, error: "no_api_key" };
  try {
    const resp = await anthropic.messages.create({
      model,
      max_tokens: 2500,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5, allowed_domains: TRUST_DOMAINS }],
      messages: [{ role: "user", content: buildPrompt(entry) }],
    });
    const text = (resp.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    const parsed = extractJSON(text);
    if (!parsed || !Array.isArray(parsed.sources)) {
      return { ok: false, error: "no_json" };
    }

    const allowed = new Set(TRUST_DOMAINS.map(registrableDomain));
    const corroboratingDomains = new Set();
    const sources = [];
    for (const s of parsed.sources) {
      const url = typeof s?.url === "string" ? s.url.trim() : "";
      if (!url) continue;
      const dom = domainOf(url);
      const reg = registrableDomain(dom);
      if (!allowed.has(reg)) continue; // nur Allowlist-Domains zählen/aufnehmen
      const corroborates = s.corroborates === true ? true : s.corroborates === false ? false : null;
      sources.push({
        url,
        title: typeof s.fakt === "string" && s.fakt.trim() ? s.fakt.trim() : `${s.publisher || reg}: Prüfquelle`,
        publisher: typeof s.publisher === "string" ? s.publisher.trim() : reg,
        domain: dom,
        kind: "websearch",
        corroborates,
      });
      if (corroborates === true) corroboratingDomains.add(reg);
    }

    const contradiction = parsed.widerspruch === true || sources.filter((s) => s.corroborates === false).length >= 2;
    return { ok: true, sources, sourceCount: corroboratingDomains.size, contradiction };
  } catch (e) {
    console.error("[verify]", e?.message || e);
    return { ok: false, error: String(e?.message || e) };
  }
}
