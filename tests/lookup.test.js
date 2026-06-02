import { describe, it, expect } from "vitest";
import { lookup, unknownHit } from "../src/modules/lexikon/lib/lookup.js";

const groups = {
  doak: { gruppe: "DOAK", notfall: [{ level: "hoch", text: "Blutungsrisiko" }] },
  betablocker: { gruppe: "Betablocker", notfall: [{ level: "mittel", text: "Bradykardie" }] },
};
const db = [
  { id: "apixaban", wirkstoff: "Apixaban", synonyms: ["Eliquis"], atc: "B01AF02", group: "doak", indikationen: ["VHF"], notfall: [...groups.doak.notfall] },
];
const atcIndex = [
  { wirkstoff: "Bisoprolol", atc: "C07AB07" },
];
const groupMap = { "B01AF": "doak", "C07": "betablocker" };

describe("lookup tier 0a", () => {
  it("returns full hit for known substance", () => {
    const r = lookup("Apixaban", { db, atcIndex, groupMap, groups });
    expect(r.hits.length).toBeGreaterThan(0);
    expect(r.hits[0].source).toBe("0a");
    expect(r.hits[0].id).toBe("apixaban");
  });
});

describe("lookup tier 0b", () => {
  it("returns generic group hit when not in 0a but in atc_index", () => {
    const r = lookup("Bisoprolol", { db, atcIndex, groupMap, groups });
    expect(r.hits.length).toBe(1);
    expect(r.hits[0].source).toBe("0b");
    expect(r.hits[0].gruppe).toBe("Betablocker");
    expect(r.hits[0].notfall.length).toBe(1);
    expect(r.badge).toBe("generic");
  });
});

describe("lookup manual fallback", () => {
  it("returns empty for unknown token", () => {
    const r = lookup("Zzzzzz", { db, atcIndex, groupMap, groups });
    expect(r.hits).toEqual([]);
  });
});

describe("unknownHit", () => {
  it("returns synthetic entry with correct shape", () => {
    const h = unknownHit("Johanniskraut");
    expect(h.id).toBe("unknown:johanniskraut");
    expect(h.wirkstoff).toBe("Johanniskraut");
    expect(h.source).toBe("unknown");
    expect(h.gruppe).toBe("Nicht im Datenbestand");
  });
  it("initializes empty lists", () => {
    const h = unknownHit("Xyz");
    expect(h.synonyms).toEqual([]);
    expect(h.indikationen).toEqual([]);
    expect(h.notfall).toEqual([]);
  });
  it("handles falsy input gracefully", () => {
    const h = unknownHit("");
    expect(h.id).toBe("unknown:");
    expect(h.wirkstoff).toBe("");
  });
});
