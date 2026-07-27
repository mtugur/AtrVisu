import type {
  FeatureAccessClassification,
  FeatureAccessEntry,
  FeatureId,
  FeatureQualitySignalId,
  PlatformEntity,
  SelectionState
} from "../contracts";
import type { PlatformSurfaceInventoryItem } from "../surfaceInventory";

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
  reason?: string;
};

export type RuntimeEntityAccessEvidence = {
  authorityBound: boolean;
  adapterFamilies: readonly string[];
  entityCount: number;
  canonicalIdentity: boolean;
  duplicateIdentityRejected: boolean;
  parentChildRelationshipsRepresented: boolean;
  visibilityRepresented: boolean;
  selectabilityRepresented: boolean;
  lockContextRepresented: boolean;
  layerAssociationRepresented: boolean;
  entities: readonly PlatformEntity[];
  reason?: string;
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

export type RuntimeFeatureAccessEvidence = {
  getCommand: (commandId: string) => RuntimeCommandAccessEvidence;
  getPanel: (panelId: string) => RuntimePanelAccessEvidence | undefined;
  selection?: RuntimeSelectionAccessEvidence;
  entities?: RuntimeEntityAccessEvidence;
  viewport?: RuntimeViewportAccessEvidence;
  quality?: RuntimeQualityEvidence;
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
};

export type RuntimeSelectionEvidenceInput = {
  selection: SelectionState;
  entities: readonly PlatformEntity[];
  activeGroupEditId: string | null;
};

export type RuntimeEntityEvidenceInput = {
  entities: readonly PlatformEntity[];
  adapterFamilies?: readonly string[];
};

export type RuntimeFeatureAccessE2EBridge = {
  getReport: () => RuntimeFeatureAccessReport;
  getFeature: (featureId: string) => RuntimeFeatureAccessReportItem | undefined;
  getGate: (quality: RuntimeQualityEvidence) => RuntimeFeatureAccessGateResult;
  listBlockedRequired: () => readonly RuntimeFeatureAccessReportItem[];
  listPlanned: () => readonly RuntimeFeatureAccessReportItem[];
};

declare global {
  interface Window {
    __atrvisuRuntimeFeatureAccess?: RuntimeFeatureAccessE2EBridge;
  }
}
