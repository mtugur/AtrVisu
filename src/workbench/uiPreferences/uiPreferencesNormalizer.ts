import {
  DENSITY_IDS,
  THEME_IDS,
  UI_PREFERENCES_SCHEMA_VERSION,
  WORKSPACE_IDS,
  type DensityId,
  type PanelPreference,
  type ThemeId,
  type WorkbenchDockRegionId,
  type WorkbenchUiPreferences,
  type WorkspaceId
} from "../../platform/contracts";
import { validateWorkbenchUiPreferences } from "../../platform/phase1ArchitectureValidation";
import { RUNTIME_PANEL_IDS } from "../../platform/runtimePanels/runtimePanelRegistryBridge";
import {
  MAX_BOTTOM_DOCK_HEIGHT,
  MAX_PRIMARY_DOCK_WIDTH,
  MIN_BOTTOM_DOCK_HEIGHT,
  MIN_PRIMARY_DOCK_WIDTH
} from "../dockSizing";
import {
  COMPATIBILITY_PANEL_IDS,
  MAX_RIGHT_PANEL_WIDTH,
  MIN_RIGHT_PANEL_WIDTH,
  cloneWorkbenchUiPreferences,
  createDefaultWorkbenchUiPreferences
} from "./uiPreferencesDefaults";

const ALLOWED_DOCKS = new Set<WorkbenchDockRegionId>([
  "primary-dock",
  "secondary-dock",
  "bottom-dock"
]);
const ALLOWED_PANEL_IDS = new Set<string>(COMPATIBILITY_PANEL_IDS);
const ALLOWED_WORKSPACE_IDS = new Set<string>(WORKSPACE_IDS);

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === "object" && value !== null && !Array.isArray(value)
);

const getPanelSizeBounds = (panelId: string): readonly [number, number] | null => {
  if (panelId === RUNTIME_PANEL_IDS.rightPanelShell) {
    return [MIN_RIGHT_PANEL_WIDTH, MAX_RIGHT_PANEL_WIDTH];
  }
  if (panelId === RUNTIME_PANEL_IDS.primaryDockShell) {
    return [MIN_PRIMARY_DOCK_WIDTH, MAX_PRIMARY_DOCK_WIDTH];
  }
  if (panelId === RUNTIME_PANEL_IDS.bottomDockShell) {
    return [MIN_BOTTOM_DOCK_HEIGHT, MAX_BOTTOM_DOCK_HEIGHT];
  }
  return null;
};

export type NormalizeWorkbenchUiPreferencesResult = {
  preferences: WorkbenchUiPreferences;
  warnings: readonly string[];
  rejectedDomainPayload: boolean;
};

export const getUiPreferencesSchemaVersion = (value: unknown): number | null => {
  if (!isRecord(value) || typeof value.schemaVersion !== "number" || !Number.isFinite(value.schemaVersion)) {
    return null;
  }
  return value.schemaVersion;
};

export const normalizeWorkbenchUiPreferences = (
  input: unknown
): NormalizeWorkbenchUiPreferencesResult => {
  const defaults = createDefaultWorkbenchUiPreferences();
  const validation = validateWorkbenchUiPreferences(input);
  const rejectedDomainPayload = validation.errors.some((error) => error.code === "boundary.domain_payload");
  if (!isRecord(input) || rejectedDomainPayload) {
    return {
      preferences: defaults,
      warnings: rejectedDomainPayload
        ? ["Domain-shaped data was rejected from UI preferences."]
        : ["Invalid UI preferences were replaced with safe defaults in memory."],
      rejectedDomainPayload
    };
  }

  const warnings: string[] = [];
  const defaultById = new Map(defaults.panels.map((panel) => [panel.panelId, panel]));
  const acceptedById = new Map<string, PanelPreference>();
  const sourcePanels = Array.isArray(input.panels) ? input.panels : [];

  sourcePanels.forEach((candidate) => {
    if (!isRecord(candidate) || typeof candidate.panelId !== "string") {
      warnings.push("Malformed panel preference was removed.");
      return;
    }
    if (!ALLOWED_PANEL_IDS.has(candidate.panelId)) {
      warnings.push(`Unknown or non-runtime panel preference "${candidate.panelId}" was removed.`);
      return;
    }
    if (acceptedById.has(candidate.panelId)) {
      warnings.push(`Duplicate panel preference "${candidate.panelId}" was removed.`);
      return;
    }
    const fallback = defaultById.get(candidate.panelId);
    if (!fallback) {
      return;
    }
    const dock = ALLOWED_DOCKS.has(candidate.dock as WorkbenchDockRegionId)
      ? candidate.dock as WorkbenchDockRegionId
      : fallback.dock;
    const sizeBounds = getPanelSizeBounds(candidate.panelId);
    const size = sizeBounds
      && typeof candidate.size === "number"
      && Number.isFinite(candidate.size)
      ? Math.min(sizeBounds[1], Math.max(sizeBounds[0], candidate.size))
      : fallback.size;
    acceptedById.set(candidate.panelId, {
      panelId: fallback.panelId,
      visible: typeof candidate.visible === "boolean" ? candidate.visible : fallback.visible,
      collapsed: typeof candidate.collapsed === "boolean" ? candidate.collapsed : fallback.collapsed,
      ...(size === undefined ? {} : { size }),
      order: typeof candidate.order === "number" && Number.isFinite(candidate.order) && candidate.order >= 0
        ? candidate.order
        : fallback.order,
      dock
    });
  });

  const panels = defaults.panels
    .map((fallback) => acceptedById.get(fallback.panelId) ?? fallback)
    .sort((left, right) => left.order - right.order || left.panelId.localeCompare(right.panelId))
    .map((panel, order) => ({ ...panel, order }));

  const requestedWorkspaceId = typeof input.activeWorkspaceId === "string"
    && input.activeWorkspaceId.length > 0
    ? input.activeWorkspaceId
    : undefined;
  if (requestedWorkspaceId && !ALLOWED_WORKSPACE_IDS.has(requestedWorkspaceId)) {
    warnings.push(`Unknown workspace preference "${requestedWorkspaceId}" was removed.`);
  }

  const normalized: WorkbenchUiPreferences = {
    schemaVersion: UI_PREFERENCES_SCHEMA_VERSION,
    theme: (THEME_IDS as readonly unknown[]).includes(input.theme)
      ? input.theme as ThemeId
      : defaults.theme,
    density: (DENSITY_IDS as readonly unknown[]).includes(input.density)
      ? input.density as DensityId
      : defaults.density,
    ...(requestedWorkspaceId && ALLOWED_WORKSPACE_IDS.has(requestedWorkspaceId)
      ? { activeWorkspaceId: requestedWorkspaceId as WorkspaceId }
      : {}),
    panels
  };

  if (!validation.valid) {
    warnings.push("Invalid UI preference fields were normalized.");
  }
  const normalizedValidation = validateWorkbenchUiPreferences(normalized);
  if (!normalizedValidation.valid) {
    return {
      preferences: cloneWorkbenchUiPreferences(defaults),
      warnings: [...warnings, "UI preference normalization failed; safe defaults are active."],
      rejectedDomainPayload
    };
  }
  return { preferences: cloneWorkbenchUiPreferences(normalized), warnings, rejectedDomainPayload };
};
