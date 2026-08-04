import { describe, it, expect } from "vitest";
import saaData from "../src/modules/lexikon/data/saa.json";
import matrix from "../src/modules/lexikon/data/saa-matrix.json";
import { aggregateCheck, normKey } from "../src/modules/lexikon/lib/saaCheck.js";

const SAA_IDS = new Set(saaData.entries.map((e) => e.id));

describe("SAA-Check: nur gelistete SAA-Medikamente", () => {
  it("verwirft Matrix-Flags gegen unbekannte SAA-IDs", () => {
    // Genau der Fall aus dem Feld: das Modell erfand "saa:tramadol" mit Level
    // "absolut" und einem reason-Text, der die Substanz selbst als nicht
    // gelistet bezeichnet. Ungefiltert erschien das als rote absolute
    // Kontraindikation gegen ein Nicht-SAA-Medikament.
    const fakeMatrix = {
      [normKey("Paroxetin")]: {
        flags: [
          { saaId: "saa:tramadol", level: "absolut", reason: "Nicht gelistet – entfällt" },
          { saaId: "saa:pethidin", level: "absolut", reason: "Nicht SAA-Medikament" },
          { saaId: "saa:morphin", level: "vorsicht", reason: "SSRI + Opioide: Serotonin-Syndrom" },
        ],
      },
    };
    const { results } = aggregateCheck(["Paroxetin"], fakeMatrix, saaData.entries);
    expect(results.map((r) => r.id)).toEqual(["saa:morphin"]);
  });

  it("meldet keine absolute Kontraindikation mehr aus Phantom-Flags", () => {
    const fakeMatrix = {
      [normKey("Paroxetin")]: {
        flags: [{ saaId: "saa:tramadol", level: "absolut", reason: "Nicht gelistet" }],
      },
    };
    const { results } = aggregateCheck(["Paroxetin"], fakeMatrix, saaData.entries);
    expect(results).toEqual([]);
  });

  it("die ausgelieferte Matrix enthält keine unbekannten SAA-IDs mehr", () => {
    const bad = new Map();
    for (const rec of Object.values(matrix.entries || {})) {
      for (const f of rec.flags || []) {
        if (!SAA_IDS.has(f.saaId)) bad.set(f.saaId, (bad.get(f.saaId) || 0) + 1);
      }
    }
    expect([...bad.entries()]).toEqual([]);
  });

  it("gültige Flags bleiben unangetastet", () => {
    const fakeMatrix = {
      [normKey("Paroxetin")]: {
        flags: [
          { saaId: "saa:morphin", level: "vorsicht", reason: "a" },
          { saaId: "saa:fentanyl", level: "absolut", reason: "b" },
        ],
      },
    };
    const { results } = aggregateCheck(["Paroxetin"], fakeMatrix, saaData.entries);
    expect(results.map((r) => r.id).sort()).toEqual(["saa:fentanyl", "saa:morphin"]);
    expect(results.find((r) => r.id === "saa:fentanyl").level).toBe("absolut");
  });

  it("jede von SaaCheck angezeigte ID hat einen Namen in saa.json", () => {
    // SaaCheck faellt auf die rohe ID zurueck, wenn der Name fehlt — genau so
    // wurde "saa:tramadol" im UI sichtbar. Nach dem Filter darf das nicht mehr
    // vorkommen.
    const alleFlags = Object.values(matrix.entries || {}).flatMap((r) => r.flags || []);
    const ohneNamen = alleFlags.map((f) => f.saaId).filter((id) => !SAA_IDS.has(id));
    expect([...new Set(ohneNamen)]).toEqual([]);
  });
});
