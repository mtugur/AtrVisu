import { describe, expect, it } from "vitest";
import { currentPlatformSurfaceInventory } from "../currentSurfaceInventory";
import { createPlatformSurfaceInventoryReport } from "../platformSurfaceInventoryReport";

describe("platform surface inventory report", () => {
  it("reports surface count", () => {
    expect(createPlatformSurfaceInventoryReport().surfaceCount).toBeGreaterThan(0);
  });

  it("reports linked surface counts", () => {
    const report = createPlatformSurfaceInventoryReport();

    expect(report.panelLinkedSurfaceCount).toBeGreaterThan(0);
    expect(report.commandLinkedSurfaceCount).toBeGreaterThan(0);
  });

  it("validates inventory with no errors", () => {
    expect(createPlatformSurfaceInventoryReport().audit.errors).toEqual([]);
  });

  it("matches current inventory counts", () => {
    const report = createPlatformSurfaceInventoryReport();

    expect(report.surfaceCount).toBe(currentPlatformSurfaceInventory.length);
    expect(report.panelLinkedSurfaceCount).toBe(
      currentPlatformSurfaceInventory.filter((item) => (item.panelIds?.length ?? 0) > 0).length
    );
    expect(report.commandLinkedSurfaceCount).toBe(
      currentPlatformSurfaceInventory.filter((item) => (item.commandIds?.length ?? 0) > 0).length
    );
    expect(report.featureLinkedSurfaceCount).toBe(
      currentPlatformSurfaceInventory.filter((item) => (item.featureIds?.length ?? 0) > 0).length
    );
  });
});

