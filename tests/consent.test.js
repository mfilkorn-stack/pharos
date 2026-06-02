// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { hashText, isAccepted, accept, KEY } from "../src/modules/lexikon/lib/consent.js";

beforeEach(() => localStorage.clear());

describe("consent", () => {
  it("hashText is stable and not empty", async () => {
    const a = await hashText("hello");
    const b = await hashText("hello");
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(8);
  });
  it("isAccepted false when never accepted", async () => {
    expect(await isAccepted("1.0", "TEXT")).toBe(false);
  });
  it("accept + isAccepted true for same version+text", async () => {
    await accept("1.0", "TEXT");
    expect(await isAccepted("1.0", "TEXT")).toBe(true);
  });
  it("isAccepted false after text change (re-consent)", async () => {
    await accept("1.0", "TEXT-A");
    expect(await isAccepted("1.0", "TEXT-B")).toBe(false);
  });
  it("isAccepted false after version change", async () => {
    await accept("1.0", "TEXT");
    expect(await isAccepted("2.0", "TEXT")).toBe(false);
  });
  it("payload is PII-free", async () => {
    await accept("1.0", "TEXT");
    const raw = JSON.parse(localStorage.getItem(KEY));
    expect(Object.keys(raw).sort()).toEqual(["acceptedAt", "hash", "version"].sort());
  });
});
