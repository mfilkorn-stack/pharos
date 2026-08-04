// Build-Zeitstempel des ausgelieferten Bundles.
//
// `__BUILD_TIME__` wird von Vite zur Build-Zeit per `define` textuell ersetzt
// (siehe vite.config.js). Ohne dieses define — in Vitest oder wenn ein Modul
// ausserhalb des Vite-Builds geladen wird — bleibt der Wert null; `typeof` auf
// einen nicht deklarierten Bezeichner wirft nicht, deshalb die Guard-Form.
export const BUILD_TIME =
  typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : null;

const FMT = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  // Fest auf Berlin: der Build laeuft auf dem Server (UTC), abgelesen wird die
  // Zeit hier. Ohne feste Zone waere der Stempel je nach Geraet verschoben.
  timeZone: "Europe/Berlin",
};

// "2026-08-04T19:31:00Z" → "04.08.2026, 21:31" (Europe/Berlin).
// Ohne gueltigen Zeitstempel (Dev-Server, Tests) → "dev".
export function formatBuildTime(iso = BUILD_TIME) {
  if (!iso) return "dev";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "dev";
  return new Intl.DateTimeFormat("de-DE", FMT).format(d);
}
