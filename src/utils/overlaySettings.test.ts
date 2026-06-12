import { describe, expect, it } from "vitest";
import { DEFAULT_OVERLAY_SETTINGS, normalizeOverlaySettings } from "./overlaySettings";

describe("overlay settings", () => {
  it("uses safe defaults for missing settings", () => {
    expect(normalizeOverlaySettings(null)).toEqual(DEFAULT_OVERLAY_SETTINGS);
  });

  it("preserves explicit boolean settings and fills missing values", () => {
    expect(normalizeOverlaySettings({ showLabels: false, showMetadataBox: true })).toEqual({
      showLabels: false,
      showSelectionBox: true,
      showMetadataBox: true,
      showCollisionEnvelope: false,
      showClearanceEnvelope: false,
      showConnectionPoints: false,
      connectionPointDisplayMode: "selected",
      showAnnotations: true,
      showAnnotationLeaderLines: true
    });
  });

  it("ignores invalid setting values", () => {
    expect(normalizeOverlaySettings({ showLabels: "nope", showSelectionBox: false })).toEqual({
      showLabels: true,
      showSelectionBox: false,
      showMetadataBox: false,
      showCollisionEnvelope: false,
      showClearanceEnvelope: false,
      showConnectionPoints: false,
      connectionPointDisplayMode: "selected",
      showAnnotations: true,
      showAnnotationLeaderLines: true
    });
  });

  it("normalizes connection point display mode", () => {
    expect(normalizeOverlaySettings({ showConnectionPoints: true, connectionPointDisplayMode: "all" })).toMatchObject({
      showConnectionPoints: true,
      connectionPointDisplayMode: "all"
    });
    expect(normalizeOverlaySettings({ connectionPointDisplayMode: "bad" })).toMatchObject({
      connectionPointDisplayMode: "selected"
    });
  });

  it("normalizes annotation overlay flags", () => {
    expect(normalizeOverlaySettings({ showAnnotations: false, showAnnotationLeaderLines: false })).toMatchObject({
      showAnnotations: false,
      showAnnotationLeaderLines: false
    });
    expect(normalizeOverlaySettings({ showAnnotations: "bad", showAnnotationLeaderLines: "bad" })).toMatchObject({
      showAnnotations: true,
      showAnnotationLeaderLines: true
    });
  });
});
