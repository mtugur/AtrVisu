import { describe, expect, it } from "vitest";
import { createBabylonSceneBoundaryAuditReportFromInventory } from "../babylonSceneBoundaryAudit";
import { currentBabylonSceneBoundary } from "../currentBabylonSceneBoundary";
import type { BabylonSceneBoundaryInventory } from "../babylonSceneBoundaryTypes";

const withInventory = (updates: Partial<BabylonSceneBoundaryInventory>) => ({
  ...currentBabylonSceneBoundary,
  ...updates
});

const hasIssue = (inventory: BabylonSceneBoundaryInventory, code: string) =>
  createBabylonSceneBoundaryAuditReportFromInventory(inventory).issues.some((issue) => issue.code === code);

describe("babylon scene boundary audit failures", () => {
  it("fails when id is empty", () => {
    expect(hasIssue(withInventory({ id: "" }), "boundary-id-empty")).toBe(true);
  });

  it("fails when id is not babylon-scene", () => {
    expect(hasIssue(withInventory({ id: "other-boundary" }), "boundary-id-invalid")).toBe(true);
  });

  it("fails when displayName is empty", () => {
    expect(hasIssue(withInventory({ displayName: "" }), "boundary-display-name-empty")).toBe(true);
  });

  it("fails when source files are empty", () => {
    expect(hasIssue(withInventory({ sourceFiles: [] }), "boundary-source-files-empty")).toBe(true);
  });

  it("fails when parent boundary ids are empty", () => {
    expect(hasIssue(withInventory({ parentBoundaryIds: [] }), "parent-boundary-ids-empty")).toBe(true);
  });

  it("fails when primary responsibilities are empty", () => {
    expect(hasIssue(withInventory({ primaryResponsibilities: [] }), "primary-responsibilities-empty")).toBe(true);
  });

  it("fails when primary responsibilities lack post-refactor metadata", () => {
    expect(
      hasIssue(
        withInventory({
          primaryResponsibilities: [
            {
              id: "pointer-interaction-handling",
              label: "Pointer interaction handling"
            }
          ] as unknown as BabylonSceneBoundaryInventory["primaryResponsibilities"]
        }),
        "primary-responsibilities-empty"
      )
    ).toBe(true);
  });

  it("fails when camera viewport contract is detached from extracted helper ownership", () => {
    expect(
      hasIssue(
        withInventory({
          cameraViewportContract: {
            ...currentBabylonSceneBoundary.cameraViewportContract,
            ownerModule: "src/components/BabylonScene.tsx"
          }
        }),
        "camera-viewport-contract-invalid"
      )
    ).toBe(true);
  });

  it("fails when object rendering contract is detached from remaining BabylonScene ownership", () => {
    expect(
      hasIssue(
        withInventory({
          objectRenderingContract: {
            ...currentBabylonSceneBoundary.objectRenderingContract,
            protectedBehaviors: []
          }
        }),
        "object-rendering-contract-invalid"
      )
    ).toBe(true);
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
    const report = createBabylonSceneBoundaryAuditReportFromInventory(withInventory({ knownDownstreamEffects: [] }));

    expect(report.status).toBe("fail");
    expect(report.readiness).toBe("not-ready");
    expect(report.errorCount).toBeGreaterThan(0);
  });
});
