const ATC_RE = /\b[A-Z]\d{2}[A-Z]{1,2}\d{0,2}\b/;

async function fetchPage(lang, name) {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(name)}&format=json&prop=wikitext&redirects=1&utf8=1`;
  const res = await fetch(url, { headers: { "User-Agent": "WirkstoffLookup/1.0 (self-test)" } });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.parse || null;
}

function extractInfobox(wikitext, names = ["Infobox Arzneistoff", "Infobox Chemikalie"]) {
  for (const name of names) {
    const startRe = new RegExp(`\\{\\{\\s*${name}\\b`, "i");
    const m = startRe.exec(wikitext);
    if (!m) continue;
    let depth = 0, i = m.index;
    for (; i < wikitext.length; i++) {
      if (wikitext.startsWith("{{", i)) { depth++; i++; }
      else if (wikitext.startsWith("}}", i)) { depth--; i++; if (depth === 0) { return wikitext.slice(m.index + 2, i - 1); } }
    }
  }
  return null;
}

function extractField(infobox, field) {
  // Top-level fields, ignoring nested templates
  const re = new RegExp(`\\|\\s*${field}\\s*=\\s*([^\\n]*(?:\\n(?!\\|)[^\\n]*)*)`, "i");
  const m = re.exec(infobox);
  return m ? m[1].trim() : null;
}

function stripWiki(s) {
  if (!s) return "";
  return s
    .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, "$2") // [[link|text]] → text
    .replace(/\[\[([^\]]*)\]\]/g, "$1")             // [[link]] → link
    .replace(/<ref[^>]*>.*?<\/ref>/gis, "")
    .replace(/<ref[^/]*\/>/gi, "")
    .replace(/'''?/g, "")
    .replace(/&shy;/g, "")                          // soft hyphens
    .replace(/<br\s*\/?>(?:\s*)/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\{\{[^}]*\}\}/g, "")                  // remaining templates
    .replace(/^\*\s*/gm, "")                        // bullet asterisks
    .trim();
}

/** Extract ATC code from raw field value, handling {{ATC|X00|XX00}} templates */
function extractAtc(raw) {
  if (!raw) return null;
  // Try {{ATC|X00|XX00}} template first
  const templateMatch = /\{\{ATC\|([A-Z]\d{2})\|([A-Z]{1,2}\d{0,2})\}\}/i.exec(raw);
  if (templateMatch) return templateMatch[1] + templateMatch[2];
  // Fallback: plain ATC code in text
  const plain = ATC_RE.exec(stripWiki(raw));
  return plain ? plain[0] : null;
}

function splitList(s) {
  if (!s) return [];
  return s.split(/\n|,|;/).map((x) => x.trim()).filter(Boolean);
}

export async function fetchDrugInfo(name) {
  try {
    let lang = "de";
    let parse = await fetchPage("de", name);
    if (!parse) { lang = "en"; parse = await fetchPage("en", name); }
    if (!parse) return null;
    const title = parse.title || name;
    const wikitext = parse.wikitext?.["*"] || "";
    const infobox = extractInfobox(wikitext) || "";
    const atcRaw = extractField(infobox, "ATC-Code") || extractField(infobox, "ATC");
    const atc = extractAtc(atcRaw);
    const synonymsRaw = extractField(infobox, "Andere Namen") || extractField(infobox, "Synonyme") || "";
    const synonyms = splitList(stripWiki(synonymsRaw));
    const indikationenRaw = extractField(infobox, "Anwendungsgebiet") || extractField(infobox, "Indikation") || extractField(infobox, "Wirkstoffgruppe") || extractField(infobox, "Wirkstoffklasse") || "";
    const indikationen = splitList(stripWiki(indikationenRaw));
    // Aufgelöste Artikel-URL (echte, verifizierbare Quelle).
    const url = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
    return { wirkstoff: title, atc, synonyms, indikationen, lang, url };
  } catch (e) {
    console.error("[wikipedia]", e?.message || e);
    return null;
  }
}
