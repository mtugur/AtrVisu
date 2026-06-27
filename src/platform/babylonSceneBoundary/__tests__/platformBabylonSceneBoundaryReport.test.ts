import { describe, expect, it } from "vitest";
import { currentBabylonSceneBoundary } from "../currentBabylonSceneBoundary";
import { createPlatformBabylonSceneBoundaryReport } from "../platformBabylonSceneBoundaryReport";

describe("platform babylon scene boundary report", () => {
  it("returns a ready report for current inventory", () => {
    const report = createPlatformBabylonSceneBoundaryReport();

    expect(report.status).toBe("ready");
    expect(report.errorCount).toBe(0);
  });

  it("reports Babylon scene identity", () => {
    const report = createPlatformBabylonSceneBoundaryReport();

    expect(report.boundaryId).toBe("babylon-scene");
    expect(report.displayName).toBe("Babylon Scene");
    expect(report.ownerLayer).toBe("scene-viewport");
    expect(report.runtimeStatus).toBe("active");
  });

  it("returns structured counts", () => {
    const report = createPlatformBabylonSceneBoundaryReport();

    expect(report.sourceFileCount).toBe(currentBabylonSceneBoundary.sourceFiles.length);
    expect(report.parentBoundaryCount).toBe(currentBabylonSceneBoundary.parentBoundaryIds.length);
    expect(report.responsibilityCount).toBe(currentBabylonSceneBoundary.primaryResponsibilities.length);
    expect(report.upstreamInputCount).toBe(currentBabylonSceneBoundary.knownUpstreamInputs.length);
    expect(report.downstreamEffectCount).toBe(currentBabylonSceneBoundary.knownDownstreamEffects.length);
    expect(report.boundaryRiskCount).toBe(currentBabylonSceneBoundary.boundaryRisks.length);
    expect(report.extractionNoteCount).toBe(currentBabylonSceneBoundary.extractionNotes.length);
  });

  it("returns inventory and audit objects", () => {
    const report = createPlatformBabylonSceneBoundaryReport();

    expect(report.inventory.id).toBe("babylon-scene");
    expect(report.audit.inventory.id).toBe("babylon-scene");
  });
});
