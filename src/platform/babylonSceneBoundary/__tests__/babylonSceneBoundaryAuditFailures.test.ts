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

const withoutResponsibility = (responsibilityId: string) =>
  currentBabylonSceneBoundary.primaryResponsibilities.filter(
    (responsibility) => responsibility.id !== responsibilityId
  );

const withResponsibilityUpdate = (
  responsibilityId: string,
  updates: Partial<BabylonSceneBoundaryInventory["primaryResponsibilities"][number]>
) =>
  currentBabylonSceneBoundary.primaryResponsibilities.map((responsibility) =>
    responsibility.id === responsibilityId
      ? { ...responsibility, ...updates }
      : responsibility
  );

const interactionResponsibilityId = "pointer-interaction-handling";
const selectionPickingResponsibilityId = "selection-visualization";

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

  it("fails when object rendering contract loses extracted helper coverage", () => {
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

  it("fails when machine object rendering adapter responsibility is missing", () => {
    expect(
      hasIssue(
        withInventory({
          primaryResponsibilities: withoutResponsibility("machine-object-rendering-adapter")
        }),
        "object-rendering-adapter-responsibility-invalid"
      )
    ).toBe(true);
  });

  it("fails when machine object rendering adapter responsibility has wrong status", () => {
    expect(
      hasIssue(
        withInventory({
          primaryResponsibilities: withResponsibilityUpdate("machine-object-rendering-adapter", {
            status: "extracted"
          })
        }),
        "object-rendering-adapter-responsibility-invalid"
      )
    ).toBe(true);
  });

  it("fails when machine object rendering adapter responsibility has wrong owner", () => {
    expect(
      hasIssue(
        withInventory({
          primaryResponsibilities: withResponsibilityUpdate("machine-object-rendering-adapter", {
            ownerModule: "src/components/babylonScene/objectRendering.ts"
          })
        }),
        "object-rendering-adapter-responsibility-invalid"
      )
    ).toBe(true);
  });

  it("fails when machine object rendering adapter responsibility is not a next refactor candidate", () => {
    expect(
      hasIssue(
        withInventory({
          primaryResponsibilities: withResponsibilityUpdate("machine-object-rendering-adapter", {
            nextRefactorCandidate: false
          })
        }),
        "object-rendering-adapter-responsibility-invalid"
      )
    ).toBe(true);
  });

  it("fails when machine object rendering adapter responsibility has wrong risk level", () => {
    expect(
      hasIssue(
        withInventory({
          primaryResponsibilities: withResponsibilityUpdate("machine-object-rendering-adapter", {
            riskLevel: "low"
          })
        }),
        "object-rendering-adapter-responsibility-invalid"
      )
    ).toBe(true);
  });

  it("fails when an interaction responsibility is missing", () => {
    expect(
      hasIssue(
        withInventory({
          primaryResponsibilities: withoutResponsibility(interactionResponsibilityId)
        }),
        "interaction-responsibility-invalid"
      )
    ).toBe(true);
  });

  it("fails when an interaction responsibility is marked extracted", () => {
    expect(
      hasIssue(
        withInventory({
          primaryResponsibilities: withResponsibilityUpdate(interactionResponsibilityId, {
            status: "extracted"
          })
        }),
        "interaction-responsibility-invalid"
      )
    ).toBe(true);
  });

  it("fails when an interaction responsibility has wrong owner", () => {
    expect(
      hasIssue(
        withInventory({
          primaryResponsibilities: withResponsibilityUpdate(interactionResponsibilityId, {
            ownerModule: "src/components/babylonScene/objectRendering.ts"
          })
        }),
        "interaction-responsibility-invalid"
      )
    ).toBe(true);
  });

  it("fails when an interaction responsibility has wrong risk level", () => {
    expect(
      hasIssue(
        withInventory({
          primaryResponsibilities: withResponsibilityUpdate(interactionResponsibilityId, {
            riskLevel: "medium"
          })
        }),
        "interaction-responsibility-invalid"
      )
    ).toBe(true);
  });

  it("fails when an interaction responsibility becomes a next refactor candidate", () => {
    expect(
      hasIssue(
        withInventory({
          primaryResponsibilities: withResponsibilityUpdate(interactionResponsibilityId, {
            nextRefactorCandidate: true
          })
        }),
        "interaction-responsibility-invalid"
      )
    ).toBe(true);
  });

  it("fails when a selection picking responsibility is missing", () => {
    expect(
      hasIssue(
        withInventory({
          primaryResponsibilities: withoutResponsibility(selectionPickingResponsibilityId)
        }),
        "selection-picking-responsibility-invalid"
      )
    ).toBe(true);
  });

  it("fails when a selection picking responsibility is still marked remaining", () => {
    expect(
      hasIssue(
        withInventory({
          primaryResponsibilities: withResponsibilityUpdate(selectionPickingResponsibilityId, {
            status: "remaining"
          })
        }),
        "selection-picking-responsibility-invalid"
      )
    ).toBe(true);
  });

  it("fails when a selection picking responsibility has wrong owner", () => {
    expect(
      hasIssue(
        withInventory({
          primaryResponsibilities: withResponsibilityUpdate(selectionPickingResponsibilityId, {
            ownerModule: "src/components/BabylonScene.tsx"
          })
        }),
        "selection-picking-responsibility-invalid"
      )
    ).toBe(true);
  });

  it("fails when a selection picking responsibility has wrong risk level", () => {
    expect(
      hasIssue(
        withInventory({
          primaryResponsibilities: withResponsibilityUpdate(selectionPickingResponsibilityId, {
            riskLevel: "high"
          })
        }),
        "selection-picking-responsibility-invalid"
      )
    ).toBe(true);
  });

  it("fails when selection picking contract is detached from extracted helper ownership", () => {
    expect(
      hasIssue(
        withInventory({
          selectionPickingContract: {
            ...currentBabylonSceneBoundary.selectionPickingContract,
            ownerModule: "src/components/BabylonScene.tsx"
          } as unknown as BabylonSceneBoundaryInventory["selectionPickingContract"]
        }),
        "selection-picking-contract-invalid"
      )
    ).toBe(true);
  });

  it("fails when selection picking contract loses extracted flow coverage", () => {
    expect(
      hasIssue(
        withInventory({
          selectionPickingContract: {
            ...currentBabylonSceneBoundary.selectionPickingContract,
            extractedFlows: {
              ...currentBabylonSceneBoundary.selectionPickingContract.extractedFlows,
              pickTargetMetadataDecoding: false
            }
          } as unknown as BabylonSceneBoundaryInventory["selectionPickingContract"]
        }),
        "selection-picking-contract-invalid"
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
