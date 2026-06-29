import { describe, expect, it } from "vitest";
import {
  babylonSceneExtractionPlan,
  getBabylonSceneExtractionPhaseById,
  getBabylonSceneExtractionPhaseIds
} from "../index";

const requiredPhaseIds = [
  "baseline-protection",
  "scene-lifecycle-extraction",
  "viewport-camera-extraction",
  "visual-context-extraction",
  "object-rendering-extraction",
  "interaction-extraction",
  "diagnostics-overlays-extraction"
] as const;

describe("babylon scene extraction plan", () => {
  it("targets the Babylon scene boundary and readiness chain", () => {
    expect(babylonSceneExtractionPlan.id).toBe("babylon-scene-extraction-plan-v0.1");
    expect(babylonSceneExtractionPlan.version).toBe("0.1");
    expect(babylonSceneExtractionPlan.boundaryId).toBe("babylon-scene");
    expect(babylonSceneExtractionPlan.sourceBoundaryId).toBe("babylon-scene");
    expect(babylonSceneExtractionPlan.readinessIntegrated).toBe(true);
  });

  it("contains every required extraction phase", () => {
    const phaseIds = getBabylonSceneExtractionPhaseIds();

    expect(phaseIds).toEqual(requiredPhaseIds);
  });

  it("uses unique phase ids", () => {
    const phaseIds = getBabylonSceneExtractionPhaseIds();

    expect(new Set(phaseIds).size).toBe(phaseIds.length);
  });

  it("fills every required phase field", () => {
    for (const phase of babylonSceneExtractionPlan.phases) {
      expect(phase.id.trim()).not.toBe("");
      expect(phase.title.trim()).not.toBe("");
      expect(phase.goal.trim()).not.toBe("");
      expect(["low", "medium", "high"]).toContain(phase.riskLevel);
      expect(phase.prerequisites.length).toBeGreaterThan(0);
      expect(phase.protectedBehaviors.length).toBeGreaterThan(0);
      expect(phase.forbiddenChanges.length).toBeGreaterThan(0);
      expect(phase.validationSignals.length).toBeGreaterThan(0);
      expect(phase.expectedFilesOrModules.length).toBeGreaterThan(0);
    }
  });

  it("marks interaction extraction as high risk and not the first refactor", () => {
    const interactionPhase = getBabylonSceneExtractionPhaseById("interaction-extraction");

    expect(interactionPhase?.riskLevel).toBe("high");
    expect(babylonSceneExtractionPlan.firstSafeRefactorCandidate).not.toBe("interaction-extraction");
  });

  it("selects a first safe refactor candidate that is not high risk", () => {
    const firstCandidate = getBabylonSceneExtractionPhaseById(
      babylonSceneExtractionPlan.firstSafeRefactorCandidate
    );

    expect(firstCandidate).toBeDefined();
    expect(firstCandidate?.riskLevel).not.toBe("high");
  });

  it("uses diagnostics and overlays as the next safe refactor candidate after extracted rendering descriptors", () => {
    expect(babylonSceneExtractionPlan.firstSafeRefactorCandidate).toBe("diagnostics-overlays-extraction");
  });

  it("protects the AppShell scene viewport slot and E2E smoke stability", () => {
    const baselinePhase = getBabylonSceneExtractionPhaseById("baseline-protection");

    expect(baselinePhase?.protectedBehaviors).toContain("app-shell-scene-viewport-slot");
    expect(baselinePhase?.protectedBehaviors).toContain("e2e-smoke-stability");
  });

  it("forbids runtime, UI, and component behavior changes across all phases", () => {
    for (const phase of babylonSceneExtractionPlan.phases) {
      expect(phase.forbiddenChanges).toContain("no-runtime-behavior-change");
      expect(phase.forbiddenChanges).toContain("no-ui-behavior-change");
      expect(phase.forbiddenChanges).toContain("no-component-behavior-change");
    }
  });

  it("documents extracted visual context, lifecycle, and camera viewport modules", () => {
    expect(getBabylonSceneExtractionPhaseById("scene-lifecycle-extraction")?.expectedFilesOrModules).toContain(
      "src/components/babylonScene/sceneLifecycle.ts"
    );
    expect(getBabylonSceneExtractionPhaseById("viewport-camera-extraction")?.expectedFilesOrModules).toContain(
      "src/components/babylonScene/cameraViewport.ts"
    );
    expect(getBabylonSceneExtractionPhaseById("visual-context-extraction")?.expectedFilesOrModules).toContain(
      "src/components/babylonScene/visualContext.ts"
    );
  });

  it("documents object rendering behavior without mixing it into interaction extraction", () => {
    const renderingPhase = getBabylonSceneExtractionPhaseById("object-rendering-extraction");
    const interactionPhase = getBabylonSceneExtractionPhaseById("interaction-extraction");

    expect(renderingPhase?.riskLevel).toBe("medium");
    expect(renderingPhase?.protectedBehaviors).toContain("placeholder-visual-descriptor-calculation");
    expect(renderingPhase?.protectedBehaviors).toContain("glb-external-visual-model-loading-flow");
    expect(renderingPhase?.protectedBehaviors).toContain("placeholder-and-fallback-visual-behavior");
    expect(renderingPhase?.protectedBehaviors).toContain("object-labels-and-visual-identity");
    expect(renderingPhase?.protectedBehaviors).toContain("rendering-lifecycle-cleanup");
    expect(renderingPhase?.expectedFilesOrModules).toContain(
      "src/components/babylonScene/objectRendering.ts"
    );
    expect(renderingPhase?.expectedFilesOrModules).toContain(
      "src/components/babylonScene/objectRendering.test.ts"
    );
    expect(renderingPhase?.expectedFilesOrModules).toContain(
      "src/scene/rendering/loadMachineVisualModel.ts (conceptual)"
    );
    expect(renderingPhase?.expectedFilesOrModules).toContain(
      "src/scene/rendering/createBabylonMachineMeshAdapter.ts (conceptual)"
    );
    expect(interactionPhase?.riskLevel).toBe("high");
    expect(interactionPhase?.protectedBehaviors).toEqual(
      expect.arrayContaining([
        "selection-picking-helper-contract",
        "pick-target-metadata-decoding",
        "machine-pick-metadata-assignment",
        "drag-placement-helper-contract",
        "machine-drag-position-updates",
        "civil-drag-position-calculation",
        "floor-delta-mm-conversion",
        "pointer-interaction-handling",
        "rotation-transform-interaction"
      ])
    );
    expect(interactionPhase?.prerequisites).toContain("drag-placement-helper-extracted");
    expect(interactionPhase?.expectedFilesOrModules).toContain(
      "src/components/babylonScene/dragPlacement.ts"
    );
    expect(interactionPhase?.expectedFilesOrModules).toContain(
      "src/components/babylonScene/dragPlacement.test.ts"
    );
    expect(interactionPhase?.expectedFilesOrModules).toContain(
      "src/components/babylonScene/selectionPicking.ts"
    );
    expect(interactionPhase?.expectedFilesOrModules).toContain(
      "src/components/babylonScene/selectionPicking.test.ts"
    );
    expect(interactionPhase?.expectedFilesOrModules).toContain(
      "src/scene/interactions/createScenePointerController.ts (conceptual)"
    );
    expect(interactionPhase?.expectedFilesOrModules).toContain(
      "src/scene/interactions/createRotationGizmoController.ts (conceptual)"
    );
    expect(interactionPhase?.expectedFilesOrModules).toContain(
      "src/platform/babylonSceneBoundary/postInteractionInventory.ts (conceptual)"
    );
    expect(interactionPhase?.expectedFilesOrModules).toContain(
      "src/scene/interactions/createMultiSelectMoveController.ts (conceptual)"
    );
    expect(interactionPhase?.expectedFilesOrModules).toContain(
      "src/scene/interactions/createAlignmentSnapPreparationAdapter.ts (conceptual)"
    );
  });
});
