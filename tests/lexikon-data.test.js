import { describe, it, expect } from "vitest";
import data from "../src/modules/lexikon/data/data.json";
import seed from "../scripts/seed.json";
import { norm } from "../src/modules/lexikon/lib/match.js";

// Die Lexikon-Suche matcht Handelsnamen ausschliesslich ueber `synonyms`.
// Fehlt dort ein gaengiger Name, findet die App das Medikament nicht — genau
// so ist "Allegra" (Fexofenadin) durchgefallen. Seed und generierte data.json
// duerfen dabei nicht auseinanderlaufen: seed.json ist der kanonische Input,
// data.json der Bestand, der ins Bundle wandert.
const HANDELSNAMEN = [
  ["fexofenadin", "Allegra"],
  ["fexofenadin", "Telfast"],
];

function findById(list, id) {
  return list.find((e) => e.id === id);
}

describe("Lexikon-Datenbestand: Handelsnamen", () => {
  for (const [id, name] of HANDELSNAMEN) {
    it(`data.json: "${name}" ist Synonym von ${id}`, () => {
      const entry = findById(data.substances, id);
      expect(entry, `Eintrag ${id} fehlt in data.json`).toBeDefined();
      expect((entry.synonyms || []).map(norm)).toContain(norm(name));
    });

    it(`seed.json: "${name}" ist Synonym von ${id}`, () => {
      const entry = findById(seed.substances, id);
      expect(entry, `Eintrag ${id} fehlt in seed.json`).toBeDefined();
      expect((entry.synonyms || []).map(norm)).toContain(norm(name));
    });
  }
});
