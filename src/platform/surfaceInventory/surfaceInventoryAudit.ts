import { platformFeatureAccessMatrix } from "../featureAccess";
import { platformCommandSeedDefinitions, platformPanelSeedDefinitions } from "../registrySeeds";
import { currentPlatformSurfaceInventory } from "./currentSurfaceInventory";
import type {
  PlatformSurfaceInventoryAuditIssue,
  PlatformSurfaceInventoryAuditReport,
  PlatformSurfaceInventoryItem
} from "./surfaceInventoryTypes";

const surfaceInventoryItems: readonly PlatformSurfaceInventoryItem[] = currentPlatformSurfaceInventory;

const hasText = (value: string) => value.trim().length > 0;

const findDuplicateValues = (values: readonly string[]) => {
  const seenValues = new Set<string>();
  const duplicateValues = new Set<string>();

  values.forEach((value) => {
    if (seenValues.has(value)) {
      duplicateValues.add(value);
    }
    seenValues.add(value);
  });

  return Array.from(duplicateValues);
};

export const getSurfaceInventoryItemById = (surfaceId: string) =>
  surfaceInventoryItems.find((item) => item.surfaceId === surfaceId);

export const getSurfaceInventoryItemsByPanelId = (panelId: string) =>
  surfaceInventoryItems.filter((item) => item.panelIds?.includes(panelId));

export const getSurfaceInventoryItemsByCommandId = (commandId: string) =>
  surfaceInventoryItems.filter((item) => item.commandIds?.includes(commandId));

export const getSurfaceInventoryItemsByFeatureId = (featureId: string) =>
  surfaceInventoryItems.filter((item) => item.featureIds?.includes(featureId));

export const validateSurfaceInventory = (
  inventory: readonly PlatformSurfaceInventoryItem[] = currentPlatformSurfaceInventory
): PlatformSurfaceInventoryAuditReport => {
  const errors: PlatformSurfaceInventoryAuditIssue[] = [];
  const warnings: PlatformSurfaceInventoryAuditIssue[] = [];
  const commandIds: Set<string> = new Set(platformCommandSeedDefinitions.map((command) => command.id));
  const panelIds: Set<string> = new Set(platformPanelSeedDefinitions.map((panel) => panel.id));
  const featureIds: Set<string> = new Set(platformFeatureAccessMatrix.map((feature) => feature.featureId));
  const seenSurfaceIds = new Set<string>();

  inventory.forEach((item) => {
    if (seenSurfaceIds.has(item.surfaceId)) {
      errors.push({
        severity: "error",
        surfaceId: item.surfaceId,
        message: `Duplicate surfaceId "${item.surfaceId}".`
      });
    }
    seenSurfaceIds.add(item.surfaceId);

    if (!hasText(item.surfaceId)) {
      errors.push({ severity: "error", surfaceId: item.surfaceId, message: "surfaceId is required." });
    }
    if (!hasText(item.label)) {
      errors.push({ severity: "error", surfaceId: item.surfaceId, message: "label is required." });
    }
    if (item.sourceFiles.length === 0) {
      errors.push({ severity: "error", surfaceId: item.surfaceId, message: "sourceFiles must not be empty." });
    }
    item.sourceFiles.forEach((sourceFile) => {
      if (!hasText(sourceFile)) {
        errors.push({ severity: "error", surfaceId: item.surfaceId, message: "sourceFiles cannot contain empty paths." });
      }
    });

    item.commandIds?.forEach((commandId) => {
      if (!commandIds.has(commandId)) {
        errors.push({ severity: "error", surfaceId: item.surfaceId, message: `Missing commandId "${commandId}".` });
      }
    });
    item.panelIds?.forEach((panelId) => {
      if (!panelIds.has(panelId)) {
        errors.push({ severity: "error", surfaceId: item.surfaceId, message: `Missing panelId "${panelId}".` });
      }
    });
    item.featureIds?.forEach((featureId) => {
      if (!featureIds.has(featureId)) {
        errors.push({ severity: "error", surfaceId: item.surfaceId, message: `Missing featureId "${featureId}".` });
      }
    });

    findDuplicateValues(item.commandIds ?? []).forEach((commandId) => {
      errors.push({ severity: "error", surfaceId: item.surfaceId, message: `Duplicate commandId "${commandId}" in surface.` });
    });
    findDuplicateValues(item.panelIds ?? []).forEach((panelId) => {
      errors.push({ severity: "error", surfaceId: item.surfaceId, message: `Duplicate panelId "${panelId}" in surface.` });
    });
    findDuplicateValues(item.featureIds ?? []).forEach((featureId) => {
      errors.push({ severity: "error", surfaceId: item.surfaceId, message: `Duplicate featureId "${featureId}" in surface.` });
    });
  });

  return { errors, warnings };
};

export const createSurfaceInventoryAuditReport = () => validateSurfaceInventory();
