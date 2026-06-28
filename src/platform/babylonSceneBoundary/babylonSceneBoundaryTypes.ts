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

export type BabylonSceneCameraViewportContract = {
  responsibilityId: "camera-creation-control";
  status: BabylonSceneBoundaryResponsibilityStatus;
  ownerModule: string;
  riskLevel: BabylonSceneBoundaryRiskLevel;
  refactorRiskRank: number;
  extractedModule: "src/components/babylonScene/cameraViewport.ts";
  remainingAdapterModule: "src/components/BabylonScene.tsx";
  protectedBehaviors: readonly string[];
  initialCamera: {
    name: "orbit-camera";
    alphaExpression: "Math.PI / 4";
    betaExpression: "Math.PI / 3";
    radius: number;
    targetExpression: "Vector3.Zero()";
  };
  controls: {
    lowerRadiusLimit: number;
    upperRadiusLimit: number;
    wheelPrecision: number;
    panningSensibility: number;
    panningInertia: number;
    inertia: number;
    pointerButtons: readonly number[];
    panningMouseButton: number;
  };
  imperativeHandle: {
    exposesGetCameraState: true;
    exposesApplyCameraState: true;
    supportedModes: readonly ["perspective", "orthographic"];
  };
};

export type BabylonSceneObjectRenderingContract = {
  responsibilityId: "machine-object-mesh-rendering";
  status: "extracted";
  ownerModule: "src/components/babylonScene/objectRendering.ts";
  riskLevel: "low";
  refactorRiskRank: number;
  extractedModule: "src/components/babylonScene/objectRendering.ts";
  testModule: "src/components/babylonScene/objectRendering.test.ts";
  remainingAdapterModule: "src/components/BabylonScene.tsx";
  separatedFromResponsibilityIds: readonly string[];
  protectedBehaviors: readonly string[];
  extractedFlows: {
    placeholderVisualDescriptorCalculation: true;
    fallbackVisualDescriptorBehavior: true;
    placeholderDimensionMapping: true;
  };
  remainingAdapterFlows: {
    babylonMeshInstantiation: true;
    glbExternalVisualModelLoading: true;
    objectLabelsVisualIdentity: true;
    machinePickMetadata: true;
    renderingLifecycleCleanup: true;
  };
  extractedDependencyModules: {
    sceneLifecycle: "src/components/babylonScene/sceneLifecycle.ts";
    visualContext: "src/components/babylonScene/visualContext.ts";
    cameraViewport: "src/components/babylonScene/cameraViewport.ts";
  };
  futureModuleCandidates: readonly string[];
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
  cameraViewportContract: BabylonSceneCameraViewportContract;
  objectRenderingContract: BabylonSceneObjectRenderingContract;
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
  cameraViewportContract: BabylonSceneCameraViewportContract;
  objectRenderingContract: BabylonSceneObjectRenderingContract;
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
