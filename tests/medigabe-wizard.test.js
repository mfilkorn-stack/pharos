import { describe, it, expect, beforeEach } from "vitest";
import { getWizard, patchWizard, patchGabe, resetWizard, subscribeWizard } from "../src/modules/medigabe/lib/wizard.js";

beforeEach(() => resetWizard());

describe("wizard Store", () => {
  it("startet bei Schritt 1 mit leerem State", () => {
    const w = getWizard();
    expect(w.step).toBe(1);
    expect(w.gaben).toEqual([]);
    expect(w.patient.dauerStatus).toBeNull();
    expect(w.medsFingerprint).toBeNull();
  });
  it("patcht flach und benachrichtigt Subscriber", () => {
    let n = 0;
    const un = subscribeWizard(() => n++);
    patchWizard({ gaben: [{ medId: "saa:esketamin", indId: null, dosier: { weg: null, prep: null }, sechsR: {} }], step: 2 });
    expect(getWizard().gaben[0].medId).toBe("saa:esketamin");
    expect(n).toBe(1);
    un();
  });
  it("reset stellt Initialzustand wieder her", () => {
    patchWizard({ step: 6, gaben: [{ medId: "x", indId: null, dosier: { weg: null, prep: null }, sechsR: { 0: true } }] });
    resetWizard();
    expect(getWizard().step).toBe(1);
    expect(getWizard().gaben).toEqual([]);
  });
  it("patchGabe aktualisiert genau eine Gabe (immutable)", () => {
    patchWizard({ gaben: [
      { medId: "a", indId: null, dosier: { weg: null, prep: null }, sechsR: {} },
      { medId: "b", indId: null, dosier: { weg: null, prep: null }, sechsR: {} },
    ] });
    patchGabe(1, { indId: "x" });
    expect(getWizard().gaben[1].indId).toBe("x");
    expect(getWizard().gaben[0].indId).toBeNull();
  });
});
