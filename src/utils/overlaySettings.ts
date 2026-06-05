import type { OverlaySettings } from "../types/overlays";

export const OVERLAY_SETTINGS_STORAGE_KEY = "atrvisu.overlaySettings";

export const DEFAULT_OVERLAY_SETTINGS: OverlaySettings = {
  showLabels: true,
  showSelectionBox: true,
  showMetadataBox: false,
  showClearanceEnvelope: false
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
    showClearanceEnvelope:
      typeof value.showClearanceEnvelope === "boolean"
        ? value.showClearanceEnvelope
        : DEFAULT_OVERLAY_SETTINGS.showClearanceEnvelope
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
