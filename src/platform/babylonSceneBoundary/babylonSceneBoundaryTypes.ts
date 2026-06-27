export type BabylonSceneBoundaryId = "babylon-scene" | string;

export type BabylonSceneOwnerLayer = "scene-viewport";

export type BabylonSceneRuntimeStatus = "active";

export type BabylonSceneBoundaryStatus = "ready" | "not-ready";

export type BabylonSceneBoundaryCheckStatus = "pass" | "fail";

export type BabylonSceneBoundaryIssueSeverity = "error" | "warning";

export type BabylonSceneBoundaryRiskLevel = "low" | "medium" | "high";

export type BabylonSceneBoundaryResponsibilityStatus = "extracted" | "remaining";

export type BabylonSceneBoundaryReference = {
  id: string;
  label: string;
};

export type BabylonSceneBoundaryResponsibility = BabylonSceneBoundaryReference & {
  status: BabylonSceneBoundaryResponsibilityStatus;
  riskLevel: BabylonSceneBoundaryRiskLevel;
  ownerModule: string;
  nextRefactorCandidate: boolean;
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
  primaryResponsibilities: readonly BabylonSceneBoundaryResponsibility[];
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
  extractedResponsibilityCount: number;
  remainingResponsibilityCount: number;
  highRiskResponsibilityCount: number;
  nextRefactorCandidates: readonly BabylonSceneBoundaryResponsibility[];
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
