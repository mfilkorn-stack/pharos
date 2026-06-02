const FORMATS = ["data_matrix", "code_39", "ean_13", "qr_code"];

let zxingMod = null;
async function loadZxing() {
  if (zxingMod) return zxingMod;
  zxingMod = await import("zxing-wasm/reader");
  return zxingMod;
}

export function _resetForTests() { zxingMod = null; }

async function viaNative(blob) {
  if (!("BarcodeDetector" in globalThis)) return null;
  try {
    const det = new globalThis.BarcodeDetector({ formats: FORMATS });
    const bmp = await createImageBitmap(blob);
    const codes = await det.detect(bmp);
    if (bmp.close) bmp.close();
    if (!codes || !codes[0]) return null;
    return { rawValue: String(codes[0].rawValue), format: codes[0].format || "unknown", engine: "native" };
  } catch {
    return null;
  }
}

async function viaZxing(blob) {
  try {
    const { readBarcodesFromImageData } = await loadZxing();
    const bmp = await createImageBitmap(blob);
    const c = document.createElement("canvas");
    c.width = bmp.width; c.height = bmp.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(bmp, 0, 0);
    if (bmp.close) bmp.close();
    const img = ctx.getImageData(0, 0, c.width, c.height);
    const res = await readBarcodesFromImageData(img, { formats: ["DataMatrix", "Code39", "EAN-13", "QRCode"] });
    if (!res || !res[0]) return null;
    return { rawValue: String(res[0].text || res[0].rawValue || ""), format: res[0].format || "unknown", engine: "zxing" };
  } catch {
    return null;
  }
}

export async function detectFromBlob(blob) {
  const a = await viaNative(blob);
  if (a) return a;
  return await viaZxing(blob);
}
