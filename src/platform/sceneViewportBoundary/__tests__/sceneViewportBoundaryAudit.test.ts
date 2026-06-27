import { describe, expect, it } from "vitest";
import {
  createSceneViewportBoundaryAuditReport,
  createSceneViewportBoundaryAuditReportFromInventory,
  getSceneViewportBoundaryDownstreamEffectIds,
  getSceneViewportBoundaryInventory,
  getSceneViewportBoundaryResponsibilityIds,
  getSceneViewportBoundaryUpstreamInputIds
} from "../sceneViewportBoundaryAudit";
import { currentSceneViewportBoundary } from "../currentSceneViewportBoundary";

describe("scene viewport boundary audit", () => {
  it("passes for current valid inventory", () => {
    const report = createSceneViewportBoundaryAuditReport();

    expect(report.status).toBe("pass");
    expect(report.readiness).toBe("ready");
    expect(report.errorCount).toBe(0);
  });

  it("keeps the current inventory attached to the audit report", () => {
    expect(createSceneViewportBoundaryAuditReport().inventory.id).toBe(currentSceneViewportBoundary.id);
  });

  it("returns the current inventory", () => {
    expect(getSceneViewportBoundaryInventory().id).toBe("scene-viewport");
  });

  it("returns responsibility ids", () => {
    expect(getSceneViewportBoundaryResponsibilityIds()).toContain("babylon-canvas-scene-render");
  });

  it("returns upstream input ids", () => {
    expect(getSceneViewportBoundaryUpstreamInputIds()).toContain("app-layout-machine-state");
  });

  it("returns downstream effect ids", () => {
    expect(getSceneViewportBoundaryDownstreamEffectIds()).toContain("visual-scene-updates");
  });

  it("does not mutate input inventory arrays", () => {
    const inventory = {
      ...currentSceneViewportBoundary,
      primaryResponsibilities: [...currentSceneViewportBoundary.primaryResponsibilities]
    };
    const initialLength = inventory.primaryResponsibilities.length;

    createSceneViewportBoundaryAuditReportFromInventory(inventory);

    expect(inventory.primaryResponsibilities).toHaveLength(initialLength);
  });
});
