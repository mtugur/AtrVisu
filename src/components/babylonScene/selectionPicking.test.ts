import { describe, expect, it } from "vitest";
import {
  applyMachinePickMetadataToHierarchy,
  getSelectionPickTarget,
  isToggleSelectionEvent,
  setMachinePickMetadata,
  type SelectionPickMesh
} from "./selectionPicking";

const createMesh = (
  metadata: Record<string, unknown> | null = null,
  children: SelectionPickMesh[] = []
): SelectionPickMesh => ({
  metadata,
  isPickable: false,
  getChildMeshes: () => children
});

describe("selection picking helpers", () => {
  it("extracts machine, civil reference, and annotation ids from picked mesh metadata", () => {
    expect(
      getSelectionPickTarget({
        pickedMesh: createMesh({
          instanceId: "machine-1",
          civilReferenceId: "column-1",
          annotationId: "note-1"
        })
      })
    ).toEqual({
      instanceId: "machine-1",
      civilReferenceId: "column-1",
      annotationId: "note-1"
    });
  });

  it("ignores non-string metadata values", () => {
    expect(
      getSelectionPickTarget({
        pickedMesh: createMesh({
          instanceId: 100,
          civilReferenceId: null,
          annotationId: false
        })
      })
    ).toEqual({
      instanceId: undefined,
      civilReferenceId: undefined,
      annotationId: undefined
    });
  });

  it("detects Ctrl or Shift selection toggle events", () => {
    expect(isToggleSelectionEvent({ ctrlKey: true })).toBe(true);
    expect(isToggleSelectionEvent({ shiftKey: true })).toBe(true);
    expect(isToggleSelectionEvent({ ctrlKey: false, shiftKey: false })).toBe(false);
    expect(isToggleSelectionEvent(undefined)).toBe(false);
  });

  it("marks a machine mesh pickable while preserving existing metadata", () => {
    const mesh = createMesh({ role: "placeholder" });

    setMachinePickMetadata(mesh, "machine-1");

    expect(mesh.isPickable).toBe(true);
    expect(mesh.metadata).toEqual({ role: "placeholder", instanceId: "machine-1" });
  });

  it("applies machine pick metadata to child meshes", () => {
    const child = createMesh({ part: "roller" });
    const parent = createMesh({ role: "root" }, [child]);

    applyMachinePickMetadataToHierarchy(parent, "machine-1");

    expect(parent.metadata).toEqual({ role: "root", instanceId: "machine-1" });
    expect(child.metadata).toEqual({ part: "roller", instanceId: "machine-1" });
    expect(parent.isPickable).toBe(true);
    expect(child.isPickable).toBe(true);
  });
});
