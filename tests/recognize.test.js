import { describe, it, expect, vi } from "vitest";

vi.mock("../src/modules/lexikon/lib/barcode.js", () => ({
  detectFromBlob: vi.fn(),
}));
vi.mock("../src/modules/lexikon/lib/bmp.js", () => ({
  isBmpPayload: (s) => /^<MP/.test(s),
  parseBmpWhitelist: () => ({ substances: ["Apixaban", "Metoprolol"], handelsnamen: [] }),
}));

import { recognize } from "../src/modules/lexikon/lib/recognize.js";
import { detectFromBlob } from "../src/modules/lexikon/lib/barcode.js";

describe("recognize", () => {
  it("PZN-NTIN: resolves via lookup(PZN)", async () => {
    detectFromBlob.mockResolvedValueOnce({ rawValue: "04150123456785", format: "data_matrix", engine: "native" });
    const lookup = vi.fn(() => ({ matched: [{ id: "x", wirkstoff: "X" }], unmatched: [] }));
    const r = await recognize(new Blob([]), { isPdf: false, ocr: vi.fn(), lookup });
    expect(lookup).toHaveBeenCalledWith("12345678");
    expect(r.matched.length).toBe(1);
  });

  it("BMP-DataMatrix → multi substance result", async () => {
    detectFromBlob.mockResolvedValueOnce({ rawValue: "<MP v='029'><S w='Apixaban'/></MP>", format: "data_matrix", engine: "native" });
    const lookup = vi.fn((t) => ({ matched: t.split("\n").map((n, i) => ({ id: String(i), wirkstoff: n })), unmatched: [] }));
    const r = await recognize(new Blob([]), { isPdf: false, ocr: vi.fn(), lookup });
    expect(r.matched.length).toBe(2);
  });

  it("no barcode → OCR fallback", async () => {
    detectFromBlob.mockResolvedValueOnce(null);
    const ocr = vi.fn(async () => "Ibuprofen\n");
    const lookup = vi.fn(() => ({ matched: [{ id: "ibu", wirkstoff: "Ibuprofen" }], unmatched: [] }));
    const r = await recognize(new Blob([]), { isPdf: false, ocr, lookup });
    expect(ocr).toHaveBeenCalled();
    expect(r.matched[0].id).toBe("ibu");
  });

  it("PDF skips barcode → OCR direct", async () => {
    detectFromBlob.mockClear();
    const ocr = vi.fn(async () => "Ramipril\n");
    const lookup = vi.fn(() => ({ matched: [{ id: "ram", wirkstoff: "Ramipril" }], unmatched: [] }));
    const r = await recognize(new Blob([]), { isPdf: true, ocr, lookup });
    expect(detectFromBlob).not.toHaveBeenCalled();
    expect(r.matched[0].id).toBe("ram");
  });

  it("OCR error → codeNote 'fehlgeschlagen'", async () => {
    detectFromBlob.mockResolvedValueOnce(null);
    const ocr = vi.fn(async () => { throw new Error("boom"); });
    const lookup = vi.fn();
    const r = await recognize(new Blob([]), { isPdf: false, ocr, lookup });
    expect(r.matched).toEqual([]);
    expect(r.codeNote).toMatch(/fehlgeschlagen/i);
  });
});

describe("recognize KI fallback", () => {
  it("calls KI after OCR returns no matches", async () => {
    detectFromBlob.mockResolvedValueOnce(null);
    const ocr = vi.fn(async () => "noise");
    const lookup = vi.fn((t) => {
      // First call: from OCR text → no matches. Second call: from KI names → match.
      if (t === "noise") return { matched: [], unmatched: ["noise"] };
      return { matched: [{ id: "ramipril", wirkstoff: "Ramipril" }], unmatched: [] };
    });
    const ki = vi.fn(async () => ["Ramipril"]);
    const r = await recognize(new Blob([]), { isPdf: false, ocr, lookup, ki, source: "packung" });
    expect(ki).toHaveBeenCalledWith(expect.any(Blob), "packung");
    expect(r.matched[0].id).toBe("ramipril");
    expect(r.kiUsed).toBe(true);
  });

  it("calls KI after OCR throws", async () => {
    detectFromBlob.mockResolvedValueOnce(null);
    const ocr = vi.fn(async () => { throw new Error("ocr broken"); });
    const lookup = vi.fn(() => ({ matched: [{ id: "x", wirkstoff: "X" }], unmatched: [] }));
    const ki = vi.fn(async () => ["X"]);
    const r = await recognize(new Blob([]), { isPdf: false, ocr, lookup, ki, source: "plan" });
    expect(ki).toHaveBeenCalledWith(expect.any(Blob), "plan");
    expect(r.kiUsed).toBe(true);
  });

  it("calls KI first; OCR is only used when KI returns nothing", async () => {
    detectFromBlob.mockResolvedValueOnce(null);
    const ocr = vi.fn(async () => "Ibuprofen");
    const lookup = vi.fn((t) => {
      if (t === "Ibuprofen") return { matched: [{ id: "ibu-ocr", wirkstoff: "Ibuprofen" }], unmatched: [] };
      return { matched: [{ id: "ibu-ki", wirkstoff: "Ibuprofen" }], unmatched: [] };
    });
    const ki = vi.fn(async () => ["Ibuprofen-from-ki"]);
    const r = await recognize(new Blob([]), { isPdf: false, ocr, lookup, ki, source: "packung" });
    expect(ki).toHaveBeenCalled();
    expect(ocr).not.toHaveBeenCalled();
    expect(r.kiUsed).toBe(true);
  });

  it("falls back to OCR when KI returns nothing usable", async () => {
    detectFromBlob.mockResolvedValueOnce(null);
    const ocr = vi.fn(async () => "Ibuprofen");
    const lookup = vi.fn((t) => {
      if (t === "Ibuprofen") return { matched: [{ id: "ibu", wirkstoff: "Ibuprofen" }], unmatched: [] };
      return { matched: [], unmatched: [] };
    });
    const ki = vi.fn(async () => []);
    const r = await recognize(new Blob([]), { isPdf: false, ocr, lookup, ki, source: "packung" });
    expect(ki).toHaveBeenCalled();
    expect(ocr).toHaveBeenCalled();
    expect(r.matched[0].id).toBe("ibu");
  });

  it("PDF path falls back to KI when OCR has no match", async () => {
    const ocr = vi.fn(async () => "noise");
    const lookup = vi.fn((t) => {
      if (t === "noise") return { matched: [], unmatched: [] };
      return { matched: [{ id: "asp", wirkstoff: "ASS" }], unmatched: [] };
    });
    const ki = vi.fn(async () => ["Acetylsalicylsäure"]);
    const r = await recognize(new Blob([]), { isPdf: true, ocr, lookup, ki, source: "plan" });
    expect(ki).toHaveBeenCalled();
    expect(r.kiUsed).toBe(true);
  });

  it("returns fallback when KI is not provided and OCR fails", async () => {
    detectFromBlob.mockResolvedValueOnce(null);
    const ocr = vi.fn(async () => { throw new Error("x"); });
    const lookup = vi.fn();
    const r = await recognize(new Blob([]), { isPdf: false, ocr, lookup });
    expect(r.matched).toEqual([]);
    expect(r.codeNote).toMatch(/fehlgeschlagen/i);
  });
});
