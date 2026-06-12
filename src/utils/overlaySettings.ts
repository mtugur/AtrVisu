import type { OverlaySettings } from "../types/overlays";

export const OVERLAY_SETTINGS_STORAGE_KEY = "atrvisu.overlaySettings";

export const DEFAULT_OVERLAY_SETTINGS: OverlaySettings = {
  showLabels: true,
  showSelectionBox: true,
  showMetadataBox: false,
  showCollisionEnvelope: false,
  showClearanceEnvelope: false,
  showConnectionPoints: false,
  connectionPointDisplayMode: "selected",
  showAnnotations: true,
  showAnnotationLeaderLines: true
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export const normalizeOverlaySettings = (value: unknown): OverlaySettings => {
  if (!isRecord(value)) {
    return DEFAULT_OVERLAY_SETTINGS;
  }

  return {
    showLabels: typeof value.showLabels === "boolean" ? value.showLabels : DEFAULT_OVERLAY_SETTINGS.showLabels,
    showSelectionBox:
      typeof value.showSelectionBox === "boolean"
        ? value.showSelectionBox
        : DEFAULT_OVERLAY_SETTINGS.showSelectionBox,
    showMetadataBox:
      typeof value.showMetadataBox === "boolean" ? value.showMetadataBox : DEFAULT_OVERLAY_SETTINGS.showMetadataBox,
    showCollisionEnvelope:
      typeof value.showCollisionEnvelope === "boolean"
        ? value.showCollisionEnvelope
        : DEFAULT_OVERLAY_SETTINGS.showCollisionEnvelope,
    showClearanceEnvelope:
      typeof value.showClearanceEnvelope === "boolean"
        ? value.showClearanceEnvelope
        : DEFAULT_OVERLAY_SETTINGS.showClearanceEnvelope,
    showConnectionPoints:
      typeof value.showConnectionPoints === "boolean"
        ? value.showConnectionPoints
        : DEFAULT_OVERLAY_SETTINGS.showConnectionPoints,
    connectionPointDisplayMode:
      value.connectionPointDisplayMode === "all" || value.connectionPointDisplayMode === "selected"
        ? value.connectionPointDisplayMode
        : DEFAULT_OVERLAY_SETTINGS.connectionPointDisplayMode,
    showAnnotations:
      typeof value.showAnnotations === "boolean"
        ? value.showAnnotations
        : DEFAULT_OVERLAY_SETTINGS.showAnnotations,
    showAnnotationLeaderLines:
      typeof value.showAnnotationLeaderLines === "boolean"
        ? value.showAnnotationLeaderLines
        : DEFAULT_OVERLAY_SETTINGS.showAnnotationLeaderLines
  };
};

export const loadOverlaySettings = (): OverlaySettings => {
  try {
    const raw = window.localStorage.getItem(OVERLAY_SETTINGS_STORAGE_KEY);
    return raw ? normalizeOverlaySettings(JSON.parse(raw)) : DEFAULT_OVERLAY_SETTINGS;
  } catch {
    return DEFAULT_OVERLAY_SETTINGS;
  }
};

export const saveOverlaySettings = (settings: OverlaySettings) => {
  window.localStorage.setItem(OVERLAY_SETTINGS_STORAGE_KEY, JSON.stringify(normalizeOverlaySettings(settings)));
};
