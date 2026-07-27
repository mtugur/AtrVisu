import { createRuntimeFeatureAccessReport } from "./runtimeFeatureAccessReport";
import type {
  RuntimeFeatureAccessGateResult,
  RuntimeFeatureAccessReport,
  RuntimeFeatureAccessReportInput
} from "./runtimeFeatureAccessTypes";

export const evaluateRuntimeFeatureAccessGate = (
  report: RuntimeFeatureAccessReport
): RuntimeFeatureAccessGateResult => {
  const invalidRequiredStatuses = report.requiredRuntimeFeatures
    .filter((feature) =>
      feature.status !== "ready" && feature.status !== "contextually-unavailable"
    )
    .map((feature) => feature.featureId);
  const invalidPlannedStatuses = report.plannedFeatures
    .filter((feature) => feature.status !== "planned-unbound")
    .map((feature) => feature.featureId);
  const invalidQualityStatuses = report.qualitySignals
    .filter((feature) => feature.status !== "ready")
    .map((feature) => feature.featureId);
  const blockedFeatureIds = [...new Set([
    ...invalidRequiredStatuses,
    ...invalidPlannedStatuses,
    ...invalidQualityStatuses
  ])].sort((left, right) => left.localeCompare(right));
  const reasons = [...new Set([
    ...report.issues,
    ...report.qualitySignals
      .filter((feature) => feature.status !== "ready")
      .flatMap((feature) => feature.reasons.map((reason) => `${feature.featureId}: ${reason}`))
  ])].sort((left, right) => left.localeCompare(right));
  const structuralFailure =
    report.duplicateFeatureIds.length > 0
    || report.unknownCommandIds.length > 0
    || report.unknownPanelIds.length > 0
    || report.staleSurfaceFeatureIds.length > 0
    || report.unmappedRuntimeSurfaceIds.length > 0
    || report.metadataOnlyRequiredFeatureIds.length > 0
    || report.missingSurfaceExecutionCommandIds.length > 0;

  return {
    passed: blockedFeatureIds.length === 0 && !structuralFailure,
    blockedFeatureIds,
    reasons,
    report
  };
};

export const createRuntimeFeatureAccessGate = (
  input: RuntimeFeatureAccessReportInput
) => evaluateRuntimeFeatureAccessGate(createRuntimeFeatureAccessReport(input));
