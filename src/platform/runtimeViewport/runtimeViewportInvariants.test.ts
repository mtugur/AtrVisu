import { describe, expect, it } from "vitest";
import {
  areRuntimeViewportCameraSnapshotsEquivalent,
  areRuntimeViewportInvariantSnapshotsEqual,
  isRuntimeViewportOrthographicIntentUniform,
  type RuntimeViewportCameraSnapshot,
  type RuntimeViewportInvariantSnapshot
} from "./runtimeViewportBridge";

const perspectiveCamera = (): RuntimeViewportCameraSnapshot => ({
  mode: "perspective",
  alpha: 0.7,
  beta: 1.1,
  radius: 34,
  targetX: 1,
  targetY: 2,
  targetZ: 3,
  positionX: 20,
  positionY: 15,
  positionZ: 20,
  fov: 0.8
});

const invariants = (): RuntimeViewportInvariantSnapshot => ({
  selectionIds: ["machine:one"],
  primarySelectionId: "machine:one",
  activeGroupEditId: "group-one",
  machineTransforms: ["one:100:200:90"],
  civilTransforms: ["column-one:300:400:0"],
  annotationTransforms: ["note-one:-100:50:1600"],
  groupMembership: ["group-one:machine:one"],
  layerState: ["default:true:false"],
  undoDepth: 2,
  redoDepth: 1,
  undoStack: ["undo-one", "undo-two"],
  redoStack: ["redo-one"],
  projectDirty: true,
  simulationRunning: false,
  simulationSpeed: 1
});

describe("runtime viewport invariants", () => {
  it("keeps a perspective camera snapshot equivalent within numeric tolerance", () => {
    const before = perspectiveCamera();
    const after = { ...before, alpha: before.alpha + 1e-8 };

    expect(areRuntimeViewportCameraSnapshotsEquivalent(before, after)).toBe(true);
    expect(areRuntimeViewportCameraSnapshotsEquivalent(before, { ...after, mode: "orthographic" }))
      .toBe(false);
  });

  it("keeps orthographic framing and target equivalent after a pure resize", () => {
    const before: RuntimeViewportCameraSnapshot = {
      ...perspectiveCamera(),
      mode: "orthographic",
      orthoLeft: -10,
      orthoRight: 10,
      orthoTop: 8,
      orthoBottom: -8,
      orthographicIntent: {
        centerX: 0,
        centerY: 0,
        horizontalWorldSpan: 20,
        verticalWorldSpan: 16,
        viewportAspectRatio: 1.25,
        horizontalWorldUnitsPerPixel: 0.02,
        verticalWorldUnitsPerPixel: 0.02
      }
    };
    const after: RuntimeViewportCameraSnapshot = {
      ...before,
      orthoLeft: -16,
      orthoRight: 16,
      orthographicIntent: {
        centerX: 0,
        centerY: 0,
        horizontalWorldSpan: 32,
        verticalWorldSpan: 16,
        viewportAspectRatio: 2,
        horizontalWorldUnitsPerPixel: 0.02,
        verticalWorldUnitsPerPixel: 0.02
      }
    };

    expect(areRuntimeViewportCameraSnapshotsEquivalent(before, after)).toBe(true);
    expect(areRuntimeViewportCameraSnapshotsEquivalent(before, {
      ...after,
      orthographicIntent: {
        ...after.orthographicIntent!,
        centerX: 1
      }
    })).toBe(false);
    expect(areRuntimeViewportCameraSnapshotsEquivalent(before, {
      ...after,
      orthographicIntent: {
        ...after.orthographicIntent!,
        horizontalWorldUnitsPerPixel: 0.03
      }
    }))
      .toBe(false);
  });

  it("detects non-uniform orthographic world-to-pixel scaling", () => {
    expect(isRuntimeViewportOrthographicIntentUniform({
      centerX: 0,
      centerY: 0,
      horizontalWorldSpan: 20,
      verticalWorldSpan: 10,
      viewportAspectRatio: 2,
      horizontalWorldUnitsPerPixel: 0.02,
      verticalWorldUnitsPerPixel: 0.02
    })).toBe(true);
    expect(isRuntimeViewportOrthographicIntentUniform({
      centerX: 0,
      centerY: 0,
      horizontalWorldSpan: 20,
      verticalWorldSpan: 10,
      viewportAspectRatio: 2,
      horizontalWorldUnitsPerPixel: 0.02,
      verticalWorldUnitsPerPixel: 0.01
    })).toBe(false);
  });

  it("detects changes across selection, transforms, groups, layers, history, dirty, and simulation state", () => {
    const before = invariants();

    expect(areRuntimeViewportInvariantSnapshotsEqual(before, { ...before })).toBe(true);
    expect(areRuntimeViewportInvariantSnapshotsEqual(before, {
      ...before,
      machineTransforms: ["one:101:200:90"]
    })).toBe(false);
    expect(areRuntimeViewportInvariantSnapshotsEqual(before, {
      ...before,
      undoDepth: before.undoDepth + 1
    })).toBe(false);
    expect(areRuntimeViewportInvariantSnapshotsEqual(before, {
      ...before,
      undoStack: ["changed"]
    })).toBe(false);
    expect(areRuntimeViewportInvariantSnapshotsEqual(before, {
      ...before,
      projectDirty: !before.projectDirty
    })).toBe(false);
  });
});
