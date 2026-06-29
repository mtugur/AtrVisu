import { describe, expect, it } from "vitest";
import { currentBabylonSceneBoundary } from "../currentBabylonSceneBoundary";
import { createPlatformBabylonSceneBoundaryReport } from "../platformBabylonSceneBoundaryReport";

const selectionPickingResponsibilityIds = [
  "selection-visualization",
  "object-picking-metadata"
] as const;

const remainingInteractionResponsibilityIds = [
  "pointer-interaction-handling",
  "rotation-transform-interaction"
] as const;

const dragPlacementResponsibilityId = "drag-move-placement-interaction";

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
    expect(report.extractedResponsibilityCount).toBe(7);
    expect(report.remainingResponsibilityCount).toBe(currentBabylonSceneBoundary.primaryResponsibilities.length - 7);
    expect(report.highRiskResponsibilityCount).toBe(2);
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
      "machine-object-rendering-adapter",
      "visual-diagnostics-overlays",
      "rotation-transform-interaction"
    ]);
  });

  it("keeps extracted selection and object picking responsibilities visible in the report inventory", () => {
    const report = createPlatformBabylonSceneBoundaryReport();
    const selectionPickingResponsibilities = report.inventory.primaryResponsibilities.filter((item) =>
      selectionPickingResponsibilityIds.includes(item.id as (typeof selectionPickingResponsibilityIds)[number])
    );

    expect(selectionPickingResponsibilities.map((item) => item.id)).toEqual(selectionPickingResponsibilityIds);
    expect(
      selectionPickingResponsibilities.every(
        (item) =>
          item.status === "extracted" &&
          item.ownerModule === "src/components/babylonScene/selectionPicking.ts" &&
          item.riskLevel === "low" &&
          item.nextRefactorCandidate === false
      )
    ).toBe(true);
  });

  it("keeps extracted drag move and placement responsibility visible in the report inventory", () => {
    const report = createPlatformBabylonSceneBoundaryReport();
    const dragPlacementResponsibility = report.inventory.primaryResponsibilities.find(
      (item) => item.id === dragPlacementResponsibilityId
    );

    expect(dragPlacementResponsibility?.status).toBe("extracted");
    expect(dragPlacementResponsibility?.ownerModule).toBe("src/components/babylonScene/dragPlacement.ts");
    expect(dragPlacementResponsibility?.riskLevel).toBe("low");
    expect(dragPlacementResponsibility?.nextRefactorCandidate).toBe(false);
  });

  it("keeps remaining high-risk interaction responsibilities visible in the report inventory", () => {
    const report = createPlatformBabylonSceneBoundaryReport();
    const interactionResponsibilities = report.inventory.primaryResponsibilities.filter((item) =>
      remainingInteractionResponsibilityIds.includes(item.id as (typeof remainingInteractionResponsibilityIds)[number])
    );

    expect(interactionResponsibilities.map((item) => item.id)).toEqual(remainingInteractionResponsibilityIds);
    expect(
      interactionResponsibilities.every(
        (item) =>
          item.status === "remaining" &&
          item.ownerModule === "src/components/BabylonScene.tsx" &&
          item.riskLevel === "high"
      )
    ).toBe(true);
    expect(
      interactionResponsibilities.find((item) => item.id === "pointer-interaction-handling")?.nextRefactorCandidate
    ).toBe(false);
    expect(
      interactionResponsibilities.find((item) => item.id === "rotation-transform-interaction")?.nextRefactorCandidate
    ).toBe(true);
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

    expect(report.objectRenderingContract.status).toBe("extracted");
    expect(report.objectRenderingContract.ownerModule).toBe("src/components/babylonScene/objectRendering.ts");
    expect(report.objectRenderingContract.extractedModule).toBe("src/components/babylonScene/objectRendering.ts");
    expect(report.objectRenderingContract.testModule).toBe("src/components/babylonScene/objectRendering.test.ts");
    expect(report.objectRenderingContract.remainingAdapterModule).toBe("src/components/BabylonScene.tsx");
    expect(report.objectRenderingContract.riskLevel).toBe("low");
    expect(report.objectRenderingContract.separatedFromResponsibilityIds).toContain("camera-creation-control");
    expect(report.objectRenderingContract.separatedFromResponsibilityIds).toContain("pointer-interaction-handling");
    expect(report.objectRenderingContract.separatedFromResponsibilityIds).toContain("object-picking-metadata");
    expect(report.objectRenderingContract.extractedFlows).toEqual({
      placeholderVisualDescriptorCalculation: true,
      fallbackVisualDescriptorBehavior: true,
      placeholderDimensionMapping: true
    });
    expect(report.objectRenderingContract.remainingAdapterFlows).toEqual({
      babylonMeshInstantiation: true,
      glbExternalVisualModelLoading: true,
      objectLabelsVisualIdentity: true,
      machinePickMetadata: true,
      renderingLifecycleCleanup: true
    });
    expect(report.objectRenderingContract.extractedDependencyModules).toEqual({
      sceneLifecycle: "src/components/babylonScene/sceneLifecycle.ts",
      visualContext: "src/components/babylonScene/visualContext.ts",
      cameraViewport: "src/components/babylonScene/cameraViewport.ts"
    });
  });

  it("exposes the selection and object picking contract in the report", () => {
    const report = createPlatformBabylonSceneBoundaryReport();

    expect(report.selectionPickingContract.status).toBe("extracted");
    expect(report.selectionPickingContract.responsibilityIds).toEqual(selectionPickingResponsibilityIds);
    expect(report.selectionPickingContract.ownerModule).toBe("src/components/babylonScene/selectionPicking.ts");
    expect(report.selectionPickingContract.extractedModule).toBe("src/components/babylonScene/selectionPicking.ts");
    expect(report.selectionPickingContract.testModule).toBe("src/components/babylonScene/selectionPicking.test.ts");
    expect(report.selectionPickingContract.remainingPointerOrchestrationModule).toBe("src/components/BabylonScene.tsx");
    expect(report.selectionPickingContract.separatedFromResponsibilityIds).toEqual([
      "pointer-interaction-handling",
      "drag-move-placement-interaction",
      "rotation-transform-interaction"
    ]);
    expect(report.selectionPickingContract.extractedFlows).toEqual({
      pickTargetMetadataDecoding: true,
      machinePickMetadataAssignment: true,
      hierarchyPickMetadataPropagation: true,
      toggleSelectionEventDetection: true
    });
  });

  it("exposes the drag move and placement contract in the report", () => {
    const report = createPlatformBabylonSceneBoundaryReport();

    expect(report.dragPlacementContract.responsibilityId).toBe(dragPlacementResponsibilityId);
    expect(report.dragPlacementContract.status).toBe("extracted");
    expect(report.dragPlacementContract.ownerModule).toBe("src/components/babylonScene/dragPlacement.ts");
    expect(report.dragPlacementContract.extractedModule).toBe("src/components/babylonScene/dragPlacement.ts");
    expect(report.dragPlacementContract.testModule).toBe("src/components/babylonScene/dragPlacement.test.ts");
    expect(report.dragPlacementContract.remainingPointerOrchestrationModule).toBe("src/components/BabylonScene.tsx");
    expect(report.dragPlacementContract.riskLevel).toBe("low");
    expect(report.dragPlacementContract.extractedFlows).toEqual({
      machineDragInstanceSelection: true,
      machineStartPositionCapture: true,
      floorDeltaMmConversion: true,
      civilDragPositionCalculation: true,
      machineDragPositionUpdates: true
    });
    expect(report.dragPlacementContract.remainingInteractionFlows).toEqual({
      pointerObserverOrchestration: true,
      rotationTransformGizmo: true
    });
  });
});
