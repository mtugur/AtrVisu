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

const expectedSelectionPickingResponsibilities = [
  "selection-visualization",
  "object-picking-metadata"
] as const;

const expectedDragPlacementResponsibility = "drag-move-placement-interaction";

const expectedRemainingInteractionResponsibilities = [
  "pointer-interaction-handling",
  "rotation-transform-interaction"
] as const;

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
  for (const responsibilityId of expectedSelectionPickingResponsibilities) {
    const responsibility = findResponsibilityById(inventory.primaryResponsibilities, responsibilityId);

    if (
      !responsibility ||
      responsibility.status !== "extracted" ||
      responsibility.ownerModule !== "src/components/babylonScene/selectionPicking.ts" ||
      responsibility.riskLevel !== "low" ||
      responsibility.nextRefactorCandidate !== false
    ) {
      issues.push(createIssue("selection-picking-responsibility-invalid", "Babylon scene primaryResponsibilities must keep selection and object picking responsibilities as extracted selectionPicking helper work.", inventory.id, [responsibilityId]));
    }
  }
  for (const responsibilityId of expectedRemainingInteractionResponsibilities) {
    const responsibility = findResponsibilityById(inventory.primaryResponsibilities, responsibilityId);
    const isRotationTransform = responsibilityId === "rotation-transform-interaction";

    if (
      !responsibility ||
      responsibility.status !== "remaining" ||
      responsibility.ownerModule !== "src/components/BabylonScene.tsx" ||
      responsibility.riskLevel !== "high" ||
      responsibility.nextRefactorCandidate !== isRotationTransform
    ) {
      issues.push(createIssue("interaction-responsibility-invalid", "Babylon scene primaryResponsibilities must keep pointer orchestration and rotation/gizmo responsibilities as remaining high-risk BabylonScene work with the expected next-candidate classification.", inventory.id, [responsibilityId]));
    }
  }
  const dragPlacementResponsibility = findResponsibilityById(
    inventory.primaryResponsibilities,
    expectedDragPlacementResponsibility
  );
  if (
    !dragPlacementResponsibility ||
    dragPlacementResponsibility.status !== "extracted" ||
    dragPlacementResponsibility.ownerModule !== "src/components/babylonScene/dragPlacement.ts" ||
    dragPlacementResponsibility.riskLevel !== "low" ||
    dragPlacementResponsibility.nextRefactorCandidate !== false
  ) {
    issues.push(createIssue("drag-placement-responsibility-invalid", "Babylon scene primaryResponsibilities must keep drag/move/placement as extracted dragPlacement helper work.", inventory.id, [expectedDragPlacementResponsibility]));
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
  if (
    inventory.selectionPickingContract.status !== "extracted" ||
    inventory.selectionPickingContract.ownerModule !== "src/components/babylonScene/selectionPicking.ts" ||
    inventory.selectionPickingContract.extractedModule !== "src/components/babylonScene/selectionPicking.ts" ||
    inventory.selectionPickingContract.testModule !== "src/components/babylonScene/selectionPicking.test.ts" ||
    inventory.selectionPickingContract.remainingPointerOrchestrationModule !== "src/components/BabylonScene.tsx" ||
    inventory.selectionPickingContract.riskLevel !== "low" ||
    inventory.selectionPickingContract.protectedBehaviors.length === 0 ||
    !expectedSelectionPickingResponsibilities.every((responsibilityId) =>
      inventory.selectionPickingContract.responsibilityIds.includes(responsibilityId)
    ) ||
    !inventory.selectionPickingContract.extractedFlows.pickTargetMetadataDecoding ||
    !inventory.selectionPickingContract.extractedFlows.machinePickMetadataAssignment ||
    !inventory.selectionPickingContract.extractedFlows.hierarchyPickMetadataPropagation ||
    !inventory.selectionPickingContract.extractedFlows.toggleSelectionEventDetection ||
    !inventory.selectionPickingContract.remainingInteractionFlows.pointerObserverOrchestration ||
    !inventory.selectionPickingContract.remainingInteractionFlows.rotationTransformGizmo ||
    !inventory.selectionPickingContract.separatedFromResponsibilityIds.includes("pointer-interaction-handling") ||
    !inventory.selectionPickingContract.separatedFromResponsibilityIds.includes("drag-move-placement-interaction") ||
    !inventory.selectionPickingContract.separatedFromResponsibilityIds.includes("rotation-transform-interaction")
  ) {
    issues.push(createIssue("selection-picking-contract-invalid", "Babylon scene selectionPickingContract must protect extracted selection/object-picking helper behavior while keeping pointer orchestration, drag, and rotation responsibilities separate.", inventory.id));
  }
  if (
    inventory.dragPlacementContract.responsibilityId !== "drag-move-placement-interaction" ||
    inventory.dragPlacementContract.status !== "extracted" ||
    inventory.dragPlacementContract.ownerModule !== "src/components/babylonScene/dragPlacement.ts" ||
    inventory.dragPlacementContract.extractedModule !== "src/components/babylonScene/dragPlacement.ts" ||
    inventory.dragPlacementContract.testModule !== "src/components/babylonScene/dragPlacement.test.ts" ||
    inventory.dragPlacementContract.remainingPointerOrchestrationModule !== "src/components/BabylonScene.tsx" ||
    inventory.dragPlacementContract.riskLevel !== "low" ||
    inventory.dragPlacementContract.protectedBehaviors.length === 0 ||
    !inventory.dragPlacementContract.extractedFlows.machineDragInstanceSelection ||
    !inventory.dragPlacementContract.extractedFlows.machineStartPositionCapture ||
    !inventory.dragPlacementContract.extractedFlows.floorDeltaMmConversion ||
    !inventory.dragPlacementContract.extractedFlows.civilDragPositionCalculation ||
    !inventory.dragPlacementContract.extractedFlows.machineDragPositionUpdates ||
    !inventory.dragPlacementContract.remainingInteractionFlows.pointerObserverOrchestration ||
    !inventory.dragPlacementContract.remainingInteractionFlows.rotationTransformGizmo ||
    !inventory.dragPlacementContract.separatedFromResponsibilityIds.includes("pointer-interaction-handling") ||
    !inventory.dragPlacementContract.separatedFromResponsibilityIds.includes("rotation-transform-interaction")
  ) {
    issues.push(createIssue("drag-placement-contract-invalid", "Babylon scene dragPlacementContract must protect extracted drag/move/placement helper behavior while keeping pointer orchestration and rotation responsibilities separate.", inventory.id));
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
