import { describe, expect, it } from "vitest";
import { currentPlatformSurfaceInventory } from "../currentSurfaceInventory";

const criticalSurfaceIds = [
  "surface.machineLibrary",
  "surface.sceneViewport",
  "surface.inspector",
  "surface.projectExportJson",
  "surface.projectImportJson",
  "surface.deleteSelected",
  "surface.undoRedo",
  "surface.multiSelectionAlignment",
  "surface.annotations",
  "surface.layers",
  "surface.groups",
  "surface.collisionCheck",
  "surface.libraryManager",
  "surface.taxonomyManager",
  "surface.civilColumn",
  "surface.rotationSnap",
  "surface.connectionPointSnap",
  "surface.alignment"
] as const;

describe("current surface inventory", () => {
  it("is not empty", () => {
    expect(currentPlatformSurfaceInventory.length).toBeGreaterThan(0);
  });

  it("uses unique surface ids", () => {
    const surfaceIds = currentPlatformSurfaceInventory.map((item) => item.surfaceId);

    expect(new Set(surfaceIds).size).toBe(surfaceIds.length);
  });

  it("has non-empty labels", () => {
    expect(currentPlatformSurfaceInventory.every((item) => item.label.trim())).toBe(true);
  });

  it("has non-empty source files", () => {
    expect(currentPlatformSurfaceInventory.every((item) => item.sourceFiles.length > 0)).toBe(true);
    expect(currentPlatformSurfaceInventory.every((item) => item.sourceFiles.every((sourceFile) => sourceFile.trim()))).toBe(true);
  });

  it("contains panel-linked surfaces", () => {
    expect(currentPlatformSurfaceInventory.some((item) => (item.panelIds?.length ?? 0) > 0)).toBe(true);
  });

  it("contains command-linked surfaces", () => {
    expect(currentPlatformSurfaceInventory.some((item) => (item.commandIds?.length ?? 0) > 0)).toBe(true);
  });

  it("contains critical surface ids", () => {
    const surfaceIds = new Set(currentPlatformSurfaceInventory.map((item) => item.surfaceId));

    criticalSurfaceIds.forEach((surfaceId) => {
      expect(surfaceIds.has(surfaceId)).toBe(true);
    });
  });

  it("documents the multi-selection alignment panel surface", () => {
    const multiSelectionSurface = currentPlatformSurfaceInventory.find(
      (item) => item.surfaceId === "surface.multiSelectionAlignment"
    );

    expect(multiSelectionSurface?.sourceFiles).toContain("src/components/MultiSelectionProperties.tsx");
    expect(multiSelectionSurface?.commandIds).toContain("alignment.alignSelection");
    expect(multiSelectionSurface?.panelIds).toContain("panel.inspector");
    expect(multiSelectionSurface?.featureIds).toEqual(
      expect.arrayContaining(["selection.multiSelect", "alignment.alignSelection", "object.movePlan"])
    );
    expect(multiSelectionSurface?.notes).toContain("PR #69-#73");
  });

  it("documents the selected-machine duplicate action as an inspector surface", () => {
    const duplicateSurface = currentPlatformSurfaceInventory.find(
      (item) => item.surfaceId === "surface.duplicateSelected"
    );

    expect(duplicateSurface?.owner).toBe("existing-ui");
    expect(duplicateSurface?.sourceFiles).toEqual(
      expect.arrayContaining(["src/App.tsx", "src/components/MachineProperties.tsx", "src/utils/placement.ts"])
    );
    expect(duplicateSurface?.commandIds).toContain("edit.duplicateSelected");
    expect(duplicateSurface?.panelIds).toContain("panel.inspector");
    expect(duplicateSurface?.featureIds).toEqual(expect.arrayContaining(["object.duplicate", "panel.inspector"]));
    expect(duplicateSurface?.notes).toContain("multi-select duplicate remains out of scope");
  });
});

