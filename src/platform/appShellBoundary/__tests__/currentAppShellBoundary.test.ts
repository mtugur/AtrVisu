import { describe, expect, it } from "vitest";
import { currentAppShellBoundaryZones } from "../currentAppShellBoundary";

describe("current app shell boundary", () => {
  it("is not empty", () => {
    expect(currentAppShellBoundaryZones.length).toBeGreaterThan(0);
  });

  it("has non-empty zone ids", () => {
    expect(currentAppShellBoundaryZones.every((zone) => zone.id.trim())).toBe(true);
  });

  it("has non-empty labels", () => {
    expect(currentAppShellBoundaryZones.every((zone) => zone.label.trim())).toBe(true);
  });

  it("has non-empty source files", () => {
    expect(currentAppShellBoundaryZones.every((zone) => zone.sourceFiles.length > 0)).toBe(true);
  });

  it("contains app-root", () => {
    expect(currentAppShellBoundaryZones.some((zone) => zone.id === "app-root")).toBe(true);
  });

  it("contains scene-viewport", () => {
    expect(currentAppShellBoundaryZones.some((zone) => zone.id === "scene-viewport")).toBe(true);
  });

  it("contains at least one panel zone", () => {
    expect(currentAppShellBoundaryZones.some((zone) => zone.type === "panel")).toBe(true);
  });

  it("contains at least one modal zone", () => {
    expect(currentAppShellBoundaryZones.some((zone) => zone.type === "modal")).toBe(true);
  });

  it("can calculate high risk zone count", () => {
    const highRiskZoneCount = currentAppShellBoundaryZones.filter((zone) => zone.riskLevel === "high").length;

    expect(typeof highRiskZoneCount).toBe("number");
  });

  it("uses non-empty string source file paths", () => {
    expect(currentAppShellBoundaryZones.every((zone) =>
      zone.sourceFiles.every((sourceFile) => typeof sourceFile === "string" && sourceFile.trim().length > 0)
    )).toBe(true);
  });

  it("links the machine-properties zone to the multi-selection alignment surface", () => {
    const machinePropertiesZone = currentAppShellBoundaryZones.find((zone) => zone.id === "machine-properties");

    expect(machinePropertiesZone?.sourceFiles).toContain("src/components/MultiSelectionProperties.tsx");
    expect(machinePropertiesZone?.relatedSurfaceIds).toContain("surface.multiSelectionAlignment");
    expect(machinePropertiesZone?.relatedCommandIds).toContain("alignment.alignSelection");
  });

  it("links the machine-properties zone to selected-machine lifecycle actions", () => {
    const machinePropertiesZone = currentAppShellBoundaryZones.find((zone) => zone.id === "machine-properties");

    expect(machinePropertiesZone?.sourceFiles).toContain("src/components/MachineProperties.tsx");
    expect(machinePropertiesZone?.relatedSurfaceIds).toContain("surface.duplicateSelected");
    expect(machinePropertiesZone?.relatedCommandIds).toEqual(
      expect.arrayContaining(["edit.deleteSelected", "edit.duplicateSelected"])
    );
  });
});
