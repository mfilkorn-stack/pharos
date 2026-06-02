import { describe, it, expect } from "vitest";
import { norm, lev, scoreEntry, resolve } from "../src/modules/lexikon/lib/match.js";

const DB = [
  { id: "apixaban", wirkstoff: "Apixaban", synonyms: ["Eliquis"] },
  { id: "metoprolol", wirkstoff: "Metoprolol", synonyms: ["Beloc", "Beloc-Zok"] },
  { id: "ibuprofen", wirkstoff: "Ibuprofen", synonyms: ["Nurofen"] },
];

describe("norm", () => {
  it("lowercases, strips diacritics and non-alphanumerics", () => {
    expect(norm("Acetylsalicylsäure")).toBe("acetylsalicylsaure");
    expect(norm("  Beloc-Zok  ")).toBe("beloczok");
    expect(norm("")).toBe("");
  });
});

describe("lev", () => {
  it("returns edit distance", () => {
    expect(lev("kitten", "sitting")).toBe(3);
    expect(lev("abc", "abc")).toBe(0);
    expect(lev("", "abc")).toBe(3);
  });
});

describe("scoreEntry", () => {
  it("scores exact wirkstoff match as 1", () => {
    expect(scoreEntry("Apixaban", DB[0])).toBe(1);
  });
  it("scores synonym as 1 when exact", () => {
    expect(scoreEntry("Eliquis", DB[0])).toBe(1);
  });
  it("tolerates typos", () => {
    expect(scoreEntry("Apixban", DB[0])).toBeGreaterThan(0.7);
  });
});

describe("resolve", () => {
  it("returns sorted candidates above threshold", () => {
    const r = resolve("metoprolol", DB);
    expect(r[0].entry.id).toBe("metoprolol");
    expect(r[0].score).toBe(1);
  });
  it("returns [] for nonsense", () => {
    expect(resolve("zzzzzzzzz", DB)).toEqual([]);
  });
});
