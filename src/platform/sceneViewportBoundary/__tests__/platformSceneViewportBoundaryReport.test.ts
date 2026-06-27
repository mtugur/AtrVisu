import { describe, expect, it } from "vitest";
import { currentSceneViewportBoundary } from "../currentSceneViewportBoundary";
import { createPlatformSceneViewportBoundaryReport } from "../platformSceneViewportBoundaryReport";

describe("platform scene viewport boundary report", () => {
  it("returns a ready report for current inventory", () => {
    const report = createPlatformSceneViewportBoundaryReport();

    expect(report.status).toBe("ready");
    expect(report.errorCount).toBe(0);
  });

  it("reports scene viewport identity", () => {
    const report = createPlatformSceneViewportBoundaryReport();

    expect(report.boundaryId).toBe("scene-viewport");
    expect(report.displayName).toBe("Scene Viewport");
    expect(report.ownerLayer).toBe("app-shell");
    expect(report.runtimeStatus).toBe("active");
    expect(report.appShellZoneId).toBe("scene-viewport");
  });

  it("returns structured counts", () => {
    const report = createPlatformSceneViewportBoundaryReport();

    expect(report.sourceFileCount).toBe(currentSceneViewportBoundary.sourceFiles.length);
    expect(report.responsibilityCount).toBe(currentSceneViewportBoundary.primaryResponsibilities.length);
    expect(report.upstreamInputCount).toBe(currentSceneViewportBoundary.knownUpstreamInputs.length);
    expect(report.downstreamEffectCount).toBe(currentSceneViewportBoundary.knownDownstreamEffects.length);
    expect(report.boundaryRiskCount).toBe(currentSceneViewportBoundary.boundaryRisks.length);
    expect(report.extractionNoteCount).toBe(currentSceneViewportBoundary.extractionNotes.length);
  });

  it("returns inventory and audit objects", () => {
    const report = createPlatformSceneViewportBoundaryReport();

    expect(report.inventory.id).toBe("scene-viewport");
    expect(report.audit.inventory.id).toBe("scene-viewport");
  });
});
