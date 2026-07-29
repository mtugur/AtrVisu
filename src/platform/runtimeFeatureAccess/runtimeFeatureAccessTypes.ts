import type {
  FeatureAccessClassification,
  FeatureAccessEntry,
  FeatureId,
  FeatureQualitySignalId,
  PlatformEntity,
  SelectionState
} from "../contracts";
import type { LegacyEntityFamily } from "../adapters";
import type { PlatformSurfaceInventoryItem } from "../surfaceInventory";
import type {
  RuntimeCommandExecutionProbe as SharedRuntimeCommandExecutionProbe
} from "../runtimeCommands/runtimeCommandOperation";

export type RuntimeFeatureAccessStatus =
  | "ready"
  | "contextually-unavailable"
  | "planned-unbound"
  | "external-evidence-required"
  | "blocked";

export type RuntimeCommandAccessEvidence = {
  commandId: string;
  registered: boolean;
  bound: boolean;
  reachable: boolean;
  currentlyAvailable: boolean;
  reason?: string;
};

export type RuntimePanelAccessEvidence = {
  panelId: string;
  registered: boolean;
  bound: boolean;
  visible: boolean;
  open: boolean;
  available: boolean;
  capabilities: readonly string[];
  reason?: string;
};

export type RuntimeSelectionAccessEvidence = {
  authorityBound: boolean;
  canonicalIdSupport: boolean;
  currentSelectionIds: readonly string[];
  primarySelectionId: string | null;
  replaceSupported: boolean;
  toggleSupported: boolean;
  clearSupported: boolean;
  reconciliationSupported: boolean;
  groupRootSemanticsSupported: boolean;
  editChildSemanticsSupported: boolean;
  staleUnselectableRemovalSupported: boolean;
  selectedEntitiesResolved: boolean;
  selectedEntitiesVisible: boolean;
  selectedEntitiesSelectable: boolean;
  primarySelectionValid: boolean;
  annotationExclusivityValid: boolean;
  activeGroupEditValid: boolean;
  activeGroupSelectionExclusive: boolean;
  groupChildPromotionValid: boolean;
  reasons: readonly string[];
  reason?: string;
};

export type RuntimeEntityAccessEvidence = {
  authorityBound: boolean;
  adapterFamilies: readonly LegacyEntityFamily[];
  entityCount: number;
  canonicalIdentity: boolean;
  duplicateIdentityRejected: boolean;
  parentChildRelationshipsRepresented: boolean;
  visibilityRepresented: boolean;
  selectabilityRepresented: boolean;
  lockContextRepresented: boolean;
  layerAssociationRepresented: boolean;
  groupEntitiesValid: boolean;
  entities: readonly PlatformEntity[];
  reasons: readonly string[];
  reason?: string;
};

export type RuntimeSelectionAuthorityCapabilities = {
  authorityBound: boolean;
  replaceSupported: boolean;
  toggleSupported: boolean;
  clearSupported: boolean;
  reconciliationSupported: boolean;
  groupRootSemanticsSupported: boolean;
  editChildSemanticsSupported: boolean;
  staleUnselectableRemovalSupported: boolean;
};

export type RuntimeEntityAuthorityCapabilities = {
  authorityBound: boolean;
  adapterFamilies: readonly LegacyEntityFamily[];
};

export type RuntimeViewportAccessEvidence = {
  viewportId: string;
  registered: boolean;
  bound: boolean;
  available: boolean;
  visible: boolean;
  cssWidth: number;
  cssHeight: number;
  cameraResolvable: boolean;
  resizeSupported: boolean;
  sceneLifecycleGeneration: number;
  resizeGeneration: number;
  reason?: string;
};

export type RuntimeQualityEvidence = Readonly<
  Partial<Record<FeatureQualitySignalId, boolean>>
>;

export type RuntimeSurfaceExecutionObservationHandle = {
  token: string;
  commandId: string;
};

export type RuntimeSurfaceExecutionCompletion = {
  source: "live-runtime-probe-authority";
  sessionId: string;
  commandId: string;
  status: "verified";
};

export type RuntimeSurfaceExecutionRejectionKind =
  | "attempt-delta"
  | "execution-delta"
  | "cancelled"
  | "disabled"
  | "unavailable"
  | "unsupported"
  | "failed"
  | "malformed";

export type RuntimeSurfaceExecutionRejection = {
  commandId: string;
  kind: RuntimeSurfaceExecutionRejectionKind;
  reason: string;
};

export type RuntimeSurfaceExecutionAuthoritySnapshot = {
  source: "live-runtime-probe-authority";
  sessionId: string;
  verifiedCommandIds: readonly string[];
  missingCommandIds: readonly string[];
  rejectedCommandIds: readonly string[];
  rejections: readonly RuntimeSurfaceExecutionRejection[];
  complete: boolean;
  reasons: readonly string[];
};

export type RuntimeSurfaceExecutionAuthorityValidation = {
  passed: boolean;
  verifiedCommandIds: readonly string[];
  missingCommandIds: readonly string[];
  duplicateCommandIds: readonly string[];
  staleCommandIds: readonly string[];
  cancelledCommandIds: readonly string[];
  failedCommandIds: readonly string[];
  attemptedOnlyCommandIds: readonly string[];
  unknownCommandIds: readonly string[];
  malformedCommandIds: readonly string[];
  reasons: readonly string[];
};

