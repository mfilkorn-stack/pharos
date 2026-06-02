import { useState, useCallback } from "react";

// Aktiver Pharos-Modus: "home" (Launcher) | "lexikon" | "trainer".
export function useMode(initial = "home") {
  const [mode, setMode] = useState(initial);
  const goHome = useCallback(() => setMode("home"), []);
  return { mode, setMode, goHome };
}
