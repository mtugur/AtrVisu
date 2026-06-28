import { currentBabylonSceneBoundary } from "./currentBabylonSceneBoundary";
import type {
  BabylonSceneBoundaryAuditReport,
  BabylonSceneBoundaryInventory,
  BabylonSceneBoundaryIssue,
  BabylonSceneBoundaryReference,
  BabylonSceneBoundaryResponsibility
} from "./babylonSceneBoundaryTypes";

const hasText = (value: string) => value.trim().length > 0;

const hasReferenceItems = (items: readonly BabylonSceneBoundaryReference[]) =>
  items.length > 0 && items.every((item) => hasText(item.id) && hasText(item.label));

const hasResponsibilityItems = (items: readonly BabylonSceneBoundaryResponsibility[]) =>
  hasReferenceItems(items) &&
  items.every((item) =>
    (item.status === "extracted" || item.status === "remaining") &&
    (item.riskLevel === "low" || item.riskLevel === "medium" || item.riskLevel === "high") &&
    hasText(item.ownerModule)
  );

const findResponsibilityById = (
  responsibilities: readonly BabylonSceneBoundaryResponsibility[],
  responsibilityId: string
) => responsibilities.find((responsibility) => responsibility.id === responsibilityId);

const createIssue = (
  code: string,
  message: string,
  boundaryId?: string,
  relatedIds?: readonly string[]
): BabylonSceneBoundaryIssue => ({
  severity: "error",
  code,
  message,
  ...(boundaryId !== undefined ? { boundaryId } : {}),
  ...(relatedIds !== undefined ? { relatedIds } : {})
});

