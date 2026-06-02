import { describe, it, expect, vi, beforeEach } from "vitest";
import { enrichName } from "../src/modules/lexikon/lib/enrich.js";

beforeEach(() => { vi.restoreAllMocks(); });

describe("enrichName", () => {
  it("POSTs name and returns the entry on 200", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ entry: { id: "x", wirkstoff: "X", source: "ki" }, cached: false }),
    }));
    globalThis.fetch = fetchMock;
    const entry = await enrichName("X", { url: "http://x/enrich" });
    expect(entry).toEqual({ id: "x", wirkstoff: "X", source: "ki" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://x/enrich");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ name: "X" });
  });

  it("returns null on non-ok response", async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 502, json: async () => ({}) }));
    const r = await enrichName("X", { url: "http://x/enrich" });
    expect(r).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error("boom"); });
    const r = await enrichName("X", { url: "http://x/enrich" });
    expect(r).toBeNull();
  });

  it("returns null for empty url or empty name", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    expect(await enrichName("", { url: "http://x/enrich" })).toBeNull();
    expect(await enrichName("X", { url: "" })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
