import { detectFromBlob } from "./barcode.js";
import { isBmpPayload, parseBmpWhitelist } from "./bmp.js";
import { parsePznFromGtin } from "./atc.js";

const noop = () => {};

async function tryKI(blob, source, ki, lookup, status) {
  if (!ki) return null;
  try {
    status("Frage Cloud-KI …");
    const names = await ki(blob, source);
    if (!names || !names.length) return null;
    status(`KI lieferte ${names.length} Namen – gleiche mit Datenbestand ab …`);
    const r = lookup(names.join("\n"));
    if (r.matched.length || r.unmatched?.length) return { ...r, kiUsed: true };
    return null;
  } catch {
    return null;
  }
}

async function tryOCR(blob, ocr, lookup, status) {
  if (!ocr) return null;
  try {
    status("Lokale Texterkennung (OCR) als Fallback …");
    const text = await ocr(blob);
    if (!text) return null;
    status("Gleiche OCR-Text mit Datenbestand ab …");
    const r = lookup(text);
    if (r.matched.length || r.unmatched?.length) return r;
    return null;
  } catch {
    return null;
  }
}

export async function recognize(blob, { isPdf, ocr, lookup, ki, source, onStatus }) {
  const status = onStatus || noop;

  // 1) Barcode-Versuch (nur Bilder; instant, off- und online sinnvoll)
  let codeNote = null;
  if (!isPdf) {
    status("Suche Barcode / Data-Matrix …");
    const code = await detectFromBlob(blob);
    if (code) {
      const raw = code.rawValue;
      if (isBmpPayload(raw)) {
        status("Medikationsplan-Code erkannt – extrahiere Wirkstoffe (nur Wirkstoff-Felder) …");
        const { substances, handelsnamen } = parseBmpWhitelist(raw);
        const text = [...substances, ...handelsnamen].join("\n");
        const r = lookup(text);
        if (r.matched.length || r.unmatched?.length) return r;
        // BMP geparst aber lookup leer → unten KI/OCR auf Originalbild
      } else {
        const pzn = parsePznFromGtin(raw);
        if (pzn) {
          status(`PZN ${pzn} aus Barcode – schlage nach …`);
          const r = lookup(pzn);
          if (r.matched.length) return r;
          codeNote = `PZN erkannt: ${pzn} — nicht im Datenbestand. KI-Suche …`;
        } else {
          status(`Barcode-Code „${raw}" – schlage nach …`);
          const r = lookup(raw);
          if (r.matched.length) return r;
          codeNote = `Code erkannt: ${raw} — nicht im Datenbestand. KI-Suche …`;
        }
      }
    }
  }

  // 2) Cloud-KI bevorzugt (schneller + besser als OCR bei Plänen/Packungen)
  if (ki) {
    const kiR = await tryKI(blob, source, ki, lookup, status);
    if (kiR) return kiR;
    // KI lief, aber leer → noch OCR als zweite Chance
  }

  // 3) OCR als Fallback (offline, oder wenn KI nichts geliefert hat)
  const ocrR = await tryOCR(blob, ocr, lookup, status);
  if (ocrR) return ocrR;

  return { matched: [], unmatched: [], codeNote: codeNote || "Erkennung fehlgeschlagen — bitte erneut versuchen oder Namen manuell suchen." };
}
