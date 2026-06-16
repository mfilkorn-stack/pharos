// Client wrapper for the /enrich endpoint of the local KI proxy.
// Returns:
//   - the enriched entry (same shape as data.json substances) on success
//   - { quarantined: true, name } when the server signals quarantine
//   - null on any other failure

export async function enrichName(name, { url, timeoutMs = 45000 } = {}) {
  if (!url || !name) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.quarantined === true) {
      return { quarantined: true, name };
    }
    return data?.entry || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
