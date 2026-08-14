import { describe, expect, it } from "vitest";
import { currentPlatformSurfaceInventory } from "../currentSurfaceInventory";
import {
  getSurfaceInventoryItemById,
  getSurfaceInventoryItemsByCommandId,
  getSurfaceInventoryItemsByFeatureId,
  getSurfaceInventoryItemsByPanelId,
  validateSurfaceInventory
} from "../surfaceInventoryAudit";
import type { PlatformSurfaceInventoryItem } from "../surfaceInventoryTypes";

const firstSurface = currentPlatformSurfaceInventory[0];

describe("surface inventory audit", () => {
  it("finds an existing item by id", () => {
    expect(getSurfaceInventoryItemById("surface.machineLibrary")?.label).toBe("Machine Library");
  });

  it("returns undefined for missing item ids", () => {
    expect(getSurfaceInventoryItemById("surface.missing")).toBeUndefined();
  });

  it("finds surfaces by panel id", () => {
    expect(getSurfaceInventoryItemsByPanelId("panel.machineLibrary").map((item) => item.surfaceId)).toContain("surface.machineLibrary");
  });

  it("finds surfaces by command id", () => {
    expect(getSurfaceInventoryItemsByCommandId("project.exportJson").map((item) => item.surfaceId)).toContain("surface.projectExportJson");
  });

  it("does not represent planned or quality-only capabilities as runtime commands", () => {
    expect(getSurfaceInventoryItemsByCommandId("view.fitView")).toEqual([]);
    expect(getSurfaceInventoryItemsByCommandId("diagnostics.noRedConsole")).toEqual([]);
  });

  it("represents live workbench panels and excludes declared-planned panels", () => {
    expect(getSurfaceInventoryItemsByPanelId("panel.layoutExplorer").map((item) => item.surfaceId))
      .toContain("surface.layoutExplorer");
    expect(getSurfaceInventoryItemsByPanelId("panel.statusBar").map((item) => item.surfaceId))
      .toContain("surface.workbenchStatusBar");
    expect(getSurfaceInventoryItemsByPanelId("panel.diagnostics")).toEqual([]);
  });

  it("represents no-red-console as external quality evidence", () => {
    expect(
      getSurfaceInventoryItemsByFeatureId("diagnostics.noRedConsole").map((item) => item.surfaceId)
    ).toContain("surface.noRedConsoleQualityGate");
  });

  it("finds surfaces by feature id", () => {
    expect(getSurfaceInventoryItemsByFeatureId("library.manager").map((item) => item.surfaceId)).toContain("surface.libraryManager");
  });

  it("links the View-owned display modal to its command, panel, and overlay features", () => {
    expect(getSurfaceInventoryItemsByCommandId("view.displayOverlayControls").map((item) => item.surfaceId))
      .toContain("surface.displayOverlayControls");
    expect(getSurfaceInventoryItemsByPanelId("panel.displayOverlayControls").map((item) => item.surfaceId))
      .toContain("surface.displayOverlayControls");
    [
      "view.selectionBox",
      "view.metadataBox",
      "view.collisionEnvelope",
      "view.clearanceEnvelope",
      "annotations.visibility",
      "annotations.leaderLines",
      "connectionPoints.displayMode"
    ].forEach((featureId) => {
      expect(getSurfaceInventoryItemsByFeatureId(featureId).map((item) => item.surfaceId))
        .toContain("surface.displayOverlayControls");
    });
  });

  it("finds the multi-selection alignment surface by feature, command, and panel links", () => {
    expect(getSurfaceInventoryItemsByFeatureId("selection.multiSelect").map((item) => item.surfaceId)).toContain(
      "surface.multiSelectionAlignment"
    );
    expect(getSurfaceInventoryItemsByCommandId("alignment.alignSelection").map((item) => item.surfaceId)).toContain(
      "surface.multiSelectionAlignment"
    );
    expect(getSurfaceInventoryItemsByPanelId("panel.inspector").map((item) => item.surfaceId)).toContain(
      "surface.multiSelectionAlignment"
    );
  });

  it("validates current inventory without errors", () => {
    expect(validateSurfaceInventory().errors).toEqual([]);
  });

  it("reports duplicate surface ids", () => {
    const inventory: readonly PlatformSurfaceInventoryItem[] = [firstSurface, firstSurface];

    expect(validateSurfaceInventory(inventory).errors.some((error) => /Duplicate surfaceId/.test(error.message))).toBe(true);
  });

  it("reports missing command ids", () => {
    const inventory: readonly PlatformSurfaceInventoryItem[] = [
      { ...firstSurface, commandIds: ["missing.command"] }
    ];

    expect(validateSurfaceInventory(inventory).errors.some((error) => /Missing commandId/.test(error.message))).toBe(true);
  });

  it("reports missing panel ids", () => {
    const inventory: readonly PlatformSurfaceInventoryItem[] = [
      { ...firstSurface, panelIds: ["panel.missing"] }
    ];

    expect(validateSurfaceInventory(inventory).errors.some((error) => /Missing panelId/.test(error.message))).toBe(true);
  });

  it("reports missing feature ids", () => {
    const inventory: readonly PlatformSurfaceInventoryItem[] = [
      { ...firstSurface, featureIds: ["missing.feature"] }
    ];

    expect(validateSurfaceInventory(inventory).errors.some((error) => /Missing featureId/.test(error.message))).toBe(true);
  });

  it("reports empty source file lists", () => {
    const inventory: readonly PlatformSurfaceInventoryItem[] = [
      { ...firstSurface, sourceFiles: [] }
    ];

    expect(validateSurfaceInventory(inventory).errors.some((error) => /sourceFiles must not be empty/.test(error.message))).toBe(true);
  });

  it("does not mutate inventory during validation", () => {
    const inventoryLength = currentPlatformSurfaceInventory.length;

    validateSurfaceInventory();

    expect(currentPlatformSurfaceInventory).toHaveLength(inventoryLength);
  });
});

