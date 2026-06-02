import "@testing-library/jest-dom";
import { webcrypto } from "node:crypto";
if (!globalThis.crypto) globalThis.crypto = webcrypto;

// Provide a full localStorage implementation when the environment doesn't supply one
if (typeof localStorage === "undefined" || typeof localStorage.clear !== "function") {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    get length() { return store.size; },
    key: (i) => [...store.keys()][i] ?? null,
  };
}
