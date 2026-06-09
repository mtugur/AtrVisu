import type { PlacementSettings } from "../types/placement";

export const PLACEMENT_SETTINGS_STORAGE_KEY = "atrvisu.placementSettings";

export const DEFAULT_PLACEMENT_SETTINGS: PlacementSettings = {
  gridSnapEnabled: true,
  gridSnapStepMm: 100,
  rotationSnapEnabled: true,
  rotationSnapStepDeg: 15,
  showMeasurementHelpers: true
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const readPositiveNumber = (value: unknown, fallback: number, max = Number.POSITIVE_INFINITY) => {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= max ? value : fallback;
};

export const normalizePlacementSettings = (value: unknown): PlacementSettings => {
  if (!isRecord(value)) {
    return DEFAULT_PLACEMENT_SETTINGS;
  }

  return {
    gridSnapEnabled:
      typeof value.gridSnapEnabled === "boolean"
        ? value.gridSnapEnabled
        : DEFAULT_PLACEMENT_SETTINGS.gridSnapEnabled,
    gridSnapStepMm: readPositiveNumber(value.gridSnapStepMm, DEFAULT_PLACEMENT_SETTINGS.gridSnapStepMm),
    rotationSnapEnabled:
      typeof value.rotationSnapEnabled === "boolean"
        ? value.rotationSnapEnabled
        : DEFAULT_PLACEMENT_SETTINGS.rotationSnapEnabled,
    rotationSnapStepDeg: readPositiveNumber(
      value.rotationSnapStepDeg,
      DEFAULT_PLACEMENT_SETTINGS.rotationSnapStepDeg,
      360
    ),
    showMeasurementHelpers:
      typeof value.showMeasurementHelpers === "boolean"
        ? value.showMeasurementHelpers
        : DEFAULT_PLACEMENT_SETTINGS.showMeasurementHelpers
  };
};

export const loadPlacementSettings = (): PlacementSettings => {
  try {
    const raw = window.localStorage.getItem(PLACEMENT_SETTINGS_STORAGE_KEY);
    return raw ? normalizePlacementSettings(JSON.parse(raw)) : DEFAULT_PLACEMENT_SETTINGS;
  } catch {
    return DEFAULT_PLACEMENT_SETTINGS;
  }
};

export const savePlacementSettings = (settings: PlacementSettings) => {
  window.localStorage.setItem(PLACEMENT_SETTINGS_STORAGE_KEY, JSON.stringify(normalizePlacementSettings(settings)));
};
