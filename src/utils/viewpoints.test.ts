import { describe, expect, it } from "vitest";
import type { ViewpointCameraState } from "../types/viewpoints";
import {
  addViewpoint,
  createViewpoint,
  deleteViewpoint,
  normalizeViewpoints,
  updateViewpoint
} from "./viewpoints";

const camera: ViewpointCameraState = {
  alpha: 0.75,
  beta: 1.1,
  radius: 28,
  targetX: 1,
  targetY: 0,
  targetZ: -2,
  positionX: 4,
  positionY: 12,
  positionZ: 16,
  mode: "perspective"
};

describe("viewpoints", () => {
  it("creates named viewpoints with camera and display state", () => {
    const viewpoint = createViewpoint({
      id: "viewpoint-a",
      name: "  Overview  ",
      camera,
      displayState: {
        showAnnotations: true,
        showConnectionPoints: false,
        selectedObjectIds: ["machine-1"]
      },
      now: "2026-06-13T10:00:00.000Z"
    });

    expect(viewpoint).toMatchObject({
      id: "viewpoint-a",
      name: "Overview",
      camera,
      displayState: {
        showAnnotations: true,
        selectedObjectIds: ["machine-1"]
      },
      createdAt: "2026-06-13T10:00:00.000Z",
      updatedAt: "2026-06-13T10:00:00.000Z"
    });
  });

  it("rejects empty viewpoint names", () => {
    expect(() => createViewpoint({ name: " ", camera })).toThrow("Viewpoint name is required.");
  });

  it("normalizes valid viewpoints and skips invalid entries", () => {
    const normalized = normalizeViewpoints([
      {
        id: "valid",
        name: "Line review",
        camera,
        displayState: { selectedAnnotationId: "annotation-1" },
        createdAt: "2026-06-13T10:00:00.000Z",
        updatedAt: "2026-06-13T10:01:00.000Z"
      },
      { id: "missing-camera", name: "Broken" },
      { id: "bad-camera", name: "Broken", camera: { alpha: "nope" } }
    ]);

    expect(normalized).toHaveLength(1);
    expect(normalized[0]).toMatchObject({
      id: "valid",
      name: "Line review",
      camera,
      displayState: { selectedAnnotationId: "annotation-1" }
    });
  });

  it("adds, updates, and deletes viewpoints immutably", () => {
    const first = createViewpoint({ id: "first", name: "First", camera });
    const second = createViewpoint({ id: "second", name: "Second", camera });
    const added = addViewpoint([first], second);
    const updated = updateViewpoint(added, "second", {
      name: " Updated Second ",
      camera: { ...camera, radius: 18 }
    }, "2026-06-13T11:00:00.000Z");
    const deleted = deleteViewpoint(updated, "first");

    expect(added).toHaveLength(2);
    expect(updated.find((viewpoint) => viewpoint.id === "second")).toMatchObject({
      name: "Updated Second",
      camera: { radius: 18 },
      updatedAt: "2026-06-13T11:00:00.000Z"
    });
    expect(deleted.map((viewpoint) => viewpoint.id)).toEqual(["second"]);
  });

  it("returns an empty list for legacy layouts without viewpoints", () => {
    expect(normalizeViewpoints(undefined)).toEqual([]);
  });
});
