import { createBabylonSceneBoundaryAuditReport } from "./babylonSceneBoundaryAudit";
import { currentBabylonSceneBoundary } from "./currentBabylonSceneBoundary";
import type { PlatformBabylonSceneBoundaryReport } from "./babylonSceneBoundaryTypes";

export const createPlatformBabylonSceneBoundaryReport = (): PlatformBabylonSceneBoundaryReport => {
  const audit = createBabylonSceneBoundaryAuditReport();
  const nextRefactorCandidates = currentBabylonSceneBoundary.primaryResponsibilities
    .filter((responsibility) => responsibility.nextRefactorCandidate)
    .sort((left, right) => {
      const riskOrder = { low: 0, medium: 1, high: 2 };
      const riskDelta = riskOrder[left.riskLevel] - riskOrder[right.riskLevel];

      return riskDelta === 0 ? left.id.localeCompare(right.id) : riskDelta;
    });

  return {
    status: audit.readiness,
    boundaryId: currentBabylonSceneBoundary.id,
    displayName: currentBabylonSceneBoundary.displayName,
    ownerLayer: currentBabylonSceneBoundary.ownerLayer,
    runtimeStatus: currentBabylonSceneBoundary.runtimeStatus,
    sourceFileCount: currentBabylonSceneBoundary.sourceFiles.length,
    parentBoundaryCount: currentBabylonSceneBoundary.parentBoundaryIds.length,
    responsibilityCount: currentBabylonSceneBoundary.primaryResponsibilities.length,
    extractedResponsibilityCount: currentBabylonSceneBoundary.primaryResponsibilities.filter(
      (responsibility) => responsibility.status === "extracted"
    ).length,
    remainingResponsibilityCount: currentBabylonSceneBoundary.primaryResponsibilities.filter(
      (responsibility) => responsibility.status === "remaining"
    ).length,
    highRiskResponsibilityCount: currentBabylonSceneBoundary.primaryResponsibilities.filter(
      (responsibility) => responsibility.riskLevel === "high"
    ).length,
    nextRefactorCandidates,
    cameraViewportContract: currentBabylonSceneBoundary.cameraViewportContract,
    objectRenderingContract: currentBabylonSceneBoundary.objectRenderingContract,
    selectionPickingContract: currentBabylonSceneBoundary.selectionPickingContract,
    dragPlacementContract: currentBabylonSceneBoundary.dragPlacementContract,
    upstreamInputCount: currentBabylonSceneBoundary.knownUpstreamInputs.length,
    downstreamEffectCount: currentBabylonSceneBoundary.knownDownstreamEffects.length,
    boundaryRiskCount: currentBabylonSceneBoundary.boundaryRisks.length,
    extractionNoteCount: currentBabylonSceneBoundary.extractionNotes.length,
    issueCount: audit.issueCount,
    errorCount: audit.errorCount,
    warningCount: audit.warningCount,
    inventory: currentBabylonSceneBoundary,
    audit
  };
};
