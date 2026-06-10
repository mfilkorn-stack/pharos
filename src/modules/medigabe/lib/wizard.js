// Wizard-State als Modul-Store: überlebt Modulwechsel (z. B. Sprung zu MedScan
// zum Scannen) — bewusst NICHT persistiert (keine Patientendaten in Storage).

const initial = () => ({
  step: 1,
  medId: null,
  indId: null,
  patient: { geschlecht: null, alter: "", alterEinheit: "jahre", kg: "", dauerStatus: null },
  ki: {},
  aufkl: { items: {}, faehig: null, einwilligung: null, mutmasslich: false },
  dosier: { weg: null, prep: null },
  sechsR: {},
  durchf: {},
  freigabeZeit: null,
  // Fingerprint der Einsatzliste zum Zeitpunkt der Dauermedikations-Bestätigung.
  // Im Store (nicht in der Komponente), damit Änderungen während eines
  // MedScan-Besuchs beim Rückkehr-Mount erkannt werden.
  medsFingerprint: null,
});

let state = initial();
const subs = new Set();
const emit = () => [...subs].forEach((fn) => fn());

export function getWizard() { return state; }
// Flacher Spread: verschachtelte Felder (patient, aufkl, dosier, …) muss der
// Caller selbst spreaden: patchWizard({ patient: { ...getWizard().patient, kg: "70" } })
export function patchWizard(patch) { state = { ...state, ...patch }; emit(); }
export function resetWizard() { state = initial(); emit(); }
export function subscribeWizard(fn) { subs.add(fn); return () => subs.delete(fn); }
