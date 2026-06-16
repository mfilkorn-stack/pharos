/**
 * sources.js — gemeinsame Quellen-Policy für Medikamente & Drogen.
 *
 * Pure ES-Modul: kein import.meta.env, kein JSX, keine Browser-APIs.
 * Importierbar von server/ (Node ESM) UND React-Komponenten (Vite).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Hilfsfunktion für URL-sichere Slugs (einfache Kleinbuchstaben/Zahlen,
// Sonderzeichen entfernt — für EUDA/mindzone/checkit-Pfade).
// ─────────────────────────────────────────────────────────────────────────────
function slugify(name) {
  return (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")          // Diakritika weg
    .replace(/[^a-z0-9]+/g, "-")      // Nicht-Alphanumerisch → Bindestrich
    .replace(/^-+|-+$/g, "");         // führende/trailing Bindestriche
}

// ─────────────────────────────────────────────────────────────────────────────
// MED_SOURCES — die 7 bisherigen Med-Quellen (aus server/enrich.mjs übernommen).
// role:"auth" → zählen als Verify-Korroboration.
// ─────────────────────────────────────────────────────────────────────────────
export const MED_SOURCES = [
  {
    id: "gelbe-liste",
    publisher: "Gelbe Liste",
    domain: "gelbe-liste.de",
    role: "auth",
    lang: "de",
    link: (n) => `https://www.gelbe-liste.de/suche?term=${encodeURIComponent(n)}`,
  },
  {
    id: "fachinfo",
    publisher: "Fachinformation",
    domain: "fachinfo.de",
    role: "auth",
    lang: "de",
    link: (n) => `https://www.fachinfo.de/suche?q=${encodeURIComponent(n)}`,
  },
  {
    id: "embryotox",
    publisher: "Embryotox",
    domain: "embryotox.de",
    role: "auth",
    lang: "de",
    link: (n) => `https://www.embryotox.de/arzneimittel/suche/?tx_solr%5Bq%5D=${encodeURIComponent(n)}`,
  },
  {
    id: "pubchem",
    publisher: "PubChem",
    domain: "pubchem.ncbi.nlm.nih.gov",
    role: "auth",
    lang: "en",
    link: (n) => `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(n)}`,
  },
  {
    id: "drugbank",
    publisher: "DrugBank",
    domain: "go.drugbank.com",
    role: "auth",
    lang: "en",
    link: (n) => `https://go.drugbank.com/unearth/q?searcher=drugs&query=${encodeURIComponent(n)}`,
  },
  {
    id: "whocc",
    publisher: "WHO ATC/DDD",
    domain: "whocc.no",
    role: "auth",
    lang: "en",
    link: (n, atc) =>
      atc
        ? `https://www.whocc.no/atc_ddd_index/?code=${encodeURIComponent(atc)}`
        : "https://www.whocc.no/atc_ddd_index/",
  },
  {
    id: "bfarm",
    publisher: "BfArM",
    domain: "bfarm.de",
    role: "auth",
    lang: "de",
    link: (n) =>
      `https://www.bfarm.de/SiteGlobals/Forms/Suche/DE/Servicesuche_Formular.html?templateQueryString=${encodeURIComponent(n)}`,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DRUG_SOURCES_AUTH — Fachquellen für Drogen (Toxikologie/Pharmakologie).
// role:"auth" → zählen als Verify-Korroboration.
//
// URL-Validierung (Schritt 1):
//   EUDA:    euda.europa.eu/publications/drug-profiles/[slug]_en  (live bestätigt)
//   PubChem: #query= (bestätigt)
//   DrugBank: unearth/q?query= (bestätigt)
//   GIZ Tox: Notfall-Hotline-Seite (stabile Landing-URL)
//   NIDA:    /research-topics/drugs-a-to-z (stabile A-Z-Seite, kein per-Substanz-Slug)
// ─────────────────────────────────────────────────────────────────────────────
export const DRUG_SOURCES_AUTH = [
  {
    id: "euda",
    publisher: "EUDA Drug Profiles",
    domain: "euda.europa.eu",
    role: "auth",
    lang: "en",
    // Per-Substanz-Profil wenn Slug einfach ist, sonst Landing.
    link: (n) => {
      const s = slugify(n);
      return s
        ? `https://www.euda.europa.eu/publications/drug-profiles/${encodeURIComponent(s)}_en`
        : "https://www.euda.europa.eu/publications/drug-profiles_en";
    },
  },
  {
    id: "pubchem",
    publisher: "PubChem",
    domain: "pubchem.ncbi.nlm.nih.gov",
    role: "auth",
    lang: "en",
    link: (n) => `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(n)}`,
  },
  {
    id: "drugbank",
    publisher: "DrugBank",
    domain: "go.drugbank.com",
    role: "auth",
    lang: "en",
    link: (n) => `https://go.drugbank.com/unearth/q?searcher=drugs&query=${encodeURIComponent(n)}`,
  },
  {
    id: "giztox",
    publisher: "GIZ Tox München",
    domain: "toxikologie.mri.tum.de",
    role: "auth",
    lang: "de",
    // Stabile Giftnotruf-Referenzseite (keine per-Substanz-Such-URL bestätigt).
    link: () => "https://toxikologie.mri.tum.de/de/giftnotruf-muenchen",
  },
  {
    id: "nida",
    publisher: "NIDA",
    domain: "nida.nih.gov",
    role: "auth",
    lang: "en",
    // Stabile A-Z-Seite (keine per-Substanz-Such-URL, anchor-basiert).
    link: () => "https://nida.nih.gov/research-topics/drugs-a-to-z",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DRUG_SOURCES_HARMRED — Drug-Checking / Substanzwarnungen.
// role:"harm_reduction" → informativer Deeplink, zählt NICHT als Verify-Beleg.
//
// URL-Validierung (Schritt 1):
//   saferparty.ch:      /warnungen (stabile Warnungs-Landing, bestätigt)
//   mindzone.info:      /substanzen/[slug]/ (bestätigt, WP-Slugs)
//   drugchecking.berlin:/aktuelle-warnungen (stabile Landing, bestätigt)
//   checkit.wien:       /en/substanz/[slug]/ (bestätigt)
//   knowdrugs.app:      stabile Landing (keine per-Substanz-URL bestätigt)
// ─────────────────────────────────────────────────────────────────────────────
export const DRUG_SOURCES_HARMRED = [
  {
    id: "saferparty",
    publisher: "saferparty.ch",
    domain: "saferparty.ch",
    role: "harm_reduction",
    lang: "de",
    // Stabile Warnungs-Landing (kein bestätigtes Such-Pattern).
    link: () => "https://www.saferparty.ch/warnungen",
  },
  {
    id: "mindzone",
    publisher: "mindzone.info",
    domain: "mindzone.info",
    role: "harm_reduction",
    lang: "de",
    // WordPress-Substanzseiten mit Slug-Pattern (live bestätigt).
    link: (n) => {
      const s = slugify(n);
      return s
        ? `https://mindzone.info/substanzen/${s}/`
        : "https://mindzone.info/substanzen/";
    },
  },
  {
    id: "drugchecking-berlin",
    publisher: "Drugchecking Berlin",
    domain: "drugchecking.berlin",
    role: "harm_reduction",
    lang: "de",
    // Stabile Warnungs-Landing (bestätigt).
    link: () => "https://drugchecking.berlin/aktuelle-warnungen",
  },
  {
    id: "checkit",
    publisher: "checkit! Wien",
    domain: "checkit.wien",
    role: "harm_reduction",
    lang: "de",
    // Per-Substanz-Seite mit Slug-Pattern (live bestätigt: /en/substanz/[slug]/).
    link: (n) => {
      const s = slugify(n);
      return s
        ? `https://checkit.wien/en/substanz/${s}/`
        : "https://checkit.wien/en/substanzen/";
    },
  },
  {
    id: "knowdrugs",
    publisher: "KnowDrugs",
    domain: "knowdrugs.app",
    role: "harm_reduction",
    lang: "de",
    // Stabile App-Landing (keine per-Substanz-URL bestätigt).
    link: () => "https://knowdrugs.app",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// isDrug — true, wenn ein Eintrag eine Droge ist.
// ─────────────────────────────────────────────────────────────────────────────
export function isDrug(entry) {
  return (
    (entry?.group || "").startsWith("drogen_") ||
    entry?.kategorie === "droge"
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// buildSources — baut das sources[]-Array für einen Eintrag.
// Drogen: wiki + DRUG_SOURCES_AUTH + DRUG_SOURCES_HARMRED
// Medikamente: wiki + MED_SOURCES
// ─────────────────────────────────────────────────────────────────────────────
export function buildSources(entry, wiki) {
  const out = [];

  if (wiki && wiki.url) {
    out.push({
      url: wiki.url,
      title: "Wikipedia: " + (wiki.wirkstoff || entry.wirkstoff),
      publisher: "Wikipedia",
      domain: (wiki.lang || "de") + ".wikipedia.org",
      kind: "deterministisch",
      role: "auth",
      corroborates: null,
    });
  }

  const pool = isDrug(entry)
    ? [...DRUG_SOURCES_AUTH, ...DRUG_SOURCES_HARMRED]
    : MED_SOURCES;

  for (const s of pool) {
    out.push({
      url: s.link(entry.wirkstoff, entry.atc),
      title: s.publisher + ": " + entry.wirkstoff + " nachschlagen",
      publisher: s.publisher,
      domain: s.domain,
      kind: "deterministisch",
      role: s.role,
      corroborates: null,
    });
  }

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// trustDomainsFor — Verify-Allowlist (nur auth-Domains + Wikipedia).
// harm_reduction-Domains sind NICHT drin — zählen nie als Beleg.
// ─────────────────────────────────────────────────────────────────────────────
export function trustDomainsFor(entry) {
  const base = ["de.wikipedia.org", "en.wikipedia.org"];
  if (isDrug(entry)) {
    return [...base, ...DRUG_SOURCES_AUTH.map((s) => s.domain)];
  }
  return [...base, ...MED_SOURCES.map((s) => s.domain)];
}

// ─────────────────────────────────────────────────────────────────────────────
// TRUST_DOMAINS — Rückwärtskompatibilität für bestehende Imports in verify.mjs.
// Entspricht der Med-Allowlist (= altes Verhalten).
// ─────────────────────────────────────────────────────────────────────────────
export const TRUST_DOMAINS = [
  "de.wikipedia.org",
  "en.wikipedia.org",
  ...MED_SOURCES.map((s) => s.domain),
];
