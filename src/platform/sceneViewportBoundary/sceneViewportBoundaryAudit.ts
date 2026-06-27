import { currentSceneViewportBoundary } from "./currentSceneViewportBoundary";
import type {
  SceneViewportBoundaryAuditReport,
  SceneViewportBoundaryInventory,
  SceneViewportBoundaryIssue,
  SceneViewportBoundaryReference
} from "./sceneViewportBoundaryTypes";

const hasText = (value: string) => value.trim().length > 0;

const hasReferenceItems = (items: readonly SceneViewportBoundaryReference[]) =>
  items.length > 0 && items.every((item) => hasText(item.id) && hasText(item.label));

const createIssue = (
  code: string,
  message: string,
  boundaryId?: string,
  relatedIds?: readonly string[]
): SceneViewportBoundaryIssue => ({
  severity: "error",
  code,
  message,
  ...(boundaryId !== undefined ? { boundaryId } : {}),
  ...(relatedIds !== undefined ? { relatedIds } : {})
});

export const createSceneViewportBoundaryAuditReportFromInventory = (
  inventory: SceneViewportBoundaryInventory
): SceneViewportBoundaryAuditReport => {
  const issues: SceneViewportBoundaryIssue[] = [];

  if (!hasText(inventory.id)) {
    issues.push(createIssue("boundary-id-empty", "Scene viewport boundary id is required.", inventory.id));
  }
  if (inventory.id !== "scene-viewport") {
    issues.push(createIssue("boundary-id-invalid", "Scene viewport boundary id must be scene-viewport.", inventory.id, ["scene-viewport"]));
  }
  if (!hasText(inventory.displayName)) {
    issues.push(createIssue("boundary-display-name-empty", "Scene viewport displayName is required.", inventory.id));
  }
  if (inventory.ownerLayer !== "app-shell") {
    issues.push(createIssue("boundary-owner-layer-invalid", "Scene viewport ownerLayer must be app-shell.", inventory.id, ["app-shell"]));
  }
  if (inventory.runtimeStatus !== "active") {
    issues.push(createIssue("boundary-runtime-status-invalid", "Scene viewport runtimeStatus must be active.", inventory.id, ["active"]));
  }
  if (inventory.appShellZoneId !== "scene-viewport") {
    issues.push(createIssue("boundary-app-shell-zone-invalid", "Scene viewport appShellZoneId must be scene-viewport.", inventory.id, ["scene-viewport"]));
  }
  if (inventory.sourceFiles.length === 0 || inventory.sourceFiles.some((sourceFile) => !hasText(sourceFile))) {
    issues.push(createIssue("boundary-source-files-empty", "Scene viewport sourceFiles must not be empty.", inventory.id));
  }
  if (!hasReferenceItems(inventory.primaryResponsibilities)) {
    issues.push(createIssue("primary-responsibilities-empty", "Scene viewport primaryResponsibilities must not be empty.", inventory.id));
  }
  if (!hasReferenceItems(inventory.knownUpstreamInputs)) {
    issues.push(createIssue("upstream-inputs-empty", "Scene viewport knownUpstreamInputs must not be empty.", inventory.id));
  }
  if (!hasReferenceItems(inventory.knownDownstreamEffects)) {
    issues.push(createIssue("downstream-effects-empty", "Scene viewport knownDownstreamEffects must not be empty.", inventory.id));
  }
  if (!hasReferenceItems(inventory.boundaryRisks)) {
    issues.push(createIssue("boundary-risks-empty", "Scene viewport boundaryRisks must not be empty.", inventory.id));
  }
  if (!hasReferenceItems(inventory.extractionNotes)) {
    issues.push(createIssue("extraction-notes-empty", "Scene viewport extractionNotes must not be empty.", inventory.id));
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

export const createSceneViewportBoundaryAuditReport = () =>
  createSceneViewportBoundaryAuditReportFromInventory(currentSceneViewportBoundary);

export const getSceneViewportBoundaryInventory = () => currentSceneViewportBoundary;

export const getSceneViewportBoundaryResponsibilityIds = () =>
  currentSceneViewportBoundary.primaryResponsibilities.map((responsibility) => responsibility.id);

export const getSceneViewportBoundaryUpstreamInputIds = () =>
  currentSceneViewportBoundary.knownUpstreamInputs.map((input) => input.id);

export const getSceneViewportBoundaryDownstreamEffectIds = () =>
  currentSceneViewportBoundary.knownDownstreamEffects.map((effect) => effect.id);
