import { describe, it, expect, vi, beforeEach } from "vitest";
import { recognizeWithKI } from "../src/modules/lexikon/lib/ki.js";

beforeEach(() => { vi.restoreAllMocks(); });

function fakeBlob(mime, text = "x") {
  return new Blob([text], { type: mime });
}

describe("recognizeWithKI", () => {
  it("POSTs base64 + mediaType + source to proxy, returns names", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ names: ["Apixaban", "Metoprolol"] }) }));
    globalThis.fetch = fetchMock;
    const names = await recognizeWithKI(fakeBlob("image/jpeg"), "packung", { url: "http://x/ki" });
    expect(names).toEqual(["Apixaban", "Metoprolol"]);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://x/ki");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body.mediaType).toBe("image/jpeg");
    expect(body.source).toBe("packung");
    expect(typeof body.dataBase64).toBe("string");
    expect(body.dataBase64.length).toBeGreaterThan(0);
  });

  it("returns [] when proxy returns non-ok", async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }));
    const names = await recognizeWithKI(fakeBlob("image/png"), "plan", { url: "http://x/ki" });
    expect(names).toEqual([]);
  });

  it("returns [] when fetch throws", async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error("boom"); });
    const names = await recognizeWithKI(fakeBlob("image/png"), "plan", { url: "http://x/ki" });
    expect(names).toEqual([]);
  });

  it("returns [] when url is empty", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    const names = await recognizeWithKI(fakeBlob("image/png"), "packung", { url: "" });
    expect(names).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses application/pdf when blob is pdf", async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ names: [] }) }));
    await recognizeWithKI(fakeBlob("application/pdf"), "plan", { url: "http://x/ki" });
    const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
    expect(body.mediaType).toBe("application/pdf");
  });
});
