import { currentAppShellBoundaryZones } from "./currentAppShellBoundary";
import type {
  AppShellBoundaryAuditReport,
  AppShellBoundaryIssue,
  AppShellBoundaryRiskLevel,
  AppShellBoundaryZone,
  AppShellZoneType
} from "./appShellBoundaryTypes";

const validRiskLevels = new Set<AppShellBoundaryRiskLevel>(["low", "medium", "high"]);

const hasText = (value: string) => value.trim().length > 0;

const createIssue = (
  severity: "error" | "warning",
  code: string,
  message: string,
  zoneId?: string,
  relatedIds?: readonly string[]
): AppShellBoundaryIssue => ({
  severity,
  code,
  message,
  ...(zoneId !== undefined ? { zoneId } : {}),
  ...(relatedIds !== undefined ? { relatedIds } : {})
});

export const createAppShellBoundaryAuditReportFromZones = (
  zones: readonly AppShellBoundaryZone[]
): AppShellBoundaryAuditReport => {
  const issues: AppShellBoundaryIssue[] = [];
  const seenZoneIds = new Set<string>();

  zones.forEach((zone) => {
    if (!hasText(zone.id)) {
      issues.push(createIssue("error", "zone-id-empty", "Zone id is required.", zone.id));
    }

    if (seenZoneIds.has(zone.id)) {
      issues.push(createIssue("error", "zone-id-duplicate", `Duplicate zone id "${zone.id}".`, zone.id));
    }
    seenZoneIds.add(zone.id);

    if (!hasText(zone.label)) {
      issues.push(createIssue("error", "zone-label-empty", "Zone label is required.", zone.id));
    }

    if (zone.sourceFiles.length === 0 || zone.sourceFiles.some((sourceFile) => !hasText(sourceFile))) {
      issues.push(createIssue("error", "zone-source-files-empty", "Zone sourceFiles must not be empty.", zone.id));
    }

    if (zone.responsibilities.length === 0 || zone.responsibilities.some((responsibility) => !hasText(responsibility))) {
      issues.push(createIssue("error", "zone-responsibilities-empty", "Zone responsibilities must not be empty.", zone.id));
    }

    if (zone.refactorNotes.length === 0 || zone.refactorNotes.some((note) => !hasText(note))) {
      issues.push(createIssue("warning", "zone-refactor-notes-empty", "Zone refactorNotes should not be empty.", zone.id));
    }

    if (!validRiskLevels.has(zone.riskLevel)) {
      issues.push(createIssue("error", "zone-risk-level-invalid", "Zone riskLevel must be low, medium, or high.", zone.id));
    }
  });

  if (!zones.some((zone) => zone.id === "app-root")) {
    issues.push(createIssue("error", "required-zone-missing", "Required app-root zone is missing.", undefined, ["app-root"]));
  }

  if (!zones.some((zone) => zone.id === "scene-viewport")) {
    issues.push(createIssue("error", "required-zone-missing", "Required scene-viewport zone is missing.", undefined, ["scene-viewport"]));
  }

  if (!zones.some((zone) => zone.type === "panel")) {
    issues.push(createIssue("error", "panel-zone-missing", "At least one panel zone is required."));
  }

  if (!zones.some((zone) => zone.type === "modal")) {
    issues.push(createIssue("warning", "modal-zone-missing", "At least one modal zone should be documented."));
  }

  return {
    zones,
    issues,
    zoneCount: zones.length,
    errorCount: issues.filter((issue) => issue.severity === "error").length,
    warningCount: issues.filter((issue) => issue.severity === "warning").length
  };
};

export const createAppShellBoundaryAuditReport = () =>
  createAppShellBoundaryAuditReportFromZones(currentAppShellBoundaryZones);

export const getAppShellBoundaryZoneById = (zoneId: string) =>
  currentAppShellBoundaryZones.find((zone) => zone.id === zoneId);

export const getAppShellBoundaryZonesByType = (type: AppShellZoneType) =>
  currentAppShellBoundaryZones.filter((zone) => zone.type === type);

export const getHighRiskAppShellBoundaryZones = () =>
  currentAppShellBoundaryZones.filter((zone) => zone.riskLevel === "high");

export const getAppShellBoundaryZoneIds = () =>
  currentAppShellBoundaryZones.map((zone) => zone.id);
