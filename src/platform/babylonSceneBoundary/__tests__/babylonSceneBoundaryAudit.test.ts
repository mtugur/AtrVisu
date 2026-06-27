import { describe, expect, it } from "vitest";
import {
  createBabylonSceneBoundaryAuditReport,
  createBabylonSceneBoundaryAuditReportFromInventory,
  getBabylonSceneBoundaryDownstreamEffectIds,
  getBabylonSceneBoundaryInventory,
  getBabylonSceneBoundaryResponsibilityIds,
  getBabylonSceneBoundaryUpstreamInputIds
} from "../babylonSceneBoundaryAudit";
import { currentBabylonSceneBoundary } from "../currentBabylonSceneBoundary";

describe("babylon scene boundary audit", () => {
  it("passes for current valid inventory", () => {
    const report = createBabylonSceneBoundaryAuditReport();

    expect(report.status).toBe("pass");
    expect(report.readiness).toBe("ready");
    expect(report.errorCount).toBe(0);
  });

  it("keeps the current inventory attached to the audit report", () => {
    expect(createBabylonSceneBoundaryAuditReport().inventory.id).toBe(currentBabylonSceneBoundary.id);
  });

  it("returns the current inventory", () => {
    expect(getBabylonSceneBoundaryInventory().id).toBe("babylon-scene");
  });

  it("returns responsibility ids", () => {
    expect(getBabylonSceneBoundaryResponsibilityIds()).toContain("babylon-engine-scene-lifecycle");
  });

  it("returns upstream input ids", () => {
    expect(getBabylonSceneBoundaryUpstreamInputIds()).toContain("layout-machine-state");
  });

  it("returns downstream effect ids", () => {
    expect(getBabylonSceneBoundaryDownstreamEffectIds()).toContain("babylon-scene-object-updates");
  });

  it("does not mutate input inventory arrays", () => {
    const inventory = {
      ...currentBabylonSceneBoundary,
      primaryResponsibilities: [...currentBabylonSceneBoundary.primaryResponsibilities]
    };
    const initialLength = inventory.primaryResponsibilities.length;

    createBabylonSceneBoundaryAuditReportFromInventory(inventory);

    expect(inventory.primaryResponsibilities).toHaveLength(initialLength);
  });
});
