import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { isBmpPayload, parseBmpWhitelist } from "../src/modules/lexikon/lib/bmp.js";

const sample = readFileSync("tests/fixtures/bmp-sample.txt", "utf8");

describe("isBmpPayload", () => {
  it("detects BMP root tag", () => {
    expect(isBmpPayload(sample)).toBe(true);
    expect(isBmpPayload("hello world")).toBe(false);
    expect(isBmpPayload("")).toBe(false);
  });
});

describe("parseBmpWhitelist", () => {
  const out = parseBmpWhitelist(sample);

  it("extracts wirkstoff names", () => {
    expect(out.substances).toEqual(["Apixaban", "Metoprolol", "Ramipril"]);
  });

  it("extracts handelsnamen where present", () => {
    expect(out.handelsnamen).toContain("Eliquis");
    expect(out.handelsnamen).toContain("Beloc-Zok");
  });

  it("does NOT contain patient name", () => {
    const all = JSON.stringify(out);
    expect(all).not.toMatch(/Mustermann/);
    expect(all).not.toMatch(/Max/);
    expect(all).not.toMatch(/19550101/);
  });

  it("does NOT contain diagnoses (Grund)", () => {
    const all = JSON.stringify(out);
    expect(all).not.toMatch(/Vorhofflimmern/);
    expect(all).not.toMatch(/Hypertonie/);
    expect(all).not.toMatch(/Herzinsuffizienz/);
  });

  it("does NOT contain operator info", () => {
    const all = JSON.stringify(out);
    expect(all).not.toMatch(/Praxis/);
    expect(all).not.toMatch(/Dr\./);
  });

  it("does NOT contain dosages", () => {
    const all = JSON.stringify(out);
    expect(all).not.toMatch(/2x5mg/);
    expect(all).not.toMatch(/47\.5/);
  });
});
