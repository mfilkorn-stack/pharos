const ROOT_RE = /<MP\b[^>]*>/i;
const S_TAG_RE = /<S\b([^>]*)\/?>/gi;
const ATTR_W = /\bw\s*=\s*"([^"]*)"/i;
const ATTR_H = /\bh\s*=\s*"([^"]*)"/i;

export function isBmpPayload(text) {
  return typeof text === "string" && ROOT_RE.test(text);
}

// Whitelist: nur w (Wirkstoff) und h (Handelsname) werden überhaupt gelesen.
// Andere Attribute (g=Grund, d=Dosis, m=Menge, …) und andere Tags (P, O, …)
// werden im Parser gar nicht erst extrahiert — keine Variable, kein Return.
export function parseBmpWhitelist(text) {
  if (!isBmpPayload(text)) return { substances: [], handelsnamen: [] };
  const substances = [];
  const handelsnamen = [];
  let m;
  while ((m = S_TAG_RE.exec(text)) !== null) {
    const attrs = m[1];
    const w = ATTR_W.exec(attrs);
    const h = ATTR_H.exec(attrs);
    if (w && w[1]) substances.push(w[1].trim());
    if (h && h[1]) handelsnamen.push(h[1].trim());
  }
  return { substances, handelsnamen };
}