export type RuntimeFeatureAccessExternalEvidence = {
  quality?: RuntimeQualityEvidence;
};

export type RuntimeCommandExecutionProbe = SharedRuntimeCommandExecutionProbe;

export type RuntimeSurfaceExecutionAuthority = {
  readonly sessionId: string;
  readonly requiredCommandIds: readonly string[];
  beginObservation: (commandId: string) => RuntimeSurfaceExecutionObservationHandle;
  completeObservation: (token: string) => RuntimeSurfaceExecutionCompletion;
  getEvidenceSnapshot: () => RuntimeSurfaceExecutionAuthoritySnapshot;
  reset: () => void;
};

export type RuntimeFeatureAccessEvidence = {
  getCommand: (commandId: string) => RuntimeCommandAccessEvidence;
  getPanel: (panelId: string) => RuntimePanelAccessEvidence | undefined;
  selection?: RuntimeSelectionAccessEvidence;
  entities?: RuntimeEntityAccessEvidence;
  viewport?: RuntimeViewportAccessEvidence;
  quality?: RuntimeQualityEvidence;
  surfaceExecution?: RuntimeSurfaceExecutionAuthoritySnapshot;
};

export type RuntimeFeatureAccessReportItem = {
  featureId: FeatureId;
  label: string;
  classification: FeatureAccessClassification;
  requiredForRegression: boolean;
  declaredSurfaces: FeatureAccessEntry["surfaces"];
  inventoriedRuntimeSurfaceIds: readonly string[];
  commandIds: readonly string[];
  panelIds: readonly string[];
  commandEvidence: readonly RuntimeCommandAccessEvidence[];
  panelEvidence: readonly RuntimePanelAccessEvidence[];
  selectionEvidence?: RuntimeSelectionAccessEvidence;
  entityEvidence?: RuntimeEntityAccessEvidence;
  viewportEvidence?: RuntimeViewportAccessEvidence;
  registered: boolean;
  bound: boolean;
  reachable: boolean;
  currentlyAvailable: boolean;
  status: RuntimeFeatureAccessStatus;
  reasons: readonly string[];
};

export type RuntimeFeatureAccessReport = {
  features: readonly RuntimeFeatureAccessReportItem[];
  requiredRuntimeFeatures: readonly RuntimeFeatureAccessReportItem[];
  plannedFeatures: readonly RuntimeFeatureAccessReportItem[];
  qualitySignals: readonly RuntimeFeatureAccessReportItem[];
  blockedRequiredFeatureIds: readonly string[];
  metadataOnlyRequiredFeatureIds: readonly string[];
  unknownCommandIds: readonly string[];
  unknownPanelIds: readonly string[];
  staleSurfaceFeatureIds: readonly string[];
  unmappedRuntimeSurfaceIds: readonly string[];
  duplicateFeatureIds: readonly string[];
  requiredSurfaceExecutionCommandIds: readonly string[];
  missingSurfaceExecutionCommandIds: readonly string[];
  surfaceExecutionValidation: RuntimeSurfaceExecutionAuthorityValidation;
  issues: readonly string[];
};

export type RuntimeFeatureAccessGateResult = {
  passed: boolean;
  blockedFeatureIds: readonly string[];
  reasons: readonly string[];
  report: RuntimeFeatureAccessReport;
};

export type RuntimeFeatureAccessReportInput = {
  features: readonly FeatureAccessEntry[];
  surfaces: readonly PlatformSurfaceInventoryItem[];
  evidence: RuntimeFeatureAccessEvidence;
  runtimeSessionId?: string;
};

export type RuntimeSelectionEvidenceInput = {
  selection: SelectionState;
  entities: readonly PlatformEntity[];
  activeGroupEditId: string | null;
  capabilities: RuntimeSelectionAuthorityCapabilities;
};

export type RuntimeEntityEvidenceInput = {
  entities: readonly PlatformEntity[];
  authority: RuntimeEntityAuthorityCapabilities;
};

export type RuntimeFeatureAccessE2EBridge = {
  getReport: () => RuntimeFeatureAccessReport;
  getFeature: (featureId: string) => RuntimeFeatureAccessReportItem | undefined;
  getGate: (evidence: RuntimeFeatureAccessExternalEvidence) => RuntimeFeatureAccessGateResult;
  listBlockedRequired: () => readonly RuntimeFeatureAccessReportItem[];
  listPlanned: () => readonly RuntimeFeatureAccessReportItem[];
  getCommandExecution: (commandId: string) => RuntimeCommandExecutionProbe;
  listCommandExecutions: () => readonly RuntimeCommandExecutionProbe[];
  getDiagnosticsSessionId: () => string;
  getRequiredSurfaceExecutionCommandIds: () => readonly string[];
  beginSurfaceExecutionObservation: (
    commandId: string
  ) => RuntimeSurfaceExecutionObservationHandle;
  completeSurfaceExecutionObservation: (
    token: string
  ) => RuntimeSurfaceExecutionCompletion;
  getSurfaceExecutionEvidence: () => RuntimeSurfaceExecutionAuthoritySnapshot;
};

declare global {
  interface Window {
    __atrvisuRuntimeFeatureAccess?: RuntimeFeatureAccessE2EBridge;
  }
}
