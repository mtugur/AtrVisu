export type SceneViewportBoundaryId = "scene-viewport" | string;

export type SceneViewportOwnerLayer = "app-shell";

export type SceneViewportRuntimeStatus = "active";

export type SceneViewportBoundaryStatus = "ready" | "not-ready";

export type SceneViewportBoundaryCheckStatus = "pass" | "fail";

export type SceneViewportBoundaryIssueSeverity = "error" | "warning";

export type SceneViewportBoundaryReference = {
  id: string;
  label: string;
};

export type SceneViewportBoundaryInventory = {
  id: SceneViewportBoundaryId;
  displayName: string;
  ownerLayer: SceneViewportOwnerLayer;
  runtimeStatus: SceneViewportRuntimeStatus;
  appShellZoneId: "scene-viewport";
  sourceFiles: readonly string[];
  relatedSurfaceIds: readonly string[];
  relatedCommandIds: readonly string[];
  primaryResponsibilities: readonly SceneViewportBoundaryReference[];
  knownUpstreamInputs: readonly SceneViewportBoundaryReference[];
  knownDownstreamEffects: readonly SceneViewportBoundaryReference[];
  boundaryRisks: readonly SceneViewportBoundaryReference[];
  extractionNotes: readonly SceneViewportBoundaryReference[];
};

export type SceneViewportBoundaryIssue = {
  severity: SceneViewportBoundaryIssueSeverity;
  code: string;
  message: string;
  boundaryId?: string;
  relatedIds?: readonly string[];
};

export type SceneViewportBoundaryAuditReport = {
  status: SceneViewportBoundaryCheckStatus;
  readiness: SceneViewportBoundaryStatus;
  inventory: SceneViewportBoundaryInventory;
  issues: readonly SceneViewportBoundaryIssue[];
  issueCount: number;
  errorCount: number;
  warningCount: number;
};

export type PlatformSceneViewportBoundaryReport = {
  status: SceneViewportBoundaryStatus;
  boundaryId: string;
  displayName: string;
  ownerLayer: SceneViewportOwnerLayer;
  runtimeStatus: SceneViewportRuntimeStatus;
  appShellZoneId: "scene-viewport";
  sourceFileCount: number;
  responsibilityCount: number;
  upstreamInputCount: number;
  downstreamEffectCount: number;
  boundaryRiskCount: number;
  extractionNoteCount: number;
  issueCount: number;
  errorCount: number;
  warningCount: number;
  inventory: SceneViewportBoundaryInventory;
  audit: SceneViewportBoundaryAuditReport;
};
