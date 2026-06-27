import { createBabylonSceneBoundaryAuditReport } from "./babylonSceneBoundaryAudit";
import { currentBabylonSceneBoundary } from "./currentBabylonSceneBoundary";
import type { PlatformBabylonSceneBoundaryReport } from "./babylonSceneBoundaryTypes";

export const createPlatformBabylonSceneBoundaryReport = (): PlatformBabylonSceneBoundaryReport => {
  const audit = createBabylonSceneBoundaryAuditReport();

  return {
    status: audit.readiness,
    boundaryId: currentBabylonSceneBoundary.id,
    displayName: currentBabylonSceneBoundary.displayName,
    ownerLayer: currentBabylonSceneBoundary.ownerLayer,
    runtimeStatus: currentBabylonSceneBoundary.runtimeStatus,
    sourceFileCount: currentBabylonSceneBoundary.sourceFiles.length,
    parentBoundaryCount: currentBabylonSceneBoundary.parentBoundaryIds.length,
    responsibilityCount: currentBabylonSceneBoundary.primaryResponsibilities.length,
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
