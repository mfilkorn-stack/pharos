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

// Alter in Jahren aus den Patient-Eingaben — null bei leerer/ungültiger Eingabe.
// WICHTIG: Number("") wäre 0 und würde Säuglingsstufen (wennAlterUnter) fälschlich
// treffen; stufePasst behandelt null korrekt als „Bedingung nicht erfüllt".
export function alterInJahren(patient) {
  if (patient.alter === "" || patient.alter == null) return null;
  const n = Number(patient.alter);
  if (!Number.isFinite(n)) return null;
  return patient.alterEinheit === "monate" ? n / 12 : n;
}

// Löst dosis.stufen anhand Alter UND Gewicht auf (Bedingungen UND-verknüpft,
// erste passende Stufe gewinnt, letzte Stufe = Default).
function stufePasst(s, alterJahre, kg) {
  if (s.wennAlterUnter != null && !(alterJahre != null && alterJahre < s.wennAlterUnter)) return false;
  if (s.wennAlterAb != null && !(alterJahre != null && alterJahre >= s.wennAlterAb)) return false;
  if (s.wennKgUnter != null && !(kg != null && kg < s.wennKgUnter)) return false;
  if (s.wennKgAb != null && !(kg != null && kg >= s.wennKgAb)) return false;
  return true;
}
function resolveStufe(dosis, alterJahre, kg) {
  if (!Array.isArray(dosis.stufen)) return { d: dosis, stufe: null };
  for (const s of dosis.stufen) {
    if (stufePasst(s, alterJahre, kg)) return { d: s, stufe: s };
  }
  const last = dosis.stufen[dosis.stufen.length - 1];
  return { d: last, stufe: last };
}

// → { mg, maxMg|null, gekappt, schritte[], stufe|null }
// einheit ist reine Anzeige (µg/I.E./g/…) — gerechnet wird einheitenagnostisch;
// bewusst KEINE Umrechnung (z. B. µg→mg): Originaleinheit = Verwechslungsschutz.
export function computeDose({ dosis, kg, alterJahre, maxMgProKg, maxMgAbsolut, einheit = "mg" }) {
  const { d, stufe } = resolveStufe(dosis, alterJahre, kg);
  const schritte = [];
  let mg;
  if (d.fixMg != null) {
    mg = r2(d.fixMg);
    schritte.push(`Fixdosis ${fmt(mg)} ${einheit}`);
  } else {
    mg = r2(d.mgProKg * kg);
    schritte.push(`${fmt(d.mgProKg)} ${einheit}/kg × ${fmt(kg)} kg = ${fmt(mg)} ${einheit}`);
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
      schritte.push(`Über Maximaldosis ${fmt(maxMg)} ${einheit} → gekappt auf ${fmt(maxMg)} ${einheit}`);
      mg = maxMg;
    } else {
      schritte.push(`Maximaldosis ${fmt(maxMg)} ${einheit} ✓`);
    }
  }
  return { mg, maxMg, gekappt, schritte, stufe };
}

const r1 = (n) => Math.round(n * 10) / 10;
const r3 = (n) => Math.round(n * 1000) / 1000;

// Volumen auf 0,1 ml gerundet; niemals über maxMg runden (dann abrunden).
// → { ml, mlRoh, mgEffektiv, schritte[] }
export function computeVolume({ mg, mgPerMl, maxMg, einheit = "mg" }) {
  const mlRoh = r3(mg / mgPerMl);
  let ml = r1(mlRoh);
  const schritte = [];
  let mgEffektiv = r2(ml * mgPerMl);

  if (maxMg != null && mgEffektiv > maxMg) {
    ml = Math.floor(mlRoh * 10) / 10;
    mgEffektiv = r2(ml * mgPerMl);
    schritte.push(`${fmt(mg)} ${einheit} ÷ ${fmt(mgPerMl)} ${einheit}/ml = ${fmt(mlRoh)} ml`);
    schritte.push(`Aufrunden würde Maximaldosis ${fmt(maxMg)} ${einheit} überschreiten → abgerundet ${fmt(ml)} ml (= ${fmt(mgEffektiv)} ${einheit})`);
  } else if (ml !== mlRoh) {
    const richtung = ml > mlRoh ? "aufgerundet" : "abgerundet";
    schritte.push(`${fmt(mg)} ${einheit} ÷ ${fmt(mgPerMl)} ${einheit}/ml = ${fmt(mlRoh)} ml → ${richtung} ${fmt(ml)} ml (= ${fmt(mgEffektiv)} ${einheit})`);
  } else {
    schritte.push(`${fmt(mg)} ${einheit} ÷ ${fmt(mgPerMl)} ${einheit}/ml = ${fmt(ml)} ml`);
  }
  return { ml, mlRoh, mgEffektiv, schritte };
}
