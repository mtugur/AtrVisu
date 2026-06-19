export type PlatformSurfaceType =
  | "panel"
  | "modal"
  | "toolbar-action"
  | "scene-interaction"
  | "keyboard-action"
  | "property-editor"
  | "manager"
  | "diagnostics"
  | "persistence"
  | "visual-overlay";

export type PlatformSurfaceOwner = "existing-ui" | "platform" | "legacy-compatible";

export type PlatformSurfaceInventoryItem = {
  surfaceId: string;
  surfaceType: PlatformSurfaceType;
  label: string;
  owner: PlatformSurfaceOwner;
  sourceFiles: readonly string[];
  commandIds?: readonly string[];
  panelIds?: readonly string[];
  featureIds?: readonly string[];
  notes?: string;
};

export type PlatformSurfaceInventoryAuditIssue = {
  severity: "error" | "warning";
  surfaceId?: string;
  message: string;
};

export type PlatformSurfaceInventoryAuditReport = {
  errors: readonly PlatformSurfaceInventoryAuditIssue[];
  warnings: readonly PlatformSurfaceInventoryAuditIssue[];
};

