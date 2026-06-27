import { describe, expect, it } from "vitest";
import { currentSceneViewportBoundary } from "../currentSceneViewportBoundary";

describe("current scene viewport boundary", () => {
  it("documents the scene viewport identity", () => {
    expect(currentSceneViewportBoundary.id).toBe("scene-viewport");
    expect(currentSceneViewportBoundary.displayName).toBe("Scene Viewport");
    expect(currentSceneViewportBoundary.ownerLayer).toBe("app-shell");
    expect(currentSceneViewportBoundary.runtimeStatus).toBe("active");
    expect(currentSceneViewportBoundary.appShellZoneId).toBe("scene-viewport");
  });

  it("has non-empty source files", () => {
    expect(currentSceneViewportBoundary.sourceFiles.length).toBeGreaterThan(0);
    expect(currentSceneViewportBoundary.sourceFiles.every((sourceFile) => sourceFile.trim())).toBe(true);
  });

  it("documents primary responsibilities", () => {
    const responsibilityIds = currentSceneViewportBoundary.primaryResponsibilities.map((item) => item.id);

    expect(responsibilityIds).toContain("babylon-canvas-scene-render");
    expect(responsibilityIds).toContain("viewport-camera-interaction");
    expect(responsibilityIds).toContain("machine-placement-visualization");
    expect(responsibilityIds).toContain("selection-visualization");
    expect(responsibilityIds).toContain("gizmo-manipulation-interaction");
    expect(responsibilityIds).toContain("grid-ground-lighting-context");
  });

  it("documents upstream inputs and downstream effects", () => {
    expect(currentSceneViewportBoundary.knownUpstreamInputs.length).toBeGreaterThan(0);
    expect(currentSceneViewportBoundary.knownDownstreamEffects.length).toBeGreaterThan(0);
  });

  it("documents boundary risks and extraction notes", () => {
    expect(currentSceneViewportBoundary.boundaryRisks.length).toBeGreaterThan(0);
    expect(currentSceneViewportBoundary.extractionNotes.length).toBeGreaterThan(0);
  });
});
