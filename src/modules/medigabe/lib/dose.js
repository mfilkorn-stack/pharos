// src/modules/medigabe/lib/dose.js
// Dosislogik Medigabe — reine Funktionen, keine Seiteneffekte.
// Alle mg-Werte auf 2 Nachkommastellen gerundet (Fließkomma-Artefakte).

const r2 = (n) => Math.round(n * 100) / 100;

// 8.75 → "8,75" (deutsches Komma). Bewusst OHNE Rundung: Dosisfaktoren wie
// 0,125 mg/kg müssen exakt erscheinen — gerundet wird nur in den
// compute-Funktionen (r2 für mg, r1 für ml).
export function fmt(n) {
  return String(n).replace(".", ",");
}

// Löst dosis.stufen anhand des Alters auf (erste passende Stufe gewinnt).
function resolveStufe(dosis, alterJahre) {
  if (!Array.isArray(dosis.stufen)) return dosis;
  for (const s of dosis.stufen) {
    if (s.wennAlterUnter == null || (alterJahre != null && alterJahre < s.wennAlterUnter)) return s;
  }
  return dosis.stufen[dosis.stufen.length - 1];
}

// → { mg, maxMg|null, gekappt, schritte[] }
export function computeDose({ dosis, kg, alterJahre, maxMgProKg, maxMgAbsolut }) {
  const d = resolveStufe(dosis, alterJahre);
  const schritte = [];
  let mg;
  if (d.fixMg != null) {
    mg = r2(d.fixMg);
    schritte.push(`Fixdosis ${fmt(mg)} mg`);
  } else {
    mg = r2(d.mgProKg * kg);
    schritte.push(`${fmt(d.mgProKg)} mg/kg × ${fmt(kg)} kg = ${fmt(mg)} mg`);
  }

  // Max-Grenzen: pro kg, absolut (Eintrag) und absolut (Stufe) — strengste gilt.
  const caps = [];
  if (maxMgProKg != null) caps.push(r2(maxMgProKg * kg));
  if (maxMgAbsolut != null) caps.push(r2(maxMgAbsolut));
  if (d.maxMgAbsolut != null) caps.push(r2(d.maxMgAbsolut));
  const maxMg = caps.length ? Math.min(...caps) : null;

  let gekappt = false;
  if (maxMg != null) {
    if (mg > maxMg) {
      gekappt = true;
      schritte.push(`Über Maximaldosis ${fmt(maxMg)} mg → gekappt auf ${fmt(maxMg)} mg`);
      mg = maxMg;
    } else {
      schritte.push(`Maximaldosis ${fmt(maxMg)} mg ✓`);
    }
  }
  return { mg, maxMg, gekappt, schritte };
}

const r1 = (n) => Math.round(n * 10) / 10;
const r3 = (n) => Math.round(n * 1000) / 1000;

// Volumen auf 0,1 ml gerundet; niemals über maxMg runden (dann abrunden).
// → { ml, mlRoh, mgEffektiv, schritte[] }
export function computeVolume({ mg, mgPerMl, maxMg }) {
  const mlRoh = r3(mg / mgPerMl);
  let ml = r1(mlRoh);
  const schritte = [];
  let mgEffektiv = r2(ml * mgPerMl);

  if (maxMg != null && mgEffektiv > maxMg) {
    ml = Math.floor(mlRoh * 10) / 10;
    mgEffektiv = r2(ml * mgPerMl);
    schritte.push(`${fmt(mg)} mg ÷ ${fmt(mgPerMl)} mg/ml = ${fmt(mlRoh)} ml`);
    schritte.push(`Aufrunden würde Maximaldosis ${fmt(maxMg)} mg überschreiten → abgerundet ${fmt(ml)} ml (= ${fmt(mgEffektiv)} mg)`);
  } else if (ml !== mlRoh) {
    const richtung = ml > mlRoh ? "aufgerundet" : "abgerundet";
    schritte.push(`${fmt(mg)} mg ÷ ${fmt(mgPerMl)} mg/ml = ${fmt(mlRoh)} ml → ${richtung} ${fmt(ml)} ml (= ${fmt(mgEffektiv)} mg)`);
  } else {
    schritte.push(`${fmt(mg)} mg ÷ ${fmt(mgPerMl)} mg/ml = ${fmt(ml)} ml`);
  }
  return { ml, mlRoh, mgEffektiv, schritte };
}
