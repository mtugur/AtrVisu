export type AppShellZoneId =
  | "app-root"
  | "scene-viewport"
  | "machine-library"
  | "machine-properties"
  | "top-toolbar"
  | "modal-layer"
  | "diagnostics"
  | "project-storage"
  | "library-management"
  | "taxonomy-management"
  | string;

export type AppShellZoneType =
  | "root"
  | "viewport"
  | "panel"
  | "toolbar"
  | "modal"
  | "service-boundary"
  | "diagnostics";

export type AppShellBoundaryRiskLevel = "low" | "medium" | "high";

export type AppShellBoundaryZone = {
  id: AppShellZoneId;
  label: string;
  type: AppShellZoneType;
  owner: "existing-app";
  sourceFiles: readonly string[];
  relatedSurfaceIds?: readonly string[];
  relatedPanelIds?: readonly string[];
  relatedCommandIds?: readonly string[];
  responsibilities: readonly string[];
  refactorNotes: readonly string[];
  riskLevel: AppShellBoundaryRiskLevel;
};

export type AppShellBoundaryIssueSeverity = "error" | "warning";

export type AppShellBoundaryIssue = {
  severity: AppShellBoundaryIssueSeverity;
  code: string;
  message: string;
  zoneId?: string;
  relatedIds?: readonly string[];
};

export type AppShellBoundaryAuditReport = {
  zones: readonly AppShellBoundaryZone[];
  issues: readonly AppShellBoundaryIssue[];
  zoneCount: number;
  errorCount: number;
  warningCount: number;
};

export type PlatformAppShellBoundaryReport = {
  zoneCount: number;
  highRiskZoneCount: number;
  mediumRiskZoneCount: number;
  lowRiskZoneCount: number;
  issueCount: number;
  errorCount: number;
  warningCount: number;
  zones: readonly AppShellBoundaryZone[];
  audit: AppShellBoundaryAuditReport;
};
