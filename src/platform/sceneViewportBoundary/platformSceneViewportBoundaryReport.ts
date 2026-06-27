import { createSceneViewportBoundaryAuditReport } from "./sceneViewportBoundaryAudit";
import { currentSceneViewportBoundary } from "./currentSceneViewportBoundary";
import type { PlatformSceneViewportBoundaryReport } from "./sceneViewportBoundaryTypes";

export const createPlatformSceneViewportBoundaryReport = (): PlatformSceneViewportBoundaryReport => {
  const audit = createSceneViewportBoundaryAuditReport();

  return {
    status: audit.readiness,
    boundaryId: currentSceneViewportBoundary.id,
    displayName: currentSceneViewportBoundary.displayName,
    ownerLayer: currentSceneViewportBoundary.ownerLayer,
    runtimeStatus: currentSceneViewportBoundary.runtimeStatus,
    appShellZoneId: currentSceneViewportBoundary.appShellZoneId,
    sourceFileCount: currentSceneViewportBoundary.sourceFiles.length,
    responsibilityCount: currentSceneViewportBoundary.primaryResponsibilities.length,
    upstreamInputCount: currentSceneViewportBoundary.knownUpstreamInputs.length,
    downstreamEffectCount: currentSceneViewportBoundary.knownDownstreamEffects.length,
    boundaryRiskCount: currentSceneViewportBoundary.boundaryRisks.length,
    extractionNoteCount: currentSceneViewportBoundary.extractionNotes.length,
    issueCount: audit.issueCount,
    errorCount: audit.errorCount,
    warningCount: audit.warningCount,
    inventory: currentSceneViewportBoundary,
    audit
  };
};
