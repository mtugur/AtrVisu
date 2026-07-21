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
  removeObjectsFromGroupWithResult,
  removeObjectsFromGroups,
  ungroupObjectGroup
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
      objectIds: ["machine:a", "machine:b"],
      createdAt: "2026-06-15T10:00:00.000Z"
    });
  });

  it("normalizes groups, preserves unresolved members, and drops duplicate ownership", () => {
    const groups = normalizeGroups([
      { id: "line-1", name: "Line 1", objectIds: ["a", "missing"] },
      { id: "line-2", name: "Line 2", objectIds: ["a", "b"] }
    ], [machine("a"), machine("b")], [createDefaultLayer()]);

    expect(groups).toEqual([
      expect.objectContaining({ id: "line-1", objectIds: ["machine:a", "machine:missing"] }),
      expect.objectContaining({ id: "line-2", objectIds: ["machine:b"] })
    ]);
  });

  it("adds and removes selected objects while keeping one group per object", () => {
    const first = createObjectGroup("First", ["a"]);
    const second = createObjectGroup("Second", []);
    const added = addObjectsToGroup([first, second], second.id, ["a", "b"]);

    expect(added.find((group) => group.id === first.id)).toBeUndefined();
    expect(added.find((group) => group.id === second.id)?.objectIds).toEqual(["machine:a", "machine:b"]);

    const removed = removeObjectsFromGroup(added, second.id, ["a"]);
    expect(removed.find((group) => group.id === second.id)?.objectIds).toEqual(["machine:b"]);
  });

  it("cleans deleted object ids from groups", () => {
    const group = createObjectGroup("Line", ["a", "b"]);
    expect(removeObjectsFromGroups([group], ["a"])[0].objectIds).toEqual(["machine:b"]);
  });

  it("resolves selectable group members from visible layers only", () => {
    const layers = [
      createDefaultLayer(),
      { id: "hidden", name: "Hidden", visible: false, locked: false, createdAt: "now", updatedAt: "now" }
    ];
    const group = createObjectGroup("Line", ["a", "b"]);

    expect(getVisibleGroupObjectIds(group, [machine("a"), machine("b", "hidden")], layers)).toEqual(["machine:a"]);
  });

  it("normalizes mixed machine and civil group members", () => {
    const groups = normalizeGroups([
      { id: "mixed", name: "Mixed", objectIds: ["machine:a", "civil:column-1", "civil:missing"] }
    ], [machine("a")], [createDefaultLayer()], [civil("column-1")]);

    expect(groups[0].objectIds).toEqual(["machine:a", "civil:column-1", "civil:missing"]);
  });

  it("treats legacy machine aliases as one deterministic membership claim", () => {
    const groups = normalizeGroups([
      { id: "first", name: "First", objectIds: ["a"] },
      { id: "second", name: "Second", objectIds: ["object:a", "machine:a"] }
    ], [machine("a")], [createDefaultLayer()]);

    expect(groups.map((group) => group.objectIds)).toEqual([["machine:a"]]);
  });

  it("reparents a member to the target group regardless of its legacy id form", () => {
    const first = createObjectGroup("First", ["object:a"]);
    const second = createObjectGroup("Second", []);
    const result = addObjectsToGroup([first, second], second.id, ["a"]);

    expect(result.find((group) => group.id === first.id)).toBeUndefined();
    expect(result.find((group) => group.id === second.id)?.objectIds).toEqual(["machine:a"]);
  });

  it("does not interpret a nested group identity as a machine member", () => {
    const groups = normalizeGroups([
      { id: "outer", name: "Outer", objectIds: ["group:inner", "machine:a"] }
    ], [machine("a")], [createDefaultLayer()]);

    expect(groups[0].objectIds).toEqual(["machine:a"]);
  });

  it("removes only explicit members and prunes the group after its final member", () => {
    const group = createObjectGroup("Line", ["machine:a", "machine:b"]);
    const firstRemoval = removeObjectsFromGroupWithResult([group], group.id, ["machine:a"]);

    expect(firstRemoval).toMatchObject({
      removedObjectIds: ["machine:a"],
      removedGroup: false
    });
    expect(firstRemoval?.groups[0].objectIds).toEqual(["machine:b"]);

    const finalRemoval = removeObjectsFromGroupWithResult(
      firstRemoval?.groups ?? [],
      group.id,
      ["machine:b"]
    );
    expect(finalRemoval).toMatchObject({
      groups: [],
      removedObjectIds: ["machine:b"],
      removedGroup: true
    });
  });

  it("keeps group membership unchanged for a group-root identity", () => {
    const group = createObjectGroup("Line", ["machine:a", "machine:b"]);
    const groups = [group];

    expect(addObjectsToGroup(groups, group.id, ["group:source"])).toBe(groups);
    expect(removeObjectsFromGroupWithResult(groups, group.id, ["group:source"])).toBeNull();
  });

  it("resolves visible civil group members and hides hidden civil members", () => {
    const layers = [
      createDefaultLayer(),
      { id: "hidden", name: "Hidden", visible: false, locked: false, createdAt: "now", updatedAt: "now" }
    ];
    const group = createObjectGroup("Civil", ["civil:column-a", "civil:column-b"]);

    expect(getVisibleGroupObjectIds(group, [], layers, [civil("column-a"), civil("column-b", "hidden")])).toEqual(["civil:column-a"]);
  });

  it("ungroups without changing persisted member identities", () => {
    const first = createObjectGroup("Line", ["machine:a", "civil:column-a"]);
    const second = createObjectGroup("Other", ["machine:b"]);

    expect(ungroupObjectGroup([first, second], first.id)).toEqual({
      groups: [second],
      memberEntityIds: ["machine:a", "civil:column-a"]
    });
  });
});
