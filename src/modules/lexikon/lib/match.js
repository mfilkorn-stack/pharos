export function norm(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .replace(/[^a-z0-9]/g, "");
}

export function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const d = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
    }
  }
  return d[m][n];
}

export function scoreEntry(token, entry) {
  const t = norm(token);
  if (!t) return 0;
  const synonyms = entry.synonyms || entry.handelsnamen || [];
  const cands = [entry.wirkstoff, ...synonyms].map(norm);
  let best = 0;
  for (const c of cands) {
    if (!c) continue;
    let s;
    if (c === t) s = 1;
    // Substring-Bonus nur für Kandidaten ab 3 Zeichen — sonst matchen kurze
    // Synonyme ("H", "E", "K") als Teilstring in fremde Wörter ("musHrooms").
    else if (c.length >= 3 && (c.includes(t) || t.includes(c))) s = 0.85;
    else s = 1 - lev(t, c) / Math.max(t.length, c.length);
    if (s > best) best = s;
  }
  return best;
}

export function resolve(input, db) {
  const tokens = (input || "").split(/[\s,;\n]+/).filter((x) => x.length >= 3);
  // Ganze Eingabe zusätzlich als Probe: Phrasen-Synonyme ("Liquid Ecstasy",
  // "Special K") sollen als Exaktmatch gewinnen statt nur Wort-für-Wort.
  const probe = tokens.length ? [input, ...tokens] : [input];
  return db.map((entry) => {
    let best = 0;
    for (const tok of probe) {
      let s = scoreEntry(tok, entry);
      // Exakter Voll-Phrasen-Match (mehrwortige Eingabe) leicht bevorzugen, damit
      // "Liquid Ecstasy" (GHB) ein einzelnes "Ecstasy" (MDMA) schlägt.
      if (tok === input && tokens.length > 1 && s >= 0.99) s = 1.05;
      if (s > best) best = s;
    }
    return { entry, score: best };
  })
    .filter((x) => x.score >= 0.55)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}
