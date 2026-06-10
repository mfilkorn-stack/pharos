import { describe, it, expect, beforeEach } from "vitest";
import {
  getCaseMeds, setCaseMeds, addCaseMed, removeCaseMed,
  clearCaseMeds, subscribeCaseMeds, caseMedNames,
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
  it("caseMedNames filtert unknown/rejected (wie SaaCheck)", () => {
    const list = [
      { wirkstoff: "Metoprolol", source: "0a" },
      { wirkstoff: "Blister", source: "rejected" },
      { wirkstoff: "Xyz", source: "unknown" },
    ];
    expect(caseMedNames(list)).toEqual(["Metoprolol"]);
  });
});
