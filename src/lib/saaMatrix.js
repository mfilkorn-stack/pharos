// Geteilte SAA-Interaktionsmatrix: committeter Seed + Runtime-Ergänzungen vom Server.
// Eine Quelle für MedScan UND Medigabe — sonst divergieren die KI-Abgleiche der Module.
import { useCallback, useEffect, useMemo, useState } from "react";
import seed from "../modules/lexikon/data/saa-matrix.json";

export function useSaaMatrix() {
  const [runtime, setRuntime] = useState({});
  const reload = useCallback(async () => {
    try {
      const res = await fetch("/data/saa-matrix-runtime.json", { cache: "no-store" });
      if (!res.ok) return;
      const d = await res.json();
      setRuntime(d?.entries || {});
    } catch { /* offline ok — Seed reicht */ }
  }, []);
  useEffect(() => { reload(); }, [reload]);
  const matrix = useMemo(() => ({ ...(seed.entries || {}), ...runtime }), [runtime]);
  return { matrix, reload };
}
