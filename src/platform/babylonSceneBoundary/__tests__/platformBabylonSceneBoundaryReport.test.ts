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
    expect(report.extractedResponsibilityCount).toBe(3);
    expect(report.remainingResponsibilityCount).toBe(currentBabylonSceneBoundary.primaryResponsibilities.length - 3);
    expect(report.highRiskResponsibilityCount).toBe(4);
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

  it("returns deterministic next refactor risk ordering", () => {
    const report = createPlatformBabylonSceneBoundaryReport();

    expect(report.nextRefactorCandidates.map((item) => item.id)).toEqual([
      "collision-clearance-visualization",
      "machine-object-mesh-rendering",
      "visual-diagnostics-overlays"
    ]);
    expect(report.nextRefactorCandidates.every((item) => item.riskLevel !== "high")).toBe(true);
  });

  it("exposes the camera and viewport contract in the report", () => {
    const report = createPlatformBabylonSceneBoundaryReport();

    expect(report.cameraViewportContract.status).toBe("extracted");
    expect(report.cameraViewportContract.ownerModule).toBe("src/components/babylonScene/cameraViewport.ts");
    expect(report.cameraViewportContract.extractedModule).toBe("src/components/babylonScene/cameraViewport.ts");
    expect(report.cameraViewportContract.remainingAdapterModule).toBe("src/components/BabylonScene.tsx");
    expect(report.cameraViewportContract.riskLevel).toBe("low");
    expect(report.cameraViewportContract.initialCamera.name).toBe("orbit-camera");
    expect(report.cameraViewportContract.controls.lowerRadiusLimit).toBe(8);
    expect(report.cameraViewportContract.controls.upperRadiusLimit).toBe(78);
    expect(report.cameraViewportContract.imperativeHandle.supportedModes).toEqual([
      "perspective",
      "orthographic"
    ]);
  });

  it("exposes the object and machine rendering contract in the report", () => {
    const report = createPlatformBabylonSceneBoundaryReport();

    expect(report.objectRenderingContract.status).toBe("remaining");
    expect(report.objectRenderingContract.ownerModule).toBe("src/components/BabylonScene.tsx");
    expect(report.objectRenderingContract.riskLevel).toBe("medium");
    expect(report.objectRenderingContract.separatedFromResponsibilityIds).toContain("camera-creation-control");
    expect(report.objectRenderingContract.separatedFromResponsibilityIds).toContain("pointer-interaction-handling");
    expect(report.objectRenderingContract.renderingFlows).toEqual({
      machineMeshCreation: true,
      placeholderVisualRendering: true,
      glbExternalVisualModelLoading: true,
      fallbackVisualBehavior: true,
      objectLabelsVisualIdentity: true,
      renderingLifecycleCleanup: true
    });
    expect(report.objectRenderingContract.extractedDependencyModules).toEqual({
      sceneLifecycle: "src/components/babylonScene/sceneLifecycle.ts",
      visualContext: "src/components/babylonScene/visualContext.ts",
      cameraViewport: "src/components/babylonScene/cameraViewport.ts"
    });
  });
});
