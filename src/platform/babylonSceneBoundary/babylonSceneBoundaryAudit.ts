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
    inventory.objectRenderingContract.status !== "remaining" ||
    inventory.objectRenderingContract.ownerModule !== "src/components/BabylonScene.tsx" ||
    inventory.objectRenderingContract.riskLevel !== "medium" ||
    inventory.objectRenderingContract.protectedBehaviors.length === 0 ||
    !inventory.objectRenderingContract.renderingFlows.machineMeshCreation ||
    !inventory.objectRenderingContract.renderingFlows.placeholderVisualRendering ||
    !inventory.objectRenderingContract.renderingFlows.glbExternalVisualModelLoading ||
    !inventory.objectRenderingContract.renderingFlows.fallbackVisualBehavior ||
    !inventory.objectRenderingContract.renderingFlows.objectLabelsVisualIdentity ||
    !inventory.objectRenderingContract.renderingFlows.renderingLifecycleCleanup ||
    !inventory.objectRenderingContract.separatedFromResponsibilityIds.includes("pointer-interaction-handling") ||
    !inventory.objectRenderingContract.separatedFromResponsibilityIds.includes("camera-creation-control")
  ) {
    issues.push(createIssue("object-rendering-contract-invalid", "Babylon scene objectRenderingContract must protect remaining machine/object rendering without merging it into extracted camera, lifecycle, visual context, or high-risk interaction responsibilities.", inventory.id));
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
