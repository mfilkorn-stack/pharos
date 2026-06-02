import { useState, useEffect, useRef, useCallback } from "react";
import { useMode } from "./shell/useMode.js";
import HomeScreen from "./shell/HomeScreen.jsx";
import DesktopSidebar from "./shell/DesktopSidebar.jsx";
import BottomTabBar from "./shell/BottomTabBar.jsx";
import Lexikon from "./modules/lexikon/Lexikon.jsx";
import Trainer from "./modules/trainer/Trainer.jsx";
import ConsentGate, { CONSENT_TEXT } from "./modules/lexikon/components/ConsentGate.jsx";
import { isAccepted } from "./modules/lexikon/lib/consent.js";
import { config } from "./modules/lexikon/config.js";

export default function App() {
  const { mode, setMode, goHome } = useMode("home");
  const [consented, setConsented] = useState(false);
  const [checking, setChecking] = useState(true);

  // Lexikon-Navigationszustand (von der Shell gespiegelt fuer Hervorhebung + Zaehler).
  const [lexNav, setLexNav] = useState({ active: "suche", counts: {} });
  const lexRef = useRef(null);

  // Consent einmalig auf App-Ebene (gilt fuer beide Module).
  useEffect(() => {
    isAccepted(config.consentVersion, CONSENT_TEXT).then((ok) => {
      setConsented(ok);
      setChecking(false);
    });
  }, []);

  const handleNav = useCallback((key) => lexRef.current?.nav(key), []);
  const handleMode = useCallback((m) => setMode(m), [setMode]);
  const onNavState = useCallback((s) => setLexNav(s), []);

  if (checking) return null;
  if (!consented) return <ConsentGate onAccept={() => setConsented(true)} />;

  if (mode === "home") {
    return <HomeScreen onPick={setMode} />;
  }

  return (
    <div className="min-h-screen bg-bg-primary flex">
      {/* Desktop-Navigation (lg+) */}
      <div className="hidden lg:block">
        <DesktopSidebar
          mode={mode}
          active={lexNav.active}
          counts={lexNav.counts}
          onNav={handleNav}
          onMode={handleMode}
          onHome={goHome}
        />
      </div>

      {/* Modul-Inhalt */}
      <div className="flex-1 flex flex-col min-w-0">
        {mode === "lexikon" ? <Lexikon ref={lexRef} onNavState={onNavState} /> : null}
        {mode === "trainer" ? <Trainer /> : null}
      </div>

      {/* Mobile-Navigation (< lg) */}
      <div className="lg:hidden">
        <BottomTabBar
          mode={mode}
          active={lexNav.active}
          counts={lexNav.counts}
          onNav={handleNav}
          onMode={handleMode}
        />
      </div>
    </div>
  );
}
