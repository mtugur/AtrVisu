import { describe, expect, it } from "vitest";
import { currentBabylonSceneBoundary } from "../currentBabylonSceneBoundary";

describe("current babylon scene boundary", () => {
  it("documents the Babylon scene identity", () => {
    expect(currentBabylonSceneBoundary.id).toBe("babylon-scene");
    expect(currentBabylonSceneBoundary.displayName).toBe("Babylon Scene");
    expect(currentBabylonSceneBoundary.ownerLayer).toBe("scene-viewport");
    expect(currentBabylonSceneBoundary.runtimeStatus).toBe("active");
    expect(currentBabylonSceneBoundary.parentBoundaryIds).toContain("scene-viewport");
  });

  it("has non-empty source files", () => {
    expect(currentBabylonSceneBoundary.sourceFiles.length).toBeGreaterThan(0);
    expect(currentBabylonSceneBoundary.sourceFiles).toContain("src/components/BabylonScene.tsx");
    expect(currentBabylonSceneBoundary.sourceFiles).toContain("src/components/babylonScene/cameraViewport.ts");
    expect(currentBabylonSceneBoundary.sourceFiles).toContain("src/components/babylonScene/objectRendering.ts");
    expect(currentBabylonSceneBoundary.sourceFiles).toContain("src/components/babylonScene/objectRendering.test.ts");
    expect(currentBabylonSceneBoundary.sourceFiles).toContain("src/components/babylonScene/sceneLifecycle.ts");
    expect(currentBabylonSceneBoundary.sourceFiles).toContain("src/components/babylonScene/visualContext.ts");
    expect(currentBabylonSceneBoundary.sourceFiles.every((sourceFile) => sourceFile.trim())).toBe(true);
  });

  it("documents primary responsibilities", () => {
    const responsibilityIds = currentBabylonSceneBoundary.primaryResponsibilities.map((item) => item.id);

    expect(responsibilityIds).toContain("babylon-engine-scene-lifecycle");
    expect(responsibilityIds).toContain("canvas-rendering");
    expect(responsibilityIds).toContain("camera-creation-control");
    expect(responsibilityIds).toContain("machine-object-mesh-rendering");
    expect(responsibilityIds).toContain("machine-object-rendering-adapter");
    expect(responsibilityIds).toContain("selection-visualization");
    expect(responsibilityIds).toContain("pointer-interaction-handling");
    expect(responsibilityIds).toContain("object-picking-metadata");
    expect(responsibilityIds).toContain("drag-move-placement-interaction");
    expect(responsibilityIds).toContain("collision-clearance-visualization");
  });

  it("marks extracted visual context and scene lifecycle responsibilities", () => {
    const lifecycle = currentBabylonSceneBoundary.primaryResponsibilities.find(
      (item) => item.id === "babylon-engine-scene-lifecycle"
    );
    const visualContext = currentBabylonSceneBoundary.primaryResponsibilities.find(
      (item) => item.id === "lighting-ground-grid-context"
    );

    expect(lifecycle?.status).toBe("extracted");
    expect(lifecycle?.ownerModule).toBe("src/components/babylonScene/sceneLifecycle.ts");
    expect(visualContext?.status).toBe("extracted");
    expect(visualContext?.ownerModule).toBe("src/components/babylonScene/visualContext.ts");
  });

  it("keeps interaction responsibilities visible as high risk", () => {
    const highRiskIds = currentBabylonSceneBoundary.primaryResponsibilities
      .filter((item) => item.riskLevel === "high")
      .map((item) => item.id);

    expect(highRiskIds).toContain("selection-visualization");
    expect(highRiskIds).toContain("pointer-interaction-handling");
    expect(highRiskIds).toContain("object-picking-metadata");
    expect(highRiskIds).toContain("drag-move-placement-interaction");
    expect(highRiskIds).toContain("rotation-transform-interaction");
  });

  it("tracks object and machine placeholder rendering descriptors as an extracted helper responsibility", () => {
    const renderingResponsibility = currentBabylonSceneBoundary.primaryResponsibilities.find(
      (item) => item.id === "machine-object-mesh-rendering"
    );
    const contract = currentBabylonSceneBoundary.objectRenderingContract;

    expect(renderingResponsibility?.status).toBe("extracted");
    expect(renderingResponsibility?.riskLevel).toBe("low");
    expect(renderingResponsibility?.ownerModule).toBe("src/components/babylonScene/objectRendering.ts");
    expect(renderingResponsibility?.nextRefactorCandidate).toBe(false);
    expect(contract.responsibilityId).toBe("machine-object-mesh-rendering");
    expect(contract.status).toBe("extracted");
    expect(contract.ownerModule).toBe("src/components/babylonScene/objectRendering.ts");
    expect(contract.extractedModule).toBe("src/components/babylonScene/objectRendering.ts");
    expect(contract.testModule).toBe("src/components/babylonScene/objectRendering.test.ts");
    expect(contract.remainingAdapterModule).toBe("src/components/BabylonScene.tsx");
    expect(contract.riskLevel).toBe("low");
  });

  it("keeps rendering responsibility separate from extracted and high-risk interaction responsibilities", () => {
    const separatedIds = currentBabylonSceneBoundary.objectRenderingContract.separatedFromResponsibilityIds;

    expect(separatedIds).toContain("babylon-engine-scene-lifecycle");
    expect(separatedIds).toContain("lighting-ground-grid-context");
    expect(separatedIds).toContain("camera-creation-control");
    expect(separatedIds).toContain("pointer-interaction-handling");
    expect(separatedIds).toContain("selection-visualization");
    expect(separatedIds).toContain("object-picking-metadata");
    expect(separatedIds).toContain("drag-move-placement-interaction");
    expect(separatedIds).toContain("rotation-transform-interaction");
  });

  it("protects extracted placeholder descriptors and remaining rendering adapter responsibilities", () => {
    const contract = currentBabylonSceneBoundary.objectRenderingContract;
    const adapterResponsibility = currentBabylonSceneBoundary.primaryResponsibilities.find(
      (item) => item.id === "machine-object-rendering-adapter"
    );

    expect(adapterResponsibility?.status).toBe("remaining");
    expect(adapterResponsibility?.ownerModule).toBe("src/components/BabylonScene.tsx");
    expect(adapterResponsibility?.riskLevel).toBe("medium");
    expect(adapterResponsibility?.nextRefactorCandidate).toBe(true);
    expect(contract.protectedBehaviors).toContain("placeholder-visual-descriptor-calculation");
    expect(contract.protectedBehaviors).toContain("placeholder-visual-rendering");
    expect(contract.protectedBehaviors).toContain("fallback-visual-behavior");
    expect(contract.protectedBehaviors).toContain("babylon-mesh-instantiation-adapter");
    expect(contract.protectedBehaviors).toContain("glb-external-visual-model-loading-flow");
    expect(contract.protectedBehaviors).toContain("object-labels-and-visual-identity");
    expect(contract.protectedBehaviors).toContain("rendering-lifecycle-cleanup");
    expect(contract.extractedFlows).toEqual({
      placeholderVisualDescriptorCalculation: true,
      fallbackVisualDescriptorBehavior: true,
      placeholderDimensionMapping: true
    });
    expect(contract.remainingAdapterFlows).toEqual({
      babylonMeshInstantiation: true,
      glbExternalVisualModelLoading: true,
      objectLabelsVisualIdentity: true,
      machinePickMetadata: true,
      renderingLifecycleCleanup: true
    });
  });

  it("marks camera and viewport setup as an extracted helper responsibility", () => {
    const cameraResponsibility = currentBabylonSceneBoundary.primaryResponsibilities.find(
      (item) => item.id === "camera-creation-control"
    );
    const contract = currentBabylonSceneBoundary.cameraViewportContract;

    expect(cameraResponsibility?.status).toBe("extracted");
    expect(cameraResponsibility?.riskLevel).toBe("low");
    expect(cameraResponsibility?.ownerModule).toBe("src/components/babylonScene/cameraViewport.ts");
    expect(contract.responsibilityId).toBe("camera-creation-control");
    expect(contract.status).toBe("extracted");
    expect(contract.ownerModule).toBe("src/components/babylonScene/cameraViewport.ts");
    expect(contract.extractedModule).toBe("src/components/babylonScene/cameraViewport.ts");
    expect(contract.remainingAdapterModule).toBe("src/components/BabylonScene.tsx");
  });

  it("protects existing camera initialization and control values", () => {
    const contract = currentBabylonSceneBoundary.cameraViewportContract;

    expect(contract.initialCamera).toEqual({
      name: "orbit-camera",
      alphaExpression: "Math.PI / 4",
      betaExpression: "Math.PI / 3",
      radius: 34,
      targetExpression: "Vector3.Zero()"
    });
    expect(contract.controls).toEqual({
      lowerRadiusLimit: 8,
      upperRadiusLimit: 78,
      wheelPrecision: 35,
      panningSensibility: 75,
      panningInertia: 0.18,
      inertia: 0.65,
      pointerButtons: [0],
      panningMouseButton: 1
    });
  });

  it("keeps camera and viewport refactor risk below interaction risks", () => {
    const cameraContract = currentBabylonSceneBoundary.cameraViewportContract;
    const highRiskInteractionRanks = currentBabylonSceneBoundary.primaryResponsibilities
      .filter((item) => item.riskLevel === "high")
      .map(() => 3);

    expect(cameraContract.riskLevel).toBe("low");
    expect(highRiskInteractionRanks.every((rank) => cameraContract.refactorRiskRank < rank)).toBe(true);
  });

  it("protects camera state read and restore handles", () => {
    const contract = currentBabylonSceneBoundary.cameraViewportContract;

    expect(contract.imperativeHandle.exposesGetCameraState).toBe(true);
    expect(contract.imperativeHandle.exposesApplyCameraState).toBe(true);
    expect(contract.imperativeHandle.supportedModes).toEqual(["perspective", "orthographic"]);
    expect(contract.protectedBehaviors).toContain("imperative-get-camera-state");
    expect(contract.protectedBehaviors).toContain("imperative-apply-camera-state");
  });

  it("documents controlled next refactor candidates", () => {
    const candidateIds = currentBabylonSceneBoundary.primaryResponsibilities
      .filter((item) => item.nextRefactorCandidate)
      .map((item) => item.id);

    expect(candidateIds).toEqual([
      "machine-object-rendering-adapter",
      "collision-clearance-visualization",
      "visual-diagnostics-overlays"
    ]);
  });

  it("documents upstream inputs and downstream effects", () => {
    const upstreamInputIds = currentBabylonSceneBoundary.knownUpstreamInputs.map((item) => item.id);
    const downstreamEffectIds = currentBabylonSceneBoundary.knownDownstreamEffects.map((item) => item.id);

    expect(upstreamInputIds).toContain("layout-machine-state");
    expect(upstreamInputIds).toContain("selected-object-group-state");
    expect(upstreamInputIds).toContain("viewport-camera-settings");
    expect(downstreamEffectIds).toContain("babylon-scene-object-updates");
    expect(downstreamEffectIds).toContain("visual-selection-feedback");
    expect(downstreamEffectIds).toContain("app-state-callback-events");
  });

  it("documents boundary risks and extraction notes", () => {
    const riskIds = currentBabylonSceneBoundary.boundaryRisks.map((item) => item.id);
    const noteIds = currentBabylonSceneBoundary.extractionNotes.map((item) => item.id);

    expect(riskIds).toContain("multi-responsibility-component");
    expect(riskIds).toContain("render-interaction-coupling");
    expect(noteIds).toContain("preserve-app-shell-scene-viewport-slot");
    expect(noteIds).toContain("preserve-zone-anchors");
    expect(noteIds).toContain("no-platform-runtime-dependency");
    expect(noteIds).toContain("visual-context-extracted");
    expect(noteIds).toContain("scene-lifecycle-extracted");
    expect(noteIds).toContain("camera-viewport-extracted");
    expect(noteIds).toContain("camera-state-adapter-remains");
    expect(noteIds).toContain("object-rendering-contract-added");
    expect(noteIds).toContain("object-rendering-adapter-remains");
  });
});
