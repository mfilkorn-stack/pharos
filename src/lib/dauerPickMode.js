// Signalisiert Lexikon, dass es im "Dauermedikation auswählen"-Modus läuft.
// Wird von Medigabe gesetzt, von Lexikon gelesen + zurückgesetzt.
let active = false;
const subs = new Set();
const emit = () => [...subs].forEach((fn) => fn());
export const getDauerPick = () => active;
export const setDauerPick = (v) => { active = !!v; emit(); };
export const subscribeDauerPick = (fn) => { subs.add(fn); return () => subs.delete(fn); };