export const createBabylonSceneBoundaryAuditReportFromInventory = (
  inventory: BabylonSceneBoundaryInventory
): BabylonSceneBoundaryAuditReport => {
  const issues: BabylonSceneBoundaryIssue[] = [];

  if (!hasText(inventory.id)) {
    issues.push(createIssue("boundary-id-empty", "Babylon scene boundary id is required.", inventory.id));
  }
  if (inventory.id !== "babylon-scene") {
    issues.push(createIssue("boundary-id-invalid", "Babylon scene boundary id must be babylon-scene.", inventory.id, ["babylon-scene"]));
  }
  if (!hasText(inventory.displayName)) {
    issues.push(createIssue("boundary-display-name-empty", "Babylon scene displayName is required.", inventory.id));
  }
  if (inventory.ownerLayer !== "scene-viewport") {
    issues.push(createIssue("boundary-owner-layer-invalid", "Babylon scene ownerLayer must be scene-viewport.", inventory.id, ["scene-viewport"]));
  }
  if (inventory.runtimeStatus !== "active") {
    issues.push(createIssue("boundary-runtime-status-invalid", "Babylon scene runtimeStatus must be active.", inventory.id, ["active"]));
  }
  if (inventory.sourceFiles.length === 0 || inventory.sourceFiles.some((sourceFile) => !hasText(sourceFile))) {
    issues.push(createIssue("boundary-source-files-empty", "Babylon scene sourceFiles must not be empty.", inventory.id));
  }
  if (inventory.parentBoundaryIds.length === 0 || inventory.parentBoundaryIds.some((boundaryId) => !hasText(boundaryId))) {
    issues.push(createIssue("parent-boundary-ids-empty", "Babylon scene parentBoundaryIds must not be empty.", inventory.id));
  }
  if (!hasResponsibilityItems(inventory.primaryResponsibilities)) {
    issues.push(createIssue("primary-responsibilities-empty", "Babylon scene primaryResponsibilities must include id, label, status, riskLevel, and ownerModule.", inventory.id));
  }
  const objectRenderingAdapterResponsibility = findResponsibilityById(
    inventory.primaryResponsibilities,
    "machine-object-rendering-adapter"
  );
  if (
    !objectRenderingAdapterResponsibility ||
    objectRenderingAdapterResponsibility.status !== "remaining" ||
    objectRenderingAdapterResponsibility.ownerModule !== "src/components/BabylonScene.tsx" ||
    objectRenderingAdapterResponsibility.riskLevel !== "medium" ||
    objectRenderingAdapterResponsibility.nextRefactorCandidate !== true
  ) {
    issues.push(createIssue("object-rendering-adapter-responsibility-invalid", "Babylon scene primaryResponsibilities must keep machine-object-rendering-adapter as remaining medium-risk BabylonScene work and a controlled next refactor candidate.", inventory.id, ["machine-object-rendering-adapter"]));
  }
  if (
    inventory.cameraViewportContract.responsibilityId !== "camera-creation-control" ||
    inventory.cameraViewportContract.status !== "extracted" ||
    inventory.cameraViewportContract.ownerModule !== "src/components/babylonScene/cameraViewport.ts" ||
    inventory.cameraViewportContract.extractedModule !== "src/components/babylonScene/cameraViewport.ts" ||
    inventory.cameraViewportContract.remainingAdapterModule !== "src/components/BabylonScene.tsx" ||
    inventory.cameraViewportContract.protectedBehaviors.length === 0
  ) {
    issues.push(createIssue("camera-viewport-contract-invalid", "Babylon scene cameraViewportContract must protect the extracted camera viewport helper and remaining BabylonScene camera state adapter.", inventory.id));
  }
  if (
    inventory.objectRenderingContract.responsibilityId !== "machine-object-mesh-rendering" ||
    inventory.objectRenderingContract.status !== "extracted" ||
    inventory.objectRenderingContract.ownerModule !== "src/components/babylonScene/objectRendering.ts" ||
    inventory.objectRenderingContract.extractedModule !== "src/components/babylonScene/objectRendering.ts" ||
    inventory.objectRenderingContract.testModule !== "src/components/babylonScene/objectRendering.test.ts" ||
    inventory.objectRenderingContract.remainingAdapterModule !== "src/components/BabylonScene.tsx" ||
    inventory.objectRenderingContract.riskLevel !== "low" ||
    inventory.objectRenderingContract.protectedBehaviors.length === 0 ||
    !inventory.objectRenderingContract.extractedFlows.placeholderVisualDescriptorCalculation ||
    !inventory.objectRenderingContract.extractedFlows.fallbackVisualDescriptorBehavior ||
    !inventory.objectRenderingContract.extractedFlows.placeholderDimensionMapping ||
    !inventory.objectRenderingContract.remainingAdapterFlows.babylonMeshInstantiation ||
    !inventory.objectRenderingContract.remainingAdapterFlows.glbExternalVisualModelLoading ||
    !inventory.objectRenderingContract.remainingAdapterFlows.objectLabelsVisualIdentity ||
    !inventory.objectRenderingContract.remainingAdapterFlows.machinePickMetadata ||
    !inventory.objectRenderingContract.remainingAdapterFlows.renderingLifecycleCleanup ||
    !inventory.objectRenderingContract.separatedFromResponsibilityIds.includes("pointer-interaction-handling") ||
    !inventory.objectRenderingContract.separatedFromResponsibilityIds.includes("object-picking-metadata") ||
    !inventory.objectRenderingContract.separatedFromResponsibilityIds.includes("camera-creation-control")
  ) {
    issues.push(createIssue("object-rendering-contract-invalid", "Babylon scene objectRenderingContract must protect extracted placeholder rendering descriptors while keeping BabylonScene adapter, picking, and high-risk interaction responsibilities separate.", inventory.id));
  }
  if (!hasReferenceItems(inventory.knownUpstreamInputs)) {
    issues.push(createIssue("upstream-inputs-empty", "Babylon scene knownUpstreamInputs must not be empty.", inventory.id));
  }
  if (!hasReferenceItems(inventory.knownDownstreamEffects)) {
    issues.push(createIssue("downstream-effects-empty", "Babylon scene knownDownstreamEffects must not be empty.", inventory.id));
  }
  if (!hasReferenceItems(inventory.boundaryRisks)) {
    issues.push(createIssue("boundary-risks-empty", "Babylon scene boundaryRisks must not be empty.", inventory.id));
  }
  if (!hasReferenceItems(inventory.extractionNotes)) {
    issues.push(createIssue("extraction-notes-empty", "Babylon scene extractionNotes must not be empty.", inventory.id));
  }

  return {
    status: issues.length === 0 ? "pass" : "fail",
    readiness: issues.length === 0 ? "ready" : "not-ready",
    inventory,
    issues,
    issueCount: issues.length,
    errorCount: issues.length,
    warningCount: 0
  };
};

export const createBabylonSceneBoundaryAuditReport = () =>
  createBabylonSceneBoundaryAuditReportFromInventory(currentBabylonSceneBoundary);

export const getBabylonSceneBoundaryInventory = () => currentBabylonSceneBoundary;

export const getBabylonSceneBoundaryResponsibilityIds = () =>
  currentBabylonSceneBoundary.primaryResponsibilities.map((responsibility) => responsibility.id);

export const getBabylonSceneBoundaryUpstreamInputIds = () =>
  currentBabylonSceneBoundary.knownUpstreamInputs.map((input) => input.id);

export const getBabylonSceneBoundaryDownstreamEffectIds = () =>
  currentBabylonSceneBoundary.knownDownstreamEffects.map((effect) => effect.id);
