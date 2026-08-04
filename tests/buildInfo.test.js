import { describe, it, expect } from "vitest";
import { formatBuildTime } from "../src/lib/buildInfo.js";

describe("formatBuildTime", () => {
  it("formatiert einen ISO-Zeitstempel in Europe/Berlin", () => {
    // 19:31 UTC im August = 21:31 CEST
    const out = formatBuildTime("2026-08-04T19:31:00Z");
    expect(out).toContain("04.08.2026");
    expect(out).toContain("21:31");
  });

  it("beachtet die Zeitzone auch im Winter (CET, +1)", () => {
    const out = formatBuildTime("2026-01-15T19:31:00Z");
    expect(out).toContain("15.01.2026");
    expect(out).toContain("20:31");
  });

  it("liefert 'dev' ohne Zeitstempel", () => {
    expect(formatBuildTime(null)).toBe("dev");
    expect(formatBuildTime(undefined)).toBe("dev");
    expect(formatBuildTime("")).toBe("dev");
  });

  it("liefert 'dev' bei ungültigem Zeitstempel", () => {
    expect(formatBuildTime("kein-datum")).toBe("dev");
  });
});
