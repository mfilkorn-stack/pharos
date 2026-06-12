import { useRef, useState, useEffect } from "react";
import { recognize } from "../lib/recognize.js";
import { recognizeText } from "../lib/ocr.js";
import { recognizeWithKI } from "../lib/ki.js";
import { config } from "../config.js";
import ConfirmList from "./ConfirmList.jsx";
import { XIcon, CameraIcon } from "./ui/icons.jsx";
import Button from "./ui/Button.jsx";

export default function Scanner({ source, onClose, onPick, onPickUnknown, onPickAll, lookup }) {
  const videoRef = useRef(null);
  const fileRef = useRef(null);
  const streamRef = useRef(null);
  const cancelRef = useRef(null);
  const autoOpenedRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [status, setStatus] = useState("");
  const [result, setResult] = useState(null);
  const [snapshot, setSnapshot] = useState(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const resetForRetry = () => {
    setResult(null);
    setSnapshot(null);
    setStatus("");
    setMsg("");
    if (source === "scan") { cancelRef.current?.(); cancelRef.current = startCamera(); }
  };

  const run = async (blob, isPdf) => {
    setBusy(true); setResult(null); setMsg(""); setStatus("Bereite Erkennung vor …");
    try {
      const cloudActive = config.flags.cloudPackung || config.flags.cloudPlan;
      const ki = cloudActive ? (b, s) => recognizeWithKI(b, s, { url: config.kiProxyUrl }) : null;
      const r = await recognize(blob, {
        isPdf,
        ocr: recognizeText,
        lookup,
        ki,
        source: "auto",
        onStatus: setStatus,
      });
      setStatus("Fertig.");
      setResult(r);
    } catch {
      setMsg("Erkennung fehlgeschlagen – bitte erneut versuchen oder Namen manuell suchen.");
      setStatus("");
    } finally { setBusy(false); }
  };

  const startCamera = () => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play();
        }
      } catch {
        setMsg("Kamera nicht verfügbar – bitte stattdessen Hochladen nutzen.");
      }
    })();
    return () => { cancelled = true; };
  };

  useEffect(() => {
    if (source !== "scan") return;
    cancelRef.current = startCamera();
    return () => { cancelRef.current?.(); stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  // Modal-Verhalten: Esc schließt, Hintergrund-Scroll sperren.
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow; };
  }, [onClose]);

  useEffect(() => {
    if (source === "upload" && fileRef.current && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      fileRef.current.click();
    }
  }, [source]);

  const capture = async () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) { setMsg("Noch kein Kamerabild – kurz warten."); return; }
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    const dataUrl = c.toDataURL("image/jpeg", 0.9);
    setSnapshot(dataUrl);
    stopCamera();
    const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.9));
    if (blob) run(blob, false);
  };

  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setSnapshot(String(reader.result));
      reader.readAsDataURL(f);
    } else {
      setSnapshot("pdf");
    }
    run(f, f.type === "application/pdf");
  };

  const frozen = snapshot !== null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-start justify-center overflow-auto p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={source === "scan" ? "Medikament scannen" : "Datei hochladen"}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="bg-bg-secondary rounded-2xl border border-border shadow-2xl max-w-md w-full flex flex-col gap-4 p-5 sm:p-6 max-h-[92vh] overflow-y-auto my-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-text-muted">
            {source === "scan" ? "Scannen" : "Hochladen"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors"
            aria-label="Schließen"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Camera / Image area */}
        {source === "scan" && !frozen ? (
          <video ref={videoRef} className="w-full aspect-[4/3] object-cover bg-bg-primary border border-border rounded-xl" muted playsInline />
        ) : null}
        {frozen && snapshot !== "pdf" ? (
          <img src={snapshot} alt="Aufnahme" className="w-full aspect-[4/3] object-cover bg-bg-primary border border-border rounded-xl" />
        ) : null}
        {frozen && snapshot === "pdf" ? (
          <div className="w-full aspect-[4/3] bg-bg-primary border border-border rounded-xl flex items-center justify-center font-mono text-sm text-text-muted">
            PDF wird verarbeitet …
          </div>
        ) : null}

        {/* Capture button */}
        {!result && source === "scan" && !frozen ? (
          <Button variant="primary" size="lg" onClick={capture} disabled={busy} className="w-full">
            <CameraIcon className="h-5 w-5" />
            Aufnehmen &amp; erkennen
          </Button>
        ) : null}

        {/* File input (hidden) */}
        {!result && source === "upload" && !frozen ? (
          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onFile} />
        ) : null}

        {/* Status row */}
        {(busy || (status && !result)) ? (
          <div className="flex items-center gap-3 px-3 py-2.5 bg-card border border-border rounded-lg">
            <span className="h-2 w-2 rounded-full bg-accent flex-shrink-0 animate-pulse" />
            <span className="text-sm text-text-primary font-mono">{status || "Erkenne …"}</span>
          </div>
        ) : null}

        {/* Error message */}
        {msg ? (
          <p className="text-sm text-warning font-mono leading-relaxed">{msg}</p>
        ) : null}

        {/* Result / ConfirmList */}
        {result ? (
          <>
            {result.kiUsed ? (
              <p className="text-xs text-text-muted font-mono">Erkennung via Cloud-KI</p>
            ) : null}
            <ConfirmList
              {...result}
              onPick={onPick}
              onPickUnknown={onPickUnknown}
              onPickAll={onPickAll}
              onClose={onClose}
              onRetry={resetForRetry}
            />
          </>
        ) : !frozen && source === "scan" ? (
          <p className="text-sm text-text-muted leading-relaxed">
            Packung, Plan oder Barcode vor die Kamera halten und aufnehmen.
          </p>
        ) : !frozen && source === "upload" ? (
          <p className="text-sm text-text-muted leading-relaxed">
            PDF oder Bild auswählen. Erkannte Wirkstoffe erscheinen als Vorschlag.
          </p>
        ) : null}
      </div>
    </div>
  );
}
