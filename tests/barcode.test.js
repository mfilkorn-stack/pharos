import { describe, it, expect, vi, beforeEach } from "vitest";
import { detectFromBlob, _resetForTests } from "../src/modules/lexikon/lib/barcode.js";

vi.mock("zxing-wasm/reader", () => ({ readBarcodesFromImageData: vi.fn(async () => []) }));

beforeEach(() => _resetForTests());

describe("barcode.detectFromBlob", () => {
  it("uses BarcodeDetector when available", async () => {
    globalThis.BarcodeDetector = class {
      constructor() {}
      async detect() { return [{ rawValue: "04150123456785", format: "data_matrix" }]; }
    };
    globalThis.createImageBitmap = async () => ({ close() {} });
    const r = await detectFromBlob(new Blob([]));
    expect(r).toEqual({ rawValue: "04150123456785", format: "data_matrix", engine: "native" });
  });

  it("returns null when no engines available", async () => {
    delete globalThis.BarcodeDetector;
    const r = await detectFromBlob(new Blob([]));
    expect(r).toBeNull();
  });
});
