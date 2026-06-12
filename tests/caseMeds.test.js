import { describe, it, expect, beforeEach } from "vitest";
import {
  getCaseMeds, setCaseMeds, addCaseMed, removeCaseMed,
  clearCaseMeds, subscribeCaseMeds, caseMedNames, upsertCaseMeds,
} from "../src/lib/caseMeds.js";

beforeEach(() => clearCaseMeds());

describe("caseMeds Store", () => {
  it("setzt und liest Einträge (immutable Snapshot)", () => {
    setCaseMeds([{ wirkstoff: "Metoprolol", source: "0a" }]);
    const a = getCaseMeds();
    expect(a).toHaveLength(1);
    setCaseMeds([]);
    expect(a).toHaveLength(1); // alter Snapshot unverändert
  });
  it("addCaseMed dedupliziert per Wirkstoffname (case-insensitive)", () => {
    addCaseMed({ wirkstoff: "Ramipril", source: "medigabe" });
    addCaseMed({ wirkstoff: "ramipril", source: "medigabe" });
    expect(getCaseMeds()).toHaveLength(1);
  });
  it("removeCaseMed entfernt per Wirkstoffname", () => {
    setCaseMeds([{ wirkstoff: "A", source: "x" }, { wirkstoff: "B", source: "x" }]);
    removeCaseMed("A");
    expect(getCaseMeds().map((e) => e.wirkstoff)).toEqual(["B"]);
  });
  it("benachrichtigt Subscriber, Unsubscribe funktioniert", () => {
    let n = 0;
    const un = subscribeCaseMeds(() => n++);
    addCaseMed({ wirkstoff: "X", source: "t" });
    un();
    addCaseMed({ wirkstoff: "Y", source: "t" });
    expect(n).toBe(1);
  });
  it("upsertCaseMeds ergänzt statt zu ersetzen — bestehende Einträge bleiben", () => {
    setCaseMeds([{ wirkstoff: "Ramipril", source: "medigabe" }]);
    upsertCaseMeds([{ wirkstoff: "Metoprolol", source: "0a" }]);
    expect(getCaseMeds().map((e) => e.wirkstoff)).toEqual(["Ramipril", "Metoprolol"]);
  });
  it("upsertCaseMeds aktualisiert gleichnamige Einträge (neuer gewinnt, case-insensitive)", () => {
    setCaseMeds([{ wirkstoff: "metoprolol", source: "medigabe" }]);
    upsertCaseMeds([{ wirkstoff: "Metoprolol", source: "0a", id: "metoprolol" }]);
    const list = getCaseMeds();
    expect(list).toHaveLength(1);
    expect(list[0].source).toBe("0a");
  });
  it("getSnapshot ist referenzstabil zwischen Mutationen (useSyncExternalStore-Kontrakt)", () => {
    addCaseMed({ wirkstoff: "X", source: "t" });
    expect(getCaseMeds()).toBe(getCaseMeds());
  });
  it("caseMedNames filtert unknown/rejected (wie SaaCheck)", () => {
    const list = [
      { wirkstoff: "Metoprolol", source: "0a" },
      { wirkstoff: "Blister", source: "rejected" },
      { wirkstoff: "Xyz", source: "unknown" },
    ];
    expect(caseMedNames(list)).toEqual(["Metoprolol"]);
  });
});
