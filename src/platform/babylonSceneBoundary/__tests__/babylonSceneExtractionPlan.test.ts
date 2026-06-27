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

  it("documents expected conceptual files or modules for every phase", () => {
    expect(
      babylonSceneExtractionPlan.phases.every((phase) =>
        phase.expectedFilesOrModules.some((moduleName) => moduleName.includes("conceptual"))
      )
    ).toBe(true);
  });
});
