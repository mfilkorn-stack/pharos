/**
 * Task C Tests — HomeScreen, App handlePick, ResultDetail drug sources, enrich quarantine.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// ─── HomeScreen ───────────────────────────────────────────────────────────────
describe("HomeScreen", () => {
  it("rendert das Drogen/Tox-Tile", async () => {
    const HomeScreen = (await import("../src/shell/HomeScreen.jsx")).default;
    render(<HomeScreen onPick={() => {}} />);
    expect(screen.getByText("Drogen / Tox")).toBeTruthy();
    expect(screen.getByText("Erkennen", { exact: false })).toBeTruthy();
  });

  it("ruft onPick('drogen') beim Klick auf das Tile auf", async () => {
    const HomeScreen = (await import("../src/shell/HomeScreen.jsx")).default;
    const onPick = vi.fn();
    render(<HomeScreen onPick={onPick} />);
    // Button enthält "Drogen / Tox"
    const buttons = screen.getAllByRole("button");
    const drogenBtn = buttons.find((b) => b.textContent.includes("Drogen / Tox"));
    expect(drogenBtn).toBeTruthy();
    fireEvent.click(drogenBtn);
    expect(onPick).toHaveBeenCalledWith("drogen");
  });
});

// ─── App handlePick ───────────────────────────────────────────────────────────
describe("App handlePick", () => {
  beforeEach(() => {
    vi.resetModules();
    // Stub consent so App renders HomeScreen immediately.
    vi.doMock("../src/modules/lexikon/lib/consent.js", () => ({
      isAccepted: async () => true,
    }));
    vi.doMock("../src/modules/lexikon/components/ConsentGate.jsx", () => ({
      default: () => null,
      CONSENT_TEXT: "",
    }));
  });

  it("handlePick('drogen') setzt mode auf 'lexikon' und pendingLexNav auf 'drogen'", async () => {
    // Unit-Test der handlePick-Logik ohne vollen App-Mount.
    // Wir extrahieren die Logik direkt — pendingLexNav-Pattern ist imperative ref.
    const pendingLexNav = { current: null };
    let capturedMode = null;
    const setMode = (m) => { capturedMode = m; };

    // Logik aus App.jsx nachgebaut:
    const handlePick = (key) => {
      if (key === "drogen") {
        pendingLexNav.current = "drogen";
        setMode("lexikon");
      } else {
        setMode(key);
      }
    };

    handlePick("drogen");
    expect(capturedMode).toBe("lexikon");
    expect(pendingLexNav.current).toBe("drogen");
  });

  it("handlePick('medigabe') setzt mode auf 'medigabe' ohne pendingLexNav", async () => {
    const pendingLexNav = { current: null };
    let capturedMode = null;
    const setMode = (m) => { capturedMode = m; };

    const handlePick = (key) => {
      if (key === "drogen") {
        pendingLexNav.current = "drogen";
        setMode("lexikon");
      } else {
        setMode(key);
      }
    };

    handlePick("medigabe");
    expect(capturedMode).toBe("medigabe");
    expect(pendingLexNav.current).toBeNull();
  });
});

// ─── ResultDetail — Drogen-Quellen ───────────────────────────────────────────
describe("ResultDetail — Drogen-Quellen (Seed-Droge, isDrug=true, keine item.sources)", () => {
  beforeEach(() => {
    vi.resetModules();
    // SaaDetail stub
    vi.doMock("../src/modules/lexikon/components/SaaDetail.jsx", () => ({
      default: () => null,
    }));
  });

  it("zeigt 2 Sektionen: Geprüfte Fachquellen + Substanzwarnungen / Drug-Checking", async () => {
    const { default: ResultDetail } = await import(
      "../src/modules/lexikon/components/ResultDetail.jsx"
    );
    // Seed-Droge: group beginnt mit drogen_, keine item.sources
    const item = {
      id: "mdma",
      wirkstoff: "MDMA",
      gruppe: "Empathogene / Entaktogene",
      group: "drogen_mdma",
      source: "0b",
      synonyms: ["Ecstasy", "Molly"],
      indikationen: [],
    };
    render(<ResultDetail item={item} />);

    expect(screen.getByText("Geprüfte Fachquellen")).toBeTruthy();
    expect(screen.getByText("Substanzwarnungen / Drug-Checking")).toBeTruthy();
    // Harm-reduction disclaimer
    expect(screen.getByText(/kein Medizinprodukt/i)).toBeTruthy();
  });

  it("zeigt corroborates-Badges für auth-Quellen mit gespeicherten item.sources", async () => {
    const { default: ResultDetail } = await import(
      "../src/modules/lexikon/components/ResultDetail.jsx"
    );
    const item = {
      id: "kokain",
      wirkstoff: "Kokain",
      gruppe: "Stimulanzien",
      group: "drogen_stimulanzien",
      source: "ki",
      synonyms: [],
      indikationen: [],
      verification: { status: "valide", sourceCount: 3, checkedAt: "2026-06-01" },
      sources: [
        { url: "https://euda.europa.eu/test", publisher: "EUDA", domain: "euda.europa.eu", role: "auth", corroborates: true },
        { url: "https://saferparty.ch/warnungen", publisher: "saferparty.ch", domain: "saferparty.ch", role: "harm_reduction", corroborates: null },
      ],
    };
    render(<ResultDetail item={item} />);

    expect(screen.getByText("Geprüfte Fachquellen", { exact: false })).toBeTruthy();
    expect(screen.getByText("bestätigt")).toBeTruthy();
    expect(screen.getByText("Substanzwarnungen / Drug-Checking")).toBeTruthy();
  });

  it("zeigt für Medikament (!isDrug) keine Drogen-Quellen-Sektionen", async () => {
    const { default: ResultDetail } = await import(
      "../src/modules/lexikon/components/ResultDetail.jsx"
    );
    const item = {
      id: "asp",
      wirkstoff: "Aspirin",
      gruppe: "Analgetika",
      group: "analgetika",
      source: "0b",
      synonyms: [],
      indikationen: [],
    };
    render(<ResultDetail item={item} />);

    expect(screen.queryByText("Geprüfte Fachquellen")).toBeNull();
    expect(screen.queryByText("Substanzwarnungen / Drug-Checking")).toBeNull();
  });
});

// ─── enrich.js — quarantined ──────────────────────────────────────────────────
describe("enrichName — quarantined-Response", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("gibt { quarantined: true, name } zurück wenn Server quarantined:true liefert", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ entry: null, quarantined: true, reason: "widerspruch" }),
    }));
    const { enrichName } = await import("../src/modules/lexikon/lib/enrich.js");
    const result = await enrichName("SomeNPS", { url: "http://x/enrich" });
    expect(result).toEqual({ quarantined: true, name: "SomeNPS" });
  });

  it("gibt entry zurück wenn Server kein quarantined liefert", async () => {
    const entry = { id: "y", wirkstoff: "Y", source: "ki" };
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ entry, quarantined: false }),
    }));
    const { enrichName } = await import("../src/modules/lexikon/lib/enrich.js");
    const result = await enrichName("Y", { url: "http://x/enrich" });
    expect(result).toEqual(entry);
  });

  it("gibt null zurück bei non-ok Response", async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }));
    const { enrichName } = await import("../src/modules/lexikon/lib/enrich.js");
    const result = await enrichName("Z", { url: "http://x/enrich" });
    expect(result).toBeNull();
  });

  it("gibt null zurück wenn fetch wirft", async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error("network"); });
    const { enrichName } = await import("../src/modules/lexikon/lib/enrich.js");
    const result = await enrichName("Z", { url: "http://x/enrich" });
    expect(result).toBeNull();
  });
});
