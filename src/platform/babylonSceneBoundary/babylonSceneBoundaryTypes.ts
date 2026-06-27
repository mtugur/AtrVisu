export type BabylonSceneBoundaryId = "babylon-scene" | string;

export type BabylonSceneOwnerLayer = "scene-viewport";

export type BabylonSceneRuntimeStatus = "active";

export type BabylonSceneBoundaryStatus = "ready" | "not-ready";

export type BabylonSceneBoundaryCheckStatus = "pass" | "fail";

export type BabylonSceneBoundaryIssueSeverity = "error" | "warning";

export type BabylonSceneBoundaryReference = {
  id: string;
  label: string;
};

export type BabylonSceneBoundaryInventory = {
  id: BabylonSceneBoundaryId;
  displayName: string;
  ownerLayer: BabylonSceneOwnerLayer;
  runtimeStatus: BabylonSceneRuntimeStatus;
  sourceFiles: readonly string[];
  parentBoundaryIds: readonly string[];
  relatedSurfaceIds: readonly string[];
  relatedCommandIds: readonly string[];
  primaryResponsibilities: readonly BabylonSceneBoundaryReference[];
  knownUpstreamInputs: readonly BabylonSceneBoundaryReference[];
  knownDownstreamEffects: readonly BabylonSceneBoundaryReference[];
  boundaryRisks: readonly BabylonSceneBoundaryReference[];
  extractionNotes: readonly BabylonSceneBoundaryReference[];
};

export type BabylonSceneBoundaryIssue = {
  severity: BabylonSceneBoundaryIssueSeverity;
  code: string;
  message: string;
  boundaryId?: string;
  relatedIds?: readonly string[];
};

export type BabylonSceneBoundaryAuditReport = {
  status: BabylonSceneBoundaryCheckStatus;
  readiness: BabylonSceneBoundaryStatus;
  inventory: BabylonSceneBoundaryInventory;
  issues: readonly BabylonSceneBoundaryIssue[];
  issueCount: number;
  errorCount: number;
  warningCount: number;
};

export type PlatformBabylonSceneBoundaryReport = {
  status: BabylonSceneBoundaryStatus;
  boundaryId: string;
  displayName: string;
  ownerLayer: BabylonSceneOwnerLayer;
  runtimeStatus: BabylonSceneRuntimeStatus;
  sourceFileCount: number;
  parentBoundaryCount: number;
  responsibilityCount: number;
  upstreamInputCount: number;
  downstreamEffectCount: number;
  boundaryRiskCount: number;
  extractionNoteCount: number;
  issueCount: number;
  errorCount: number;
  warningCount: number;
  inventory: BabylonSceneBoundaryInventory;
  audit: BabylonSceneBoundaryAuditReport;
};
