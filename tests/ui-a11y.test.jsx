// @vitest-environment jsdom
// Absicherung der UI/UX-Audit-Fixes: Dialog-Fokus, stabile Modul-Navigation, Chip-State.
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ConfirmDialog from "../src/modules/lexikon/components/ui/ConfirmDialog.jsx";
import BottomTabBar from "../src/shell/BottomTabBar.jsx";
import Chip from "../src/modules/lexikon/components/ui/Chip.jsx";

describe("ConfirmDialog", () => {
  it("rendert als alertdialog mit sprechenden Buttons und schließt per Escape", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog open title="Neuen Patienten beginnen?" confirmLabel="Alles zurücksetzen" onCancel={onCancel} onConfirm={onConfirm}>
        Text
      </ConfirmDialog>
    );
    const dlg = screen.getByRole("alertdialog", { name: "Neuen Patienten beginnen?" });
    expect(dlg).toBeTruthy();
    expect(dlg.contains(document.activeElement)).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Alles zurücksetzen" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("rendert geschlossen nichts", () => {
    render(<ConfirmDialog open={false} title="x" confirmLabel="y" onCancel={() => {}} onConfirm={() => {}} />);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});

describe("BottomTabBar", () => {
  const labels = () => screen.getAllByRole("button").map((b) => b.textContent);

  it("hat in jedem Modul dieselbe Reihenfolge inkl. Start", () => {
    const { rerender } = render(<BottomTabBar mode="lexikon" onMode={() => {}} onHome={() => {}} />);
    const a = labels();
    rerender(<BottomTabBar mode="trainer" onMode={() => {}} onHome={() => {}} />);
    expect(labels()).toEqual(a);
    expect(a).toEqual(["Start", "MedScan", "Medigabe", "Übergabe"]);
  });

  it("markiert das aktive Modul mit aria-current und ruft onHome für Start", () => {
    const onHome = vi.fn();
    render(<BottomTabBar mode="medigabe" onMode={() => {}} onHome={onHome} />);
    expect(screen.getByRole("button", { name: "Medigabe" }).getAttribute("aria-current")).toBe("page");
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(onHome).toHaveBeenCalledOnce();
  });
});

describe("Chip", () => {
  it("meldet den Auswahlzustand per aria-pressed", () => {
    render(<Chip active onClick={() => {}}>Kardio</Chip>);
    expect(screen.getByRole("button", { name: /Kardio/ }).getAttribute("aria-pressed")).toBe("true");
  });
});
