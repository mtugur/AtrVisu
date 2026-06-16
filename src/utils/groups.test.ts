import { describe, expect, it } from "vitest";
import type { CivilReferenceItem } from "../types/civil";
import type { MachineDefinition, PlacedMachine } from "../types/machine";
import { createDefaultLayer } from "./layers";
import {
  addObjectsToGroup,
  createObjectGroup,
  getVisibleGroupObjectIds,
  normalizeGroups,
  removeObjectsFromGroup,
  removeObjectsFromGroups
} from "./groups";

const definition: MachineDefinition = {
  id: "machine",
  name: "Machine",
  category: "Packaging",
  width: 1,
  depth: 1,
  height: 1,
  widthMm: 1000,
  depthMm: 1000,
  heightMm: 1000,
  defaultColor: "#ffffff",
  connectionPoints: []
};

const machine = (instanceId: string, layerId = "default"): PlacedMachine => ({
  instanceId,
  machineDefinitionId: definition.id,
  definition,
  definitionSnapshot: definition,
  layerId,
  position: { x: 0, z: 0 },
  positionMm: { xMm: 0, yMm: 0 },
  rotationY: 0,
  rotationDeg: 0,
  flowDirection: "forward"
});

const civil = (id: string, layerId = "default"): CivilReferenceItem => ({
  id,
  type: "column",
  name: id,
  positionMm: { xMm: 0, yMm: 0, zMm: 0 },
  referencePoint: "front-left-bottom",
  coordinateReferenceVersion: "front-left-bottom-v1",
  sizeMm: { widthMm: 500, depthMm: 500, heightMm: 3000 },
  rotationDeg: 0,
  layerId,
  createdAt: "now",
  updatedAt: "now"
});

describe("object groups", () => {
  it("creates a group with unique object ids", () => {
    const group = createObjectGroup(" Packaging Line ", ["a", "a", "b"], "2026-06-15T10:00:00.000Z");

    expect(group).toMatchObject({
      name: "Packaging Line",
      objectIds: ["a", "b"],
      createdAt: "2026-06-15T10:00:00.000Z"
    });
  });

  it("normalizes groups and drops orphan or duplicate object references", () => {
    const groups = normalizeGroups([
      { id: "line-1", name: "Line 1", objectIds: ["a", "missing"] },
      { id: "line-2", name: "Line 2", objectIds: ["a", "b"] }
    ], [machine("a"), machine("b")], [createDefaultLayer()]);

    expect(groups).toEqual([
      expect.objectContaining({ id: "line-1", objectIds: ["a"] }),
      expect.objectContaining({ id: "line-2", objectIds: ["b"] })
    ]);
  });

  it("adds and removes selected objects while keeping one group per object", () => {
    const first = createObjectGroup("First", ["a"]);
    const second = createObjectGroup("Second", []);
    const added = addObjectsToGroup([first, second], second.id, ["a", "b"]);

    expect(added.find((group) => group.id === first.id)?.objectIds).toEqual([]);
    expect(added.find((group) => group.id === second.id)?.objectIds).toEqual(["a", "b"]);

    const removed = removeObjectsFromGroup(added, second.id, ["a"]);
    expect(removed.find((group) => group.id === second.id)?.objectIds).toEqual(["b"]);
  });

  it("cleans deleted object ids from groups", () => {
    const group = createObjectGroup("Line", ["a", "b"]);
    expect(removeObjectsFromGroups([group], ["a"])[0].objectIds).toEqual(["b"]);
  });

  it("resolves selectable group members from visible layers only", () => {
    const layers = [
      createDefaultLayer(),
      { id: "hidden", name: "Hidden", visible: false, locked: false, createdAt: "now", updatedAt: "now" }
    ];
    const group = createObjectGroup("Line", ["a", "b"]);

    expect(getVisibleGroupObjectIds(group, [machine("a"), machine("b", "hidden")], layers)).toEqual(["a"]);
  });

  it("normalizes mixed machine and civil group members", () => {
    const groups = normalizeGroups([
      { id: "mixed", name: "Mixed", objectIds: ["machine:a", "civil:column-1", "civil:missing"] }
    ], [machine("a")], [createDefaultLayer()], [civil("column-1")]);

    expect(groups[0].objectIds).toEqual(["machine:a", "civil:column-1"]);
  });

  it("resolves visible civil group members and hides hidden civil members", () => {
    const layers = [
      createDefaultLayer(),
      { id: "hidden", name: "Hidden", visible: false, locked: false, createdAt: "now", updatedAt: "now" }
    ];
    const group = createObjectGroup("Civil", ["civil:column-a", "civil:column-b"]);

    expect(getVisibleGroupObjectIds(group, [], layers, [civil("column-a"), civil("column-b", "hidden")])).toEqual(["civil:column-a"]);
  });
});
