// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  loadPlacementSettings,
  PLACEMENT_SETTINGS_STORAGE_KEY,
  savePlacementSettings
} from "./placementSettings";

const legacySettings = {
  gridSnapEnabled: false,
  gridSnapStepMm: 250,
  rotationSnapEnabled: true,
  rotationSnapStepDeg: 30,
  showMeasurementHelpers: true
};

beforeEach(() => {
  window.localStorage.clear();
});

describe("placement settings persistence", () => {
  it("migrates legacy visible helpers to a session-off state without losing snap preferences", () => {
    window.localStorage.setItem(PLACEMENT_SETTINGS_STORAGE_KEY, JSON.stringify(legacySettings));

    expect(loadPlacementSettings()).toEqual({
      ...legacySettings,
      showMeasurementHelpers: false
    });
    expect(JSON.parse(window.localStorage.getItem(PLACEMENT_SETTINGS_STORAGE_KEY) ?? "null")).toEqual({
      ...legacySettings,
      showMeasurementHelpers: false
    });
  });

  it("never persists runtime measurement visibility across sessions", () => {
    savePlacementSettings(legacySettings);

    expect(JSON.parse(window.localStorage.getItem(PLACEMENT_SETTINGS_STORAGE_KEY) ?? "null")).toEqual({
      ...legacySettings,
      showMeasurementHelpers: false
    });
  });
});
