import { describe, it, expect, beforeEach } from "vitest";
import { getWizard, patchWizard, resetWizard, subscribeWizard } from "../src/modules/medigabe/lib/wizard.js";

beforeEach(() => resetWizard());

describe("wizard Store", () => {
  it("startet bei Schritt 1 mit leerem State", () => {
    const w = getWizard();
    expect(w.step).toBe(1);
    expect(w.medId).toBeNull();
    expect(w.patient.dauerStatus).toBeNull();
    expect(w.medsFingerprint).toBeNull();
  });
  it("patcht flach und benachrichtigt Subscriber", () => {
    let n = 0;
    const un = subscribeWizard(() => n++);
    patchWizard({ medId: "saa:esketamin", step: 2 });
    expect(getWizard().medId).toBe("saa:esketamin");
    expect(n).toBe(1);
    un();
  });
  it("reset stellt Initialzustand wieder her", () => {
    patchWizard({ step: 6, sechsR: { 0: true } });
    resetWizard();
    expect(getWizard().step).toBe(1);
    expect(getWizard().sechsR).toEqual({});
  });
});
