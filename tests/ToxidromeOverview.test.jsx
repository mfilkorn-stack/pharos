// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ToxidromeOverview from "../src/modules/lexikon/components/ToxidromeOverview.jsx";

// Minimale Testdaten — 7 drogen_*-Gruppen
const GROUPS = {
  drogen_opioide: {
    gruppe: "Illegale Opioide",
    toxidrom: { key: "opioid", label: "Opioid-Toxidrom", leitsymptome: ["Miosis", "Atemdepression"] },
    antidot: [{ mittel: "Naloxon", hinweis: "Titriert i.v." }],
    mischkonsum: [],
    notfall: [],
  },
  drogen_stimulanzien: {
    gruppe: "Stimulanzien",
    toxidrom: { key: "sympathomimetisch", label: "Sympathomimetisches Toxidrom", leitsymptome: ["Mydriasis", "Tachykardie"] },
    antidot: [],
    mischkonsum: [],
    notfall: [],
  },
  drogen_halluzinogene: {
    gruppe: "Halluzinogene",
    toxidrom: { key: "halluzinogen", label: "Halluzinogenes Toxidrom", leitsymptome: ["Halluzinationen"] },
    antidot: [],
    mischkonsum: [],
    notfall: [],
  },
  drogen_cannabinoide: {
    gruppe: "Cannabinoide",
    toxidrom: { key: "cannabinoid", label: "Cannabinoid-Wirkung", leitsymptome: ["Tachykardie"] },
    antidot: [],
    mischkonsum: [],
    notfall: [],
  },
  drogen_dissoziativa: {
    gruppe: "Dissoziativa",
    toxidrom: { key: "dissoziativ", label: "Dissoziatives Toxidrom", leitsymptome: ["Nystagmus"] },
    antidot: [],
    mischkonsum: [],
    notfall: [],
  },
  drogen_dampfdrogen: {
    gruppe: "Dampfdrogen",
    toxidrom: { key: "dampf", label: "Dampfdrogen / GHB", leitsymptome: ["Sedierung"] },
    antidot: [],
    mischkonsum: [],
    notfall: [],
  },
  drogen_inhalantien: {
    gruppe: "Inhalantien",
    toxidrom: { key: "inhalant", label: "Inhalantien-Toxidrom", leitsymptome: ["Schwindel"] },
    antidot: [],
    mischkonsum: [],
    notfall: [],
  },
  // Nicht-Drogen-Gruppe — darf nicht auftauchen
  betablocker: {
    gruppe: "Betablocker",
    toxidrom: null,
    antidot: [],
    mischkonsum: [],
    notfall: [],
  },
};

const SUBSTANCE_COUNTS = {
  drogen_opioide: 4,
  drogen_stimulanzien: 6,
  drogen_halluzinogene: 6,
  drogen_cannabinoide: 2,
  drogen_dissoziativa: 1,
  drogen_dampfdrogen: 1,
  drogen_inhalantien: 2,
};

describe("ToxidromeOverview", () => {
  let onPickClass, onScan, onSearch;

  beforeEach(() => {
    onPickClass = vi.fn();
    onScan = vi.fn();
    onSearch = vi.fn();
  });

  it("rendert exakt 7 Klassenkarten", () => {
    render(
      <ToxidromeOverview
        groups={GROUPS}
        substanceCounts={SUBSTANCE_COUNTS}
        onPickClass={onPickClass}
        onScan={onScan}
        onSearch={onSearch}
      />
    );
    // Jede Karte ist ein <button> mit dem Toxidrom-Label
    expect(screen.getByText("Opioid-Toxidrom")).toBeDefined();
    expect(screen.getByText("Sympathomimetisches Toxidrom")).toBeDefined();
    expect(screen.getByText("Halluzinogenes Toxidrom")).toBeDefined();
    expect(screen.getByText("Cannabinoid-Wirkung")).toBeDefined();
    expect(screen.getByText("Dissoziatives Toxidrom")).toBeDefined();
    expect(screen.getByText("Dampfdrogen / GHB")).toBeDefined();
    expect(screen.getByText("Inhalantien-Toxidrom")).toBeDefined();
    // Nicht-Drogen-Gruppe betablocker darf NICHT erscheinen
    expect(screen.queryByText("Betablocker")).toBeNull();
  });

  it("ruft onPickClass mit korrektem groupId auf", () => {
    render(
      <ToxidromeOverview
        groups={GROUPS}
        substanceCounts={SUBSTANCE_COUNTS}
        onPickClass={onPickClass}
        onScan={onScan}
        onSearch={onSearch}
      />
    );
    fireEvent.click(screen.getByText("Opioid-Toxidrom"));
    expect(onPickClass).toHaveBeenCalledWith("drogen_opioide");

    fireEvent.click(screen.getByText("Sympathomimetisches Toxidrom"));
    expect(onPickClass).toHaveBeenCalledWith("drogen_stimulanzien");
  });

  it("zeigt Antidot-Text wenn antidot.length > 0", () => {
    render(
      <ToxidromeOverview
        groups={GROUPS}
        substanceCounts={SUBSTANCE_COUNTS}
        onPickClass={onPickClass}
        onScan={onScan}
        onSearch={onSearch}
      />
    );
    // Nur Opioide haben ein Antidot
    expect(screen.getByText("Naloxon")).toBeDefined();
    // Stimulanzien haben keins — "Antidot:" sollte nicht für diese Karte auftauchen
    // (kann aber wegen anderer Gruppen trotzdem da sein — nur einmal = Opioide)
    const antidotChips = screen.getAllByText("Naloxon");
    expect(antidotChips.length).toBe(1);
  });

  it("ruft onScan beim Scan-Button-Klick auf", () => {
    render(
      <ToxidromeOverview
        groups={GROUPS}
        substanceCounts={SUBSTANCE_COUNTS}
        onPickClass={onPickClass}
        onScan={onScan}
        onSearch={onSearch}
      />
    );
    fireEvent.click(screen.getByText("Substanz scannen"));
    expect(onScan).toHaveBeenCalledOnce();
  });

  it("ruft onSearch beim Suchen-Button-Klick auf", () => {
    render(
      <ToxidromeOverview
        groups={GROUPS}
        substanceCounts={SUBSTANCE_COUNTS}
        onPickClass={onPickClass}
        onScan={onScan}
        onSearch={onSearch}
      />
    );
    fireEvent.click(screen.getByText("Substanz suchen"));
    expect(onSearch).toHaveBeenCalledOnce();
  });

  it("zeigt Substanz-Anzahl pro Karte", () => {
    render(
      <ToxidromeOverview
        groups={GROUPS}
        substanceCounts={SUBSTANCE_COUNTS}
        onPickClass={onPickClass}
        onScan={onScan}
        onSearch={onSearch}
      />
    );
    // 4 nur bei drogen_opioide
    expect(screen.getByText("4 Substanzen")).toBeDefined();
    // 6 kommt zweimal (stimulanzien + halluzinogene) → getAllByText
    const sixSubst = screen.getAllByText("6 Substanzen");
    expect(sixSubst.length).toBe(2);
    // drogen_dissoziativa und drogen_dampfdrogen haben je 1 → "1 Substanz" (Singular)
    const oneSubst = screen.getAllByText("1 Substanz");
    expect(oneSubst.length).toBe(2);
  });
});
