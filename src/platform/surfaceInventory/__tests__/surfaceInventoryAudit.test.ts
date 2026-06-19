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

  it("covers viewport fit and no-red-console command seed links", () => {
    expect(getSurfaceInventoryItemsByCommandId("view.fitView").length).toBeGreaterThan(0);
    expect(getSurfaceInventoryItemsByCommandId("diagnostics.noRedConsole").length).toBeGreaterThan(0);
  });

  it("covers layout explorer and diagnostics panel seed links", () => {
    expect(getSurfaceInventoryItemsByPanelId("panel.layoutExplorer").length).toBeGreaterThan(0);
    expect(getSurfaceInventoryItemsByPanelId("panel.diagnostics").length).toBeGreaterThan(0);
  });

  it("finds surfaces by feature id", () => {
    expect(getSurfaceInventoryItemsByFeatureId("library.manager").map((item) => item.surfaceId)).toContain("surface.libraryManager");
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

