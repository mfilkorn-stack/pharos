export const KEY = "wirkstoff-lookup.consent";

export async function hashText(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isAccepted(version, text) {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const obj = JSON.parse(raw);
    if (obj.version !== version) return false;
    const h = await hashText(text);
    return obj.hash === h;
  } catch {
    return false;
  }
}

export async function accept(version, text) {
  const hash = await hashText(text);
  localStorage.setItem(KEY, JSON.stringify({ version, hash, acceptedAt: new Date().toISOString() }));
}
