// Lazy-loaded Tesseract worker. Modell wird aus eigener Origin (`/tesseract/`) gezogen,
// vom Service Worker (CacheFirst) gecacht. KEIN Drittanbieter-CDN.
let workerP = null;

async function getWorker() {
  if (workerP) return workerP;
  workerP = (async () => {
    const { createWorker } = await import("tesseract.js");
    const w = await createWorker("deu", 1, {
      langPath: "/tesseract",
      cachePath: "/tesseract",
    });
    return w;
  })();
  return workerP;
}

const OCR_TIMEOUT_MS = 45000;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`${label} timeout after ${ms}ms`)), ms)),
  ]);
}

export async function recognizeText(blob) {
  try {
    const w = await withTimeout(getWorker(), OCR_TIMEOUT_MS, "OCR init");
    const { data } = await withTimeout(w.recognize(blob), OCR_TIMEOUT_MS, "OCR recognize");
    return (data && data.text) ? data.text : "";
  } catch (e) {
    // Worker may be wedged after timeout — drop the cached promise so next call retries fresh.
    workerP = null;
    throw e;
  }
}

export async function terminateOcr() {
  if (!workerP) return;
  const w = await workerP;
  await w.terminate();
  workerP = null;
}

// Hintergrund-Init: lädt das Sprachmodell und startet den Worker, ohne zu blocken.
// Verzögert um `delayMs`, damit der initiale Render nicht konkurriert.
// Fehler werden geschluckt — der erste echte recognizeText()-Aufruf retried bei Bedarf.
export function prewarmOCR({ delayMs = 1500 } = {}) {
  if (workerP) return;
  setTimeout(() => {
    getWorker().catch(() => { workerP = null; });
  }, delayMs);
}
