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
    expect(currentBabylonSceneBoundary.sourceFiles.every((sourceFile) => sourceFile.trim())).toBe(true);
  });

  it("documents primary responsibilities", () => {
    const responsibilityIds = currentBabylonSceneBoundary.primaryResponsibilities.map((item) => item.id);

    expect(responsibilityIds).toContain("babylon-engine-scene-lifecycle");
    expect(responsibilityIds).toContain("canvas-rendering");
    expect(responsibilityIds).toContain("camera-creation-control");
    expect(responsibilityIds).toContain("machine-object-mesh-rendering");
    expect(responsibilityIds).toContain("selection-visualization");
    expect(responsibilityIds).toContain("pointer-interaction-handling");
    expect(responsibilityIds).toContain("drag-move-placement-interaction");
    expect(responsibilityIds).toContain("collision-clearance-visualization");
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
  });
});
