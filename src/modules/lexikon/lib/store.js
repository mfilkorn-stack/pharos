// LocalStorage-Wrapper für Favoriten und Verlauf.
// Alles client-only, kein PII, nur Substanz-IDs.

const FAV_KEY = "wirkstoff-lookup.favorites";
const HIST_KEY = "wirkstoff-lookup.history";
const HIST_MAX = 30;

export function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function saveFavorites(ids) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify([...ids]));
  } catch { /* quota / private mode */ }
}

export function loadHistory() {
  try {
    const raw = localStorage.getItem(HIST_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function saveHistory(ids) {
  try {
    localStorage.setItem(HIST_KEY, JSON.stringify(ids.slice(0, HIST_MAX)));
  } catch { /* quota / private mode */ }
}

// Prepend id; remove duplicates further down; cap at HIST_MAX.
export function pushHistory(currentArr, id) {
  if (!id) return currentArr;
  const next = [id, ...currentArr.filter((x) => x !== id)];
  return next.slice(0, HIST_MAX);
}

export function toggleFavorite(currentArr, id) {
  if (!id) return currentArr;
  if (currentArr.includes(id)) return currentArr.filter((x) => x !== id);
  return [id, ...currentArr];
}
