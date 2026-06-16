import { describe, it, expect } from "vitest";
import {
  isDrug,
  buildSources,
  trustDomainsFor,
  MED_SOURCES,
  DRUG_SOURCES_AUTH,
  DRUG_SOURCES_HARMRED,
} from "../src/modules/lexikon/lib/sources.js";

// ─────────────────────────────────────────────────────────────────────────────
// Hilfsfunktion: buildQuarantineKeys (Unit-Test ohne ki-proxy-Import,
// da ki-proxy ein Express-Server ist der beim Import startet).
// Dupliziert die Logik aus ki-proxy für Unit-Test-Zwecke.
// ─────────────────────────────────────────────────────────────────────────────
function normName(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/\p{Mn}/gu, "").replace(/[^a-z0-9]/g, "");
}

function buildQuarantineKeys(store) {
  const keys = new Set();
  for (const q of store.quarantine || []) {
    const wk = normName(q.wirkstoff);
    if (wk) keys.add(wk);
    for (const s of q.synonyms || []) {
      const k = normName(s);
      if (k) keys.add(k);
    }
  }
  return keys;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────
const drugEntry = { wirkstoff: "MDMA", group: "drogen_stimulanzien", atc: "" };
const medEntry = { wirkstoff: "ASS", group: "tah", atc: "B01AC06" };

// ─────────────────────────────────────────────────────────────────────────────
// isDrug
// ─────────────────────────────────────────────────────────────────────────────
describe("isDrug", () => {
  it("gibt true für group='drogen_opioide'", () => {
    expect(isDrug({ group: "drogen_opioide" })).toBe(true);
  });
  it("gibt false für group='tah'", () => {
    expect(isDrug({ group: "tah" })).toBe(false);
  });
  it("gibt true für kategorie='droge'", () => {
    expect(isDrug({ kategorie: "droge" })).toBe(true);
  });
  it("gibt false für reines Medikament ohne group", () => {
    expect(isDrug({ wirkstoff: "ASS", atc: "B01AC06" })).toBe(false);
  });
  it("gibt false für undefined-Eintrag", () => {
    expect(isDrug({})).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildSources — Drogen-Eintrag (MDMA)
// ─────────────────────────────────────────────────────────────────────────────
describe("buildSources — Droge (MDMA)", () => {
  const sources = buildSources(drugEntry);
  const domains = sources.map((s) => s.domain);
  const urls = sources.map((s) => s.url);

  it("enthält euda.europa.eu", () => {
    expect(domains).toContain("euda.europa.eu");
  });
  it("enthält checkit.wien", () => {
    expect(domains).toContain("checkit.wien");
  });
  it("enthält bfarm.de NICHT", () => {
    expect(domains).not.toContain("bfarm.de");
  });
  it("enthält gelbe-liste.de NICHT", () => {
    expect(domains).not.toContain("gelbe-liste.de");
  });
  it("alle URLs sind nicht-leere Strings ohne 'undefined'", () => {
    for (const url of urls) {
      expect(typeof url).toBe("string");
      expect(url.length).toBeGreaterThan(0);
      expect(url).not.toContain("undefined");
    }
  });
  it("enthält saferparty.ch (harm_reduction)", () => {
    expect(domains).toContain("saferparty.ch");
  });
  it("alle Einträge haben role-Feld", () => {
    for (const s of sources) {
      expect(["auth", "harm_reduction"]).toContain(s.role);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildSources — Med-Eintrag (ASS)
// ─────────────────────────────────────────────────────────────────────────────
describe("buildSources — Medikament (ASS)", () => {
  const sources = buildSources(medEntry);
  const domains = sources.map((s) => s.domain);
  const urls = sources.map((s) => s.url);

  it("enthält gelbe-liste.de", () => {
    expect(domains).toContain("gelbe-liste.de");
  });
  it("enthält checkit.wien NICHT", () => {
    expect(domains).not.toContain("checkit.wien");
  });
  it("enthält euda.europa.eu NICHT", () => {
    expect(domains).not.toContain("euda.europa.eu");
  });
  it("alle URLs sind nicht-leere Strings ohne 'undefined'", () => {
    for (const url of urls) {
      expect(typeof url).toBe("string");
      expect(url.length).toBeGreaterThan(0);
      expect(url).not.toContain("undefined");
    }
  });
  it("ATC-Code landet in whocc-URL", () => {
    const whocc = sources.find((s) => s.domain === "whocc.no");
    expect(whocc?.url).toContain("B01AC06");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildSources — mit Wiki-Objekt
// ─────────────────────────────────────────────────────────────────────────────
describe("buildSources — mit Wiki", () => {
  const wiki = { url: "https://de.wikipedia.org/wiki/MDMA", wirkstoff: "MDMA", lang: "de" };
  const sources = buildSources(drugEntry, wiki);

  it("Wikipedia-Eintrag ist erster", () => {
    expect(sources[0].domain).toBe("de.wikipedia.org");
    expect(sources[0].url).toBe(wiki.url);
  });
  it("Wikipedia-Eintrag hat role='auth'", () => {
    expect(sources[0].role).toBe("auth");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// trustDomainsFor
// ─────────────────────────────────────────────────────────────────────────────
describe("trustDomainsFor", () => {
  it("Droge enthält euda.europa.eu", () => {
    expect(trustDomainsFor(drugEntry)).toContain("euda.europa.eu");
  });
  it("Droge enthält saferparty.ch NICHT", () => {
    expect(trustDomainsFor(drugEntry)).not.toContain("saferparty.ch");
  });
  it("Droge enthält checkit.wien NICHT", () => {
    expect(trustDomainsFor(drugEntry)).not.toContain("checkit.wien");
  });
  it("Med enthält gelbe-liste.de", () => {
    expect(trustDomainsFor(medEntry)).toContain("gelbe-liste.de");
  });
  it("Med enthält euda.europa.eu NICHT", () => {
    expect(trustDomainsFor(medEntry)).not.toContain("euda.europa.eu");
  });
  it("beide enthalten Wikipedia", () => {
    expect(trustDomainsFor(drugEntry)).toContain("de.wikipedia.org");
    expect(trustDomainsFor(medEntry)).toContain("en.wikipedia.org");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildQuarantineKeys
// ─────────────────────────────────────────────────────────────────────────────
describe("buildQuarantineKeys", () => {
  it("leere quarantine → leeres Set", () => {
    const keys = buildQuarantineKeys({ quarantine: [] });
    expect(keys.size).toBe(0);
  });
  it("ohne quarantine-Feld → leeres Set", () => {
    const keys = buildQuarantineKeys({});
    expect(keys.size).toBe(0);
  });
  it("matcht wirkstoff normalisiert", () => {
    const keys = buildQuarantineKeys({
      quarantine: [{ wirkstoff: "mdma", synonyms: [] }],
    });
    expect(keys.has("mdma")).toBe(true);
  });
  it("matcht Synonym normalisiert (Großbuchstaben + Sonderzeichen)", () => {
    const keys = buildQuarantineKeys({
      quarantine: [{ wirkstoff: "mdma", synonyms: ["Ecstasy", "XTC"] }],
    });
    expect(keys.has("mdma")).toBe(true);
    expect(keys.has("ecstasy")).toBe(true);
    expect(keys.has("xtc")).toBe(true);
  });
  it("matcht wirkstoff mit Umlaut normalisiert", () => {
    const keys = buildQuarantineKeys({
      quarantine: [{ wirkstoff: "Methamphetamin", synonyms: ["Crystal Méth"] }],
    });
    expect(keys.has("methamphetamin")).toBe(true);
    expect(keys.has("crystalmeth")).toBe(true);
  });
});
