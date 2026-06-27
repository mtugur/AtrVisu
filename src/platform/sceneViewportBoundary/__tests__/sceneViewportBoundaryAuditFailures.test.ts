import { describe, expect, it } from "vitest";
import { createSceneViewportBoundaryAuditReportFromInventory } from "../sceneViewportBoundaryAudit";
import { currentSceneViewportBoundary } from "../currentSceneViewportBoundary";
import type { SceneViewportBoundaryInventory } from "../sceneViewportBoundaryTypes";

const withInventory = (updates: Partial<SceneViewportBoundaryInventory>) => ({
  ...currentSceneViewportBoundary,
  ...updates
});

const hasIssue = (inventory: SceneViewportBoundaryInventory, code: string) =>
  createSceneViewportBoundaryAuditReportFromInventory(inventory).issues.some((issue) => issue.code === code);

describe("scene viewport boundary audit failures", () => {
  it("fails when id is empty", () => {
    expect(hasIssue(withInventory({ id: "" }), "boundary-id-empty")).toBe(true);
  });

  it("fails when id is not scene-viewport", () => {
    expect(hasIssue(withInventory({ id: "other-boundary" }), "boundary-id-invalid")).toBe(true);
  });

  it("fails when displayName is empty", () => {
    expect(hasIssue(withInventory({ displayName: "" }), "boundary-display-name-empty")).toBe(true);
  });

  it("fails when source files are empty", () => {
    expect(hasIssue(withInventory({ sourceFiles: [] }), "boundary-source-files-empty")).toBe(true);
  });

  it("fails when primary responsibilities are empty", () => {
    expect(hasIssue(withInventory({ primaryResponsibilities: [] }), "primary-responsibilities-empty")).toBe(true);
  });

  it("fails when upstream inputs are empty", () => {
    expect(hasIssue(withInventory({ knownUpstreamInputs: [] }), "upstream-inputs-empty")).toBe(true);
  });

  it("fails when downstream effects are empty", () => {
    expect(hasIssue(withInventory({ knownDownstreamEffects: [] }), "downstream-effects-empty")).toBe(true);
  });

  it("fails when boundary risks are empty", () => {
    expect(hasIssue(withInventory({ boundaryRisks: [] }), "boundary-risks-empty")).toBe(true);
  });

  it("fails when extraction notes are empty", () => {
    expect(hasIssue(withInventory({ extractionNotes: [] }), "extraction-notes-empty")).toBe(true);
  });

  it("returns not-ready for invalid inventory", () => {
    const report = createSceneViewportBoundaryAuditReportFromInventory(withInventory({ knownDownstreamEffects: [] }));

    expect(report.status).toBe("fail");
    expect(report.readiness).toBe("not-ready");
    expect(report.errorCount).toBeGreaterThan(0);
  });
});
