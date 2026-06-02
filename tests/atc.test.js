import { describe, it, expect } from "vitest";
import { parsePznFromGtin, groupForAtc } from "../src/modules/lexikon/lib/atc.js";

describe("parsePznFromGtin", () => {
  it("parses 8-digit PZN from NTIN-prefixed GTIN-14", () => {
    expect(parsePznFromGtin("04150123456785")).toBe("12345678");
  });
  it("returns null for non-NTIN GTIN", () => {
    expect(parsePznFromGtin("04006381333931")).toBeNull();
  });
  it("returns null for malformed input", () => {
    expect(parsePznFromGtin("")).toBeNull();
    expect(parsePznFromGtin("abc")).toBeNull();
    expect(parsePznFromGtin(null)).toBeNull();
  });
  it("accepts 13-digit GTIN by left-padding to 14", () => {
    expect(parsePznFromGtin("4150123456785")).toBe("12345678");
  });
});

describe("groupForAtc", () => {
  const MAP = {
    "B01AF": "doak",
    "B01AA": "vka",
    "C07": "betablocker",
    "C09A": "acehemmer",
    "C09AA": "acehemmer",
  };
  it("longest matching prefix wins", () => {
    expect(groupForAtc("C09AA05", MAP)).toBe("acehemmer");
  });
  it("matches by exact prefix", () => {
    expect(groupForAtc("C07AB02", MAP)).toBe("betablocker");
  });
  it("returns null when no prefix matches", () => {
    expect(groupForAtc("Z99XX99", MAP)).toBeNull();
  });
  it("returns null for empty input", () => {
    expect(groupForAtc("", MAP)).toBeNull();
    expect(groupForAtc(null, MAP)).toBeNull();
  });
});
