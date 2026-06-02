// Client-side KI fallback. Posts blob to local proxy, returns name list.
// Never logs or returns anything other than the substance names.

async function blobToBase64(blob) {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export async function recognizeWithKI(blob, source, { url, timeoutMs = 60000 } = {}) {
  if (!url) return [];
  let ctrl, timer;
  try {
    const mediaType = blob.type || "application/octet-stream";
    const dataBase64 = await blobToBase64(blob);
    ctrl = new AbortController();
    timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mediaType, dataBase64, source }),
      signal: ctrl.signal,
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.names) ? data.names.map((x) => String(x).trim()).filter(Boolean) : [];
  } catch {
    return [];
  } finally {
    if (timer) clearTimeout(timer);
  }
}
